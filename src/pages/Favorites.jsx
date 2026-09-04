import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from '../components/Icons'
import SongCard from '../components/SongCard'
import { useAuth } from '../hooks/useAuth'
import { getFavorites } from '../lib/store'

export default function Favorites() {
  const nav = useNavigate()
  const { user } = useAuth()
  const [items, setItems] = useState(null)

  useEffect(() => {
    if (user) getFavorites().then(setItems)
  }, [user])

  return (
    <div className="page">
      <header className="page-head">
        <h1>Favoritos</h1>
        <p className="muted">Suas cifras favoritas, num lugar só.</p>
      </header>

      {items === null && <p className="muted">Carregando...</p>}
      {items && items.length === 0 && (
        <div className="empty-state">
          <Icon name="heart" size={34} />
          <p className="muted">
            Nenhum favorito ainda. Toque no coração dentro de uma cifra.
          </p>
        </div>
      )}
      <div className="card-grid">
        {items?.map((f, i) => (
          <SongCard key={`${f.song.id}-${i}`} song={f.song} />
        ))}
      </div>
      {!user && (
        <div className="setup-hint">
          <button className="btn btn-primary" onClick={() => nav('/auth')}>
            Entrar para ver favoritos
          </button>
        </div>
      )}
    </div>
  )
}
