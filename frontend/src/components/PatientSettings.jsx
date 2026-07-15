import { useState } from 'react'
import axios from 'axios'

const API = 'http://localhost:5000/api'

export default function PatientSettings() {
  const token = localStorage.getItem('token')
  const headers = { Authorization: `Bearer ${token}` }
  const user = JSON.parse(localStorage.getItem('user') || '{}')

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleChangePassword = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    try {
      const { data } = await axios.post(`${API}/auth/change-password`, {
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      }, { headers })
      setMessage(data.message)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setMessage(err.response?.data?.message || 'Erreur')
    } finally {
      setLoading(false)
    }
  }

  const handleEmailChange = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    try {
      const { data } = await axios.post(`${API}/auth/request-email-change`, { new_email: newEmail }, { headers })
      setMessage(data.message)
      setNewEmail('')
    } catch (err) {
      setMessage(err.response?.data?.message || 'Erreur')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-800">Paramètres du compte</h2>
        <p className="text-sm text-gray-500">Email actuel : {user.email}</p>
      </div>

      {message && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 text-sm">{message}</div>
      )}

      <form onSubmit={handleChangePassword} className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4">
        <h3 className="font-bold text-gray-800">Modifier mot de passe</h3>
        <input type="password" placeholder="Mot de passe actuel" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-green-500" />
        <input type="password" placeholder="Nouveau mot de passe" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-green-500" />
        <input type="password" placeholder="Confirmer le mot de passe" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-green-500" />
        <button type="submit" disabled={loading} className="bg-green-600 hover:bg-green-700 text-white font-bold px-6 py-2.5 rounded-xl text-sm disabled:opacity-50">Enregistrer</button>
      </form>

      <form onSubmit={handleEmailChange} className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4">
        <h3 className="font-bold text-gray-800">Changer adresse email</h3>
        <p className="text-xs text-gray-500">Un lien de confirmation sera envoyé à la nouvelle adresse.</p>
        <input type="email" placeholder="Nouvelle adresse email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} required className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-green-500" />
        <button type="submit" disabled={loading} className="bg-green-600 hover:bg-green-700 text-white font-bold px-6 py-2.5 rounded-xl text-sm disabled:opacity-50">Envoyer la confirmation</button>
      </form>
    </div>
  )
}
