import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

const API = 'http://localhost:5000/api/auth'

function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)

    try {
      const response = await axios.post(`${API}/forgot-password`, { email })
      setMessage(response.data.message)
      setEmail('')
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur serveur')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">

      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold text-green-600">MediCam</h1>
        <p className="text-gray-500 mt-2">Plateforme de consultation médicale en ligne</p>
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">
        <h2 className="text-2xl font-bold text-gray-800 mb-2 text-center">
          Mot de passe oublié
        </h2>
        <p className="text-gray-500 text-center mb-6 text-sm">
          Entrez votre email et nous vous enverrons un lien de réinitialisation
        </p>

        {message && (
          <div className="bg-green-50 border border-green-300 text-green-600 rounded-lg px-4 py-3 mb-4 text-sm">
            {message}
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-300 text-red-600 rounded-lg px-4 py-3 mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            placeholder="Adresse email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-green-500"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? 'Envoi en cours...' : 'Envoyer le lien'}
          </button>

          <p className="text-center text-sm text-gray-500">
            <span
              onClick={() => navigate('/login')}
              className="text-green-600 cursor-pointer hover:underline"
            >
              ← Retour à la connexion
            </span>
          </p>
        </form>
      </div>
    </div>
  )
}

export default ForgotPassword
