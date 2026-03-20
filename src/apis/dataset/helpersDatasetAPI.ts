/* eslint-disable @typescript-eslint/no-explicit-any */

import { AfsChunk, AfsListEntry } from './commonDataset'

const AFS_LIST_SPLIT_PATTERN = new RegExp('[;\\r\\n\\0]+', 'g')

export type ErrorInfo = {
  summary: string
  details?: string
}

export function splitCsvLike(value: string): string[] {
  return value
    .split(/[\n,\s]+/g)
    .map((part) => part.trim())
    .filter(Boolean)
}

export function toErrorInfo(error: unknown): ErrorInfo {
  if (error == null) return { summary: 'Unknown error' }

  const anyError = error as any
  const message =
    typeof anyError?.message === 'string'
      ? anyError.message
      : typeof anyError?.getMessage === 'function'
        ? String(anyError.getMessage())
        : String(error)

  const summary = message && message !== '[object Object]' ? message : String(anyError?.name ?? 'Error')

  const safePick = (value: any) => {
    if (!value || typeof value !== 'object') return value

    const picked: Record<string, unknown> = {}
    for (const key of ['name', 'message', 'stack', 'cause', 'code', 'status', 'statusText']) {
      if (key in value) picked[key] = value[key]
    }
    if ('response' in value) picked.response = value.response
    if ('data' in value) picked.data = value.data
    return picked
  }

  try {
    return { summary, details: JSON.stringify(safePick(anyError), null, 2) }
  } catch {
    return anyError?.stack ? { summary, details: String(anyError.stack) } : { summary }
  }
}

export function generateUploadId(prefix: string = 'upload'): string {
  const now = new Date()
  const pad = (value: number, width: number) => String(value).padStart(width, '0')

  return [
    prefix,
    now.getFullYear(),
    pad(now.getMonth() + 1, 2),
    pad(now.getDate(), 2),
    pad(now.getHours(), 2),
    pad(now.getMinutes(), 2),
    pad(now.getSeconds(), 2),
    pad(Math.round(Math.random() * 100000), 5),
  ].join('-')
}

export function safeGet<T>(reader: () => T): T | undefined {
  try {
    return reader()
  } catch {
    return undefined
  }
}

export function downloadBlobFile(fileName: string, blob: Blob) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

/**
 * The AFS list endpoint returns a flat text payload rather than JSON.
 * Different openBIS builds separate records with newlines, NUL bytes, or semicolons.
 */
export function parseAfsListOctetStream(text: string): AfsListEntry[] {
  const rows = String(text ?? '')
    .split(AFS_LIST_SPLIT_PATTERN)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split(','))
    .filter((parts) => parts.length >= 6)
    .filter(
      (parts) =>
        !(parts[0]?.toLowerCase?.() === 'owner' && parts[1]?.toLowerCase?.() === 'path' && parts[2]?.toLowerCase?.() === 'name')
    )
    .map((parts) => {
      const path = String(parts[1] ?? '')
      const name = String(parts[2] ?? '') || path.split('/').filter(Boolean).pop() || path
      const size = Number(String(parts[4] ?? '').trim())
      const lastModified = Number(String(parts[5] ?? '').trim())

      return {
        path,
        name,
        directory: String(parts[3] ?? '').toLowerCase() === 'true',
        size: Number.isFinite(size) ? size : undefined,
        lastModified: Number.isFinite(lastModified) ? lastModified : undefined,
      }
    })
    .filter((entry) => entry.path)

  rows.sort((left, right) => {
    if (left.directory !== right.directory) return left.directory ? -1 : 1
    return left.path.localeCompare(right.path)
  })

  return rows
}

/**
 * AFS `read` and `write` exchange a binary `Chunk[]` envelope.
 * Keeping the encoder/decoder here isolates the one protocol detail that cannot be simplified away.
 */
function encodeAfsChunk(chunk: AfsChunk): Uint8Array {
  const encoder = new TextEncoder()
  const ownerBytes = chunk.owner ? encoder.encode(chunk.owner) : null
  const sourceBytes = chunk.source ? encoder.encode(chunk.source) : null
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

  const packet = new ArrayBuffer(size)
  const view = new DataView(packet)
  const bytes = new Uint8Array(packet)
  let position = 0

  view.setInt32(position, ownerBytes ? ownerBytes.length : -1, false)
  position += 4
  if (ownerBytes) {
    bytes.set(ownerBytes, position)
    position += ownerBytes.length
  }

  view.setInt32(position, sourceBytes ? sourceBytes.length : -1, false)
  position += 4
  if (sourceBytes) {
    bytes.set(sourceBytes, position)
    position += sourceBytes.length
  }

  view.setBigInt64(position, BigInt(chunk.offset ?? -1), false)
  position += 8

  view.setInt32(position, chunk.limit ?? (dataBytes ? dataBytes.length : -1), false)
  position += 4

  view.setInt32(position, dataBytes ? dataBytes.length : -1, false)
  position += 4
  if (dataBytes) {
    bytes.set(dataBytes, position)
  }

  return bytes
}

export function encodeAfsChunksAsBytes(chunks: AfsChunk[]): Uint8Array {
  const encoded = chunks.map(encodeAfsChunk)
  const packet = new Uint8Array(4 + encoded.reduce((size, chunk) => size + chunk.length, 0))
  const view = new DataView(packet.buffer, packet.byteOffset, packet.byteLength)

  view.setInt32(0, chunks.length, false)
  let position = 4
  for (const chunk of encoded) {
    packet.set(chunk, position)
    position += chunk.length
  }

  return packet
}

export function decodeAfsChunksFromBytes(encodedChunks: Uint8Array): AfsChunk[] {
  const view = new DataView(encodedChunks.buffer, encodedChunks.byteOffset, encodedChunks.byteLength)
  const decoder = new TextDecoder()
  const chunks: AfsChunk[] = []

  let position = 4
  while (position < encodedChunks.length) {
    const ownerLength = view.getInt32(position, false)
    position += 4
    const owner = ownerLength >= 0 ? decoder.decode(encodedChunks.slice(position, position + ownerLength)) : ''
    position += ownerLength >= 0 ? ownerLength : 0

    const sourceLength = view.getInt32(position, false)
    position += 4
    const source = sourceLength >= 0 ? decoder.decode(encodedChunks.slice(position, position + sourceLength)) : ''
    position += sourceLength >= 0 ? sourceLength : 0

    const offsetRaw = view.getBigInt64(position, false)
    position += 8

    const limitRaw = view.getInt32(position, false)
    position += 4

    const dataLength = view.getInt32(position, false)
    position += 4
    const data = dataLength >= 0 ? encodedChunks.slice(position, position + dataLength) : undefined
    position += dataLength >= 0 ? dataLength : 0

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

export async function parseAfsApiResponse(res: Response): Promise<any> {
  const text = await res.text()
  const trimmed = text.trim()

  let parsed: any
  try {
    parsed = trimmed ? JSON.parse(trimmed) : null
  } catch {
    if (trimmed === 'true') return true
    if (trimmed === 'false') return false
    throw new Error(`AFS returned non-JSON response (HTTP ${res.status}): ${trimmed.slice(0, 500)}`)
  }

  if (!res.ok) {
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

  if (parsed === true || parsed === false) return parsed
  if (typeof parsed === 'string') {
    const normalized = parsed.trim().toLowerCase()
    if (normalized === 'true') return true
    if (normalized === 'false') return false
    return parsed
  }

  const result = parsed?.result
  if (typeof result === 'string') {
    const normalized = result.trim().toLowerCase()
    if (normalized === 'true') return true
    if (normalized === 'false') return false
  }

  return result
}