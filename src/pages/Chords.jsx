import { useMemo, useState } from 'react'
import ChordDiagram from '../components/ChordDiagram'
import { DICTIONARY_QUALITIES, DICTIONARY_ROOTS, dictionaryChord } from '../lib/chords'

export default function Chords() {
  const [root, setRoot] = useState('C')
  const [quality, setQuality] = useState('')
  const [instrument, setInstrument] = useState('violao')
  const chord = useMemo(() => dictionaryChord(root, quality), [root, quality])

  return (
    <div className="page">
      <header className="page-head">
        <h1>Dicionário de acordes</h1>
        <p className="muted">Toque a raiz e o tipo para ver o diagrama.</p>
      </header>

      <div className="seg">
        <button className={instrument === 'violao' ? 'seg-btn on' : 'seg-btn'} onClick={() => setInstrument('violao')}>
          Violão
        </button>
        <button className={instrument === 'guitarra' ? 'seg-btn on' : 'seg-btn'} onClick={() => setInstrument('guitarra')}>
          Guitarra
        </button>
        <button className={instrument === 'teclado' ? 'seg-btn on' : 'seg-btn'} onClick={() => setInstrument('teclado')}>
          Teclado
        </button>
      </div>

      <div className="key-grid">
        {DICTIONARY_ROOTS.map((r) => (
          <button key={r} className={root === r ? 'key-btn on' : 'key-btn'} onClick={() => setRoot(r)}>
            {r}
          </button>
        ))}
      </div>

      <div className="quality-grid">
        {DICTIONARY_QUALITIES.map((q) => (
          <button
            key={q.id || 'maj'}
            className={quality === q.id ? 'key-btn on' : 'key-btn'}
            onClick={() => setQuality(q.id)}
          >
            {q.label}
          </button>
        ))}
      </div>

      <div className="dict-card">
        <ChordDiagram chord={chord} instrument={instrument} />
      </div>
    </div>
  )
}
