import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import axios from 'axios'
import Navbar from '../../components/Navbar'
import PatientSidebar from '../../components/PatientSidebar'
import PatientSettings from '../../components/PatientSettings'
import LandingContent from '../Landing'
import { MAIN_TOP } from '../../utils/layout'
import { formatDoctorName } from '../../utils/formatDoctor'
import socket from '../../socket'

const API = 'http://localhost:5000/api'

export default function Home() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const tabFromUrl = searchParams.get('tab') || 'accueil'
  const [activeTab, setActiveTab] = useState(tabFromUrl)

  const [doctors, setDoctors] = useState([])
  const [appointments, setAppointments] = useState([])
  const [consultations, setConsultations] = useState([])
  const [prescriptions, setPrescriptions] = useState([])

  const [search, setSearch] = useState('')
  const [specialty, setSpecialty] = useState('')
  const [loading, setLoading] = useState(false)
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
    'Médecin du Travail', 'Allergologue', 'Addictologue',
    'Médecin Esthétique', 'Sexologue',
    'Gastro-Entérologue Pédiatrique', 'Médecin Nutritionniste',
    'Médecin Rééducateur', 'Anesthésiste-Réanimateur'
  ]

  useEffect(() => {
    if (!token) { navigate('/login'); return }

    // ✅ Socket : rejoindre salle personnelle pour recevoir notifs en temps réel
    if (!socket.connected) socket.connect()
    socket.emit('join_user', user.id)

    // Notif si consultation acceptée par le médecin
    socket.on('consultation_accepted', (data) => {
      fetchData()
      alert(`✅ Le médecin a accepté votre demande ! Vous pouvez rejoindre le chat.`)
    })

    // Notif si consultation refusée
    socket.on('consultation_rejected', (data) => {
      fetchData()
      alert(`❌ Le médecin a refusé votre demande de consultation.`)
    })

    // Notif si consultation expirée (30 min)
    socket.on('consultation_expired', (data) => {
      fetchData()
      alert(`⏰ ${data.message}`)
    })

    return () => {
      socket.off('consultation_accepted')
      socket.off('consultation_rejected')
      socket.off('consultation_expired')
    }
  }, [token])

  useEffect(() => { setActiveTab(tabFromUrl) }, [tabFromUrl])

  useEffect(() => {
    if (token && activeTab !== 'accueil' && activeTab !== 'settings') {
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
      } else if (activeTab === 'health') {
        const { data } = await axios.get(`${API}/consultations/my`, { headers })
        setConsultations(data)
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

  // ✅ Helper : libellé et style du statut
  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return { label: 'En cours', className: 'bg-green-50 text-green-700 border border-green-100' }
      case 'pending':
        return { label: 'En attente', className: 'bg-orange-50 text-orange-700 border border-orange-200' }
      case 'completed':
        return { label: 'Terminée', className: 'bg-gray-100 text-gray-500' }
      case 'cancelled':
        return { label: 'Annulée', className: 'bg-red-50 text-red-500 border border-red-100' }
      default:
        return { label: status, className: 'bg-gray-100 text-gray-500' }
    }
  }

  // ✅ Helper : bouton action selon statut
  const getConsultationButton = (c) => {
    if (c.status === 'active') {
      return (
        <button
          onClick={() => navigate(`/consultation/${c.id}/chat`)}
          className="bg-green-600 hover:bg-green-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md whitespace-nowrap"
        >
          Rejoindre le chat 🚀
        </button>
      )
    }
    if (c.status === 'pending') {
      return (
        <div className="flex flex-col items-end gap-1">
          <span className="text-xs text-orange-600 font-medium">⏳ En attente du médecin</span>
          <span className="text-xs text-gray-400">Expire dans 30 min</span>
        </div>
      )
    }
    if (c.status === 'completed') {
      return (
        <button
          onClick={() => navigate(`/consultation/${c.id}/chat`)}
          className="bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold text-xs px-4 py-2.5 rounded-xl transition-all whitespace-nowrap"
        >
          Consulter l'historique
        </button>
      )
    }
    // cancelled
    return (
      <span className="text-xs text-red-400 font-medium">Demande refusée / expirée</span>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <PatientSidebar activeTab={activeTab} />
      <Navbar />

      <div className={`ml-64 ${MAIN_TOP}`}>

        {activeTab === 'accueil' && <LandingContent hideNavbar />}

        {activeTab !== 'accueil' && (
          <div className="max-w-6xl mx-auto px-4 mt-8 pb-12">
            <main className="flex-1">

              {activeTab === 'health' && (
                <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm space-y-4">
                  <h2 className="text-xl font-bold text-gray-800">Suivi santé</h2>
                  <p className="text-sm text-gray-500">Informations de base de votre profil.</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div className="bg-gray-50 rounded-xl p-4"><span className="text-gray-500">Nom</span><p className="font-bold text-gray-800">{user.full_name}</p></div>
                    <div className="bg-gray-50 rounded-xl p-4"><span className="text-gray-500">Sexe</span><p className="font-bold text-gray-800">{user.gender || '—'}</p></div>
                    <div className="bg-gray-50 rounded-xl p-4"><span className="text-gray-500">Âge</span><p className="font-bold text-gray-800">{user.age || '—'} ans</p></div>
                    <div className="bg-gray-50 rounded-xl p-4"><span className="text-gray-500">Consultations</span><p className="font-bold text-gray-800">{consultations.length} enregistrée(s)</p></div>
                  </div>
                </div>
              )}

              {activeTab === 'settings' && <PatientSettings />}

              {/* ============ SEARCH DOCTORS ============ */}
              {activeTab === 'search' && (
                <div className="space-y-6">
                  <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
                    <h2 className="text-xl font-bold text-gray-800 mb-4">Rechercher un praticien</h2>
                    <div className="flex flex-col md:flex-row gap-4">
                      <input type="text" placeholder="Rechercher par nom..."
                        value={search} onChange={(e) => setSearch(e.target.value)}
                        className="flex-1 border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-green-500" />
                      <select value={specialty} onChange={(e) => setSpecialty(e.target.value)}
                        className="flex-1 border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-green-500 text-gray-500">
                        <option value="">Toutes les spécialités</option>
                        {specialties.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                  {loading ? (
                    <p className="text-center text-green-600 font-medium">Chargement des praticiens...</p>
                  ) : filtered.length === 0 ? (
                    <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100">
                      <p className="text-gray-500 text-sm font-medium">Aucun médecin trouvé</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {filtered.map(doc => (
                        <div key={doc.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow flex flex-col justify-between">
                          <div>
                            <div className="flex items-center gap-4 mb-4">
                              <div className="w-14 h-14 rounded-full bg-green-50 border border-green-200 flex items-center justify-center text-2xl flex-shrink-0">👨‍⚕️</div>
                              <div>
                                <h3 className="font-bold text-gray-800 text-base">{formatDoctorName(doc.full_name)}</h3>
                                <p className="text-green-600 text-xs font-semibold">{doc.specialty}</p>
                              </div>
                            </div>
                            <div className="space-y-1.5 mb-6 text-sm text-gray-500">
                              <p>⭐ {doc.avg_rating || '0'}/5 ({doc.total_consultations || '0'} consultations)</p>
                              <p className="font-semibold text-gray-700">💰 {doc.tarif ? `${doc.tarif} FCFA` : 'Tarif non défini'}</p>
                            </div>
                          </div>
                          <button onClick={() => navigate(`/doctor/${doc.id}`)}
                            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 rounded-lg transition-colors text-sm">
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
                            <h3 className="font-bold text-gray-800 text-base">Médecin : {formatDoctorName(ap.doctor_name)}</h3>
                            <p className="text-green-600 text-xs font-semibold">{ap.specialty}</p>
                            <p className="text-sm text-gray-500">📅 {new Date(ap.appointment_date).toLocaleString('fr-FR')} ({ap.duration} minutes)</p>
                            <div className="flex gap-2 items-center mt-1">
                              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100">{ap.type}</span>
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
                            <button onClick={() => handleCancelAppointment(ap.id)} disabled={actionLoading}
                              className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs font-bold px-3 py-2 rounded-lg transition-colors disabled:opacity-50">
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
                      {/* ✅ Séparation : en attente en haut */}
                      {consultations.filter(c => c.status === 'pending').length > 0 && (
                        <>
                          <div className="flex items-center gap-3">
                            <div className="flex-1 h-px bg-orange-200"></div>
                            <span className="text-xs text-orange-500 font-semibold uppercase">En attente de confirmation</span>
                            <div className="flex-1 h-px bg-orange-200"></div>
                          </div>
                          {consultations.filter(c => c.status === 'pending').map((c) => {
                            const badge = getStatusBadge(c.status)
                            return (
                              <div key={c.id} className="bg-orange-50 border border-orange-200 rounded-2xl p-5 flex justify-between items-center gap-4">
                                <div>
                                  <h3 className="font-bold text-gray-800 text-base">Consultation avec {formatDoctorName(c.doctor_name)}</h3>
                                  <p className="text-green-600 text-xs font-semibold">{c.specialty}</p>
                                  <p className="text-xs text-gray-400 mt-1">Demande envoyée le {new Date(c.created_at).toLocaleDateString('fr-FR')}</p>
                                  <span className={`text-xs font-bold px-2 py-0.5 rounded mt-2 inline-block ${badge.className}`}>{badge.label}</span>
                                </div>
                                {getConsultationButton(c)}
                              </div>
                            )
                          })}
                        </>
                      )}

                      {/* ✅ Consultations actives */}
                      {consultations.filter(c => c.status === 'active').length > 0 && (
                        <>
                          <div className="flex items-center gap-3">
                            <div className="flex-1 h-px bg-green-200"></div>
                            <span className="text-xs text-green-600 font-semibold uppercase">En cours</span>
                            <div className="flex-1 h-px bg-green-200"></div>
                          </div>
                          {consultations.filter(c => c.status === 'active').map((c) => {
                            const badge = getStatusBadge(c.status)
                            return (
                              <div key={c.id} className="bg-white border border-green-100 rounded-2xl p-5 flex justify-between items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
                                <div>
                                  <h3 className="font-bold text-gray-800 text-base">Consultation avec {formatDoctorName(c.doctor_name)}</h3>
                                  <p className="text-green-600 text-xs font-semibold">{c.specialty}</p>
                                  <p className="text-xs text-gray-400 mt-1">Démarrée le {new Date(c.created_at).toLocaleDateString('fr-FR')}</p>
                                  <span className={`text-xs font-bold px-2 py-0.5 rounded mt-2 inline-block ${badge.className}`}>{badge.label}</span>
                                </div>
                                {getConsultationButton(c)}
                              </div>
                            )
                          })}
                        </>
                      )}

                      {/* ✅ Historique : terminées et annulées */}
                      {consultations.filter(c => c.status === 'completed' || c.status === 'cancelled').length > 0 && (
                        <>
                          <div className="flex items-center gap-3">
                            <div className="flex-1 h-px bg-gray-200"></div>
                            <span className="text-xs text-gray-400 font-semibold uppercase">Historique</span>
                            <div className="flex-1 h-px bg-gray-200"></div>
                          </div>
                          {consultations.filter(c => c.status === 'completed' || c.status === 'cancelled').map((c) => {
                            const badge = getStatusBadge(c.status)
                            return (
                              <div key={c.id} className="bg-white border border-gray-100 rounded-2xl p-5 flex justify-between items-center gap-4 shadow-sm opacity-80 hover:opacity-100 transition-opacity">
                                <div>
                                  <h3 className="font-bold text-gray-800 text-base">Consultation avec {formatDoctorName(c.doctor_name)}</h3>
                                  <p className="text-green-600 text-xs font-semibold">{c.specialty}</p>
                                  <p className="text-xs text-gray-400 mt-1">
                                    {c.ended_at
                                      ? `Terminée le ${new Date(c.ended_at).toLocaleDateString('fr-FR')}`
                                      : `Créée le ${new Date(c.created_at).toLocaleDateString('fr-FR')}`}
                                  </p>
                                  <span className={`text-xs font-bold px-2 py-0.5 rounded mt-2 inline-block ${badge.className}`}>{badge.label}</span>
                                </div>
                                {getConsultationButton(c)}
                              </div>
                            )
                          })}
                        </>
                      )}
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
                            <p className="text-sm text-gray-600">Prescrite par : <b>{formatDoctorName(pr.doctor_name)}</b></p>
                            <p className="text-xs text-gray-500 mt-1 truncate max-w-md">Médicaments : {pr.medications}</p>
                            <p className="text-xs text-gray-400 font-light mt-1">Date : {new Date(pr.created_at).toLocaleDateString('fr-FR')}</p>
                          </div>
                          {pr.pdf_path && (
                            <a href={`http://localhost:5000/${pr.pdf_path}`} target="_blank" rel="noreferrer"
                              className="bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 text-xs font-bold px-4 py-2.5 rounded-xl transition-colors whitespace-nowrap">
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
        )}
      </div>
    </div>
  )
}
