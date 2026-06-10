import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await axios.post('http://localhost:5000/api/auth/login', {
        email,
        password
      })

      // Sauvegarder le token et les infos utilisateur
      localStorage.setItem('token', response.data.token)
      localStorage.setItem('user', JSON.stringify(response.data.user))
      
// Redirection selon le rôle
const role = response.data.user.role
if (role === 'patient') navigate('/home')
else if (role === 'doctor') navigate('/doctor/dashboard')
else if (role === 'admin') navigate('/admin')

    } catch (error) {
      setError(error.response?.data?.message || 'Erreur serveur')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">

      {/* Logo */}
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold text-green-600">MediCam</h1>
        <p className="text-gray-500 mt-2">Plateforme de consultation médicale en ligne</p>
      </div>

      {/* Carte */}
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Connexion</h2>

        {/* Message d'erreur */}
        {error && (
          <div className="bg-red-50 border border-red-300 text-red-600 rounded-lg px-4 py-3 mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="email"
            placeholder="Adresse email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-green-500"
          />

          {/* Mot de passe avec œil */}
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-green-500 pr-12"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 text-xl"
            >
              {showPassword ? '🙈' : '👁️'}
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>

          {/* Mot de passe oublié */}
          <p className="text-center text-sm text-gray-500">
            <span
              onClick={() => navigate('/forgot-password')}
              className="text-green-600 cursor-pointer hover:underline"
            >
              Mot de passe oublié ?
            </span>
          </p>

          {/* Lien inscription */}
          <p className="text-center text-sm text-gray-500">
            Pas encore de compte ?{' '}
            <span
              onClick={() => navigate('/')}
              className="text-green-600 cursor-pointer hover:underline font-semibold"
            >
              S'inscrire
            </span>
          </p>
        </form>
      </div>
    </div>
  )
}

export default Login