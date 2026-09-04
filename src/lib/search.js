const STOP = new Set([
  'a', 'o', 'as', 'os', 'um', 'uma', 'uns', 'umas', 'de', 'do', 'da', 'dos', 'das', 'no', 'na',
  'nos', 'nas', 'em', 'e', 'ou', 'para', 'pra', 'pro', 'pras', 'pelo', 'pela', 'pelos', 'pelas',
  'the', 'an', 'of', 'to', 'for', 'and', 'in', 'on', 'at', 'my', 'me', 'your', 'you',
  'minha', 'meu', 'sua', 'seu', 'essa', 'esse', 'com', 'sem', 'que', 'tem', 'voce', 'quero',
  'cifra', 'letra', 'tocar', 'musica'
])

function clean(text) {
  return String(text || '').trim()
}

function titleCase(text) {
  return String(text || '')
    .split(' ')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

function looksLikeName(w) {
  return (
    w.length >= 2 &&
    !STOP.has(w.toLowerCase()) &&
    /^[a-zA-ZÀ-ÿ\u00C0-\u017F][\wÀ-ÿ\u00C0-\u017F'.\- ]*$/.test(w)
  )
}

function wordsOf(q) {
  return q.split(/\s+/).filter(Boolean)
}

function pair(artist, title, type) {
  const a = clean(titleCase(artist))
  const t = clean(titleCase(title))
  if (!a || !t) return null
  return { artist: a, title: t, type }
}

function explicitSplit(q) {
  const idxDash = q.indexOf(' - ')
  const idxEn = q.indexOf('\u2013')
  const idxEm = q.indexOf('\u2014')
  const candidates = []
  for (const idx of [idxDash, idxEn, idxEm]) {
    if (idx === -1) continue
    const left = q.slice(0, idx).trim()
    const right = q.slice(idx + 1).replace(/^[\s\u2013\u2014-]+/, '').trim()
    if (left && right) candidates.push({ left, right })
  }
  const mBy = q.match(/\s+by\s+/i)
  if (mBy && mBy.index > 0) {
    const left = q.slice(0, mBy.index).trim()
    const right = q.slice(mBy.index + mBy[0].length).trim()
    if (left && right) candidates.push({ left: right, right: left, reversed: true })
  }
  const mSlash = q.match(/^(.+?)\s*\/\s*(.+)$/)
  if (mSlash) candidates.push({ left: mSlash[1].trim(), right: mSlash[2].trim() })
  return candidates
}

// Interpreta uma busca digitada em texto livre e devolve pares
// artista/música ordenados por relevância.
//
//  auto:true  -> há um único resultado provável, pode navegar direto
//  auto:false -> mostre os candidates para a pessoa escolher
export function parseSearchQuery(raw) {
  const q = clean(raw)
  if (!q) return { auto: false, candidates: [] }

  // 1) link/path: "cifraclub.com.br/coldplay/the-scientist"
  const url =
    q.match(/cifraclub\.com\.br\/([a-z0-9-]+)\/([a-z0-9-]+)/i) ||
    q.match(/^([a-z0-9-]+)\/([a-z0-9-]+)\/?$/)
  if (url) {
    return {
      auto: true,
      candidates: [{ artist: url[1], title: url[2], slug: true, type: 'url' }]
    }
  }

  // 2) separadores explícitos
  const splits = explicitSplit(q)
  if (splits.length) {
    const seen = new Set()
    const list = []
    for (const s of splits) {
      const c = pair(s.left, s.right, 'split')
      if (!c) continue
      const k = `${c.artist}|${c.title}`
      if (!seen.has(k)) {
        seen.add(k)
        list.push(c)
      }
    }
    if (list.length) return { auto: list.length === 1, candidates: list }
  }

  const words = wordsOf(q)
  if (words.length < 2) {
    return { auto: false, candidates: [{ artist: '', title: q, type: 'song-only' }] }
  }

  const first = words[0]
  const startsWithArticle = STOP.has(first.toLowerCase())

  // 3) palpite artista no começo ("coldplay the scientist", "cazuza exagerado")
  const candidates = []
  if (!startsWithArticle && looksLikeName(first) && first.length > 2) {
    const c1 = pair(first, words.slice(1).join(' '), 'guess')
    if (c1) candidates.push(c1)
    // 4) artista de duas palavras ("legiao urbana tempo perdido") — só quando a
    //    2ª palavra não é artigo/preposição (evita "coldplay the ..." errado)
    if (words.length >= 3 && !STOP.has(words[1].toLowerCase())) {
      const c2 = pair(words.slice(0, 2).join(' '), words.slice(2).join(' '), 'guess2')
      if (c2) candidates.push(c2)
    }
  }

  // 5) título com artigo no começo + artista no final ("the scientist coldplay")
  if (startsWithArticle && words.length >= 3 && words.length <= 4) {
    const last = words[words.length - 1]
    if (looksLikeName(last)) {
      const cLast = pair(last, words.slice(0, words.length - 1).join(' '), 'guess-last')
      if (cLast) candidates.push(cLast)
    }
  }

  if (!candidates.length) {
    return { auto: false, candidates: [{ artist: '', title: q, type: 'song-only' }] }
  }
  const top = candidates.slice(0, 2)
  // mais de uma interpretação: nunca navegar sozinho, deixa a pessoa escolher
  return { auto: top.length === 1, candidates: top }
}
