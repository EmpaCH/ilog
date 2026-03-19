import { useContext, useMemo, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Autocomplete,
  AutocompleteItem,
  Button,
  Input,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from '@heroui/react'
import DownloadIcon from '@mui/icons-material/Download'
import openbis from '@openbis/openbis.esm'
import { AuthContext } from '../../context/auth/authContext'
import { useGetObjects } from '../../apis/object/useGetObjects'
import { buildSampleAutocompleteItems, generateUploadId, toErrorInfo } from './datasetHelpers'

type AfsChunk = {
  owner: string
  source: string
  offset: number
  limit?: number
  data?: Uint8Array
}

type AfsListEntry = {
  path: string
  name: string
  directory: boolean
  size?: number
  lastModified?: number
}

type UploadStatus =
  | { kind: 'idle' }
  | { kind: 'working' }
  | { kind: 'ok'; dataSetPermId: string }
  | { kind: 'partial'; message: string; details?: string; afsPath: string }
  | { kind: 'error'; message: string; details?: string }

type AfsDownloadStatus =
  | { kind: 'idle' }
  | { kind: 'working'; path: string }
  | { kind: 'ok'; fileName: string }
  | { kind: 'error'; message: string; details?: string }

const AFS_FACADE_LIST_PATCH_FLAG = '__ilogAfsCsvListPatched'
const AFS_FACADE_LIST_MODE_FLAG = '__ilogAfsListMode'

function buildAfsRegistrationFailureMessage(errorSummary: string, afsPath: string, dataSetTypeCode: string): string {
  const lowerSummary = errorSummary.toLowerCase()
  if (lowerSummary.includes('physical data cannot be null for a physical data set')) {
    return [
      `AFS file upload succeeded: ${afsPath}.`,
      `openBIS dataset registration failed afterwards because the server treated the new ${dataSetTypeCode || 'dataset'} as a PHYSICAL dataset and expected a physical-data record in openBIS/DSS.`,
      'So the file exists in AFS, but no dataset was registered in openBIS for it.',
    ].join(' ')
  }

  return `AFS file upload succeeded: ${afsPath}. openBIS dataset registration failed afterwards. ${errorSummary}`.trim()
}

/**
 * Parses the octet-stream list response returned by some AFS servers.
 *
 * Formats seen in practice:
 * - one record per line
 * - one record per NUL byte
 * - one record per semicolon
 *
 * Record shape:
 *   owner,path,name,directory,size,lastModified
 */
function parseAfsListOctetStream(text: string): AfsListEntry[] {
  const lines = String(text ?? '')
    // Some AFS servers separate rows with newlines, NUL bytes, or semicolons.
    .split(/[;\r\n\u0000]+/g)
    .map((l) => l.trim())
    .filter(Boolean)

  const rows: AfsListEntry[] = []
  for (const line of lines) {
    const parts = line.split(',')
    if (parts.length < 6) continue

    // Skip a potential header row.
    if (
      parts[0]?.toLowerCase?.() === 'owner' &&
      parts[1]?.toLowerCase?.() === 'path' &&
      parts[2]?.toLowerCase?.() === 'name'
    ) {
      continue
    }

    const path = String(parts[1] ?? '')
    if (!path) continue

    const name = String(parts[2] ?? '') || path.split('/').filter(Boolean).pop() || path
    const directory = String(parts[3] ?? '').toLowerCase() === 'true'

    const sizeText = String(parts[4] ?? '').trim()
    const sizeRaw = sizeText === '' ? Number.NaN : Number(sizeText)
    const size = Number.isFinite(sizeRaw) ? sizeRaw : undefined

    const lmText = String(parts[5] ?? '').trim()
    const lmRaw = lmText === '' ? Number.NaN : Number(lmText)
    const lastModified = Number.isFinite(lmRaw) ? lmRaw : undefined

    rows.push({ path, name, directory, size, lastModified })
  }

  rows.sort((a, b) => {
    if (a.directory !== b.directory) return a.directory ? -1 : 1
    return a.path.localeCompare(b.path)
  })
  return rows
}

function safeIsoFromEpochMs(ts?: number): string {
  if (!ts) return ''
  try {
    const d = new Date(ts)
    if (Number.isNaN(d.getTime())) return ''
    return d.toISOString()
  } catch {
    return ''
  }
}

function downloadBlobFile(fileName: string, blob: Blob) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function getPatchedAfsServerFacade(apiFacade: any): any {
  const afsFacade = apiFacade?.getAfsServerFacade?.()
  if (!afsFacade || typeof afsFacade.list !== 'function') {
    throw new Error('AFS facade is not available (getAfsServerFacade().list missing)')
  }

  if ((afsFacade as any)[AFS_FACADE_LIST_PATCH_FLAG]) {
    return afsFacade
  }

  const originalList = afsFacade.list.bind(afsFacade)
  ;(afsFacade as any)[AFS_FACADE_LIST_PATCH_FLAG] = true

  afsFacade.list = async (owner: string, source: string, recursively: boolean) => {
    const mode = (apiFacade as any)?.[AFS_FACADE_LIST_MODE_FLAG] as 'native' | 'csv' | undefined

    if (mode !== 'csv') {
      try {
        const raw = await originalList(owner, source, recursively)
        ;(apiFacade as any)[AFS_FACADE_LIST_MODE_FLAG] = 'native'
        return raw
      } catch (e: any) {
        const message = String(e?.message || e)
        const normalizedMessage = message.toLowerCase()

        // openbis.esm currently attempts JSON.parse on a Blob for octet-stream responses,
        // which throws different messages depending on the browser/runtime.
        const isFacadeParsingBug =
          normalizedMessage.includes('[object blob]') ||
          normalizedMessage.includes('is not valid json') ||
          normalizedMessage.includes('unexpected token') ||
          normalizedMessage.includes('json.parse: unexpected character') ||
          normalizedMessage.includes('unexpected non-whitespace character')

        if (!isFacadeParsingBug) {
          throw e
        }

        ;(apiFacade as any)[AFS_FACADE_LIST_MODE_FLAG] = 'csv'
      }
    }

    const sessionToken = apiFacade?._private?.sessionToken
    if (!sessionToken) {
      throw new Error('Missing openBIS session token (please log in again)')
    }

    const url = new URL('/afs-server/api', window.location.origin)
    url.search = new URLSearchParams({
      method: 'list',
      owner: String(owner ?? '').trim(),
      source: String(source ?? ''),
      recursively: String(Boolean(recursively)),
      sessionToken,
    }).toString()

    const res = await fetch(url.toString(), { method: 'GET', cache: 'no-store' })
    const bodyText = await res.text().catch(() => '')
    if (!res.ok) {
      throw new Error(`AFS list failed (HTTP ${res.status}): ${bodyText.slice(0, 500)}`)
    }

    const rows = parseAfsListOctetStream(bodyText)
    return rows.map((r) => {
      const lm = r.lastModified
      return {
        owner,
        path: r.path,
        name: r.name,
        directory: r.directory,
        size: r.size,
        lastModified: lm,
        getOwner: () => owner,
        getPath: () => r.path,
        getName: () => r.name,
        getDirectory: () => r.directory,
        getSize: () => (r.size ?? 0),
        getLastModified: () => (lm ?? 0),
        getLastModifiedTime: () => safeIsoFromEpochMs(lm),
        getCreationTime: () => '',
        getLastAccessTime: () => '',
      }
    })
  }

  return afsFacade
}

/**
 * Encodes one AFS `Chunk` into the binary format expected by the AFS server.
 *
 * The stock openBIS UI uses this binary `Chunk[]` envelope for both `write`
 * and `read` requests sent to `/afs-server/api?method=...`.
 */
function encodeAfsChunk(chunk: AfsChunk): Uint8Array {
  const textEncoder = new TextEncoder()

  const ownerBytes = chunk.owner != null ? textEncoder.encode(chunk.owner) : null
  const sourceBytes = chunk.source != null ? textEncoder.encode(chunk.source) : null
  const dataBytes = chunk.data ?? null

  const size =
    4 +
    (ownerBytes ? ownerBytes.length : 0) +
    4 +
    (sourceBytes ? sourceBytes.length : 0) +
    8 +
    4 +
    4 +
    (dataBytes ? dataBytes.length : 0)

  const buf = new ArrayBuffer(size)
  const view = new DataView(buf)
  const out = new Uint8Array(buf)
  let p = 0

  view.setInt32(p, ownerBytes ? ownerBytes.length : -1, false)
  p += 4
  if (ownerBytes) {
    out.set(ownerBytes, p)
    p += ownerBytes.length
  }

  view.setInt32(p, sourceBytes ? sourceBytes.length : -1, false)
  p += 4
  if (sourceBytes) {
    out.set(sourceBytes, p)
    p += sourceBytes.length
  }

  view.setBigInt64(p, BigInt(chunk.offset ?? -1), false)
  p += 8

  const resolvedLimit = chunk.limit ?? (chunk.data ? chunk.data.length : -1)
  view.setInt32(p, resolvedLimit, false)
  p += 4

  view.setInt32(p, dataBytes ? dataBytes.length : -1, false)
  p += 4
  if (dataBytes) {
    out.set(dataBytes, p)
    p += dataBytes.length
  }

  return out
}

/**
 * Encodes a `Chunk[]` array into bytes.
 *
 * Layout:
 * - int32: number of chunks
 * - then chunk payloads back-to-back
 */
function encodeAfsChunksAsBytes(chunks: AfsChunk[]): Uint8Array {
  const encodedChunks = chunks.map(encodeAfsChunk)
  const totalSize = 4 + encodedChunks.reduce((sum, b) => sum + b.length, 0)

  const buf = new Uint8Array(totalSize)
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength)

  view.setInt32(0, chunks.length, false)
  let p = 4
  for (const part of encodedChunks) {
    buf.set(part, p)
    p += part.length
  }
  return buf
}

