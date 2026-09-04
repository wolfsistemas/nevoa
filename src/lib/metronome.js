export function createMetronome() {
  let ctx = null
  let playing = false
  let bpm = 90
  let timer = 0
  let next = 0
  let onBeat = null

  function ensure() {
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return null
    if (!ctx) ctx = new AC()
    if (ctx.state === 'suspended') ctx.resume()
    return ctx
  }

  function click(time) {
    const c = ctx
    if (!c) return
    const osc = c.createOscillator()
    const g = c.createGain()
    osc.type = 'square'
    osc.frequency.value = 1100
    g.gain.setValueAtTime(0.14, time)
    g.gain.exponentialRampToValueAtTime(0.001, time + 0.045)
    osc.connect(g)
    g.connect(c.destination)
    osc.start(time)
    osc.stop(time + 0.05)
  }

  function tick() {
    if (!playing || !ctx) return
    const horizon = ctx.currentTime + 0.12
    while (next < horizon) {
      click(next)
      if (onBeat) onBeat()
      next += 60 / Math.max(40, bpm)
    }
    timer = requestAnimationFrame(tick)
  }

  return {
    setBpm(value) {
      const n = Number(value)
      bpm = Number.isFinite(n) ? Math.max(40, Math.min(240, Math.round(n))) : 90
    },
    setOnBeat(fn) {
      onBeat = fn
    },
    start() {
      const c = ensure()
      if (!c || playing) return
      playing = true
      next = c.currentTime + 0.04
      tick()
    },
    stop() {
      playing = false
      cancelAnimationFrame(timer)
    },
    isPlaying() {
      return playing
    }
  }
}

export function tapTempo(taps, now = Date.now()) {
  const next = [...taps, now].filter((t) => now - t < 3000).slice(-5)
  if (next.length < 2) return { taps: next, bpm: null }
  let sum = 0
  for (let i = 1; i < next.length; i++) sum += next[i] - next[i - 1]
  const avg = sum / (next.length - 1)
  const bpm = Math.max(40, Math.min(240, Math.round(60000 / avg)))
  return { taps: next, bpm }
}
