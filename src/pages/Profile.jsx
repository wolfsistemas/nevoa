import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from '../components/Icons'
import { useAuth } from '../hooks/useAuth'
import { getLists } from '../lib/store'
import { getTheme, setTheme } from '../lib/theme'

function ThemeCard() {
  const [theme, setThemeState] = useState(getTheme)
  const isLight = theme === 'light'
  const toggle = () => {
    const next = isLight ? 'dark' : 'light'
    setTheme(next)
    setThemeState(next)
  }
  return (
    <div className="list-card" role="button" onClick={toggle}>
      <span className="list-card-body">
        <strong>Aparência</strong>
        <span className="muted small">{isLight ? 'Modo claro' : 'Modo escuro'}</span>
      </span>
      <span className="theme-toggle" aria-hidden="true">
        <Icon name={isLight ? 'sun' : 'moon'} size={18} />
      </span>
    </div>
  )
}

export default function Profile() {
  const nav = useNavigate()
  const { user, profile, signOut, loading } = useAuth()
  const [lists, setLists] = useState(null)

  useEffect(() => {
    if (user) getLists().then((l) => setLists(l)).catch(() => setLists([]))
  }, [user])

  if (loading) return <div className="page center-page">Carregando...</div>

  if (!user) {
    return (
      <div className="page center-page">
        <p className="big-icon"><Icon name="user" size={40} /></p>
        <h2>Sua conta</h2>
        <p className="muted center">Entre para sincronizar listas e favoritos em qualquer aparelho.</p>
        <button className="btn btn-primary" onClick={() => nav('/auth')}>
          Entrar / Criar conta
        </button>
        <div className="stack auth-theme">
          <ThemeCard />
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <header className="page-head">
        <div className="avatar">{profile?.username?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase()}</div>
        <h1>{profile?.username || user.email}</h1>
        <p className="muted">{user.email}</p>
      </header>

      <div className="stack">
        <ThemeCard />
        <div className="list-card" role="button" onClick={() => nav('/lists')}>
          <span className="list-card-body">
            <strong>Minhas listas</strong>
            <span className="muted small">
              {lists === null ? '—' : `${lists.length} ${lists.length === 1 ? 'lista' : 'listas'}`}
            </span>
          </span>
          <Icon name="list" size={20} className="ghost-icon" />
        </div>
        <button className="btn danger" onClick={async () => { await signOut(); nav('/', { replace: true }) }}>
          Sair da conta
        </button>
        <p className="muted small">
          Sincronizado via Supabase. Em breve: login com Google e listas públicas.
        </p>
      </div>
    </div>
  )
}
