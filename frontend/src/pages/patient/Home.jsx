import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import PatientSidebar from '../../components/PatientSidebar'

const API = 'http://localhost:5000/api'

export default function Home() {
  const navigate = useNavigate()
  
  // Navigation states
  const [activeTab, setActiveTab] = useState('search')
  
  // Data states
  const [doctors, setDoctors] = useState([])
  const [appointments, setAppointments] = useState([])
  const [consultations, setConsultations] = useState([])
  const [prescriptions, setPrescriptions] = useState([])
  
  // Search & Filter states
  const [search, setSearch] = useState('')
  const [specialty, setSpecialty] = useState('')
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  const token = localStorage.getItem('token')
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  const headers = { Authorization: `Bearer ${token}` }

  const specialties = [
    'Médecin Généraliste', 'Cardiologue', 'Pédiatre',
    'Gynécologue-Obstétricien', 'Neurologue', 'Psychiatre',
    'Ophtalmologue', 'ORL', 'Pneumologue', 'Dermatologue',
    'Néphrologue', 'Endocrinologue', 'Hépato-Gastro-Entérologue',
    'Oncologue', 'Interniste', 'Urologue', 'Radiologue',
    'Médecin de Santé Publique', 'Rhumatologue', 'Gériatre',
    'Médecin du Sport', 'Infectiologue', 'Hématologue',
    'Médecin du Travail', 'Allergologue',
    'Gastro-Entérologue Pédiatrique', 'Médecin Nutritionniste',
    'Médecin Rééducateur'
  ]

  useEffect(() => {
    if (!token) {
      navigate('/login')
      return
    }
  }, [token])

  useEffect(() => {
    if (token) {
      fetchData()
    }
  }, [activeTab])

  const fetchData = async () => {
    setLoading(true)
    try {
      if (activeTab === 'search') {
        const { data } = await axios.get(`${API}/auth/doctors`, { headers })
        setDoctors(data)
      } else if (activeTab === 'appointments') {
        const { data } = await axios.get(`${API}/appointments/my`, { headers })
        setAppointments(data)
      } else if (activeTab === 'consultations') {
        const { data } = await axios.get(`${API}/consultations/my`, { headers })
        setConsultations(data)
      } else if (activeTab === 'prescriptions') {
        const { data } = await axios.get(`${API}/prescriptions/my`, { headers })
        setPrescriptions(data)
      }
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleCancelAppointment = async (id) => {
    if (!window.confirm("Êtes-vous sûr de vouloir annuler ce rendez-vous ?")) return
    setActionLoading(true)
    try {
      await axios.patch(`${API}/appointments/${id}/cancel`, {}, { headers })
      alert("✅ Le rendez-vous a bien été annulé.")
      // Refresh
      const { data } = await axios.get(`${API}/appointments/my`, { headers })
      setAppointments(data)
    } catch (err) {
      alert(err.response?.data?.message || "Erreur lors de l'annulation")
    } finally {
      setActionLoading(false)
    }
  }

  const filtered = doctors.filter(doc => {
    const matchName = doc.full_name.toLowerCase().includes(search.toLowerCase())
    const matchSpecialty = specialty ? doc.specialty === specialty : true
    return matchName && matchSpecialty
  })

  const tabs = [
    { id: 'search', label: 'Trouver un médecin', icon: '🔍' },
    { id: 'appointments', label: 'Mes rendez-vous', icon: '📅' },
    { id: 'consultations', label: 'Mes consultations', icon: '💬' },
    { id: 'prescriptions', label: 'Mes ordonnances', icon: '📋' },
  ]

  return (
    <div className="min-h-screen bg-gray-50 font-sans pb-12">
      {/* Header */}
      <PatientSidebar />

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

        {/* Content Area */}
        <main className="flex-1">
          {/* ============ SEARCH DOCTORS ============ */}
          {activeTab === 'search' && (
            <div className="space-y-6">
              {/* Search fields */}
              <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
                <h2 className="text-xl font-bold text-gray-800 mb-4">
                  Rechercher un praticien
                </h2>
                <div className="flex flex-col md:flex-row gap-4">
                  <input
                    type="text"
                    placeholder="Rechercher par nom..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="flex-1 border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-green-500"
                  />
                  <select
                    value={specialty}
                    onChange={(e) => setSpecialty(e.target.value)}
                    className="flex-1 border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-green-500 text-gray-500"
                  >
                    <option value="">Toutes les spécialités</option>
                    {specialties.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Doctors List */}
              {loading ? (
                <p className="text-center text-green-600 font-medium">Chargement des praticiens...</p>
              ) : filtered.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100">
                  <p className="text-gray-500 text-sm font-medium">Aucun médecin trouvé</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filtered.map(doc => (
                    <div
                      key={doc.id}
                      className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow flex flex-col justify-between"
                    >
                      <div>
                        {/* Profile pic */}
                        <div className="flex items-center gap-4 mb-4">
                          <div className="w-14 h-14 rounded-full bg-green-50 border border-green-200 flex items-center justify-center text-2xl flex-shrink-0">
                            👨‍⚕️
                          </div>
                          <div>
                            <h3 className="font-bold text-gray-800 text-base">Dr. {doc.full_name}</h3>
                            <p className="text-green-600 text-xs font-semibold">{doc.specialty}</p>
                          </div>
                        </div>

                        {/* Summary info */}
                        <div className="space-y-1.5 mb-6 text-sm text-gray-500">
                          <p>⭐ {doc.avg_rating || '0'}/5 ({doc.total_consultations || '0'} consultations)</p>
                          <p className="font-semibold text-gray-700">
                            💰 {doc.tarif ? `${doc.tarif} FCFA` : 'Tarif non défini'}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => navigate(`/doctor/${doc.id}`)}
                        className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 rounded-lg transition-colors text-sm"
                      >
                        Voir le profil & RDV
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ============ APPOINTMENTS ============ */}
          {activeTab === 'appointments' && (
            <div className="space-y-4">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-800">Mes rendez-vous</h2>
                <p className="text-sm text-gray-500">Retrouvez l'historique et les détails de vos rendez-vous.</p>
              </div>

              {loading ? (
                <p className="text-center text-green-600 font-medium">Chargement de vos rendez-vous...</p>
              ) : appointments.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-sm">
                  <span className="text-4xl block mb-2">📅</span>
                  <h3 className="font-bold text-gray-700">Aucun rendez-vous</h3>
                  <p className="text-xs text-gray-400 mt-1">Vous n'avez pas encore de rendez-vous programmé.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {appointments.map((ap) => (
                    <div key={ap.id} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:shadow-md transition-shadow">
                      <div className="space-y-1">
                        <h3 className="font-bold text-gray-800 text-base">Médecin : Dr. {ap.doctor_name}</h3>
                        <p className="text-green-600 text-xs font-semibold">{ap.specialty}</p>
                        <p className="text-sm text-gray-500">
                          📅 {new Date(ap.appointment_date).toLocaleString('fr-FR')} ({ap.duration} minutes)
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
                            {ap.status === 'confirmed' ? 'Confirmé' : ap.status === 'cancelled' ? 'Annulé' : 'Manqué'}
                          </span>
                        </div>
                      </div>

                      {ap.status === 'confirmed' && (
                        <button
                          onClick={() => handleCancelAppointment(ap.id)}
                          disabled={actionLoading}
                          className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs font-bold px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
                        >
                          Annuler
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ============ CONSULTATIONS ============ */}
          {activeTab === 'consultations' && (
            <div className="space-y-4">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-800">Mes consultations en ligne</h2>
                <p className="text-sm text-gray-500">Accédez aux discussions instantanées actives.</p>
              </div>

              {loading ? (
                <p className="text-center text-green-600 font-medium">Chargement de vos consultations...</p>
              ) : consultations.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-sm">
                  <span className="text-4xl block mb-2">💬</span>
                  <h3 className="font-bold text-gray-700">Aucune consultation</h3>
                  <p className="text-xs text-gray-400 mt-1">Vous n'avez démarré aucune consultation médicale.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {consultations.map((c) => (
                    <div key={c.id} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex justify-between items-center gap-4 hover:shadow-md transition-shadow">
                      <div>
                        <h3 className="font-bold text-gray-800 text-base">Consultation avec Dr. {c.doctor_name}</h3>
                        <p className="text-green-600 text-xs font-semibold">{c.specialty}</p>
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
          {activeTab === 'prescriptions' && (
            <div className="space-y-4">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-800">Mes ordonnances numériques</h2>
                <p className="text-sm text-gray-500">Téléchargez vos ordonnances sécurisées avec QR Code.</p>
              </div>

              {loading ? (
                <p className="text-center text-green-600 font-medium">Chargement de vos ordonnances...</p>
              ) : prescriptions.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-sm">
                  <span className="text-4xl block mb-2">📋</span>
                  <h3 className="font-bold text-gray-700">Aucune ordonnance</h3>
                  <p className="text-xs text-gray-400 mt-1">Vous n'avez reçu aucune ordonnance numérique pour le moment.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {prescriptions.map((pr) => (
                    <div key={pr.id} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex justify-between items-center gap-4 hover:shadow-md transition-shadow">
                      <div>
                        <h3 className="font-bold text-gray-800 text-base">Ordonnance n°{pr.id}</h3>
                        <p className="text-sm text-gray-600">Prescrite par : <b>Dr. {pr.doctor_name}</b></p>
                        <p className="text-xs text-gray-500 mt-1 truncate max-w-md">Médicaments : {pr.medications}</p>
                        <p className="text-xs text-gray-400 font-light mt-1">Date : {new Date(pr.created_at).toLocaleDateString('fr-FR')}</p>
                      </div>

                      {pr.pdf_path && (
                        <a
                          href={`http://localhost:5000/${pr.pdf_path}`}
                          target="_blank"
                          rel="noreferrer"
                          className="bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 text-xs font-bold px-4 py-2.5 rounded-xl transition-colors whitespace-nowrap"
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
        </main>
      </div>
    </div>
  )
}