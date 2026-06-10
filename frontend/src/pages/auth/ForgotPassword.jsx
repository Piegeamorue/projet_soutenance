import { useNavigate } from 'react-router-dom'

function ForgotPassword() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">

      {/* Logo */}
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold text-green-600">MediCam</h1>
        <p className="text-gray-500 mt-2">Plateforme de consultation médicale en ligne</p>
      </div>

      {/* Carte */}
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">
        
        <h2 className="text-2xl font-bold text-gray-800 mb-2 text-center">
          Mot de passe oublié
        </h2>
        <p className="text-gray-500 text-center mb-6 text-sm">
          Entrez votre email et nous vous enverrons un lien de réinitialisation
        </p>

        <div className="space-y-4">
          <input
            type="email"
            placeholder="Adresse email"
            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-green-500"
          />

          <button className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition-colors">
            Envoyer le lien
          </button>

          {/* Retour connexion */}
          <p className="text-center text-sm text-gray-500">
            <span
              onClick={() => navigate('/login')}
              className="text-green-600 cursor-pointer hover:underline"
            >
              ← Retour à la connexion
            </span>
          </p>
        </div>
      </div>
    </div>
  )
}

export default ForgotPassword