function decodeAfsChunksFromBytes(encodedChunks: Uint8Array): AfsChunk[] {
  const view = new DataView(encodedChunks.buffer, encodedChunks.byteOffset, encodedChunks.byteLength)
  const textDecoder = new TextDecoder()
  const chunks: AfsChunk[] = []

  let position = 4
  while (position < encodedChunks.length) {
    const ownerLength = view.getInt32(position, false)
    position += 4

    let owner = ''
    if (ownerLength >= 0) {
      owner = textDecoder.decode(encodedChunks.slice(position, position + ownerLength))
      position += ownerLength
    }

    const sourceLength = view.getInt32(position, false)
    position += 4

    let source = ''
    if (sourceLength >= 0) {
      source = textDecoder.decode(encodedChunks.slice(position, position + sourceLength))
      position += sourceLength
    }

    const offsetRaw = view.getBigInt64(position, false)
    position += 8

    const limitRaw = view.getInt32(position, false)
    position += 4

    const dataLength = view.getInt32(position, false)
    position += 4

    let data: Uint8Array | undefined
    if (dataLength >= 0) {
      data = encodedChunks.slice(position, position + dataLength)
      position += dataLength
    }

    chunks.push({
      owner,
      source,
      offset: offsetRaw >= 0 ? Number(offsetRaw) : -1,
      limit: limitRaw >= 0 ? limitRaw : undefined,
      data,
    })
  }

  return chunks
}

