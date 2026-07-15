import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

const SPECIALTIES = [
  'Médecin Généraliste', 'Cardiologue', 'Pédiatre', 'Gynécologue-Obstétricien',
  'Neurologue', 'Psychiatre', 'Ophtalmologue', 'ORL', 'Pneumologue', 'Dermatologue',
  'Néphrologue', 'Endocrinologue', 'Hépato-Gastro-Entérologue', 'Oncologue',
  'Interniste', 'Urologue', 'Radiologue', 'Médecin de Santé Publique', 'Rhumatologue',
  'Gériatre', 'Médecin du Sport', 'Infectiologue', 'Hématologue', 'Allergologue',
  'Gastro-Entérologue Pédiatrique', 'Médecin Nutritionniste', 'Médecin Rééducateur',
  'Médecin du Travail', 'Addictologue', 'Médecin Esthétique', 'Sexologue',
  'Anesthésiste-Réanimateur'
]

// Calcul force mot de passe
const getPasswordStrength = (password) => {
  if (!password) return { level: 0, label: '', bars: 0 }
  const hasMin = password.length >= 8
  const hasUpper = /[A-Z]/.test(password)
  const hasNumber = /[0-9]/.test(password)
  const score = [hasMin, hasUpper, hasNumber].filter(Boolean).length
  if (score === 1) return { level: 1, label: 'Faible', bars: 1 }
  if (score === 2) return { level: 2, label: 'Moyen', bars: 2 }
  if (score === 3) return { level: 3, label: 'Élevé', bars: 3 }
  return { level: 0, label: '', bars: 0 }
}

const PasswordStrengthBar = ({ password }) => {
  const strength = getPasswordStrength(password)
  if (!password) return null

  const barColors = {
    1: ['bg-red-500', 'bg-gray-200', 'bg-gray-200'],
    2: ['bg-orange-400', 'bg-orange-400', 'bg-gray-200'],
    3: ['bg-green-500', 'bg-green-500', 'bg-green-500'],
  }

  const labelColors = {
    1: 'text-red-500',
    2: 'text-orange-400',
    3: 'text-green-600',
  }

  const colors = barColors[strength.level] || ['bg-gray-200', 'bg-gray-200', 'bg-gray-200']

  return (
    <div className="mt-1 space-y-1">
      <div className="flex gap-1">
        {colors.map((color, i) => (
          <div key={i} className={`h-1.5 flex-1 rounded-full ${color} transition-all duration-300`} />
        ))}
      </div>
      {strength.label && (
        <p className={`text-xs font-medium ${labelColors[strength.level]}`}>
          Force : {strength.label}
        </p>
      )}
      <p className="text-xs text-gray-400">Min. 8 caractères, 1 majuscule, 1 chiffre</p>
    </div>
  )
}

