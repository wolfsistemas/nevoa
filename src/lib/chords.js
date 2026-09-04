import { parseChord } from './transpose'

const SCALE_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const SCALE_FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']

const INTERVALS = {
  maj: [0, 4, 7],
  m: [0, 3, 7],
  '5': [0, 7],
  '6': [0, 4, 7, 9],
  m6: [0, 3, 7, 9],
  sus2: [0, 2, 7],
  sus4: [0, 5, 7],
  '7': [0, 4, 7, 10],
  m7: [0, 3, 7, 10],
  maj7: [0, 4, 7, 11],
  '7sus4': [0, 5, 7, 10],
  dim: [0, 3, 6],
  dim7: [0, 3, 6, 9],
  m7b5: [0, 3, 6, 10],
  aug: [0, 4, 8],
  '9': [0, 4, 7, 10, 14],
  m9: [0, 3, 7, 10, 14],
  maj9: [0, 4, 7, 11, 14],
  add9: [0, 4, 7, 14],
  '11': [0, 4, 7, 10, 14, 17],
  '13': [0, 4, 7, 10, 14, 17, 21]
}

const SHAPES = {
  maj: {
    E: [0, 2, 2, 1, 0, 0],
    A: [-1, 0, 2, 2, 2, 0],
    C: [-1, 3, 2, 0, 1, 0],
    D: [-1, -1, 0, 2, 3, 2]
  },
  m: {
    E: [0, 2, 2, 0, 0, 0],
    A: [-1, 0, 2, 2, 1, 0],
    D: [-1, -1, 0, 2, 3, 1]
  },
  '7': {
    E: [0, 2, 0, 1, 0, 0],
    A: [-1, 0, 2, 0, 2, 0],
    C: [-1, 3, 2, 3, 1, 0],
    D: [-1, -1, 0, 2, 1, 2]
  },
  m7: {
    E: [0, 2, 0, 0, 0, 0],
    A: [-1, 0, 2, 0, 1, 0],
    D: [-1, -1, 0, 2, 1, 1]
  },
  maj7: {
    E: [0, 2, 1, 1, 0, 0],
    A: [-1, 0, 2, 1, 2, 0],
    C: [-1, 3, 2, 0, 0, 0],
    D: [-1, -1, 0, 2, 2, 2]
  },
  sus4: {
    E: [0, 2, 2, 2, 0, 0],
    A: [-1, 0, 2, 2, 3, 0],
    D: [-1, -1, 0, 2, 3, 3]
  },
  sus2: {
    A: [-1, 0, 2, 4, 2, 0],
    D: [-1, -1, 0, 2, 3, 0],
    C: [-1, 3, 0, 0, 1, 3]
  },
  '6': {
    E: [0, 2, 2, 1, 2, 0],
    A: [-1, 0, 2, 2, 2, 2],
    C: [-1, 3, 2, 2, 1, 0],
    D: [-1, -1, 0, 2, 0, 2]
  },
  m6: {
    E: [0, 2, 2, 0, 2, 0],
    A: [-1, 0, 2, 2, 1, 2],
    D: [-1, -1, 0, 2, 0, 1]
  },
  '5': {
    E: [0, 2, 2, -1, -1, -1],
    A: [-1, 0, 2, 2, -1, -1],
    D: [-1, -1, 0, 2, 3, -1]
  },
  '9': {
    E: [0, 2, 0, 1, 0, 2],
    A: [-1, 0, 2, 0, 2, 2],
    C: [-1, 3, 2, 3, 3, 0],
    D: [-1, -1, 0, 2, 1, 0]
  },
  m9: {
    E: [0, 2, 0, 0, 0, 2],
    A: [-1, 0, 2, 0, 1, 2]
  },
  maj9: {
    E: [0, 2, 1, 1, 2, 0],
    A: [-1, 0, 2, 1, 2, 2],
    C: [-1, 3, 2, 4, 3, 0]
  },
  add9: {
    E: [0, 2, 2, 1, 0, 2],
    A: [-1, 0, 2, 4, 2, 0],
    C: [-1, 3, 2, 0, 3, 0],
    D: [-1, -1, 0, 2, 3, 0]
  },
  '7sus4': {
    E: [0, 2, 0, 2, 0, 0],
    A: [-1, 0, 2, 0, 3, 0],
    D: [-1, -1, 0, 2, 1, 3]
  },
  dim: {
    E: [0, 1, 2, 1, -1, -1],
    A: [-1, 0, 1, 2, 1, -1]
  },
  dim7: {
    E: [0, 1, 2, 1, 2, -1],
    A: [-1, 0, 1, 2, 1, 2]
  },
  m7b5: {
    E: [0, 1, 0, 1, 0, -1],
    A: [-1, 0, 1, 2, 1, 0]
  },
  aug: {
    E: [0, 3, 2, 1, 1, 0],
    A: [-1, 0, 3, 2, 2, 1]
  },
  '11': {
    E: [0, 2, 0, 2, 0, 0],
    A: [-1, 0, 2, 0, 3, 0]
  },
  '13': {
    E: [0, 2, 0, 1, 2, 0],
    A: [-1, 0, 2, 0, 2, 2],
    D: [-1, -1, 0, 2, 1, 2]
  }
}

const SHAPE_ALIAS = {
  '5': 'maj',
  '9': '7',
  m9: 'm7',
  maj9: 'maj7',
  '11': '7sus4',
  '13': '7',
  add9: 'sus2',
  '7sus4': 'sus4',
  dim: 'm',
  dim7: 'm',
  m7b5: 'm7',
  aug: 'maj'
}