async function readAfsFileBlob(
  owner: string,
  source: string,
  offset: number,
  limit: number,
  sessionToken: string
): Promise<Blob> {
  const url = new URL('/afs-server/api', window.location.origin)
  url.search = new URLSearchParams({
    method: 'read',
    sessionToken,
  }).toString()

  const requestBytes = encodeAfsChunksAsBytes([
    {
      owner,
      source,
      offset,
      limit,
      data: new Uint8Array(),
    },
  ])

  const requestBody = requestBytes.buffer.slice(
    requestBytes.byteOffset,
    requestBytes.byteOffset + requestBytes.byteLength
  ) as ArrayBuffer

  const res = await fetch(url.toString(), {
    method: 'POST',
    body: requestBody,
  })

  if (!res.ok) {
    const bodyText = await res.text().catch(() => '')
    throw new Error(`AFS download failed (HTTP ${res.status}): ${bodyText.slice(0, 500) || res.statusText}`)
  }

  const arrayBuffer = await res.arrayBuffer()
  const responseChunks = decodeAfsChunksFromBytes(new Uint8Array(arrayBuffer))
  const parts = responseChunks
    .map((chunk) => chunk.data)
    .filter((chunkData): chunkData is Uint8Array => chunkData instanceof Uint8Array)
    .map((chunkData) =>
      chunkData.buffer.slice(chunkData.byteOffset, chunkData.byteOffset + chunkData.byteLength) as ArrayBuffer
    )

  return new Blob(parts)
}

/**
 * Parses the JSON body returned by `/afs-server/api` and throws on errors.
 *
 * AFS responses are typically shaped like `{ result, error }`.
 */
async function parseAfsApiResponse(res: Response): Promise<any> {
  const text = await res.text()
  const trimmedText = text.trim()
  let parsed: any
  try {
    // Some AFS endpoints return bare JSON literals like `true`.
    // Trimming keeps JSON.parse stable for responses with trailing newlines.
    parsed = trimmedText ? JSON.parse(trimmedText) : null
  } catch {
    if (trimmedText === 'true') return true
    if (trimmedText === 'false') return false
    throw new Error(`AFS returned non-JSON response (HTTP ${res.status}): ${trimmedText.slice(0, 500)}`)
  }

  if (!res.ok) {
    // If the server didn't return the usual `{ result, error }` shape,
    // fall back to the raw body for the error message.
    if (!parsed || typeof parsed !== 'object') {
      throw new Error(
        `AFS request failed (HTTP ${res.status}): ${trimmedText || res.statusText || 'Unknown error'}`
      )
    }

    // AFS often nests the actual failure under `error.data.message` (ExceptionReason).
    const message =
      parsed?.error?.message ||
      parsed?.error?.data?.message ||
      parsed?.error?.data?.reason ||
      parsed?.message ||
      `HTTP ${res.status}`
    const details = parsed?.error?.data ?? parsed?.error ?? parsed
    const detailsText = details ? JSON.stringify(details, null, 2) : ''
    throw new Error(`AFS request failed (HTTP ${res.status}): ${message}${detailsText ? `\n${detailsText}` : ''}`)
  }

  if (parsed?.error) {
    const message = parsed?.error?.message || parsed?.error?.data?.message || JSON.stringify(parsed.error)
    throw new Error(`AFS error: ${message}`)
  }

  // Some AFS endpoints return just `true`/`false` (as JSON booleans), or
  // sometimes "true"/"false" (as JSON strings). Normalize these.
  if (parsed === true || parsed === false) return parsed
  if (typeof parsed === 'string') {
    const t = parsed.trim().toLowerCase()
    if (t === 'true') return true
    if (t === 'false') return false
    return parsed
  }

  const result = (parsed as any)?.result
  if (typeof result === 'string') {
    const t = result.trim().toLowerCase()
    if (t === 'true') return true
    if (t === 'false') return false
  }
  return result
}

/**
 * AFS upload page.
 *
 * Writes the file into AFS (`write` + `move`) and then registers an AFS-backed
 * dataset in the AS (`DataSetCreation.setAfsData(true)` + metadata pointing to
 * the AFS owner/path).
 */
