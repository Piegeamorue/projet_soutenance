import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

const API = 'http://localhost:5000/api'

export default function DoctorDashboard() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('appointments')
  const [appointments, setAppointments] = useState([])
  const [consultations, setConsultations] = useState([])
  const [prescriptions, setPrescriptions] = useState([])
  const [loading, setLoading] = useState(false)
  const [notification, setNotification] = useState(null)
  
  // Profile settings state
  const [tarif, setTarif] = useState(0)
  const [bio, setBio] = useState('')
  const [yearsExp, setYearsExp] = useState(0)
  const [specialty, setSpecialty] = useState('')

  const token = localStorage.getItem('token')
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  const headers = { Authorization: `Bearer ${token}` }

  useEffect(() => {
    if (!token || user.role !== 'doctor') {
      navigate('/login')
      return
    }
    fetchMe()
  }, [token])

  useEffect(() => {
    if (token) {
      fetchData()
    }
  }, [activeTab])

  const showNotif = (msg, type = 'success') => {
    setNotification({ msg, type })
    setTimeout(() => setNotification(null), 3000)
  }

  const fetchMe = async () => {
    try {
      const res = await axios.get(`${API}/auth/me`, { headers })
      setTarif(res.data.tarif || 0)
      setBio(res.data.bio || '')
      setYearsExp(res.data.years_experience || 0)
      setSpecialty(res.data.specialty || '')
    } catch (err) {
      console.error(err)
    }
  }

  const fetchData = async () => {
    setLoading(true)
    try {
      if (activeTab === 'appointments') {
        const res = await axios.get(`${API}/appointments/my`, { headers })
        setAppointments(res.data)
      } else if (activeTab === 'consultations') {
        const res = await axios.get(`${API}/consultations/my`, { headers })
        setConsultations(res.data)
      } else if (activeTab === 'prescriptions') {
        const res = await axios.get(`${API}/prescriptions/my`, { headers })
        setPrescriptions(res.data)
      }
    } catch (err) {
      console.error(err)
      showNotif("Erreur lors de la récupération des données", "error")
    } finally {
      setLoading(false)
    }
  }

  const handleCancelAppointment = async (id) => {
    if (!window.confirm("Êtes-vous sûr de vouloir annuler ce rendez-vous ?")) return
    try {
      await axios.patch(`${API}/appointments/${id}/cancel`, {}, { headers })
      showNotif("Rendez-vous annulé ✅")
      fetchData()
    } catch (err) {
      showNotif(err.response?.data?.message || "Impossible d'annuler le rendez-vous", "error")
    }
  }

  const handleMarkAbsent = async (id) => {
    try {
      await axios.patch(`${API}/appointments/${id}/absent`, {}, { headers })
      showNotif("Patient marqué absent ❌", "error")
      fetchData()
    } catch (err) {
      showNotif("Erreur lors de l'action", "error")
    }
  }

  const handleUpdateProfile = async (e) => {
    e.preventDefault()
    try {
      const res = await axios.put(
        `${API}/auth/doctors/profile`,
        {
          tarif,
          bio,
          years_experience: yearsExp
        },
        { headers }
      )
      showNotif(res.data.message)
    } catch (err) {
      showNotif("Erreur lors de la mise à jour", "error")
    }
  }

  const tabs = [
    { id: 'appointments', label: 'Rendez-vous', icon: '📅' },
    { id: 'consultations', label: 'Consultations', icon: '💬' },
    { id: 'prescriptions', label: 'Ordonnances rédigées', icon: '📋' },
    { id: 'profile', label: 'Mon profil', icon: '👤' },
  ]

  return (
    <div className="min-h-screen bg-gray-50 font-sans pb-12">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed top-6 right-6 z-50 px-6 py-3 rounded-xl shadow-xl text-white font-semibold text-sm transition-all ${
            notification.type === 'error' ? 'bg-red-500' : 'bg-green-600'
          }`}
        >
          {notification.msg}
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b px-6 py-4 flex justify-between items-center sticky top-0 z-40 shadow-sm">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-extrabold text-green-600">MediCam</h1>
          <span className="text-xs font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded border border-green-200 uppercase">
            Espace Médecin
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600 font-medium">Bonjour, Dr. {user.full_name}</span>
          <button
            onClick={() => { localStorage.clear(); navigate('/login') }}
            className="bg-red-50 hover:bg-red-100 text-red-500 font-semibold px-4 py-2 rounded-xl text-sm transition-colors border border-red-100"
          >
            Déconnexion
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 mt-8 flex flex-col md:flex-row gap-6">
        {/* Navigation Sidebar */}
        <aside className="w-full md:w-64 bg-white rounded-2xl shadow-sm border border-gray-100 p-4 h-fit space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                activeTab === tab.id
                  ? 'bg-green-600 text-white shadow-md'
                  : 'text-gray-600 hover:bg-green-50 hover:text-green-700'
              }`}
            >
              <span className="text-lg">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </aside>

        {/* Main Section */}
        <main className="flex-1">
          {loading && (
            <p className="text-center text-green-600 font-medium py-4">Chargement...</p>
          )}

          {/* ============ APPOINTMENTS ============ */}
          {activeTab === 'appointments' && !loading && (
            <div className="space-y-4">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-800">Mes rendez-vous programmés</h2>
                <p className="text-sm text-gray-500">Gérez vos rendez-vous et vos disponibilités.</p>
              </div>

              {appointments.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-sm">
                  <span className="text-4xl block mb-2">📅</span>
                  <h3 className="font-bold text-gray-700">Aucun rendez-vous planifié</h3>
                  <p className="text-xs text-gray-400 mt-1">Vos futurs rendez-vous s'afficheront ici.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {appointments.map((ap) => (
                    <div key={ap.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:shadow-md transition-shadow">
                      <div className="space-y-1">
                        <h3 className="font-bold text-gray-800 text-base">Patient : {ap.patient_name}</h3>
                        <p className="text-sm text-gray-500">
                          📅 {new Date(ap.appointment_date).toLocaleString('fr-FR')} ({ap.duration} min)
                        </p>
                        <div className="flex gap-2 items-center mt-1">
                          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100">
                            {ap.type}
                          </span>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                            ap.status === 'confirmed' ? 'bg-green-50 text-green-700 border border-green-100' :
                            ap.status === 'cancelled' ? 'bg-red-50 text-red-700 border border-red-100' :
                            'bg-yellow-50 text-yellow-700 border border-yellow-100'
                          }`}>
                            {ap.status === 'confirmed' ? 'Confirmé' : ap.status === 'cancelled' ? 'Annulé' : 'Absent'}
                          </span>
                        </div>
                      </div>
                      
                      {ap.status === 'confirmed' && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleMarkAbsent(ap.id)}
                            className="bg-yellow-50 hover:bg-yellow-100 text-yellow-700 border border-yellow-200 text-xs font-bold px-3 py-2 rounded-lg transition-colors"
                          >
                            Marquer absent
                          </button>
                          <button
                            onClick={() => handleCancelAppointment(ap.id)}
                            className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs font-bold px-3 py-2 rounded-lg transition-colors"
                          >
                            Annuler RDV
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ============ CONSULTATIONS ============ */}
          {activeTab === 'consultations' && !loading && (
            <div className="space-y-4">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-800">Mes consultations médicales</h2>
                <p className="text-sm text-gray-500">Accédez aux salons de messagerie active.</p>
              </div>

              {consultations.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-sm">
                  <span className="text-4xl block mb-2">💬</span>
                  <h3 className="font-bold text-gray-700">Aucune consultation</h3>
                  <p className="text-xs text-gray-400 mt-1">Vos consultations démarrées apparaîtront ici.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {consultations.map((c) => (
                    <div key={c.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex justify-between items-center gap-4 hover:shadow-md transition-shadow">
                      <div>
                        <h3 className="font-bold text-gray-800 text-base">Consultation #{c.id}</h3>
                        <p className="text-sm text-gray-600 font-medium mt-1">Patient : {c.patient_name}</p>
                        <p className="text-xs text-gray-400 mt-1">Démarrée le {new Date(c.created_at).toLocaleDateString('fr-FR')}</p>
                        <div className="mt-2">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                            c.status === 'active' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-gray-100 text-gray-500'
                          }`}>
                            {c.status === 'active' ? 'En cours' : 'Terminée'}
                          </span>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => navigate(`/consultation/${c.id}/chat`)}
                        className={`font-bold text-xs px-4 py-2.5 rounded-xl transition-all ${
                          c.status === 'active'
                            ? 'bg-green-600 hover:bg-green-700 text-white shadow-md'
                            : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                        }`}
                      >
                        {c.status === 'active' ? 'Rejoindre le chat 🚀' : 'Consulter l\'historique'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ============ PRESCRIPTIONS ============ */}
          {activeTab === 'prescriptions' && !loading && (
            <div className="space-y-4">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-800">Ordonnances numériques rédigées</h2>
                <p className="text-sm text-gray-500">Historique des prescriptions transmises aux patients.</p>
              </div>

              {prescriptions.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-sm">
                  <span className="text-4xl block mb-2">📋</span>
                  <h3 className="font-bold text-gray-700">Aucune ordonnance rédigée</h3>
                  <p className="text-xs text-gray-400 mt-1">Les ordonnances que vous créez pendant les chats s'afficheront ici.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {prescriptions.map((pr) => (
                    <div key={pr.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex justify-between items-center gap-4 hover:shadow-md transition-shadow">
                      <div className="space-y-1">
                        <h3 className="font-bold text-gray-800">Ordonnance n°{pr.id}</h3>
                        <p className="text-sm text-gray-600">Patient : <b>{pr.patient_name}</b></p>
                        <p className="text-xs text-gray-500 font-light truncate max-w-md">Médicaments : {pr.medications}</p>
                        <p className="text-xs text-gray-400">Date : {new Date(pr.created_at).toLocaleDateString('fr-FR')}</p>
                      </div>
                      
                      {pr.pdf_path && (
                        <a
                          href={`http://localhost:5000/${pr.pdf_path}`}
                          target="_blank"
                          rel="noreferrer"
                          className="bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 text-xs font-bold px-4 py-2.5 rounded-xl transition-colors text-center whitespace-nowrap"
                        >
                          Télécharger PDF 📥
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ============ PROFILE SETTINGS ============ */}
          {activeTab === 'profile' && !loading && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-6">
              <div>
                <h2 className="text-xl font-bold text-gray-800">Paramètres professionnels</h2>
                <p className="text-sm text-gray-500">Mettez à jour vos informations visibles par les patients.</p>
              </div>

              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className="block">
                    <span className="text-xs text-gray-500 font-semibold uppercase">Spécialité</span>
                    <input
                      type="text"
                      disabled
                      value={specialty}
                      className="mt-1 w-full bg-gray-100 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-500 cursor-not-allowed"
                    />
                  </label>

                  <label className="block">
                    <span className="text-xs text-gray-500 font-semibold uppercase">Années d'expérience</span>
                    <input
                      type="number"
                      required
                      value={yearsExp}
                      onChange={(e) => setYearsExp(Number(e.target.value))}
                      className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500"
                    />
                  </label>
                </div>

                <label className="block">
                  <span className="text-xs text-gray-500 font-semibold uppercase">Tarif de consultation (FCFA)</span>
                  <input
                    type="number"
                    required
                    value={tarif}
                    onChange={(e) => setTarif(Number(e.target.value))}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500"
                  />
                </label>

                <label className="block">
                  <span className="text-xs text-gray-500 font-semibold uppercase">Biographie professionnelle</span>
                  <textarea
                    rows={4}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Parlez de votre parcours, de vos compétences..."
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500 resize-none"
                  />
                </label>

                <button
                  type="submit"
                  className="bg-green-600 hover:bg-green-700 text-white font-bold px-6 py-2.5 rounded-xl transition-all shadow-md mt-2"
                >
                  Enregistrer les modifications
                </button>
              </form>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
