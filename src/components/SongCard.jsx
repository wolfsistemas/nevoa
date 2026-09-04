import { Link } from 'react-router-dom'

export default function SongCard({ song, trailing, onOpen }) {
  const body = (
    <>
      <div className="song-card-art">
        {song.image_url ? (
          <img src={song.image_url} alt="" loading="lazy" />
        ) : (
          <span className="song-card-art-letter">{(song.artist || '?')[0]?.toUpperCase()}</span>
        )}
      </div>
      <div className="song-card-body">
        <strong className="song-card-title">{song.title}</strong>
        <span className="song-card-artist">{song.artist}</span>
      </div>
      {trailing}
    </>
  )

  if (onOpen) {
    return (
      <button type="button" className="song-card" onClick={() => onOpen(song)}>
        {body}
      </button>
    )
  }

  return (
    <Link className="song-card" to={`/song/${song.id}`}>
      {body}
    </Link>
  )
}
