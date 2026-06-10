import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

function RecoverAccount() {
  const [step, setStep] = useState(1)
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    try {
      const response = await axios.post(
        'http://localhost:5000/api/auth/recover-account',
        { email }
      )
      setStep(2)
    } catch (error) {
      setError(error.response?.data?.message || 'Erreur serveur')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">

      {/* Logo */}
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold text-green-600">MediCam</h1>
        <p className="text-gray-500 mt-2">Plateforme de consultation médicale en ligne</p>
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">

        {step === 1 && (
          <>
            <h2 className="text-2xl font-bold text-gray-800 mb-2 text-center">
              Récupérer mon compte
            </h2>
            <p className="text-gray-500 text-center mb-6 text-sm">
              Votre compte médecin a été suspendu ? Soumettez une demande de récupération.
            </p>

            {/* Info paiement */}
            <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4 mb-6">
              <p className="text-yellow-700 text-sm font-semibold">
                ⚠️ Frais de récupération : 5 000 FCFA
              </p>
              <p className="text-yellow-600 text-xs mt-1">
                Ces frais sont non remboursables et seront exigés avant la réactivation de votre compte.
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-300 text-red-600 rounded-lg px-4 py-3 mb-4 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="email"
                placeholder="Adresse email de votre compte suspendu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-green-500"
              />

              <button
                type="submit"
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition-colors"
              >
                Soumettre la demande
              </button>

              <p className="text-center text-sm text-gray-500">
                <span
                  onClick={() => navigate('/')}
                  className="text-green-600 cursor-pointer hover:underline"
                >
                  ← Retour à l'inscription
                </span>
              </p>
            </form>
          </>
        )}

        {step === 2 && (
          <div className="text-center space-y-4">
            <div className="text-6xl">✅</div>
            <h2 className="text-2xl font-bold text-gray-800">
              Demande envoyée !
            </h2>
            <p className="text-gray-500 text-sm">
              Votre demande de récupération a été soumise. Notre équipe vous contactera par email sous 24-48h avec les instructions de paiement des 5 000 FCFA.
            </p>
            <button
              onClick={() => navigate('/login')}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition-colors"
            >
              Retour à la connexion
            </button>
          </div>
        )}

      </div>
    </div>
  )
}

export default RecoverAccount