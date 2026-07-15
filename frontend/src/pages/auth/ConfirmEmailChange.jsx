import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import axios from 'axios'

export default function ConfirmEmailChange() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const token = searchParams.get('token')
    if (!token) {
      setStatus('error')
      setMessage('Lien invalide')
      return
    }

    axios.post('http://localhost:5000/api/auth/confirm-email-change', { token })
      .then((res) => {
        if (res.data.user) {
          localStorage.setItem('user', JSON.stringify(res.data.user))
        }
        setStatus('success')
        setMessage(res.data.message)
      })
      .catch((err) => {
        setStatus('error')
        setMessage(err.response?.data?.message || 'Erreur')
      })
  }, [searchParams])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Confirmation email</h1>
        {status === 'loading' && <p className="text-gray-500">Confirmation en cours...</p>}
        {status !== 'loading' && (
          <p className={`text-sm mb-6 ${status === 'success' ? 'text-green-600' : 'text-red-600'}`}>{message}</p>
        )}
        {status !== 'loading' && (
          <button type="button" onClick={() => navigate('/home?tab=settings')} className="bg-green-600 hover:bg-green-700 text-white font-bold px-6 py-2.5 rounded-xl text-sm">
            Retour à mon espace
          </button>
        )}
      </div>
    </div>
  )
}
