import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'

const API = 'http://localhost:5000/api'

export default function DoctorProfile() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [doctor, setDoctor] = useState(null)
  const [loading, setLoading] = useState(true)
  const [bookingDate, setBookingDate] = useState('')
  const [bookingTime, setBookingTime] = useState('')
  const [bookingType, setBookingType] = useState('En ligne')
  const [bookingDuration, setBookingDuration] = useState(30)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const token = localStorage.getItem('token')
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  const headers = { Authorization: `Bearer ${token}` }

  const slots = [
    '08:00', '09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00'
  ]

  useEffect(() => {
    if (!token) {
      navigate('/login')
      return
    }
    fetchDoctor()
  }, [id])

  const fetchDoctor = async () => {
    try {
      const res = await axios.get(`${API}/auth/doctors/${id}`, { headers })
      setDoctor(res.data)
    } catch (err) {
      setError(err.response?.data?.message || 'Médecin introuvable')
    } finally {
      setLoading(false)
    }
  }

  const handleBook = async (e) => {
    e.preventDefault()
    if (!bookingDate || !bookingTime) {
      setError('Veuillez sélectionner la date et l\'heure.')
      return
    }

    setSubmitting(true)
    setError('')
    setMessage('')

    try {
      // Combined date and time
      const datetime = new Date(`${bookingDate}T${bookingTime}:00`)
      await axios.post(
        `${API}/appointments/book`,
        {
          doctor_id: id,
          appointment_date: datetime.toISOString(),
          duration: bookingDuration,
          type: bookingType
        },
        { headers }
      )
      setMessage('✅ Rendez-vous réservé avec succès ! Un email de confirmation vous a été envoyé.')
      setBookingDate('')
      setBookingTime('')
    } catch (err) {
      setError(err.response?.data?.message || 'Ce créneau est déjà pris ou indisponible')
    } finally {
      setSubmitting(false)
    }
  }

  const handleStartInstantConsultation = async () => {
    setSubmitting(true)
    setError('')
    try {
      const { data } = await axios.post(
        `${API}/consultations/start`,
        {
          doctor_id: id,
          type: 'En ligne'
        },
        { headers }
      )
      // Redirect to the newly created consultation chat
      navigate(`/consultation/${data.id}/chat`)
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors du démarrage de la consultation')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500 font-medium">Chargement du profil du médecin...</p>
      </div>
    )
  }

  if (error && !doctor) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
        <div className="bg-red-50 text-red-600 px-6 py-4 rounded-xl border border-red-200 mb-4 max-w-md text-center">
          {error}
        </div>
        <button
          onClick={() => navigate('/home')}
          className="text-green-600 font-semibold hover:underline"
        >
          Retour à l'accueil
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans pb-12">
      {/* Header */}
      <header className="bg-white border-b px-6 py-4 sticky top-0 z-40 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span
            onClick={() => navigate('/home')}
            className="text-2xl font-extrabold text-green-600 cursor-pointer"
          >
            MediCam
          </span>
          <span className="text-sm font-medium text-gray-400">|</span>
          <span className="text-sm font-medium text-gray-600">Profil Médecin</span>
        </div>
        <button
          onClick={() => navigate(-1)}
          className="text-sm text-gray-600 hover:text-green-600 font-semibold transition-colors"
        >
          ← Retour
        </button>
      </header>

      <main className="max-w-4xl mx-auto px-4 mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profil Médecin */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col sm:flex-row gap-6 items-center sm:items-start">
            <div className="w-24 h-24 rounded-full bg-green-50 border-2 border-green-200 flex items-center justify-center text-4xl shadow-inner flex-shrink-0">
              👨‍⚕️
            </div>
            <div className="flex-1 text-center sm:text-left space-y-2">
              <h2 className="text-2xl font-bold text-gray-800">Dr. {doctor.full_name}</h2>
              <p className="text-green-600 font-semibold">{doctor.specialty}</p>
              <div className="flex items-center justify-center sm:justify-start gap-4 text-sm text-gray-500">
                <span>⭐ {doctor.avg_rating || '0'}/5</span>
                <span>•</span>
                <span>{doctor.total_consultations || '0'} consultations</span>
              </div>
              <p className="text-sm text-gray-500 leading-relaxed font-light">
                {doctor.bio || 'Aucune description disponible pour ce médecin.'}
              </p>
              <div className="pt-2 flex flex-wrap gap-4 justify-center sm:justify-start">
                <span className="px-3 py-1.5 bg-green-50 text-green-700 text-xs font-semibold rounded-full border border-green-200">
                  Tarif : {doctor.tarif ? `${doctor.tarif} FCFA` : 'Non défini'}
                </span>
                {doctor.years_experience && (
                  <span className="px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full border border-blue-200">
                    Expérience : {doctor.years_experience} ans
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Démarrer consultation immédiate */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="space-y-1">
              <h3 className="font-bold text-green-800 text-lg">Consultation en ligne immédiate</h3>
              <p className="text-sm text-green-700">Démarrez directement une session de chat en ligne avec ce médecin.</p>
            </div>
            <button
              onClick={handleStartInstantConsultation}
              disabled={submitting}
              className="bg-green-600 hover:bg-green-700 text-white font-bold px-6 py-3 rounded-xl shadow-md transition-colors whitespace-nowrap disabled:opacity-50"
            >
              🚀 Discuter maintenant
            </button>
          </div>
        </div>

        {/* Formulaire prise RDV */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 h-fit space-y-4">
          <h3 className="font-bold text-gray-800 text-lg">Prendre rendez-vous</h3>
          {message && (
            <div className="bg-green-50 border border-green-200 text-green-600 text-xs rounded-lg p-3">
              {message}
            </div>
          )}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg p-3">
              {error}
            </div>
          )}
          <form onSubmit={handleBook} className="space-y-3">
            <label className="block">
              <span className="text-xs text-gray-500 font-semibold uppercase">Date</span>
              <input
                type="date"
                required
                min={new Date().toISOString().split('T')[0]}
                value={bookingDate}
                onChange={(e) => setBookingDate(e.target.value)}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500"
              />
            </label>

            <label className="block">
              <span className="text-xs text-gray-500 font-semibold uppercase">Heure</span>
              <select
                required
                value={bookingTime}
                onChange={(e) => setBookingTime(e.target.value)}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500"
              >
                <option value="">Sélectionner un horaire</option>
                {slots.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-xs text-gray-500 font-semibold uppercase">Type de consultation</span>
              <select
                required
                value={bookingType}
                onChange={(e) => setBookingType(e.target.value)}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500"
              >
                <option>En ligne</option>
                <option>Cabinet</option>
                <option>Domicile</option>
              </select>
            </label>

            <label className="block">
              <span className="text-xs text-gray-500 font-semibold uppercase">Durée (minutes)</span>
              <select
                required
                value={bookingDuration}
                onChange={(e) => setBookingDuration(Number(e.target.value))}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500"
              >
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={60}>60 minutes</option>
              </select>
            </label>

            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-4 bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 rounded-lg transition-colors disabled:opacity-50"
            >
              {submitting ? 'Validation...' : 'Confirmer la réservation'}
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}
