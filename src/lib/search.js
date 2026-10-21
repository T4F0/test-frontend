// Accent- and case-insensitive matching for the command palette and list filters.

export function normalizeText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
}

/** Score 0 = no match; higher is better (prefix of the text > prefix of a word > substring). */
export function matchScore(text, query) {
  const t = normalizeText(text)
  const q = normalizeText(query)
  if (!q) return 1
  if (!t) return 0
  const tokens = q.split(/\s+/).filter(Boolean)
  if (!tokens.every((tok) => t.includes(tok))) return 0
  if (t.startsWith(q)) return 4
  if (t.split(/[\s\-_/]+/).some((w) => w.startsWith(tokens[0]))) return 3
  return 2
}

/** Keeps items matching `query`, best matches first; with an empty query returns everything unchanged. */
export function filterAndRank(items, query, getText) {
  if (!normalizeText(query)) return items
  return items
    .map((item, index) => ({ item, index, score: matchScore(getText(item), query) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((x) => x.item)
}
