import { useCallback, useEffect, useState } from 'react'
import { deleteVideo, fetchVideos, likeVideo, watchVideo } from './api.js'
import UploadForm from './UploadForm.jsx'

function useDebounced(value, ms = 300) {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return v
}

function Player({ video, onClose, onLike }) {
  const key = `liked-${video.id}`
  const [liked, setLiked] = useState(localStorage.getItem(key) === '1')

  const toggleLike = async () => {
    const updated = await likeVideo(video.id, liked ? 'unlike' : 'like')
    const next = !liked
    setLiked(next)
    localStorage.setItem(key, next ? '1' : '0')
    onLike(updated)
  }

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="modal" onClick={onClose}>
      <div className="modal-body" onClick={(e) => e.stopPropagation()}>
        <video src={video.video_file} poster={video.thumbnail} controls autoPlay />
        <h3>{video.title}</h3>
        <p className="muted">{video.publish_date} · {video.quality_label} · {video.views} views</p>
        <button className={`btn heart ${liked ? 'liked' : ''}`} onClick={toggleLike}>♥ {video.likes}</button>
        <p className="desc">{video.description}</p>
        <button className="btn ghost" onClick={onClose}>Close</button>
      </div>
    </div>
  )
}

export default function App() {
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [q, setQ] = useState('')
  const [quality, setQuality] = useState('')
  const [sort, setSort] = useState('')
  const [uploading, setUploading] = useState(false)
  const [playing, setPlaying] = useState(null)
  const [toast, setToast] = useState('')
  const dq = useDebounced(q)

  const load = useCallback(async () => {
    try {
      setError('')
      const data = await fetchVideos({ q: dq, quality, sort })
      setVideos(Array.isArray(data) ? data : data.results)
    } catch (e) {
      setError(`${e.message}. Is the Django server running on port 8000?`)
    } finally {
      setLoading(false)
    }
  }, [dq, quality, sort])

  useEffect(() => { load() }, [load])

  const flash = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2500) }

  const play = async (v) => {
    setPlaying(v)
    const updated = await watchVideo(v.id)
    setPlaying(updated)
    setVideos((list) => list.map((x) => (x.id === v.id ? updated : x)))
  }

  const onLike = (updated) => {
    setPlaying(updated)
    setVideos((list) => list.map((x) => (x.id === updated.id ? updated : x)))
  }

  const remove = async (v) => {
    if (!confirm(`Delete "${v.title}"?`)) return
    await deleteVideo(v.id)
    setVideos((list) => list.filter((x) => x.id !== v.id))
    flash('Video deleted')
  }

  return (
    <div className="container">
      <header>
        <h1>Vide<span>x</span></h1>
        {!uploading && <button className="btn outline" onClick={() => setUploading(true)}>Add Video</button>}
      </header>

      {toast && <div className="toast">{toast}</div>}

      {uploading ? (
        <UploadForm
          onCancel={() => setUploading(false)}
          onDone={() => { setUploading(false); flash('Video added successfully'); load() }}
        />
      ) : (
        <>
          <div className="filters">
            <input placeholder="Search videos…" value={q} onChange={(e) => setQ(e.target.value)} />
            <select value={quality} onChange={(e) => setQuality(e.target.value)}>
              <option value="">All qualities</option>
              <option value="360">360p</option>
              <option value="720">720p</option>
              <option value="1080">1080p</option>
            </select>
            <select value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="views">Most viewed</option>
            </select>
          </div>

          {error && <div className="error banner">{error}</div>}
          {loading && <p className="muted">Loading…</p>}
          {!loading && !error && videos.length === 0 && (
            <p className="empty">No videos found. Click “Add Video” to upload one.</p>
          )}

          <div className="grid">
            {videos.map((v) => (
              <article key={v.id} className="video-card">
                <div className="thumb" onClick={() => play(v)}>
                  <img src={v.thumbnail} alt={v.title} />
                  <span className="q">{v.quality_label}</span>
                  <span className="play">▶</span>
                </div>
                <div className="meta">
                  <h4 title={v.title}>{v.title}</h4>
                  <small className="muted">{v.publish_date} · {v.views} views · ♥ {v.likes}</small>
                  <button className="btn danger sm" onClick={() => remove(v)}>Delete</button>
                </div>
              </article>
            ))}
          </div>
        </>
      )}

      {playing && <Player video={playing} onClose={() => setPlaying(null)} onLike={onLike} />}
    </div>
  )
}
