const keyFor = (listId) => `nevoa_list_tone_${listId}`

export function loadListToneMap(listId) {
  if (!listId) return {}
  try {
    const raw = JSON.parse(localStorage.getItem(keyFor(listId)) || '{}')
    return raw && typeof raw === 'object' ? raw : {}
  } catch {
    return {}
  }
}

export function loadListTone(listId, songId) {
  if (!listId || !songId) return null
  const row = loadListToneMap(listId)[songId]
  if (!row) return null
  return {
    shift: Number(row.shift) || 0,
    capo: Number(row.capo) || 0
  }
}

export function saveListTone(listId, songId, tone) {
  if (!listId || !songId) return
  const map = loadListToneMap(listId)
  map[songId] = {
    shift: Number(tone?.shift) || 0,
    capo: Number(tone?.capo) || 0
  }
  try {
    localStorage.setItem(keyFor(listId), JSON.stringify(map))
  } catch {}
}
