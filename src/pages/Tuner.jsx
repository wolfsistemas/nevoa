import { useEffect, useRef, useState } from 'react'
import { Icon } from '../components/Icons'

const STRINGS = [
  { note: 'E2', hz: 82.41, label: '6 · Mi' },
  { note: 'A2', hz: 110.0, label: '5 · Lá' },
  { note: 'D3', hz: 146.83, label: '4 · Ré' },
  { note: 'G3', hz: 196.0, label: '3 · Sol' },
  { note: 'B3', hz: 246.94, label: '2 · Si' },
  { note: 'E4', hz: 329.63, label: '1 · Mi' }
]

const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

function hzToMidi(hz) {
  return 69 + 12 * Math.log2(hz / 440)
}

function midiToName(midi) {
  const n = Math.round(midi)
  return `${NAMES[((n % 12) + 12) % 12]}${Math.floor(n / 12) - 1}`
}

function autoCorrelate(buf, sampleRate) {
  const SIZE = buf.length
  let rms = 0
  for (let i = 0; i < SIZE; i++) rms += buf[i] * buf[i]
  rms = Math.sqrt(rms / SIZE)
  if (rms < 0.01) return -1
  let r1 = 0
  let r2 = SIZE - 1
  const thres = 0.2
  for (let i = 0; i < SIZE / 2; i++) {
    if (Math.abs(buf[i]) < thres) {
      r1 = i
      break
    }
  }
  for (let i = 1; i < SIZE / 2; i++) {
    if (Math.abs(buf[SIZE - i]) < thres) {
      r2 = SIZE - i
      break
    }
  }
  const slice = buf.slice(r1, r2)
  const n = slice.length
  const c = new Array(n).fill(0)
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n - i; j++) c[i] += slice[j] * slice[j + i]
  }
  let d = 0
  while (d < n - 1 && c[d] > c[d + 1]) d++
  let maxVal = -1
  let maxPos = -1
  for (let i = d; i < n; i++) {
    if (c[i] > maxVal) {
      maxVal = c[i]
      maxPos = i
    }
  }
  if (maxPos <= 0) return -1
  const y0 = c[maxPos - 1] || 0
  const y1 = c[maxPos]
  const y2 = c[maxPos + 1] || 0
  const a = (y0 + y2 - 2 * y1) / 2
  const b = (y2 - y0) / 2
  const shift = a ? -b / (2 * a) : 0
  return sampleRate / (maxPos + shift)
}

export default function Tuner() {
  const [on, setOn] = useState(false)
  const [error, setError] = useState('')
  const [hz, setHz] = useState(0)
  const [name, setName] = useState('--')
  const [cents, setCents] = useState(0)
  const [target, setTarget] = useState(null)
  const ctxRef = useRef(null)
  const rafRef = useRef(0)

  useEffect(() => {
    if (!on) return
    let stream
    let analyser
    let buf
    let stopped = false

    const start = async () => {
      setError('')
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }
        })
        const ctx = new (window.AudioContext || window.webkitAudioContext)()
        ctxRef.current = ctx
        const src = ctx.createMediaStreamSource(stream)
        analyser = ctx.createAnalyser()
        analyser.fftSize = 2048
        src.connect(analyser)
        buf = new Float32Array(analyser.fftSize)

        const loop = () => {
          if (stopped) return
          analyser.getFloatTimeDomainData(buf)
          const freq = autoCorrelate(buf, ctx.sampleRate)
          if (freq > 50 && freq < 1200) {
            const midi = hzToMidi(freq)
            const nearest = Math.round(midi)
            setHz(freq)
            setName(midiToName(midi))
            setCents((midi - nearest) * 100)
          }
          rafRef.current = requestAnimationFrame(loop)
        }
        loop()
      } catch {
        setError('Não foi possível usar o microfone.')
        setOn(false)
      }
    }
    start()
    return () => {
      stopped = true
      cancelAnimationFrame(rafRef.current)
      stream?.getTracks?.().forEach((t) => t.stop())
      ctxRef.current?.close?.()
      ctxRef.current = null
    }
  }, [on])

  const refHz = target ? target.hz : hz ? 440 * 2 ** ((Math.round(hzToMidi(hz)) - 69) / 12) : 0
  const diff = hz && refHz ? 1200 * Math.log2(hz / refHz) : 0
  const shown = target ? diff : cents
  const abs = Math.abs(shown)
  const color = !hz ? 'var(--muted)' : abs < 5 ? 'var(--lime)' : abs < 15 ? '#ffd166' : 'var(--danger)'

  return (
    <div className="page tuner-page">
      <header className="page-head">
        <h1>Afinador</h1>
        <p className="muted">Afinação padrão do violão (E A D G B E).</p>
      </header>

      <div className="tuner-gauge" style={{ '--needle': `${Math.max(-45, Math.min(45, shown * 1.6))}deg`, '--c': color }}>
        <div className="tuner-arc" />
        <div className="tuner-needle" />
        <div className="tuner-note" style={{ color }}>
          {on && hz ? name : '--'}
        </div>
        <p className="tuner-hz">{on && hz ? `${hz.toFixed(1)} Hz · ${shown > 0 ? '+' : ''}${shown.toFixed(0)} cents` : 'Toque uma corda'}</p>
      </div>

      <div className="tuner-strings">
        {STRINGS.map((s) => (
          <button
            key={s.note}
            className={target?.note === s.note ? 'seg-btn on' : 'seg-btn'}
            onClick={() => setTarget(target?.note === s.note ? null : s)}
          >
            {s.label}
          </button>
        ))}
      </div>

      {error && <p className="form-error">{error}</p>}

      <button className={`btn ${on ? 'danger' : 'btn-primary'}`} onClick={() => setOn((v) => !v)}>
        <Icon name="tuner" size={18} />
        {on ? 'Parar microfone' : 'Começar a afinar'}
      </button>
    </div>
  )
}
