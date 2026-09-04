export function attachWakeLock() {
  let sentinel = null

  const request = async () => {
    try {
      if (!navigator.wakeLock?.request) return
      sentinel = await navigator.wakeLock.request('screen')
    } catch {
      sentinel = null
    }
  }

  request()

  const onVis = () => {
    if (document.visibilityState === 'visible') request()
  }
  document.addEventListener('visibilitychange', onVis)

  return () => {
    document.removeEventListener('visibilitychange', onVis)
    try {
      sentinel?.release?.()
    } catch {}
    sentinel = null
  }
}
