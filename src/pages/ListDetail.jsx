import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Icon } from '../components/Icons'
import SongCard from '../components/SongCard'
import { SongView } from './Song'
import { callFetchSong } from '../lib/supabase'
import { searchItunes, mergeHits } from '../lib/musicSearch'
import {
  getListWithSongs,
  removeSongFromList,
  moveListSong,
  renameList,
  addSongToList,
  searchSongsLocal
} from '../lib/store'

function hitKey(h) {
  return `${h.slug_artist || ''}|${h.slug_title || ''}|${h.id || ''}|${h.artist}|${h.title}`
}

export default function ListDetail() {
  const { id } = useParams()
  const [list, setList] = useState(null)
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [q, setQ] = useState('')
  const [hits, setHits] = useState([])
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [addedKeys, setAddedKeys] = useState([])
  const [openSongId, setOpenSongId] = useState(null)
  const deb = useRef(null)
  const lastQ = useRef('')

  const load = () => getListWithSongs(id).then(setList)

  useEffect(() => {
    load()
  }, [id])

  useEffect(() => {
    if (!searchOpen) return
    clearTimeout(deb.current)
    const value = q.trim()
    if (!value) {
      setHits([])
      setNotice('')
      return
    }
    deb.current = setTimeout(() => runSearch(value), 280)
    return () => clearTimeout(deb.current)
  }, [q, searchOpen])

  const runSearch = async (value) => {
    lastQ.current = value
    try {
      const [local, remote] = await Promise.all([
        searchSongsLocal(value, 10).catch(() => []),
        searchItunes(value, 10).catch(() => [])
      ])
      if (lastQ.current !== value) return
      setHits(mergeHits(local, remote))
    } catch {
      if (lastQ.current !== value) return
      setHits([])
    }
  }

  const addHit = async (hit) => {
    setBusy(true)
    setNotice('')
    try {
      let songId = hit.id
      if (!songId) {
        const res = await callFetchSong({ artist: hit.artist, title: hit.title })
        songId = res?.song?.id
      }
      if (!songId) throw new Error('Não encontramos essa cifra.')
      await addSongToList(id, songId)
      setAddedKeys((prev) => [...prev, hitKey(hit)])
      await load()
    } catch (e) {
      setNotice(e?.message || 'Não foi possível adicionar.')
    } finally {
      setBusy(false)
    }
  }

  const remove = async (item) => {
    await removeSongFromList(item.id)
    load()
  }

  const move = async (item, dir) => {
    try {
      await moveListSong(item.id, dir)
      load()
    } catch {}
  }

  const saveName = async () => {
    const n = name.trim()
    if (n) await renameList(id, n)
    setEditing(false)
    load()
  }

  if (!list) return <div className="page center-page">Carregando...</div>

  const items = list.items || []

  return (
    <div className="page">
      <header className="page-head row-space">
        <div className="grow">
          {editing ? (
            <div className="row">
              <input className="grow" value={name} onChange={(e) => setName(e.target.value)} />
              <button className="btn btn-primary sm-btn" onClick={saveName}>Salvar</button>
            </div>
          ) : (
            <h1 onClick={() => { setName(list.name); setEditing(true) }}>{list.name}</h1>
          )}
          <p className="muted">
            {items.length} {items.length === 1 ? 'música' : 'músicas'}
          </p>
        </div>
        <button
          className="icon-btn"
          onClick={() => { setSearchOpen(true); setQ(''); setHits([]); setNotice('') }}
          aria-label="Adicionar música"
        >
          <Icon name="plus" size={18} />
        </button>
        <button className="icon-btn" onClick={() => { setName(list.name); setEditing(true) }} aria-label="Renomear lista">
          <Icon name="edit" size={18} />
        </button>
      </header>

      <div className="stack">
        {items.length === 0 && (
          <div className="empty-state">
            <Icon name="list" size={34} />
            <p className="muted">Lista vazia. Toque no + para buscar e adicionar.</p>
          </div>
        )}
        {items.map((item, idx) => (
          <div key={item.id} className="setlist-row">
            <span className="setlist-index">{idx + 1}</span>
            <button type="button" className="song-card grow" onClick={() => item.song?.id && setOpenSongId(item.song.id)}>
              <div className="song-card-art small">
                {item.song.image_url ? (
                  <img src={item.song.image_url} alt="" loading="lazy" />
                ) : (
                  <span className="song-card-art-letter">{(item.song.artist || '?')[0]?.toUpperCase()}</span>
                )}
              </div>
              <div className="song-card-body">
                <strong className="song-card-title">{item.song.title}</strong>
                <span className="song-card-artist">{item.song.artist}</span>
                {(item.shift || item.capo) ? (
                  <span className="muted small">
                    {item.shift ? `Tom ${item.shift > 0 ? `+${item.shift}` : item.shift}` : ''}
                    {item.shift && item.capo ? ' · ' : ''}
                    {item.capo ? `Capo ${item.capo}` : ''}
                  </span>
                ) : null}
              </div>
            </button>
            <div className="col-actions">
              <button className="icon-btn sm" disabled={idx === 0} onClick={() => move(item, -1)} aria-label="Subir">
                <Icon name="up" size={16} />
              </button>
              <button
                className="icon-btn sm"
                disabled={idx === items.length - 1}
                onClick={() => move(item, 1)}
                aria-label="Descer"
              >
                <Icon name="down" size={16} />
              </button>
              <button className="icon-btn sm" onClick={() => remove(item)} aria-label="Remover da lista">
                <Icon name="trash" size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {openSongId && (
        <div className="song-modal" role="dialog" aria-modal="true">
          <SongView
            key={openSongId}
            songId={openSongId}
            listId={id}
            playlistIds={items.map((it) => it.song?.id).filter(Boolean)}
            onBack={() => { setOpenSongId(null); load() }}
            onReplaceSong={setOpenSongId}
            embedded
          />
        </div>
      )}

      {searchOpen && (
        <div className="sheet-backdrop" onClick={() => setSearchOpen(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <h3 className="sheet-title">Adicionar à lista</h3>
            <div className="search-row">
              <Icon name="search" size={18} />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Busque pelo nome da música"
                autoFocus
                autoComplete="off"
              />
            </div>
            {notice && <p className="form-error">{notice}</p>}
            {busy && <p className="muted small">Adicionando...</p>}
            <div className="sheet-list">
              {hits.map((s) => {
                const key = hitKey(s)
                const already = addedKeys.includes(key) || items.some((it) => it.song?.id === s.id)
                return (
                  <SongCard
                    key={key}
                    song={s}
                    onOpen={already || busy ? () => {} : addHit}
                    trailing={
                      already ? (
                        <span className="chip ok">Na lista</span>
                      ) : (
                        <span className="btn ghost icon-only" aria-hidden="true">
                          <Icon name="plus" size={18} />
                        </span>
                      )
                    }
                  />
                )
              })}
              {q.trim() && hits.length === 0 && !busy && (
                <p className="muted">Nenhuma cifra encontrada.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
