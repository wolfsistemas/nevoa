const KEY = 'nevoa_theme'

export function getTheme() {
  try {
    return localStorage.getItem(KEY) === 'light' ? 'light' : 'dark'
  } catch {
    return 'dark'
  }
}

export function applyTheme(theme) {
  const next = theme === 'light' ? 'light' : 'dark'
  document.documentElement.setAttribute('data-theme', next)
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', next === 'light' ? '#f3f4f8' : '#0b0e14')
}

export function setTheme(theme) {
  const next = theme === 'light' ? 'light' : 'dark'
  try {
    localStorage.setItem(KEY, next)
  } catch {}
  applyTheme(next)
}
