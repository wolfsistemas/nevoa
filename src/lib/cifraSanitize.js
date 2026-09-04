const ENTITIES = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' '
}

export function unescapeHtml(s) {
  return String(s || '')
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#([0-9]+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&(amp|lt|gt|quot|apos|nbsp);/gi, (_, name) => ENTITIES[name.toLowerCase()] || '')
}

export function stripHtml(s) {
  return unescapeHtml(
    String(s || '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|h\d|li|tr|pre)>/gi, '\n')
      .replace(/<[^>]+>/g, '')
  )
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
}

export function looksLikeTab(text) {
  const t = stripHtml(text).trim()
  if (!t) return false
  if (/^\[?\s*tab\b/i.test(t)) return true
  if (/cifra-?tab|class=["']tabs?["']/i.test(String(text || ''))) return true
  if (/^[eEBGDA]\s*[|:].*[-0-9]/.test(t)) return true
  if (/^[a-gA-G]\s*\|[-0-9hpbrx/\\~+| ]+$/.test(t)) return true
  const bars = (t.match(/\|/g) || []).length
  const leftover = t.replace(/[-0-9|hpbrx/\\~:\s()+]/gi, '')
  if (bars >= 2 && /-{3,}/.test(t) && leftover.length <= 2) return true
  return false
}

function cleanText(s) {
  return stripHtml(s).replace(/[ \t]+/g, ' ').replace(/\s+$/g, '')
}

export function sanitizeCifraLines(lines) {
  if (!Array.isArray(lines)) return []
  const out = []
  for (const line of lines) {
    if (!line || typeof line !== 'object') continue
    if (line.kind === 'blank') {
      out.push({ kind: 'blank' })
      continue
    }
    if (line.kind === 'verse') {
      const text = cleanText(line.text || (line.words || []).join(' '))
      if (looksLikeTab(text) || looksLikeTab(line.text)) {
        out.push({ kind: 'tab', text })
        continue
      }
      const words = (line.words || []).map((w) => stripHtml(w).trim()).filter(Boolean)
      out.push({ ...line, text, words })
      continue
    }
    if (line.kind === 'chords') {
      const text = cleanText(line.text || '')
      if (looksLikeTab(text) || looksLikeTab(line.text)) {
        out.push({ kind: 'tab', text })
        continue
      }
      out.push({ ...line, text })
      continue
    }
    const text = cleanText(line.text || '')
    if (!text) {
      if (line.kind === 'label' || line.kind === 'tuning') continue
      out.push({ kind: 'blank' })
      continue
    }
    if (line.kind === 'tab' || looksLikeTab(text) || looksLikeTab(line.text)) {
      out.push({ kind: 'tab', text })
      continue
    }
    out.push({ ...line, text })
  }
  while (out.length && out[0].kind === 'blank') out.shift()
  while (out.length && out[out.length - 1].kind === 'blank') out.pop()
  return out
}

export function hasTabs(lines) {
  return (lines || []).some((l) => l?.kind === 'tab')
}
