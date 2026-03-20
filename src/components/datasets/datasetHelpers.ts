/* eslint-disable @typescript-eslint/no-explicit-any */

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