const ROOT_OPEN = { E: 4, A: 9, C: 0, D: 2 }
const FORM_ORDER = ['C', 'D', 'E', 'A']

export function classifyFamily(quality) {
  const q = String(quality || '').replace(/[()[\]]/g, '').replace(/\s/g, '')
  if (!q) return 'maj'
  const t = q
  if (/m7b5|m7-5|ø|Ø/.test(t)) return 'm7b5'
  if (/dim7|°7|o7/.test(t)) return 'dim7'
  if (/dim|°/.test(t)) return 'dim'
  if (/maj7|7maj|7M|M7|Δ/.test(t)) return 'maj7'
  if (/maj9/.test(t)) return 'maj9'
  if (/7sus/.test(t)) return '7sus4'
  if (/sus2/.test(t)) return 'sus2'
  if (/sus4|sus/.test(t)) return 'sus4'
  if (/^4$/.test(t)) return 'sus4'
  if (/^2$/.test(t)) return 'sus2'
  if (/aug|\+|#5/.test(t)) return 'aug'
  if (/add9|add2/.test(t)) return 'add9'
  if (/m6/.test(t)) return 'm6'
  if (/m9/.test(t)) return 'm9'
  if (/m11/.test(t)) return 'm7'
  if (/^m/.test(t) && /7/.test(t)) return 'm7'
  if (/^m$/.test(t) || /^min$/.test(t) || /^-$/.test(t)) return 'm'
  if (/13/.test(t)) return '13'
  if (/11/.test(t)) return '11'
  if (/^6\/?9$|^69$/.test(t)) return '9'
  if (/^6$/.test(t)) return '6'
  if (/^5$/.test(t)) return '5'
  if (/9/.test(t)) return '9'
  if (/7/.test(t)) return '7'
  if (/maj|^M$/.test(t)) return 'maj'
  return 'maj'
}

export function chordNotes(chordName) {
  const c = parseChord(chordName)
  if (!c) return null
  const family = classifyFamily(c.quality)
  const intervals = INTERVALS[family] || [0, 4, 7]
  return intervals.map((s) => (c.semitone + s) % 12)
}

export function spellNote(semi, flavor) {
  return (flavor ? SCALE_FLAT : SCALE_SHARP)[((semi % 12) + 12) % 12]
}

const OPEN_SEMIS = {
  'E A D G B E': [4, 9, 2, 7, 11, 4],
  'E A D G C F': [4, 9, 2, 7, 0, 5],
  'D A D G B E': [2, 9, 2, 7, 11, 4],
  'D G C F A D': [2, 7, 0, 5, 9, 2]
}

export function tuningFrom(label) {
  return OPEN_SEMIS[label] || OPEN_SEMIS['E A D G B E']
}

function patternsFor(family) {
  return SHAPES[family] || SHAPES[SHAPE_ALIAS[family]] || SHAPES.maj
}

function candidateFrom(pattern, form, r) {
  if (!pattern) return null
  const abs = pattern.map((o) => (o === -1 ? -1 : r + o))
  if (abs.some((f) => f !== -1 && (f < 0 || f > 17))) return null
  const positives = abs.filter((f) => f >= 0)
  if (!positives.length) return null
  const minF = Math.min(...positives)
  const maxF = Math.max(...positives)
  const span = maxF - (minF === 0 ? 1 : minF)
  if (span > 5) return null
  const sum = positives.reduce((a, f) => a + f, 0)
  const openBonus = positives.some((f) => f === 0) ? -18 : 0
  const highPenalty = minF >= 8 ? 10 : 0
  const formBias = form === 'C' || form === 'D' ? -4 : 0
  return {
    frets: abs,
    r,
    form,
    sum,
    score: sum + openBonus + highPenalty + formBias + span
  }
}

export function guitarVoicings(chordName) {
  const c = parseChord(chordName)
  if (!c) return []
  const family = classifyFamily(c.quality)
  const patterns = patternsFor(family)
  const seen = new Set()
  const out = []

  for (const form of FORM_ORDER) {
    const pattern = patterns[form]
    if (!pattern) continue
    const r = (((c.semitone - ROOT_OPEN[form]) % 12) + 12) % 12
    for (const offset of [0, 12]) {
      const cand = candidateFrom(pattern, form, r + offset)
      if (!cand) continue
      const key = cand.frets.join(',')
      if (seen.has(key)) continue
      seen.add(key)
      out.push(cand)
    }
  }

  out.sort((a, b) => a.score - b.score || a.r - b.r)
  return out.slice(0, 4)
}

export function guitarVoicing(chordName) {
  return guitarVoicings(chordName)[0] || null
}

export const DICTIONARY_ROOTS = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']

export const DICTIONARY_QUALITIES = [
  { id: '', label: 'Maior' },
  { id: 'm', label: 'Menor' },
  { id: '7', label: '7' },
  { id: 'm7', label: 'm7' },
  { id: 'maj7', label: 'maj7' },
  { id: 'sus4', label: 'sus4' },
  { id: 'sus2', label: 'sus2' },
  { id: '6', label: '6' },
  { id: 'm6', label: 'm6' },
  { id: '9', label: '9' },
  { id: 'add9', label: 'add9' },
  { id: '5', label: '5' },
  { id: 'dim', label: 'dim' },
  { id: 'aug', label: '+' }
]

export function dictionaryChord(root, quality) {
  return `${root}${quality || ''}`
}