function Register() {
  const [role, setRole] = useState(null)
  const [patientPassword, setPatientPassword] = useState('')
  const [doctorPassword, setDoctorPassword] = useState('')
  const navigate = useNavigate()

  const validatePassword = (password) => {
    if (password.length < 8) return '❌ Le mot de passe doit contenir au moins 8 caractères'
    if (!/[A-Z]/.test(password)) return '❌ Le mot de passe doit contenir au moins une majuscule'
    if (!/[0-9]/.test(password)) return '❌ Le mot de passe doit contenir au moins un chiffre'
    return null
  }

  const handlePatientSubmit = async (e) => {
    e.preventDefault()

    const full_name = e.target.full_name.value.trim()
    const email = e.target.email.value.trim()
    const password = e.target.password.value
    const confirm_password = e.target.confirm_password.value
    const gender = e.target.gender.value
    const age = e.target.age.value
    const terms_accepted = e.target.terms_accepted.checked

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) return alert('❌ Adresse email invalide')

    const pwdError = validatePassword(password)
    if (pwdError) return alert(pwdError)

    if (password !== confirm_password) return alert('❌ Les mots de passe ne correspondent pas')

    if (!gender) return alert('❌ Veuillez sélectionner votre sexe')

    if (!age || isNaN(age) || parseInt(age) < 1 || parseInt(age) > 120) {
      return alert('❌ Veuillez entrer un âge valide')
    }

    if (!terms_accepted) return alert('❌ Vous devez accepter les conditions d\'utilisation')

    try {
      const response = await axios.post('http://localhost:5000/api/auth/register/patient', {
        full_name, email, password, confirm_password,
        gender, age: parseInt(age), terms_accepted: true
      })
      alert(response.data.message)
      navigate('/login')
    } catch (error) {
      alert(error.response?.data?.message || 'Erreur serveur')
    }
  }

  const handleDoctorSubmit = async (e) => {
    e.preventDefault()

    const full_name = e.target.full_name.value.trim()
    const email = e.target.email.value.trim()
    const password = e.target.password.value
    const confirm_password = e.target.confirm_password.value
    const onmc_number = e.target.onmc_number.value.trim()
    const specialty = e.target.specialty.value
    const workplace = e.target.workplace.value.trim()
    const gender = e.target.gender.value
    const age = e.target.age.value
    const terms_accepted = e.target.terms_accepted.checked

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) return alert('❌ Adresse email invalide')

    const pwdError = validatePassword(password)
    if (pwdError) return alert(pwdError)

    if (password !== confirm_password) return alert('❌ Les mots de passe ne correspondent pas')

    if (!gender) return alert('❌ Veuillez sélectionner votre sexe')

    if (!age || isNaN(age) || parseInt(age) < 1 || parseInt(age) > 120) {
      return alert('❌ Veuillez entrer un âge valide')
    }

    if (!terms_accepted) return alert('❌ Vous devez accepter les conditions d\'utilisation et la charte de déontologie')

    // Vérification ONMC unique
    try {
      const check = await axios.get(`http://localhost:5000/api/auth/check-onmc?onmc=${onmc_number}`)
      if (check.data.exists) return alert('❌ Ce numéro ONMC est déjà enregistré sur MediCam')
    } catch (error) {
      // Si la route n'existe pas encore, on continue
    }

    try {
      const formData = new FormData()
      formData.append('full_name', full_name)
      formData.append('email', email)
      formData.append('onmc_number', onmc_number)
      formData.append('specialty', specialty)
      formData.append('workplace', workplace)
      formData.append('password', password)
      formData.append('confirm_password', confirm_password)
      formData.append('gender', gender)
      formData.append('age', parseInt(age))
      formData.append('terms_accepted', true)
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

      {/* Logo */}
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold text-green-600">MediCam</h1>
        <p className="text-gray-500 mt-2">Plateforme de consultation médicale en ligne</p>
      </div>

      {/* Carte principale */}
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">
        <h2 className="text-2xl font-bold text-gray-800 mb-2 text-center">Créer un compte</h2>
        <p className="text-gray-500 text-center mb-8">Vous êtes ?</p>

        {/* Choix rôle */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <button
            onClick={() => setRole('patient')}
            className={`p-6 rounded-xl border-2 flex flex-col items-center gap-3 transition-all
              ${role === 'patient' ? 'border-green-600 bg-green-50' : 'border-gray-200 hover:border-green-300'}`}
          >
            <span className="text-4xl">🧑‍⚕️</span>
            <span className="font-semibold text-gray-700">Patient</span>
          </button>
          <button
            onClick={() => setRole('doctor')}
            className={`p-6 rounded-xl border-2 flex flex-col items-center gap-3 transition-all
              ${role === 'doctor' ? 'border-green-600 bg-green-50' : 'border-gray-200 hover:border-green-300'}`}
          >
            <span className="text-4xl">👨‍⚕️</span>
            <span className="font-semibold text-gray-700">Médecin</span>
          </button>
        </div>

        {/* ── FORMULAIRE PATIENT ── */}
        {role === 'patient' && (
          <form onSubmit={handlePatientSubmit} className="space-y-4">
            <input
              type="text" name="full_name" placeholder="Nom complet" required
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-green-500"
            />
            <input
              type="email" name="email" placeholder="Adresse email" required
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-green-500"
            />

            {/* Sexe */}
            <select
              name="gender" required
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-green-500 text-gray-700"
            >
              <option value="">Sexe</option>
              <option value="Homme">Homme</option>
              <option value="Femme">Femme</option>
            </select>

            {/* Âge */}
            <input
              type="number" name="age" placeholder="Âge" min="1" max="120" required
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-green-500"
            />

            {/* Mot de passe + barre */}
            <div>
              <input
                type="password" name="password" placeholder="Mot de passe" required
                value={patientPassword}
                onChange={(e) => setPatientPassword(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-green-500"
              />
              <PasswordStrengthBar password={patientPassword} />
            </div>

            <input
              type="password" name="confirm_password" placeholder="Confirmer le mot de passe" required
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-green-500"
            />

            {/* CGU */}
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" name="terms_accepted" className="mt-1 accent-green-600 w-4 h-4 flex-shrink-0" />
              <span className="text-sm text-gray-600">
                J'accepte les{' '}
                <span onClick={() => navigate('/privacy')} className="text-green-600 hover:underline cursor-pointer font-medium">
                  conditions d'utilisation et la politique de confidentialité
                </span>{' '}
                de MediCam
              </span>
            </label>

            <button
              type="submit"
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition-colors"
            >
              S'inscrire
            </button>
          </form>
        )}

        {/* ── FORMULAIRE MÉDECIN ── */}
        {role === 'doctor' && (
          <form onSubmit={handleDoctorSubmit} className="space-y-4">
            <input
              type="text" name="full_name" placeholder="Nom complet" required
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-green-500"
            />
            <input
              type="email" name="email" placeholder="Adresse email" required
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-green-500"
            />
            <input
              type="text" name="onmc_number" placeholder="Numéro ONMC (ex: ONMC-2026-8945)" required
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-green-500"
            />

            {/* Spécialité */}
            <select
              name="specialty" required
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-green-500 text-gray-700"
            >
              <option value="">Sélectionnez votre spécialité</option>
              {SPECIALTIES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            <input
              type="text" name="workplace" placeholder="Lieu de travail (optionnel)"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-green-500"
            />

            {/* Sexe */}
            <select
              name="gender" required
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-green-500 text-gray-700"
            >
              <option value="">Sexe</option>
              <option value="Homme">Homme</option>
              <option value="Femme">Femme</option>
            </select>

            {/* Âge */}
            <input
              type="number" name="age" placeholder="Âge" min="25" max="80" required
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-green-500"
            />

            {/* Mot de passe + barre */}
            <div>
              <input
                type="password" name="password" placeholder="Mot de passe (minimum 8 caractères)" required
                value={doctorPassword}
                onChange={(e) => setDoctorPassword(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-green-500"
              />
              <PasswordStrengthBar password={doctorPassword} />
            </div>

            <input
              type="password" name="confirm_password" placeholder="Confirmer le mot de passe" required
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-green-500"
            />

            {/* Documents */}
            <div className="space-y-3">
              <p className="text-sm font-semibold text-gray-600">Documents obligatoires :</p>
              <label className="block">
                <span className="text-sm text-gray-500">CNI ou Passeport</span>
                <input name="cni" type="file" accept="image/*,.pdf" required
                  className="mt-1 w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-green-50 file:text-green-600 hover:file:bg-green-100" />
              </label>
              <label className="block">
                <span className="text-sm text-gray-500">Attestation ONMC</span>
                <input name="attestation" type="file" accept="image/*,.pdf" required
                  className="mt-1 w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-green-50 file:text-green-600 hover:file:bg-green-100" />
              </label>
              <label className="block">
                <span className="text-sm text-gray-500">Selfie avec CNI en main</span>
                <input name="selfie" type="file" accept="image/*" required
                  className="mt-1 w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-green-50 file:text-green-600 hover:file:bg-green-100" />
              </label>
            </div>

            {/* CGU médecin */}
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" name="terms_accepted" className="mt-1 accent-green-600 w-4 h-4 flex-shrink-0" />
              <span className="text-sm text-gray-600">
                J'atteste que les informations fournies sont exactes et j'accepte les{' '}
                <span onClick={() => navigate('/privacy')} className="text-green-600 hover:underline cursor-pointer font-medium">
                  conditions d'utilisation, la politique de confidentialité ainsi que la charte de déontologie médicale
                </span>{' '}
                de MediCam
              </span>
            </label>

            <button
              type="submit"
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition-colors"
            >
              Soumettre mon dossier
            </button>

            <p className="text-center text-sm text-gray-500">
              Compte suspendu ?{' '}
              <span onClick={() => navigate('/recover-account')} className="text-green-600 cursor-pointer hover:underline font-semibold">
                Récupérer mon compte
              </span>
            </p>
          </form>
        )}

        {/* Lien connexion */}
        <p className="text-center text-sm text-gray-500 mt-6">
          Déjà un compte ?{' '}
          <span onClick={() => navigate('/login')} className="text-green-600 cursor-pointer hover:underline font-semibold">
            Se connecter
          </span>
        </p>
      </div>
    </div>
  )
}

export default Register
