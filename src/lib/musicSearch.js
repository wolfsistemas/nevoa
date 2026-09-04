function cleanTrack(name) {
  return String(name || '')
    .replace(/\s*\((?:live|ao vivo|acoustic|ac[uú]stico|remix|radio edit|oficial)[^)]*\)/gi, '')
    .replace(/\s*\[(?:live|ao vivo)[^\]]*\]/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

function hitKey(h) {
  return `${String(h.artist || '').toLowerCase()}|${String(h.title || '').toLowerCase()}`
}

export async function searchItunes(q, limit = 10) {
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&media=music&entity=song&limit=${limit}&country=BR`
  const res = await fetch(url)
  if (!res.ok) return []
  const data = await res.json().catch(() => ({}))
  const rows = data.results || []
  const out = []
  const seen = new Set()
  for (const r of rows) {
    const artist = String(r.artistName || '').split(',')[0].trim()
    const title = cleanTrack(r.trackName)
    if (!artist || !title) continue
    const key = `${artist.toLowerCase()}|${title.toLowerCase()}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push({
      artist,
      title,
      image_url: r.artworkUrl100 ? String(r.artworkUrl100).replace('100x100', '200x200') : null
    })
  }
  return out
}

export function mergeHits(local, remote) {
  const out = []
  const seen = new Set()
  for (const h of [...(local || []), ...(remote || [])]) {
    const key = hitKey(h)
    if (seen.has(key)) continue
    seen.add(key)
    out.push(h)
    if (out.length >= 10) break
  }
  return out
}
