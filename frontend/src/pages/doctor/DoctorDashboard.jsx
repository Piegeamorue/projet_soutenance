import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import axios from 'axios'
import Navbar from '../../components/Navbar'
import DoctorSidebar from '../../components/DoctorSidebar'
import DoctorSettings from '../../components/DoctorSettings'
import { MAIN_TOP } from '../../utils/layout'
import socket from '../../socket'

const API = 'http://localhost:5000/api'

export default function DoctorDashboard() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const tabFromUrl = searchParams.get('tab') || 'dashboard'
  const [activeTab, setActiveTab] = useState(tabFromUrl)

  const [appointments, setAppointments] = useState([])
  const [consultations, setConsultations] = useState([])
  const [prescriptions, setPrescriptions] = useState([])
  const [patients, setPatients] = useState([])
  const [pendingConsultations, setPendingConsultations] = useState([])
  const [waitingConsultations, setWaitingConsultations] = useState([])
  const [loading, setLoading] = useState(false)
  const [notification, setNotification] = useState(null)

  const token = localStorage.getItem('token')
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  const headers = { Authorization: `Bearer ${token}` }

  const showNotif = (msg, type = 'success') => {
    setNotification({ msg, type })
    setTimeout(() => setNotification(null), 3000)
  }

  const fetchPending = async () => {
    try {
      const res = await axios.get(`${API}/consultations/pending`, { headers })
      setPendingConsultations(res.data.filter(c => c.status === 'pending'))
      setWaitingConsultations(res.data.filter(c => c.status === 'waiting'))
    } catch (err) { console.error(err) }
  }

  useEffect(() => {
    if (!token || user.role !== 'doctor') { navigate('/login'); return }
    fetchMe()

    if (!socket.connected) socket.connect()
    socket.emit('join_doctor', user.id)
    socket.on('new_consultation_request', () => { fetchPending(); showNotif('📨 Nouvelle demande reçue !') })
    return () => { socket.off('new_consultation_request') }
  }, [token])

  useEffect(() => {
    setActiveTab(tabFromUrl)
  }, [tabFromUrl])

  useEffect(() => {
    if (token && activeTab !== 'settings' && activeTab !== 'dashboard') fetchData()
    if (token && activeTab === 'dashboard') fetchDashboardStats()
  }, [activeTab])

  const fetchMe = async () => {
    try {
      await axios.get(`${API}/auth/me`, { headers })
    } catch (err) { console.error(err) }
  }

  const fetchDashboardStats = async () => {
    setLoading(true)
    try {
      const [apRes, coRes, prRes, paRes] = await Promise.all([
        axios.get(`${API}/appointments/my`, { headers }),
        axios.get(`${API}/consultations/my`, { headers }),
        axios.get(`${API}/prescriptions/my`, { headers }),
        axios.get(`${API}/consultations/my-patients`, { headers }),
      ])
      setAppointments(apRes.data)
      setConsultations(coRes.data)
      setPrescriptions(prRes.data)
      setPatients(paRes.data)
    } catch (err) {
      showNotif('Erreur lors du chargement', 'error')
    } finally {
      setLoading(false)
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
        const pendRes = await axios.get(`${API}/consultations/pending`, { headers })
        setPendingConsultations(pendRes.data.filter(c => c.status === 'pending'))
        setWaitingConsultations(pendRes.data.filter(c => c.status === 'waiting'))
      } else if (activeTab === 'prescriptions') {
        const res = await axios.get(`${API}/prescriptions/my`, { headers })
        setPrescriptions(res.data)
      } else if (activeTab === 'patients') {
        const res = await axios.get(`${API}/consultations/my-patients`, { headers })
        setPatients(res.data)
      }
    } catch (err) {
      showNotif("Erreur lors de la récupération des données", "error")
    } finally {
      setLoading(false)
    }
  }

  const handleAccept = async (consultationId, patientId) => {
    try {
      await axios.patch(`${API}/consultations/${consultationId}/accept`, {}, { headers })
      socket.emit('accept_consultation', { consultation_id: consultationId, patient_id: patientId })
      showNotif('✅ Consultation acceptée')
      fetchData()
      navigate(`/consultation/${consultationId}/chat`)
    } catch (err) { showNotif(err.response?.data?.message || 'Erreur', 'error') }
  }

  const handleWait = async (consultationId, patientId) => {
    try {
      await axios.patch(`${API}/consultations/${consultationId}/wait`, {}, { headers })
      socket.emit('wait_consultation', { consultation_id: consultationId, patient_id: patientId })
      showNotif('⏳ Patient mis en salle d\'attente')
      fetchData()
    } catch (err) { showNotif(err.response?.data?.message || 'Erreur', 'error') }
  }

  const handleReject = async (consultationId, patientId) => {
    if (!window.confirm('Refuser cette demande ?')) return
    try {
      await axios.patch(`${API}/consultations/${consultationId}/reject`, {}, { headers })
      socket.emit('reject_consultation', { consultation_id: consultationId, patient_id: patientId })
      showNotif('Demande refusée', 'error')
      fetchData()
    } catch (err) { showNotif(err.response?.data?.message || 'Erreur', 'error') }
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

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {notification && (
        <div className={`fixed top-24 right-6 z-50 px-6 py-3 rounded-xl shadow-xl text-white font-semibold text-sm ${
          notification.type === 'error' ? 'bg-red-500' : 'bg-green-600'
        }`}>
          {notification.msg}
        </div>
      )}

      <DoctorSidebar activeTab={activeTab} />
      <Navbar />

      <div className={`ml-64 ${MAIN_TOP} min-h-screen`}>
        <div className="max-w-5xl mx-auto px-6 py-8">

          {loading && <p className="text-center text-green-600 font-medium py-4">Chargement...</p>}

          {activeTab === 'dashboard' && !loading && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-gray-800">Tableau de bord</h2>
                <p className="text-sm text-gray-500">Vue d'ensemble de votre activité.</p>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Rendez-vous', value: appointments.filter(a => a.status === 'confirmed').length, icon: '📅' },
                  { label: 'Consultations', value: consultations.length, icon: '💬' },
                  { label: 'Patients suivis', value: patients.length, icon: '👥' },
                  { label: 'Ordonnances', value: prescriptions.length, icon: '📋' },
                ].map((s) => (
                  <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm text-center">
                    <div className="text-2xl mb-2">{s.icon}</div>
                    <div className="text-2xl font-extrabold text-green-600">{s.value}</div>
                    <div className="text-xs text-gray-500 font-medium mt-1">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'settings' && <DoctorSettings />}

          {activeTab === 'patients' && !loading && (
            <div className="space-y-4">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-800">Mes patients suivis</h2>
                <p className="text-sm text-gray-500">Patients ayant consulté avec vous.</p>
              </div>
              {patients.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-sm">
                  <span className="text-4xl block mb-2">👥</span>
                  <h3 className="font-bold text-gray-700">Aucun patient</h3>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {patients.map((p) => (
                    <div key={p.id} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                      <h3 className="font-bold text-gray-800">{p.full_name}</h3>
                      <p className="text-sm text-gray-500">{p.gender} · {p.age} ans</p>
                      <p className="text-xs text-gray-400 mt-1">{p.total_consultations} consultation(s) · Dernière : {p.last_consultation ? new Date(p.last_consultation).toLocaleDateString('fr-FR') : '—'}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── APPOINTMENTS ── */}
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
                        <p className="text-sm text-gray-500">📅 {new Date(ap.appointment_date).toLocaleString('fr-FR')} ({ap.duration} min)</p>
                        <div className="flex gap-2 items-center mt-1">
                          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100">{ap.type}</span>
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
                          <button onClick={() => handleMarkAbsent(ap.id)}
                            className="bg-yellow-50 hover:bg-yellow-100 text-yellow-700 border border-yellow-200 text-xs font-bold px-3 py-2 rounded-lg transition-colors">
                            Marquer absent
                          </button>
                          <button onClick={() => handleCancelAppointment(ap.id)}
                            className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs font-bold px-3 py-2 rounded-lg transition-colors">
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

          {/* ── CONSULTATIONS ── */}
          {activeTab === 'consultations' && !loading && (
            <div className="space-y-4">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-800">Mes consultations médicales</h2>
                <p className="text-sm text-gray-500">Accédez aux salons de messagerie active.</p>
              </div>

              {pendingConsultations.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-bold text-blue-800 text-sm">Nouvelles demandes</h3>
                  {pendingConsultations.map((c) => (
                    <div key={c.id} className="rounded-2xl p-5 border-2 border-blue-200 shadow-sm" style={{ backgroundColor: '#EFF6FF' }}>
                      <h4 className="font-bold text-gray-800">Consultation #{c.id}</h4>
                      <p className="text-sm text-gray-600 mt-1">Patient : {c.patient_name}</p>
                      <p className="text-xs text-gray-400 mt-1">Reçue le {new Date(c.created_at).toLocaleString('fr-FR')}</p>
                      <div className="flex flex-wrap gap-2 mt-3">
                        <button onClick={() => handleAccept(c.id, c.patient_id)}
                          className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors">
                          ✅ Accepter
                        </button>
                        <button onClick={() => handleWait(c.id, c.patient_id)}
                          className="bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors">
                          ⏳ Attente
                        </button>
                        <button onClick={() => handleReject(c.id, c.patient_id)}
                          className="bg-red-500 hover:bg-red-600 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors">
                          ❌ Refuser
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {waitingConsultations.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-bold text-orange-800 text-sm">Salle d'attente</h3>
                  {waitingConsultations.map((c) => (
                    <div key={c.id} className="rounded-2xl p-5 border-2 border-orange-200 shadow-sm" style={{ backgroundColor: '#FFF7ED' }}>
                      <h4 className="font-bold text-gray-800">Consultation #{c.id}</h4>
                      <p className="text-sm text-gray-600 mt-1">Patient : {c.patient_name}</p>
                      <p className="text-xs text-gray-400 mt-1">{new Date(c.created_at).toLocaleString('fr-FR')}</p>
                      <div className="flex flex-wrap gap-2 mt-3">
                        <button onClick={() => handleAccept(c.id, c.patient_id)}
                          className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors">
                          ✅ Accepter
                        </button>
                        <button onClick={() => handleReject(c.id, c.patient_id)}
                          className="bg-red-500 hover:bg-red-600 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors">
                          ❌ Refuser
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {(pendingConsultations.length > 0 || waitingConsultations.length > 0) && consultations.length > 0 && (
                <div className="relative my-6">
                  <hr className="border-gray-200" />
                  <span className="absolute left-1/2 -translate-x-1/2 -top-3 bg-gray-50 px-3 text-xs text-gray-400 font-medium">Sessions en cours</span>
                </div>
              )}

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
                        <span className={`text-xs font-bold px-2 py-0.5 rounded mt-2 inline-block ${
                          c.status === 'active' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {c.status === 'active' ? 'En cours' : 'Terminée'}
                        </span>
                      </div>
                      <button onClick={() => navigate(`/consultation/${c.id}/chat`)}
                        className={`font-bold text-xs px-4 py-2.5 rounded-xl transition-all ${
                          c.status === 'active' ? 'bg-green-600 hover:bg-green-700 text-white shadow-md' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                        }`}>
                        {c.status === 'active' ? 'Rejoindre le chat 🚀' : "Consulter l'historique"}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── PRESCRIPTIONS ── */}
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
                        <p className="text-xs text-gray-500 truncate max-w-md">Médicaments : {pr.medications}</p>
                        <p className="text-xs text-gray-400">Date : {new Date(pr.created_at).toLocaleDateString('fr-FR')}</p>
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
        </div>
      </div>
    </div>
  )
}
