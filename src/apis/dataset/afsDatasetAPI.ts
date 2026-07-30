/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  AfsChunk,
  AfsListEntry,
  AfsListParams,
  DownloadAfsEntryInput,
  DownloadedFileResult,
  UploadAfsDataSetInput,
  UploadAfsDataSetResult,
} from './commonDataset'
import {
  decodeAfsChunksFromBytes,
  downloadBlobFile,
  encodeAfsChunksAsBytes,
  generateUploadId,
  parseAfsApiResponse,
  parseAfsListOctetStream,
} from './helpersDatasetAPI'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const AFS_API_PATH = '/afs-server/api'
const DEFAULT_DOWNLOAD_LIMIT = 50 * 1024 * 1024

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Extract session token from the openBIS facade. */
function getSessionToken(apiFacade: any): string {
  const sessionToken = apiFacade?._private?.sessionToken
  if (!sessionToken) {
    throw new Error('Missing openBIS session token (please log in again)')
  }
  return sessionToken
}

/** Read a file from AFS and return it as a Blob. */
export async function readAfsFileBlob(apiFacade: any, owner: string, source: string, offset: number, limit: number): Promise<Blob> {
  const sessionToken = getSessionToken(apiFacade)
  const url = new URL(AFS_API_PATH, window.location.origin)
  url.search = new URLSearchParams({ method: 'read', sessionToken }).toString()

  const requestBytes = encodeAfsChunksAsBytes([
    { owner, source, offset, limit, data: new Uint8Array() },
  ])

  const requestBody = requestBytes.buffer.slice(
    requestBytes.byteOffset,
    requestBytes.byteOffset + requestBytes.byteLength,
  ) as ArrayBuffer

  const response = await fetch(url.toString(), { method: 'POST', body: requestBody })
  if (!response.ok) {
    const bodyText = await response.text().catch(() => '')
    throw new Error('AFS download failed (HTTP ' + response.status + '): ' + (bodyText.slice(0, 500) || response.statusText))
  }

  const chunks = decodeAfsChunksFromBytes(new Uint8Array(await response.arrayBuffer()))
  const parts = chunks
    .map((chunk) => chunk.data)
    .filter((chunkData): chunkData is Uint8Array => chunkData instanceof Uint8Array)
    .map((chunkData) =>
      chunkData.buffer.slice(chunkData.byteOffset, chunkData.byteOffset + chunkData.byteLength) as ArrayBuffer,
    )

  return new Blob(parts)
}

/** Write a file chunk to AFS (used as first step of the write-then-move upload pattern). */
async function writeAfsFile(apiFacade: any, chunk: AfsChunk) {
  const sessionToken = getSessionToken(apiFacade)
  const url = new URL(AFS_API_PATH, window.location.origin)
  url.search = new URLSearchParams({ method: 'write', sessionToken }).toString()

  const bodyBytes = encodeAfsChunksAsBytes([chunk])
  const body = bodyBytes.buffer.slice(bodyBytes.byteOffset, bodyBytes.byteOffset + bodyBytes.byteLength) as ArrayBuffer
  const response = await fetch(url.toString(), { method: 'POST', body })

  if ((await parseAfsApiResponse(response)) !== true) {
    throw new Error('AFS write returned a non-true result')
  }
}

/** Atomically move (rename) a file within AFS. */
async function moveAfsFile(apiFacade: any, owner: string, source: string, target: string) {
  const sessionToken = getSessionToken(apiFacade)
  const response = await fetch(new URL(AFS_API_PATH, window.location.origin).toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
    body: new URLSearchParams({
      method: 'move',
      sourceOwner: owner,
      source,
      targetOwner: owner,
      target,
      sessionToken,
    }).toString(),
  })

  if ((await parseAfsApiResponse(response)) !== true) {
    throw new Error('AFS move returned a non-true result')
  }
}

/** Resolve the AFS owner string from the various input fields (owner override > permId > experiment > identifier). */
function resolveAfsOwner(input: Pick<UploadAfsDataSetInput, 'experimentIdentifier' | 'sampleIdentifier' | 'samplePermId' | 'afsOwnerText'>) {
  return input.afsOwnerText.trim() || input.samplePermId.trim() || input.experimentIdentifier.trim() || input.sampleIdentifier.trim()
}

/** Pick the best entry from an AFS listing (prefers original/*.png). */
export function pickPreferredAfsEntry(entries: AfsListEntry[]): AfsListEntry {
  return (
    entries.find((entry) => entry.path.startsWith('original/') && entry.path.toLowerCase().endsWith('.png')) ||
    entries.find((entry) => entry.path.toLowerCase().endsWith('.png')) ||
    entries[0]
  )
}

