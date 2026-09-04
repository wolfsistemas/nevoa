import { useEffect, useMemo, useState } from 'react'
import { guitarVoicings, chordNotes, spellNote } from '../lib/chords'
import { parseChord } from '../lib/transpose'
import { Icon } from './Icons'

function PianoDiagram({ notes, chord }) {
  const W = 14
  const BLACK_W = 9
  const whiteKeys = []
  const lit = new Set(notes)
  for (let oct = 0; oct < 2; oct++) {
    for (const off of [0, 2, 4, 5, 7, 9, 11]) {
      whiteKeys.push({ semi: oct * 12 + off })
    }
  }
  const naturalLetters = ['C', 'D', 'E', 'F', 'G', 'A', 'B']
  const blackMap = { 1: 0, 3: 1, 6: 3, 8: 4, 10: 5 }
  const octaveH = 58
  return (
    <svg viewBox={`0 0 ${W * 14 + 4} ${octaveH + 10}`} width="168" role="img" aria-label={`Teclado com acorde ${chord}`}>
      {whiteKeys.map((k, i) => {
        const oct = Math.floor(i / 7)
        const inOct = i % 7
        const x = oct * 7 * W + inOct * W + 2
        const on = lit.has(((k.semi % 12) + 12) % 12)
        return (
          <g key={i}>
            <rect x={x} y={4} width={W - 1} height={octaveH} rx={2}
              fill={on ? 'var(--lime)' : 'var(--piano-white)'} stroke="var(--line)" />
            <text x={x + (W - 1) / 2} y={octaveH - 6} textAnchor="middle" fontSize={7}
              fill={on ? 'var(--bg)' : 'var(--muted)'}>{naturalLetters[inOct]}</text>
          </g>
        )
      })}
      {[0, 12].flatMap((oct) => [1, 3, 6, 8, 10].map((b) => ({ oct, b }))).map(({ oct, b }, i) => {
        const octX = oct * 7 * W
        const x = octX + blackMap[b] * W + 2 - BLACK_W / 2
        const on = lit.has((oct + b) % 12)
        return (
          <rect key={i} x={x} y={4} width={BLACK_W} height={octaveH * 0.62} rx={1.5}
            fill={on ? 'var(--accent-2)' : 'var(--piano-black)'} stroke="var(--bg)" />
        )
      })}
    </svg>
  )
}

