import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(url, anon, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  }
})

export function authRedirectUrl() {
  const url = new URL(window.location.href)
  let path = url.pathname.replace(/index\.html$/, '')
  if (!path.endsWith('/')) {
    const i = path.lastIndexOf('/')
    path = i >= 0 ? path.slice(0, i + 1) : '/'
  }
  return `${url.origin}${path || '/'}`
}

export const EDGE_FUNCTION_URL =
  import.meta.env.VITE_EDGE_FUNCTION_URL ||
  `${url}/functions/v1/smooth-function`

export async function callFetchSong({ artist, title, ...extra }) {
  const res = await fetch(EDGE_FUNCTION_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${anon}` },
    body: JSON.stringify({ artist, title, ...extra })
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data?.error?.message || data?.message || 'Erro ao buscar a cifra.')
  }
  return data
}

export async function callSearchSong(q) {
  const res = await fetch(EDGE_FUNCTION_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${anon}` },
    body: JSON.stringify({ q, mode: 'search' })
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data?.error?.message || data?.message || 'Não encontramos essa música no Cifra Club.')
  }
  return data
}