// ---------------------------------------------------------------------------
// Exported AFS functions
// ---------------------------------------------------------------------------

/** List files under an AFS owner/source path. Returns [] if the path doesn't exist yet. */
export async function listAfsEntries(apiFacade: any, params: AfsListParams): Promise<AfsListEntry[]> {
  if (!params.owner.trim()) return []

  const sessionToken = getSessionToken(apiFacade)
  const url = new URL(AFS_API_PATH, window.location.origin)
  url.search = new URLSearchParams({
    method: 'list',
    owner: params.owner.trim(),
    source: params.source,
    recursively: String(Boolean(params.recursively)),
    sessionToken,
  }).toString()

  const response = await fetch(url.toString(), { method: 'GET', cache: 'no-store' })
  const bodyText = await response.text().catch(() => '')
  if (!response.ok) {
    // AFS returns 400 with NoSuchFileException when the dataset has no files yet
    if (bodyText.includes('NoSuchFileException')) {
      console.info('afs file list empty')
      return []
    }
    throw new Error('AFS list failed (HTTP ' + response.status + '): ' + bodyText.slice(0, 500))
  }

  return parseAfsListOctetStream(bodyText).filter((e) => !e.path.startsWith('/.trash') && !e.path.startsWith('.trash'))
}

/** Download a single AFS entry (file) to the browser. */
export async function downloadAfsEntry(apiFacade: any, input: DownloadAfsEntryInput): Promise<DownloadedFileResult> {
  if (input.entry.directory) {
    throw new Error('Directories cannot be downloaded from the AFS file list')
  }

  if (!input.owner.trim()) {
    throw new Error('Missing AFS owner for download. Please list the folder again.')
  }

  const limit = Number.isFinite(input.entry.size) && Number(input.entry.size) > 0 ? Number(input.entry.size) : DEFAULT_DOWNLOAD_LIMIT
  const blob = await readAfsFileBlob(apiFacade, input.owner.trim(), input.entry.path, 0, limit)
  const fileName = input.entry.name || input.entry.path.split('/').filter(Boolean).pop() || 'download'
  downloadBlobFile(fileName, blob)
  return { fileName }
}

/** Sanitize a single path segment so AFS accepts it.
 * Keeps letters, digits, spaces, dots, hyphens, underscores, and parentheses.
 * Everything else (en/em dashes, accented chars, etc.) is replaced with '_'.
 */
function sanitizeAfsSegment(segment: string): string {
  return segment.replace(/[^a-zA-Z0-9 .\-_()[\]]/g, '_')
}

/** Upload a file to AFS using write-then-move pattern, preserving relative folder structure. */
export async function uploadAfsDataSet(apiFacade: any, input: UploadAfsDataSetInput): Promise<UploadAfsDataSetResult> {
  if (!input.file) {
    throw new Error('Please choose a file to upload.')
  }

  const owner = resolveAfsOwner(input)
  if (!owner) {
    throw new Error('AFS upload requires an Experiment, Sample, or explicit AFS owner.')
  }

  // Preserve relative path for folder uploads; fall back to flat file name.
  // Sanitize each segment to strip characters the AFS server rejects (e.g. en/em dashes).
  const relativeName = input.file.webkitRelativePath || input.file.name
  const cleanRelative = relativeName
    .split('/')
    .filter(Boolean)
    .map(sanitizeAfsSegment)
    .join('/')
  const afsPath = '/' + cleanRelative
  const partPath = afsPath + '.__part__' + generateUploadId('u')
  const fileBytes = new Uint8Array(await input.file.arrayBuffer())

  await writeAfsFile(apiFacade, {
    owner,
    source: partPath,
    offset: 0,
    limit: fileBytes.length,
    data: fileBytes,
  })
  await moveAfsFile(apiFacade, owner, partPath, afsPath)

  return { afsPath }
}

/**
 * "Delete" a file from AFS by moving it to a .trash/ prefix.
 * The AFS HTTP API does not expose a delete endpoint; move is used as a workaround.
 * Files under .trash/ are excluded from listAfsEntries results automatically via the
 * filter applied in that function.
 */
export async function deleteAfsFile(apiFacade: any, owner: string, source: string): Promise<void> {
  const trashPath = '/.trash' + (source.startsWith('/') ? source : '/' + source)
  await moveAfsFile(apiFacade, owner, source, trashPath)
}
