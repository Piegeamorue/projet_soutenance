import axios from 'axios'

const API = 'http://localhost:5000/api'
const API_BASE = 'http://localhost:5000'

export function getStoredUser() {
  try {
    const raw = localStorage.getItem('user')
    if (raw && raw !== 'undefined' && raw !== 'null') return JSON.parse(raw)
  } catch (_) {}
  return {}
}

export function updateStoredUser(updates) {
  const user = { ...getStoredUser(), ...updates }
  localStorage.setItem('user', JSON.stringify(user))
  window.dispatchEvent(new CustomEvent('user-updated', { detail: user }))
  return user
}

export function getPhotoUrl(photo) {
  if (!photo) return null
  if (photo.startsWith('blob:') || photo.startsWith('http')) return photo
  return `${API_BASE}/${photo.replace(/^\//, '')}`
}

export async function uploadProfilePhoto(file) {
  const token = localStorage.getItem('token')
  const formData = new FormData()
  formData.append('photo', file)

  const { data } = await axios.post(`${API}/auth/profile/photo`, formData, {
    headers: { Authorization: `Bearer ${token}` },
  })

  updateStoredUser({ ...data.user, photo: data.photo })
  return data.photo
}
