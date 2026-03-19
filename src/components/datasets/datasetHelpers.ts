export type ErrorInfo = {
  summary: string
  details?: string
}

/**
 * Splits user input that may contain comma, whitespace, and/or newlines
 * into a clean list of tokens.
 *
 * Used by dataset filtering UIs where the user can paste codes/identifiers.
 */
export function splitCsvLike(value: string): string[] {
  return value
    .split(/[\n,\s]+/g)
    .map((v) => v.trim())
    .filter(Boolean)
}

/**
 * Converts an unknown thrown value into a UI-friendly error summary + details.
 *
 * The openBIS JS client sometimes throws non-Error objects; this function
 * tries to extract a readable message, plus a JSON dump of common fields.
 */
export function toErrorInfo(error: unknown): ErrorInfo {
  if (error == null) return { summary: 'Unknown error' }

  const anyErr = error as any
  const name = typeof anyErr?.name === 'string' ? anyErr.name : 'Error'
  const message =
    typeof anyErr?.message === 'string'
      ? anyErr.message
      : typeof anyErr?.getMessage === 'function'
        ? String(anyErr.getMessage())
        : String(error)

  const summary = message && message !== '[object Object]' ? message : `${name}`

  const safePick = (obj: any) => {
    if (!obj || typeof obj !== 'object') return obj
    const picked: Record<string, unknown> = {}
    for (const key of ['name', 'message', 'stack', 'cause', 'code', 'status', 'statusText']) {
      if (key in obj) picked[key] = obj[key]
    }
    if ('response' in obj) picked.response = obj.response
    if ('data' in obj) picked.data = obj.data
    return picked
  }

  let details: string | undefined
  try {
    details = JSON.stringify(safePick(anyErr), null, 2)
  } catch {
    details = anyErr?.stack ? String(anyErr.stack) : undefined
  }

  return details ? { summary, details } : { summary }
}

/**
 * Generates a reasonably unique upload folder id.
 *
 * We intentionally avoid crypto APIs here to keep it simple, deterministic
 * enough for debugging, and browser-compatible.
 */
export function generateUploadId(prefix: string = 'upload'): string {
  const d = new Date()
  const pad = (n: number, w: number) => String(n).padStart(w, '0')
  const ts =
    d.getFullYear() +
    pad(d.getMonth() + 1, 2) +
    pad(d.getDate(), 2) +
    pad(d.getHours(), 2) +
    pad(d.getMinutes(), 2) +
    pad(d.getSeconds(), 2)
  const rand = pad(Math.round(Math.random() * 100000), 5)
  return `${prefix}-${ts}-${rand}`
}

/**
 * Autocomplete item used for selecting a Sample (Object).
 *
 * Both the DSS and AFS upload pages use the exact same item shape.
 */
export type SampleAutocompleteItem = {
  key: string
  identifier: string
  permId?: string
  code: string
  name: string
  type: string
  experiment: string
  label: string
}

/**
 * Builds the list of items used by the "Sample (Object)" autocomplete.
 *
 * The objects returned by openBIS are not plain JSON; they are facade objects
 * with getters. This helper carefully reads the needed fields while tolerating
 * missing getters.
 */
export function buildSampleAutocompleteItems(objects: any[]): SampleAutocompleteItem[] {
  const safe = <T,>(fn: () => T): T | undefined => {
    try {
      return fn()
    } catch {
      return undefined
    }
  }

  return (objects ?? [])
    .map((obj: any) => {
      const identifierObj = safe(() => obj.getIdentifier?.())
      const identifier = identifierObj != null ? String(identifierObj) : ''
      if (!identifier) return null

      const permIdObj = safe(() => obj.getPermId?.())
      const permIdRaw =
        permIdObj && typeof (permIdObj as any).getPermId === 'function' ? String((permIdObj as any).getPermId()) : permIdObj
      const permId = permIdRaw != null && String(permIdRaw).trim() ? String(permIdRaw) : undefined

      const codeObj = safe(() => obj.getCode?.())
      const code = codeObj != null ? String(codeObj) : ''

      const nameRaw = safe(() => obj.getProperty?.('NAME'))
      const name = nameRaw != null && String(nameRaw).trim() ? String(nameRaw) : code

      const typeObj = safe(() => obj.getType?.())
      const type = typeObj && typeof typeObj.getCode === 'function' ? String(typeObj.getCode()) : ''

      const expObj = safe(() => obj.getExperiment?.())
      const experiment =
        expObj && typeof (expObj as any).getIdentifier === 'function' ? String((expObj as any).getIdentifier()) : ''

      const label = name && code && name !== code ? `${name} (${code})` : name || code || identifier

      return {
        key: identifier,
        identifier,
        permId,
        code,
        name,
        type,
        experiment,
        label,
      } satisfies SampleAutocompleteItem
    })
    .filter((item): item is SampleAutocompleteItem => item != null)
    .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }))
}
