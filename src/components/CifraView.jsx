import { transposeChord } from '../lib/transpose'

function renderChordButton(name, onChord) {
  return (
    <button key={name} type="button" className="chord-label" onClick={() => onChord(name)}>
      {name}
    </button>
  )
}

function Verse({ line, shift, onChord }) {
  const chordMap = {}
  ;(line.chordAt || []).forEach(({ wi, names }) => {
    chordMap[wi] = names
  })
  return (
    <div className="verse">
      <p className="lyric">
        {line.words.map((w, i) => (
          <span key={i} className={chordMap[i] ? 'ws has-chord' : 'ws'}>
            {chordMap[i] &&
              chordMap[i].map((name) => (
                <span key={name} className="chord-stack">
                  {renderChordButton(transposeChord(name, shift), onChord)}
                </span>
              ))}
            <span className="word">{w}</span>
          </span>
        ))}
      </p>
    </div>
  )
}

function ChordLine({ line, shift, onChord }) {
  let ptr = 0
  const tokens = []
  ;(line.chords || []).forEach((name) => {
    const disp = transposeChord(name, shift)
    const at = line.text.indexOf(name, ptr)
    const pos = at === -1 ? ptr : at
    if (pos > ptr) tokens.push({ t: 'txt', v: line.text.slice(ptr, pos) })
    tokens.push({ t: 'chord', v: disp, k: `${name}-${pos}` })
    ptr = pos + name.length
  })
  if (ptr < line.text.length) tokens.push({ t: 'txt', v: line.text.slice(ptr) })
  return (
    <p className="chord-line">
      {tokens.map((tok, i) =>
        tok.t === 'chord' ? (
          <span key={tok.k + i} className="chord-inline">
            {renderChordButton(tok.v, onChord)}
          </span>
        ) : (
          <span key={i}>{tok.v}</span>
        )
      )}
    </p>
  )
}

export default function CifraView({ lines, shift = 0, onChord, hideTabs = true }) {
  return (
    <div className="cifra">
      {lines.map((line, i) => {
        if (line.kind === 'tab' && hideTabs) return null
        switch (line.kind) {
          case 'label':
            return (
              <h3 key={i} className="cifra-label">
                {line.text}
              </h3>
            )
          case 'verse':
            return <Verse key={i} line={line} shift={shift} onChord={onChord} />
          case 'chords':
            return <ChordLine key={i} line={line} shift={shift} onChord={onChord} />
          case 'tuning':
            return (
              <p key={i} className="cifra-meta">
                {line.text}
              </p>
            )
          case 'tab':
            return (
              <pre key={i} className="cifra-tab">
                {line.text}
              </pre>
            )
          case 'blank':
            return <div key={i} className="cifra-gap" />
          default:
            return (
              <p key={i} className="plain-line">
                {line.text}
              </p>
            )
        }
      })}
    </div>
  )
}
