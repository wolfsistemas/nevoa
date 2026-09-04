export function slugify(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' e ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function asSlug(text) {
  const raw = String(text || '').trim()
  if (/^[a-z0-9]+(?:-[a-z0-9]+)*-?$/.test(raw)) return raw
  return slugify(raw)
}

export function slugVariants(text) {
  const raw = String(text || '').trim()
  const base = slugify(raw)
  const list = [raw, base]
  if (base) list.push(`${base}-`)
  return [...new Set(list.filter(Boolean))]
}

export function songPath(song, version) {
  if (!song?.id) return '/'
  const v = version === 'simplificada' ? '/simplificada' : ''
  return `/song/${song.id}${v}`
}

export function titleCase(text) {
  return String(text || '')
    .split(' ')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}