export function DatasetUploadAfsPage() {
  const { apiFacade } = useContext(AuthContext)
  const queryClient = useQueryClient()

  const allObjectsQuery = useGetObjects()

  const [experimentIdentifier, setExperimentIdentifier] = useState('')
  const [sampleIdentifier, setSampleIdentifier] = useState('')
  const [samplePermId, setSamplePermId] = useState('')
  const [dataSetTypeCode, setDataSetTypeCode] = useState('ELN_PREVIEW')

  const [afsOwnerText, setAfsOwnerText] = useState('')
  const [afsSourceText, setAfsSourceText] = useState('')
  const [afsListParams, setAfsListParams] = useState<{ owner: string; source: string; recursively: boolean } | null>(null)

  const [uploadStatus, setUploadStatus] = useState<UploadStatus>({ kind: 'idle' })
  const [afsDownloadStatus, setAfsDownloadStatus] = useState<AfsDownloadStatus>({ kind: 'idle' })

  const [dummyStatus, setDummyStatus] = useState<
    | { kind: 'idle' }
    | { kind: 'working' }
    | { kind: 'ok'; afsPath: string }
    | { kind: 'error'; message: string; details?: string }
  >({ kind: 'idle' })

  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const resolvedAfsOwner = useMemo(() => {
    const manual = afsOwnerText.trim()
    if (manual) return manual
    const perm = samplePermId.trim()
    if (perm) return perm
    return sampleIdentifier.trim()
  }, [afsOwnerText, samplePermId, sampleIdentifier])

  const afsListQuery = useQuery({
    queryKey: ['afs', 'list', afsListParams],
    enabled: afsListParams != null,
    queryFn: async () => {
      if (!afsListParams) return [] as AfsListEntry[]

      const owner = String(afsListParams.owner ?? '').trim()
      const source = String(afsListParams.source ?? '')
      const recursively = Boolean(afsListParams.recursively)

      if (!owner) {
        return [] as AfsListEntry[]
      }

      const normalizeFacadeList = (raw: any): AfsListEntry[] => {
        if (!raw) return []

        if (typeof raw === 'string') {
          return parseAfsListOctetStream(raw)
        }

        const toEpochMs = (v: any): number => {
          if (v == null) return NaN
          if (typeof v === 'number') return v
          if (typeof v === 'string') {
            const n = Number(v)
            if (Number.isFinite(n)) return n
            const d = Date.parse(v)
            if (Number.isFinite(d)) return d
          }
          return NaN
        }

        if (Array.isArray(raw)) {
          const rows = raw
            .map((f: any) => {
              const safeStr = (v: any) => (v == null ? '' : String(v))

              const path =
                typeof f?.getPath === 'function' ? safeStr(f.getPath()) :
                typeof f?.path !== 'undefined' ? safeStr(f.path) :
                ''
              if (!path) return null

              const name =
                typeof f?.getName === 'function' ? safeStr(f.getName()) :
                typeof f?.name !== 'undefined' ? safeStr(f.name) :
                ''
              const directory =
                typeof f?.getDirectory === 'function' ? Boolean(f.getDirectory()) :
                typeof f?.directory !== 'undefined' ? Boolean(f.directory) :
                false

              const sizeRaw =
                typeof f?.getSize === 'function' ? Number(f.getSize()) :
                typeof f?.size !== 'undefined' ? Number(f.size) :
                NaN
              const size = Number.isFinite(sizeRaw) ? sizeRaw : undefined

              const lmRaw =
                typeof f?.getLastModified === 'function' ? toEpochMs(f.getLastModified()) :
                typeof f?.getLastModifiedTime === 'function' ? toEpochMs(f.getLastModifiedTime()) :
                typeof f?.lastModified !== 'undefined' ? toEpochMs(f.lastModified) :
                typeof f?.lastModifiedTime !== 'undefined' ? toEpochMs(f.lastModifiedTime) :
                NaN
              const lastModified = Number.isFinite(lmRaw) ? lmRaw : undefined

              const derivedName = name || path.split('/').filter(Boolean).pop() || path
              return { path, name: derivedName, directory, size, lastModified } satisfies AfsListEntry
            })
            .filter(Boolean) as AfsListEntry[]

          rows.sort((a, b) => {
            if (a.directory !== b.directory) return a.directory ? -1 : 1
            return a.path.localeCompare(b.path)
          })
          return rows
        }

        return []
      }

      const afsFacade = getPatchedAfsServerFacade(apiFacade as any)
      const raw = await (afsFacade as any).list(owner, source, recursively)
      return normalizeFacadeList(raw)
    },
    staleTime: 0,
  })

  /**
   * Items for the "Sample (Object)" autocomplete.
   *
   * Shared with the DSS page to keep labels/behavior consistent.
   */
  const sampleItems = useMemo(() => {
    return buildSampleAutocompleteItems(allObjectsQuery.data ?? [])
  }, [allObjectsQuery.data])

  const dataSetTypesQuery = useQuery({
    queryKey: ['as', 'searchDataSetTypes'],
    queryFn: async () => {
      const sc = new openbis.DataSetTypeSearchCriteria()
      const fo = new openbis.DataSetTypeFetchOptions()
      fo.from(0)
      fo.count(200)
      const result = await apiFacade.searchDataSetTypes(sc, fo)
      const types = result.getObjects()

      const items = types
        .map((t: any) => {
          const code = typeof t?.getCode === 'function' ? String(t.getCode()) : String(t?.code ?? '')
          if (!code) return null
          return { key: code, code }
        })
        .filter(Boolean) as Array<{ key: string; code: string }>

      items.sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }))
      return items
    },
    staleTime: 60_000,
  })

  const dataSetTypeItems = dataSetTypesQuery.data ?? []
  const selectedDataSetTypeKey = useMemo(() => {
    const code = dataSetTypeCode.trim()
    if (!code) return null
    return dataSetTypeItems.some((t: any) => t?.key === code) ? code : null
  }, [dataSetTypeCode, dataSetTypeItems])

  const onDownloadAfsEntry = async (entry: AfsListEntry) => {
    if (entry.directory) {
      return
    }

    const owner = String(afsListParams?.owner ?? '').trim()
    const limit = Number.isFinite(entry.size) && Number(entry.size) > 0 ? Number(entry.size) : 50 * 1024 * 1024

    setAfsDownloadStatus({ kind: 'working', path: entry.path })

    try {
      if (!owner) {
        throw new Error('Missing AFS owner for download. Please list the folder again.')
      }

      const sessionToken = (apiFacade as any)?._private?.sessionToken
      if (!sessionToken) {
        throw new Error('Missing openBIS session token (please log in again)')
      }

      const blob = await readAfsFileBlob(owner, entry.path, 0, limit, sessionToken)
      const fileName = entry.name || entry.path.split('/').filter(Boolean).pop() || 'download'

      downloadBlobFile(fileName, blob)
      setAfsDownloadStatus({ kind: 'ok', fileName })
    } catch (e) {
      const info = toErrorInfo(e)
      const context = {
        owner: owner || null,
        path: entry.path,
        name: entry.name,
        size: entry.size ?? null,
        requestedLimit: limit,
      }
      const details = [info.details, '--- context ---', JSON.stringify(context, null, 2)].filter(Boolean).join('\n')

      console.error('AFS file download failed', { error: e, context })
      setAfsDownloadStatus({ kind: 'error', message: info.summary, details })
    }
  }

  /**
   * Minimal, step-1 AFS connectivity check.
   *
   * Writes a small text file into AFS using the same best-effort strategy as
   * the real upload flow (facade first; compatibility fallback to `/afs-server/api`).
   *
   * This intentionally does NOT register a dataset in AS. It's just: "can I write to AFS?"
   */
  const onDummyUpload = async () => {
    setDummyStatus({ kind: 'working' })

    let dummyTarget: string | null = null
    let dummyPart: string | null = null
    let dummyBytesLength: number | null = null

    try {
      const sessionToken = (apiFacade as any)?._private?.sessionToken
      if (!sessionToken) {
        throw new Error('Missing openBIS session token (please log in again)')
      }

      // For AFS, `owner` is a string identifier of an openBIS entity that provides
      // READ/WRITE permissions (space/project/experiment/sample/etc).
      // Prefer the selected sample permId (matches the working HAR), but allow overriding.
      const owner = afsOwnerText.trim() || samplePermId.trim() || experimentIdentifier.trim() || sampleIdentifier.trim()
      if (!owner) {
        setDummyStatus({ kind: 'error', message: 'Dummy upload requires an Experiment or Sample to use as the AFS owner.' })
        return
      }

      // Mirror the working openBIS webapp behavior seen in the HAR:
      // 1) write to a temporary `*.part` file (binary Chunk[] request body)
      // 2) move it into place (form-encoded body, returns plain text "true")
      const now = new Date()
      const fileName = `dummy-${now.toISOString().replace(/[:.]/g, '-')}.txt`
      const target = `/${fileName}`
      const part = `${target}.part`

      dummyTarget = target
      dummyPart = part

      const bytes = new TextEncoder().encode(`dummy\n${now.toISOString()}\n`)
      dummyBytesLength = bytes.length

      const writeUrl = new URL('/afs-server/api', window.location.origin)
      writeUrl.search = new URLSearchParams({ method: 'write', sessionToken }).toString()
      const writeBodyBytes = encodeAfsChunksAsBytes([
        {
          owner,
          source: part,
          offset: 0,
          // The EMPA AFS server validates limit == data length (as per HAR).
          limit: bytes.length,
          data: bytes,
        },
      ])
      const writeBody = writeBodyBytes.buffer.slice(
        writeBodyBytes.byteOffset,
        writeBodyBytes.byteOffset + writeBodyBytes.byteLength
      ) as ArrayBuffer

      const writeRes = await fetch(writeUrl.toString(), {
        method: 'POST',
        // Intentionally omit Content-Type to match the working HAR request.
        body: writeBody,
      })
      const writeOk = await parseAfsApiResponse(writeRes)
      if (writeOk !== true) {
        throw new Error('AFS write returned a non-true result')
      }

      const moveUrl = new URL('/afs-server/api', window.location.origin)
      const moveBody = new URLSearchParams({
        method: 'move',
        sourceOwner: owner,
        source: part,
        targetOwner: owner,
        target,
        sessionToken,
      }).toString()

      const moveRes = await fetch(moveUrl.toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
        body: moveBody,
      })
      const moveOk = await parseAfsApiResponse(moveRes)
      if (moveOk !== true) {
        throw new Error('AFS move returned a non-true result')
      }

      setDummyStatus({ kind: 'ok', afsPath: target })

      // Refresh the AFS list (if it's currently shown) so the new dummy file appears.
      queryClient
        .invalidateQueries({ queryKey: ['afs', 'list'] })
        .catch((e) => console.warn('AFS list refresh after dummy upload failed', e))
    } catch (e: any) {
      const info = toErrorInfo(e)
      const context = {
        experimentIdentifier: experimentIdentifier.trim() || null,
        sampleIdentifier: sampleIdentifier.trim() || null,
        samplePermId: samplePermId.trim() || null,
        afsOwnerText: afsOwnerText.trim() || null,
        ownerUsed: (afsOwnerText.trim() || samplePermId.trim() || experimentIdentifier.trim() || sampleIdentifier.trim()) || null,
        dummyTarget,
        dummyPart,
        dummyBytesLength,
      }
      const details = [info.details, '--- context ---', JSON.stringify(context, null, 2)].filter(Boolean).join('\n')
      console.error('AFS dummy upload failed', { error: e, context })
      setDummyStatus({ kind: 'error', message: info.summary || 'Dummy upload failed.', details })
    }
  }

  /**
   * Upload handler for the AFS workflow.
   *
   * Steps:
   * 1) Write file bytes into AFS in chunks (binary `write`, using a `*.part` temp path)
   * 2) Atomically `move` the temp file into place
   * 3) Register an AFS-backed dataset in AS, storing AFS location in metadata
   */
  const onUpload = async () => {
    setUploadStatus({ kind: 'working' })

    let stage = 'init'
    let ownerUsed: string | null = null
    let fileNameUsed: string | null = null
    let relativeNameUsed: string | null = null
    let fileSizeUsed: number | null = null
    let afsPathUsed: string | null = null
    let afsPartPathUsed: string | null = null

    try {
      const input = fileInputRef.current
      const files = input?.files
      if (!files || files.length === 0) {
        setUploadStatus({ kind: 'error', message: 'Please choose a file to upload.' })
        return
      }

      const expId = experimentIdentifier.trim()
      const sampId = sampleIdentifier.trim()
      if (!sampId) {
        setUploadStatus({ kind: 'error', message: 'AFS upload requires selecting a Sample (Object).' })
        return
      }

      const sessionToken = (apiFacade as any)?._private?.sessionToken
      if (!sessionToken) {
        throw new Error('Missing openBIS session token (please log in again)')
      }

      const trimmedTypeCode = dataSetTypeCode.trim()
      if (!trimmedTypeCode) {
        setUploadStatus({ kind: 'error', message: 'Please set a dataset type code.' })
        return
      }

      const file = files[0]
      const uploadId = generateUploadId('upload')
      const relativeName = file.webkitRelativePath || file.name
      fileNameUsed = file.name
      relativeNameUsed = relativeName
      fileSizeUsed = file.size

      stage = 'resolve owner/path'

      // In openBIS AFS, "owner" is typically the sample identifier.
      const owner = afsOwnerText.trim() || samplePermId.trim() || sampId
      ownerUsed = owner

      // Avoid relying on `create(...)` by writing via `write` (to `*.part`) and finalizing via `move`.
      // We write a single file at the AFS root (unique name with uploadId prefix) to avoid
      // assuming the server auto-creates directories.
      const safeRelativeName = String(relativeName).split('/').filter(Boolean).join('_')
      const afsPath = `/${uploadId}-${safeRelativeName}`
      const afsPartPath = `${afsPath}.part`
      afsPathUsed = afsPath
      afsPartPathUsed = afsPartPath

      /**
       * Writes one or more chunks into AFS using the binary Chunk[] encoding.
       *
       * We intentionally use the direct `/afs-server/api?method=write` call here.
       * This is the same contract the openBIS webapp uses (per HAR) and avoids
       * version-dependent facade write signatures.
       */
      const afsWrite = async (chunks: AfsChunk[]) => {
        const url = new URL('/afs-server/api', window.location.origin)
        url.search = new URLSearchParams({ method: 'write', sessionToken }).toString()

        const bodyBytes = encodeAfsChunksAsBytes(chunks)
        const body = bodyBytes.buffer.slice(bodyBytes.byteOffset, bodyBytes.byteOffset + bodyBytes.byteLength) as ArrayBuffer
        const res = await fetch(url.toString(), {
          method: 'POST',
          // Intentionally omit Content-Type to match the working HAR request.
          body,
        })
        const ok = await parseAfsApiResponse(res)
        if (ok !== true) {
          throw new Error('AFS write returned a non-true result')
        }
      }

      const afsMove = async (source: string, target: string) => {
        const moveUrl = new URL('/afs-server/api', window.location.origin)
        const moveBody = new URLSearchParams({
          method: 'move',
          sourceOwner: owner,
          source,
          targetOwner: owner,
          target,
          sessionToken,
        }).toString()

        const moveRes = await fetch(moveUrl.toString(), {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
          body: moveBody,
        })
        const moveOk = await parseAfsApiResponse(moveRes)
        if (moveOk !== true) {
          throw new Error('AFS move returned a non-true result')
        }
      }

      // Mirror the working openBIS webapp behavior in the HAR: one write request
      // containing one chunk with offset=0 and limit=data.length.
      stage = 'afs write'
      const buf = await file.arrayBuffer()
      const data = new Uint8Array(buf)
      await afsWrite([
        {
          owner,
          source: afsPartPath,
          offset: 0,
          limit: data.length,
          data,
        },
      ])

      // Finalize atomically.
      stage = 'afs move'
      await afsMove(afsPartPath, afsPath)

      // Register dataset in AS (AFS-backed) and store AFS location in metadata.
      stage = 'as register dataset'
      const dsCreation = new openbis.DataSetCreation()
      dsCreation.setAfsData(true)
      // The server rejects empty codes when auto-generated codes are disabled.
      // Use auto-generated dataset codes to avoid collisions and keep the UI simple.
      dsCreation.setAutoGeneratedCode(true)
      dsCreation.setTypeId(new openbis.EntityTypePermId(trimmedTypeCode, openbis.EntityKind.DATA_SET))
      if (expId) {
        dsCreation.setExperimentId(new openbis.ExperimentIdentifier(expId))
      }
      dsCreation.setSampleId(new openbis.SampleIdentifier(sampId))
      dsCreation.setMetaData({
        'afs.owner': owner,
        'afs.path': afsPath,
        'original.name': file.name,
        'original.size': String(file.size),
        'original.type': file.type || 'application/octet-stream',
      })

      const created = await apiFacade.createDataSets([dsCreation])
      const createdPermId = Array.isArray(created) ? created[0] : created
      const createdPermIdStr =
        typeof (createdPermId as any)?.getPermId === 'function'
          ? String((createdPermId as any).getPermId())
          : String(createdPermId)

      setUploadStatus({ kind: 'ok', dataSetPermId: createdPermIdStr })

      // Keep the UI in the success state even if background refetches fail.
      queryClient
        .invalidateQueries({ queryKey: ['as', 'searchDataSets'] })
        .catch((e) => console.warn('AS dataset list refresh after upload failed', e))
      queryClient
        .invalidateQueries({ queryKey: ['afs', 'list'] })
        .catch((e) => console.warn('AFS list refresh after upload failed', e))
    } catch (e: any) {
      const info = toErrorInfo(e)

      const isRegistrationFailureAfterAfsWrite = stage === 'as register dataset' && Boolean(afsPathUsed)

      const message =
        isRegistrationFailureAfterAfsWrite && afsPathUsed
          ? buildAfsRegistrationFailureMessage(info.summary || '', afsPathUsed, dataSetTypeCode.trim())
          : info.summary || 'Upload failed.'

      const context = {
        stage: typeof stage === 'string' ? stage : undefined,
        ownerUsed,
        fileName: fileNameUsed,
        relativeName: relativeNameUsed,
        fileSize: fileSizeUsed,
        afsPath: afsPathUsed,
        afsPartPath: afsPartPathUsed,
        experimentIdentifier: experimentIdentifier.trim() || null,
        sampleIdentifier: sampleIdentifier.trim() || null,
        samplePermId: samplePermId.trim() || null,
        afsOwnerText: afsOwnerText.trim() || null,
        dataSetTypeCode: dataSetTypeCode.trim(),
      }
      const details = [info.details, '--- context ---', JSON.stringify(context, null, 2)].filter(Boolean).join('\n')

      console.error('AFS dataset upload failed', { error: e, context })
      if (isRegistrationFailureAfterAfsWrite && afsPathUsed) {
        setUploadStatus({ kind: 'partial', message, details, afsPath: afsPathUsed })
      } else {
        setUploadStatus({ kind: 'error', message, details })
      }
    }
  }

  const formatEpochMs = (ts?: number) => {
    if (!ts) return ''
    try {
      const d = new Date(ts)
      if (Number.isNaN(d.getTime())) return ''
      return d.toISOString().replace('T', ' ').slice(0, 19)
    } catch {
      return ''
    }
  }

  // Clear the table while (re)fetching to avoid showing stale/cached rows.
  const afsListEntries = afsListQuery.isFetching ? [] : (afsListQuery.data ?? [])
  const canListAfs = Boolean(resolvedAfsOwner)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <h3>AFS file list</h3>
        <div className="text-small text-default-600">API used: getAfsServerFacade().list(owner, source, recursively)</div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="AFS owner"
            placeholder="e.g. 20260220115322412-4481"
            value={afsOwnerText}
            onValueChange={setAfsOwnerText}
            description={samplePermId.trim() ? `Selected sample permId: ${samplePermId.trim()}` : 'Leave empty to use the selected Sample permId (if available)'}
          />
          <Input
            label="AFS source"
            placeholder=""
            value={afsSourceText}
            onValueChange={setAfsSourceText}
            description="Empty = root directory"
          />
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="bordered"
            isDisabled={!canListAfs}
            isLoading={afsListQuery.isFetching}
            onPress={() => {
              const owner = resolvedAfsOwner.trim()
              if (!owner) return

              const next = { owner, source: afsSourceText, recursively: false }
              const sameAsCurrent =
                afsListParams != null &&
                afsListParams.owner === next.owner &&
                afsListParams.source === next.source &&
                afsListParams.recursively === next.recursively

              setAfsDownloadStatus({ kind: 'idle' })
              setAfsListParams(next)

              // If the user clicks "List" again with the same params, React Query
              // won't re-run the query by itself (queryKey is unchanged). Force a refetch.
              if (sameAsCurrent) {
                void afsListQuery.refetch()
              }
            }}
          >
            List
          </Button>
          <div className="text-small text-default-600">Owner used: {resolvedAfsOwner || '—'}</div>
          {afsListQuery.isSuccess && <div className="text-small text-default-600">{afsListEntries.length} entries</div>}
        </div>

        {afsListQuery.isError && (
          <div className="flex flex-col gap-2">
            <div className="text-small text-danger">{toErrorInfo(afsListQuery.error).summary}</div>
            <pre className="text-xs text-default-600 whitespace-pre-wrap break-words">{String(toErrorInfo(afsListQuery.error).details ?? '')}</pre>
          </div>
        )}

        <Table
          aria-label="AFS files"
          isHeaderSticky
          classNames={{ wrapper: 'max-h-[420px]' }}
          style={{ border: '1px solid #E0E0E0', borderRadius: '8px' }}
        >
          <TableHeader>
            <TableColumn key="actions" align="end">Download</TableColumn>
            <TableColumn key="path">Path</TableColumn>
            <TableColumn key="name">Name</TableColumn>
            <TableColumn key="dir">Directory</TableColumn>
            <TableColumn key="size" align="end">Size</TableColumn>
            <TableColumn key="lm">Modified</TableColumn>
          </TableHeader>
          <TableBody
            emptyContent={
              afsListQuery.isFetching
                ? 'Loading…'
                : afsListQuery.isError
                  ? 'Failed to list.'
                  : afsListQuery.isSuccess
                    ? 'No entries found.'
                    : 'Click “List” to load.'
            }
          >
            {afsListEntries.map((f) => (
              <TableRow key={f.path}>
                <TableCell style={{ textAlign: 'right' }}>
                  <Button
                    isIconOnly
                    size="sm"
                    variant="light"
                    aria-label={f.directory ? `download disabled for directory ${f.path}` : `download ${f.path}`}
                    isDisabled={f.directory}
                    isLoading={afsDownloadStatus.kind === 'working' && afsDownloadStatus.path === f.path}
                    onPress={() => onDownloadAfsEntry(f)}
                  >
                    <DownloadIcon className="text-default-500" />
                  </Button>
                </TableCell>
                <TableCell>{f.path}</TableCell>
                <TableCell>{f.name}</TableCell>
                <TableCell>{f.directory ? 'true' : 'false'}</TableCell>
                <TableCell style={{ textAlign: 'right' }}>{typeof f.size === 'number' ? String(f.size) : ''}</TableCell>
                <TableCell>{formatEpochMs(f.lastModified)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {afsDownloadStatus.kind === 'ok' && (
          <div className="text-small text-success">Downloaded file: {afsDownloadStatus.fileName}</div>
        )}
        {afsDownloadStatus.kind === 'error' && (
          <div className="flex flex-col gap-2">
            <div className="text-small text-danger">{afsDownloadStatus.message}</div>
            <pre className="text-xs text-default-600 whitespace-pre-wrap break-words">{String(afsDownloadStatus.details ?? '')}</pre>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <h3>Upload file as dataset (AFS)</h3>

        <div className="text-small text-default-600">API used: AFS write+move (direct via /afs-server/api) + AS registration</div>
        <pre className="text-xs text-default-600 whitespace-pre-wrap break-words">
          {[
            'Same-origin API calls:',
            '  POST /afs-server/api?method=write (binary Chunk[] request body)',
            '  POST /afs-server/api (method=move ...; text/plain;charset=UTF-8)',
            'AS registration:',
            '  createDataSets(DataSetCreation.setAfsData(true))',
          ].join('\n')}
        </pre>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Experiment"
            placeholder="/SPACE/PROJECT/EXPERIMENT"
            value={experimentIdentifier}
            onValueChange={setExperimentIdentifier}
            description="Optional (Sample is required)"
          />
          <Autocomplete
            label="Sample (Object)"
            placeholder={allObjectsQuery.isLoading ? 'Loading objects…' : 'Select an object'}
            items={sampleItems}
            selectedKey={sampleIdentifier || null}
            onSelectionChange={(key) => {
              const nextIdentifier = key == null ? '' : String(key)
              setSampleIdentifier(nextIdentifier)

              if (!nextIdentifier) {
                setSamplePermId('')
                return
              }
              const selected = sampleItems.find((it: any) => it.identifier === nextIdentifier)
              if (selected?.experiment) {
                setExperimentIdentifier(String(selected.experiment))
              }

              const nextPermId = selected?.permId ? String(selected.permId) : ''
              setSamplePermId(nextPermId)
              if (!afsOwnerText.trim() && nextPermId) {
                setAfsOwnerText(nextPermId)
              }
            }}
            isDisabled={allObjectsQuery.isLoading || allObjectsQuery.isError}
            allowsCustomValue={false}
            description={allObjectsQuery.isError ? 'Failed to load objects' : 'Selecting an object will auto-fill its experiment'}
          >
            {(item: any) => (
              <AutocompleteItem key={item.key} textValue={item.label}>
                <div className="flex flex-col">
                  <div className="text-small">{item.label}</div>
                  <div className="text-tiny text-default-500">{[item.type, item.experiment].filter(Boolean).join(' • ')}</div>
                </div>
              </AutocompleteItem>
            )}
          </Autocomplete>
          <Autocomplete
            label="Dataset type"
            placeholder={dataSetTypesQuery.isLoading ? 'Loading dataset types…' : 'Select a dataset type'}
            items={dataSetTypeItems}
            selectedKey={selectedDataSetTypeKey}
            inputValue={dataSetTypeCode}
            onInputChange={(value) => setDataSetTypeCode(value)}
            onSelectionChange={(value) => setDataSetTypeCode(value?.toString() ?? '')}
            allowsCustomValue={true}
            isDisabled={dataSetTypesQuery.isLoading}
            description={
              dataSetTypesQuery.isError
                ? `Failed to load dataset types: ${toErrorInfo(dataSetTypesQuery.error).summary}`
                : 'Type code used for the uploaded dataset'
            }
          >
            {(type: any) => <AutocompleteItem key={type.key}>{type.code}</AutocompleteItem>}
          </Autocomplete>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="bordered" isLoading={dummyStatus.kind === 'working'} onPress={onDummyUpload}>
            Dummy upload
          </Button>
          {dummyStatus.kind === 'ok' && <div className="text-small text-success">Wrote AFS file: {dummyStatus.afsPath}</div>}
          {dummyStatus.kind === 'error' && (
            <div className="flex flex-col gap-2">
              <div className="text-small text-danger">{dummyStatus.message}</div>
              <pre className="text-xs text-default-600 whitespace-pre-wrap break-words">{String(dummyStatus.details ?? '')}</pre>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <div className="text-small text-default-600">File</div>
          <input ref={fileInputRef} type="file" />
        </div>

        <div className="flex items-center gap-3">
          <Button color="primary" isLoading={uploadStatus.kind === 'working'} onPress={onUpload}>
            Upload
          </Button>
          {uploadStatus.kind === 'ok' && <div className="text-small text-success">Created dataset: {uploadStatus.dataSetPermId}</div>}
          {uploadStatus.kind === 'partial' && (
            <div className="flex flex-col gap-2">
              <div className="text-small text-warning">{uploadStatus.message}</div>
              <div className="text-xs text-default-600">AFS path kept: {uploadStatus.afsPath}</div>
              <pre className="text-xs text-default-600 whitespace-pre-wrap break-words">{String(uploadStatus.details ?? '')}</pre>
            </div>
          )}
          {uploadStatus.kind === 'error' && (
            <div className="flex flex-col gap-2">
              <div className="text-small text-danger">{uploadStatus.message}</div>
              <pre className="text-xs text-default-600 whitespace-pre-wrap break-words">{String(uploadStatus.details ?? '')}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