function GuitarDiagram({ voicing, chord, notes }) {
  if (!voicing) {
    return (
      <div className="chord-fallback">
        <span className="chord-fallback-title">{chord}</span>
        <div className="chord-fallback-notes">
          {(notes || []).map((n, i) => (
            <span key={i}>{spellNote(n, false)}</span>
          ))}
        </div>
      </div>
    )
  }
  const frets = voicing.frets
  const positives = frets.filter((f) => f !== -1)
  const hasOpen = positives.some((f) => f === 0)
  const minPos = positives.length ? Math.min(...positives) : 1
  const base = hasOpen || minPos < 4 ? 1 : minPos
  const maxCell = Math.max(0, ...frets.map((f) => (f === -1 ? 0 : f - base)))
  const cells = Math.max(2, Math.min(4, maxCell)) + 1
  const strings = frets.length
  const sw = 14
  const sh = 12
  const topPad = 16
  const W = sw * (strings - 1) + 30
  const H = topPad + cells * sh + 14
  const x0 = 20

  const barreFret = base === voicing.r && voicing.r > 0 ? voicing.r : null
  const barreCells = frets.filter((f) => f === barreFret).length
  const drawBarre = barreFret !== null && barreCells >= 3

  const xOf = (si) => x0 + si * sw
  const yOfFretLine = (li) => topPad + li * sh
  const dotY = (cell) => topPad + cell * sh + sh / 2
  const formLabel = voicing.form ? `forma ${voicing.form}` : ''
  const pressed = positives.filter((f) => f > 0)
  const high = pressed.length ? Math.min(...pressed) >= 7 : false

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="168" role="img" aria-label={`Diagrama de ${chord}`}>
      {base > 1 && (
        <text x={x0 - 5} y={topPad + 3} textAnchor="end" fontSize={9} fill="var(--muted)">{base}</text>
      )}
      {drawBarre && (
        <rect x={x0 - 2} y={topPad + (barreFret - base) * sh + 1} width={sw * (strings - 1) + 4}
          height={sh - 2} rx={3} fill="var(--accent)" />
      )}
      {Array.from({ length: cells + 1 }).map((_, li) => {
        const isNut = base === 1 && li === 0
        return (
          <line key={li} x1={x0 - 2} y1={yOfFretLine(li)} x2={x0 + sw * (strings - 1) + 2} y2={yOfFretLine(li)}
            stroke={isNut ? 'var(--text)' : 'var(--muted)'} strokeWidth={isNut ? 2.5 : 1} />
        )
      })}
      {frets.map((f, si) => {
        const x = xOf(si)
        const labelY = yOfFretLine(0) - 6
        return (
          <g key={si}>
            <line x1={x} y1={yOfFretLine(0)} x2={x} y2={yOfFretLine(cells)} stroke="var(--muted)" />
            <text x={x} y={labelY} textAnchor="middle" fontSize={9} fill="var(--text)">
              {f === -1 ? 'x' : f === 0 ? 'O' : ''}
            </text>
            {f > 0 && !(drawBarre && f === barreFret) && (
              <circle cx={x} cy={dotY(f - base)} r={4.2} fill="var(--lime)" />
            )}
          </g>
        )
      })}
      <text x={0} y={H - 2} fontSize={8} fill="var(--muted)">
        {(notes || []).map((n) => spellNote(n, false)).join(' · ')}
        {formLabel ? ` · ${formLabel}` : ''}
        {high ? ' · pestana alta' : ''}
      </text>
    </svg>
  )
}

export default function ChordDiagram({ chord, instrument }) {
  const parsed = parseChord(chord)
  const [idx, setIdx] = useState(0)
  const displayName = String(chord || '').split('/')[0]
  const notes = useMemo(() => chordNotes(displayName) || [], [displayName])
  const voicings = useMemo(() => guitarVoicings(displayName), [displayName])
  useEffect(() => { setIdx(0) }, [displayName])
  const voicing = voicings[Math.min(idx, Math.max(0, voicings.length - 1))] || null

  if (!parsed) {
    return (
      <div className="chord-fallback">
        <span className="chord-fallback-title">{chord}</span>
      </div>
    )
  }

  return (
    <div className="diagram">
      <div className="diagram-title">{chord}</div>
      {instrument === 'teclado' ? (
        <PianoDiagram notes={notes} chord={chord} />
      ) : (
        <GuitarDiagram voicing={voicing} chord={displayName} notes={notes} />
      )}
      {instrument !== 'teclado' && voicings.length > 1 && (
        <div className="voicing-nav">
          <button
            type="button"
            className="icon-btn sm"
            disabled={idx <= 0}
            onClick={() => setIdx((n) => Math.max(0, n - 1))}
            aria-label="Formação anterior"
          >
            <Icon name="prev" size={14} />
          </button>
          <span className="muted small">{idx + 1}/{voicings.length}</span>
          <button
            type="button"
            className="icon-btn sm"
            disabled={idx >= voicings.length - 1}
            onClick={() => setIdx((n) => Math.min(voicings.length - 1, n + 1))}
            aria-label="Próxima formação"
          >
            <Icon name="next" size={14} />
          </button>
        </div>
      )}
      {instrument === 'teclado' && notes.length > 0 && (
        <div className="diagram-notes">
          {notes.map((n) => spellNote(n, parsed.flavor)).join(' · ')}
        </div>
      )}
    </div>
  )
}
