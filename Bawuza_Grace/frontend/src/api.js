export const API = 'http://127.0.0.1:8000/api'

export async function fetchVideos({ q = '', quality = '', sort = '' } = {}) {
  const params = new URLSearchParams()
  if (q) params.set('q', q)
  if (quality) params.set('quality', quality)
  if (sort) params.set('sort', sort)
  const res = await fetch(`${API}/videos/?${params}`)
  if (!res.ok) throw new Error('Could not load videos')
  return res.json()
}

export async function deleteVideo(id) {
  const res = await fetch(`${API}/videos/${id}/`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Could not delete video')
}

export async function watchVideo(id) {
  const res = await fetch(`${API}/videos/${id}/watch/`, { method: 'POST' })
  return res.json()
}

export async function likeVideo(id, action) {
  const res = await fetch(`${API}/videos/${id}/like/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action }),
  })
  return res.json()
}

// XMLHttpRequest (not fetch) so we get upload progress events.
export function uploadVideo(formData, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${API}/videos/`)
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload = () => {
      let body = {}
      try { body = JSON.parse(xhr.responseText) } catch { /* ignore */ }
      if (xhr.status === 201) resolve(body)
      else reject(body) // DRF returns {field: ["error", ...]}
    }
    xhr.onerror = () => reject({ non_field: ['Network error. Is the Django server running?'] })
    xhr.send(formData)
  })
}
