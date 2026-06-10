import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

function Register() {
  const [role, setRole] = useState(null)
  const navigate = useNavigate()

  const handlePatientSubmit = async (e) => {
    e.preventDefault()
    
    const full_name = e.target.full_name.value
    const email = e.target.email.value
    const password = e.target.password.value
    const confirm_password = e.target.confirm_password.value
  
    // Validation email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      alert('❌ Adresse email invalide')
      return
    }
  
    // Validation mot de passe
    if (password.length < 8) {
      alert('❌ Le mot de passe doit contenir au moins 8 caractères')
      return
    }
  
    // Validation confirmation mot de passe
    if (password !== confirm_password) {
      alert('❌ Les mots de passe ne correspondent pas')
      return
    }
  
    try {
      const response = await axios.post('http://localhost:5000/api/auth/register/patient', {
        full_name,
        email,
        password,
        confirm_password
      })
      alert(response.data.message)
      navigate('/login')
    } catch (error) {
      alert(error.response?.data?.message || 'Erreur serveur')
    }
  }
 
  const handleDoctorSubmit = async (e) => {
    e.preventDefault()
  
    const password = e.target.password.value
    const confirm_password = e.target.confirm_password.value
  
    // Validation email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(e.target.email.value)) {
      alert('❌ Adresse email invalide')
      return
    }
  
    // Validation mot de passe
    if (password.length < 8) {
      alert('❌ Le mot de passe doit contenir au moins 8 caractères')
      return
    }
  
    if (password !== confirm_password) {
      alert('❌ Les mots de passe ne correspondent pas')
      return
    }
  
    try {
      const formData = new FormData()
      formData.append('full_name', e.target.full_name.value)
      formData.append('email', e.target.email.value)
      formData.append('onmc_number', e.target.onmc_number.value)
      formData.append('specialty', e.target.specialty.value)
      formData.append('workplace', e.target.workplace.value)  
      formData.append('password', password)
      formData.append('confirm_password', confirm_password)
      formData.append('cni', e.target.cni.files[0])
      formData.append('attestation', e.target.attestation.files[0])
      formData.append('selfie', e.target.selfie.files[0])
  
      const response = await axios.post(
        'http://localhost:5000/api/auth/register/doctor',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      )
  
      alert('✅ Dossier soumis ! Votre demande sera traitée sous 24-48h.')
      navigate('/login')
  
    } catch (error) {
      alert(error.response?.data?.message || 'Erreur serveur')
    }
  }
  
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      
      {/* Logo et titre */}
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold text-green-600">MediCam</h1>
        <p className="text-gray-500 mt-2">Plateforme de consultation médicale en ligne</p>
      </div>

      {/* Carte principale */}
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">
        <h2 className="text-2xl font-bold text-gray-800 mb-2 text-center">Créer un compte</h2>
        <p className="text-gray-500 text-center mb-8">Vous êtes ?</p>

        {/* Choix du rôle */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          
          {/* Carte Patient */}
          <button
            onClick={() => setRole('patient')}
            className={`p-6 rounded-xl border-2 flex flex-col items-center gap-3 transition-all
              ${role === 'patient' 
                ? 'border-green-600 bg-green-50' 
                : 'border-gray-200 hover:border-green-300'}`}
          >
            <span className="text-4xl">🧑‍⚕️</span>
            <span className="font-semibold text-gray-700">Patient</span>
          </button>

          {/* Carte Médecin */}
          <button
            onClick={() => setRole('doctor')}
            className={`p-6 rounded-xl border-2 flex flex-col items-center gap-3 transition-all
              ${role === 'doctor' 
                ? 'border-green-600 bg-green-50' 
                : 'border-gray-200 hover:border-green-300'}`}
          >
            <span className="text-4xl">👨‍⚕️</span>
            <span className="font-semibold text-gray-700">Médecin</span>
          </button>

        </div>

        {/* Formulaire Patient */}
        {role === 'patient' && (
          <form onSubmit={handlePatientSubmit} className="space-y-4">
            <input
              type="text"
              name="full_name"
              placeholder="Nom complet"
              required
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-green-500"
            />
            <input
              type="email"
              name="email"
              placeholder="Adresse email"
              required
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-green-500"
            />
            <input
              type="password"
              name="password"
              placeholder="Mot de passe"
              required
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-green-500"
            />
            <input
              type="password"
              name="confirm_password"
              placeholder="Confirmer le mot de passe"
              required
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-green-500"
            />
            <button
              type="submit"
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition-colors"
            >
              S'inscrire
            </button>
          </form>
        )}

        {/* Formulaire Médecin */}
        {role === 'doctor' && (
  <form onSubmit={handleDoctorSubmit} className="space-y-4">
    <input
      type="text"
      name="full_name"
      placeholder="Nom complet"
      required
      className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-green-500"
    />
    <input
      type="email"
      name="email"
      placeholder="Adresse email"
      required
      className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-green-500"
    />
    <input
      type="text"
      name="onmc_number"
      placeholder="Numéro ONMC (ex: 12345/2023)"
      required
      className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-green-500"
    />
    <input
      type="text"
      name="workplace"
      placeholder="Lieu de travail"
      className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-green-500"
    />
    <select
      name="specialty"
      required
      className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-green-500 text-gray-500"
    >
      <option value="">Sélectionnez votre spécialité</option>
      <option>Médecin Généraliste</option>
      <option>Cardiologue</option>
      <option>Pédiatre</option>
      <option>Gynécologue-Obstétricien</option>
      <option>Chirurgien Général</option>
      <option>Neurologue</option>
      <option>Psychiatre</option>
      <option>Ophtalmologue</option>
      <option>ORL</option>
      <option>Pneumologue</option>
      <option>Dermatologue</option>
      <option>Néphrologue</option>
      <option>Endocrinologue</option>
      <option>Hépato-Gastro-Entérologue</option>
      <option>Oncologue</option>
      <option>Interniste</option>
      <option>Chirurgien Orthopédiste</option>
      <option>Urologue</option>
      <option>Chirurgien Pédiatrique</option>
      <option>Neurochirurgien</option>
      <option>Anesthésiste-Réanimateur</option>
      <option>Radiologue</option>
      <option>Médecin de Santé Publique</option>
    </select>
    <input
      type="password"
      name="password"
      placeholder="Mot de passe (minimum 8 caractères)"
      required
      className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-green-500"
    />
    <input
      type="password"
      name="confirm_password"
      placeholder="Confirmer le mot de passe"
      required
      className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-green-500"
    />

    {/* Upload documents */}
    <div className="space-y-3">
      <p className="text-sm font-semibold text-gray-600">Documents obligatoires :</p>
      <label className="block">
        <span className="text-sm text-gray-500">CNI ou Passeport</span>
        <input name="cni" type="file" accept="image/*,.pdf" required className="mt-1 w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-green-50 file:text-green-600 hover:file:bg-green-100"/>
      </label>
      <label className="block">
        <span className="text-sm text-gray-500">Attestation ONMC</span>
        <input name="attestation" type="file" accept="image/*,.pdf" required className="mt-1 w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-green-50 file:text-green-600 hover:file:bg-green-100"/>
      </label>
      <label className="block">
        <span className="text-sm text-gray-500">Selfie avec CNI en main</span>
        <input name="selfie" type="file" accept="image/*" required className="mt-1 w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-green-50 file:text-green-600 hover:file:bg-green-100"/>
      </label>
    </div>

    <button
      type="submit"
      className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition-colors"
    >
      Soumettre mon dossier
    </button>

    {/* Récupérer mon compte */}
    <p className="text-center text-sm text-gray-500">
      Compte suspendu ?{' '}
      <span
        onClick={() => navigate('/recover-account')}
        className="text-green-600 cursor-pointer hover:underline font-semibold"
      >
        Récupérer mon compte
      </span>
    </p>
  </form>
)}

        {/* Lien connexion */}
        <p className="text-center text-sm text-gray-500 mt-6">
          Déjà un compte ?{' '}
          <span
            onClick={() => navigate('/login')}
            className="text-green-600 cursor-pointer hover:underline font-semibold"
          >
            Se connecter
          </span>
        </p>
      </div>
    </div>
  )
}

export default Register