import { useEffect, useRef, useState } from 'react'
import { uploadVideo } from './api.js'

const MAX_MB = 200
const empty = { title: '', description: '', quality: '', publish_date: '' }

function useObjectUrl(file) {
  const [url, setUrl] = useState(null)
  useEffect(() => {
    if (!file) { setUrl(null); return }
    const u = URL.createObjectURL(file)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [file])
  return url
}

function DropZone({ label, accept, file, onFile, kind }) {
  const [over, setOver] = useState(false)
  const inputRef = useRef(null)
  const url = useObjectUrl(file)

  const pick = (f) => f && onFile(f)

  return (
    <div
      className={`dropzone ${over ? 'over' : ''}`}
      onClick={() => inputRef.current.click()}
      onDragOver={(e) => { e.preventDefault(); setOver(true) }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); pick(e.dataTransfer.files[0]) }}
    >
      <input ref={inputRef} type="file" accept={accept} hidden
             onChange={(e) => pick(e.target.files[0])} />
      <strong>{label}</strong>
      <span className="muted filename">{file ? file.name : 'Click or drag a file here'}</span>
      {url && kind === 'video' && <video src={url} controls onClick={(e) => e.stopPropagation()} />}
      {url && kind === 'image' && <img src={url} alt="preview" />}
    </div>
  )
}

export default function UploadForm({ onDone, onCancel }) {
  const [fields, setFields] = useState(empty)
  const [video, setVideo] = useState(null)
  const [thumb, setThumb] = useState(null)
  const [errors, setErrors] = useState({})
  const [progress, setProgress] = useState(null)

  const set = (k) => (e) => setFields({ ...fields, [k]: e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    const errs = {}
    if (!fields.title.trim()) errs.title = ['Title is required.']
    if (!fields.quality) errs.quality = ['Pick a quality.']
    if (!fields.publish_date) errs.publish_date = ['Pick a date.']
    if (!video) errs.video_file = ['Choose a video.']
    else if (video.size > MAX_MB * 1024 * 1024) errs.video_file = [`Max size is ${MAX_MB} MB.`]
    if (!thumb) errs.thumbnail = ['Choose a thumbnail.']
    setErrors(errs)
    if (Object.keys(errs).length) return

    const data = new FormData()
    Object.entries(fields).forEach(([k, v]) => data.append(k, v))
    data.append('video_file', video)
    data.append('thumbnail', thumb)

    try {
      setProgress(0)
      await uploadVideo(data, setProgress)
      onDone()
    } catch (serverErrors) {
      setErrors(serverErrors)
      setProgress(null)
    }
  }

  const Err = ({ name }) => (errors[name] || []).map((m) => <div key={m} className="error">{m}</div>)

  return (
    <form className="card upload" onSubmit={submit} noValidate>
      <h2>Upload your video</h2>
      <Err name="non_field" />
      <div className="grid2">
        <div>
          <input placeholder="Video title" value={fields.title} onChange={set('title')} />
          <Err name="title" />
          <textarea rows="5" placeholder="Description (optional)"
                    value={fields.description} onChange={set('description')} />
          <select value={fields.quality} onChange={set('quality')}>
            <option value="">Video quality</option>
            <option value="360">360p</option>
            <option value="720">720p</option>
            <option value="1080">1080p</option>
          </select>
          <Err name="quality" />
          <input type="date" value={fields.publish_date} onChange={set('publish_date')} />
          <Err name="publish_date" />
        </div>
        <div>
          <DropZone label="Video (mp4, webm)" accept="video/mp4,video/webm,video/ogg"
                    kind="video" file={video} onFile={setVideo} />
          <Err name="video_file" />
          <DropZone label="Thumbnail" accept="image/*" kind="image" file={thumb} onFile={setThumb} />
          <Err name="thumbnail" />
        </div>
      </div>

      {progress !== null && (
        <div className="progress"><div style={{ width: `${progress}%` }} />
          <span>{progress}%</span></div>
      )}

      <div className="actions">
        <button type="button" className="btn ghost" onClick={onCancel} disabled={progress !== null}>Cancel</button>
        <button className="btn solid" disabled={progress !== null}>
          {progress !== null ? 'Uploading…' : 'Upload'}
        </button>
      </div>
    </form>
  )
}
