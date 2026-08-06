/**
 * Getting a Sleeper draft id out of whatever the user pasted.
 *
 * People paste the whole URL from their address bar, the app's share link, or
 * just the id. Sleeper draft ids are numeric strings (snowflake-style, ~18
 * digits), which makes them easy to recognise inside a URL without needing to
 * know every path shape Sleeper has used.
 */

/** Sleeper ids are long digit strings. Short numbers are not draft ids. */
const ID_RE = /\b(\d{6,25})\b/

export function parseDraftId(input: string): string | null {
  if (!input || typeof input !== 'string') return null
  const trimmed = input.trim()
  if (!trimmed) return null

  // A bare id.
  if (/^\d{6,25}$/.test(trimmed)) return trimmed

  // Anything containing one — URL, share text, with or without query/hash.
  const withoutQuery = trimmed.split(/[?#]/)[0]
  const m = ID_RE.exec(withoutQuery) ?? ID_RE.exec(trimmed)
  return m ? m[1] : null
}

/** True when the string looks like it was meant to identify a draft at all. */
export function looksLikeDraftInput(input: string): boolean {
  return parseDraftId(input) !== null
}
