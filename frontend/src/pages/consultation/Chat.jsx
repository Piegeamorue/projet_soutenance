import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import socket from '../../socket'

const API = 'http://localhost:5000/api/consultations'

export default function Chat() {
  const { consultationId } = useParams()
  const navigate = useNavigate()
  const [messages, setMessages] = useState([])
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [consultation, setConsultation] = useState(null)
  const [notification, setNotification] = useState(null)
  
  // Prescription modal state
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false)
  const [medications, setMedications] = useState('')
  const [instructions, setInstructions] = useState('')
  const [prescribing, setPrescribing] = useState(false)

  const messagesEndRef = useRef(null)
  const fileInputRef = useRef(null)

  const token = localStorage.getItem('token')
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  const authHeaders = { Authorization: `Bearer ${token}` }

  const showNotif = (msg, type = 'success') => {
    setNotification({ msg, type })
    setTimeout(() => setNotification(null), 3000)
  }

  useEffect(() => {
    if (!token) {
      navigate('/login')
      return
    }

    const loadMessages = async () => {
      try {
        const { data } = await axios.get(
          `${API}/${consultationId}/messages`,
          { headers: authHeaders }
        )
        setMessages(data)
      } catch (err) {
        setError(err.response?.data?.message || 'Impossible de charger les messages')
      } finally {
        setLoading(false)
      }
    }

    const loadConsultation = async () => {
      try {
        const { data } = await axios.get(
          `${API}/my`,
          { headers: authHeaders }
        )
        const current = data.find(c => String(c.id) === String(consultationId))
        if (current) {
          setConsultation(current)
        }
      } catch (err) {
        console.error(err)
      }
    }

    loadMessages()
    loadConsultation()

    socket.connect()
    socket.emit('join_consultation', consultationId)

    socket.on('receive_message', (data) => {
      if (String(data.consultation_id) === String(consultationId)) {
        setMessages((prev) => [...prev, data])
      }
    })

    // Listen for consultation ended
    socket.on('consultation_ended', (data) => {
      if (String(data.consultation_id) === String(consultationId)) {
        setConsultation(prev => prev ? { ...prev, status: 'completed' } : null)
        showNotif("La consultation a été terminée par le médecin", "error")
      }
    })

    return () => {
      socket.off('receive_message')
      socket.off('consultation_ended')
      socket.disconnect()
    }
  }, [consultationId, navigate, token])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async (e) => {
    e.preventDefault()
    if (!content.trim() || (consultation && consultation.status === 'completed')) return

    try {
      const { data } = await axios.post(
        `${API}/message`,
        { consultation_id: consultationId, content: content.trim() },
        { headers: authHeaders }
      )

      const payload = {
        ...data,
        consultation_id: consultationId,
        sender_name: user.full_name,
      }

      socket.emit('send_message', payload)
      setMessages((prev) => [...prev, payload])
      setContent('')
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de l\'envoi')
    }
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files[0]
    if (!file || (consultation && consultation.status === 'completed')) return

    const formData = new FormData()
    formData.append('consultation_id', consultationId)
    formData.append('file_type', file.type.split('/')[1] || 'file')
    formData.append('file', file)

    try {
      const { data } = await axios.post(
        `${API}/upload`,
        formData,
        {
          headers: {
            ...authHeaders,
            'Content-Type': 'multipart/form-data'
          }
        }
      )

      const payload = {
        ...data,
        consultation_id: consultationId,
        sender_name: user.full_name,
      }

      socket.emit('send_message', payload)
      setMessages((prev) => [...prev, payload])
      showNotif("Fichier partagé avec succès ✅")
    } catch (err) {
      setError("Erreur lors de l'envoi du fichier")
    }
  }

  const handleEndConsultation = async () => {
    if (!window.confirm("Voulez-vous vraiment clore cette consultation ? Les messages seront désactivés.")) return
    try {
      await axios.patch(`${API}/${consultationId}/end`, {}, { headers: authHeaders })
      setConsultation(prev => prev ? { ...prev, status: 'completed' } : null)
      socket.emit('send_message', { consultation_id: consultationId, type: 'end' }) // Notify other peer via socket
      showNotif("La consultation est désormais terminée ✅")
    } catch (err) {
      showNotif("Impossible de terminer la consultation", "error")
    }
  }

  const handleCreatePrescription = async (e) => {
    e.preventDefault()
    if (!medications.trim()) {
      alert("La liste des médicaments est requise.")
      return
    }

    setPrescribing(true)
    try {
      const res = await axios.post(
        `http://localhost:5000/api/prescriptions/create`,
        {
          consultation_id: consultationId,
          medications: medications.trim(),
          instructions: instructions.trim()
        },
        { headers: authHeaders }
      )

      // Send a system text message informing the patient
      const msgText = `📄 Une ordonnance numérique a été rédigée. Médicaments : ${medications.trim()}.`
      const msgRes = await axios.post(
        `${API}/message`,
        { consultation_id: consultationId, content: msgText },
        { headers: authHeaders }
      )

      const payload = {
        ...msgRes.data,
        consultation_id: consultationId,
        sender_name: user.full_name,
      }

      socket.emit('send_message', payload)
      setMessages((prev) => [...prev, payload])
      
      // Close modal
      setShowPrescriptionModal(false)
      setMedications('')
      setInstructions('')
      showNotif("Ordonnance générée avec succès ✅")
    } catch (err) {
      console.error(err)
      alert("Erreur lors de la création de l'ordonnance")
    } finally {
      setPrescribing(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Chargement de la conversation…</p>
      </div>
    )
  }

  const isDoctor = user.role === 'doctor'
  const isCompleted = consultation && consultation.status === 'completed'

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
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
      <header className="bg-white border-b px-4 py-3 flex items-center justify-between sticky top-0 z-40 shadow-sm">
        <div>
          <h1 className="text-lg font-bold text-green-600">MediCam</h1>
          <p className="text-xs text-gray-500">
            Consultation #{consultationId} {isCompleted && '— (Terminée)'}
          </p>
        </div>
        
        <div className="flex gap-2">
          {isDoctor && !isCompleted && (
            <>
              <button
                type="button"
                onClick={() => setShowPrescriptionModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-3 py-2 rounded-lg transition-colors shadow-sm"
              >
                📋 Rédiger Ordonnance
              </button>
              <button
                type="button"
                onClick={handleEndConsultation}
                className="bg-red-500 hover:bg-red-600 text-white font-bold text-xs px-3 py-2 rounded-lg transition-colors shadow-sm"
              >
                🔒 Clore Session
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="text-xs font-semibold text-gray-600 hover:text-green-600 px-3 py-2 border rounded-lg hover:bg-gray-50 transition-colors"
          >
            Retour
          </button>
        </div>
      </header>

      {error && (
        <div className="mx-4 mt-3 bg-red-50 border border-red-300 text-red-600 rounded-lg px-4 py-2 text-sm">
          {error}
        </div>
      )}

      {/* Messages list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-center text-gray-400 text-sm">Aucun message pour l&apos;instant.</p>
        )}

        {messages.map((msg) => {
          const isMine = msg.sender_id === user.id
          return (
            <div
              key={msg.id || `${msg.created_at}-${msg.content}`}
              className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                  isMine
                    ? 'bg-green-600 text-white'
                    : 'bg-white border border-gray-200 text-gray-800 shadow-sm'
                }`}
              >
                {!isMine && (
                  <p className="text-xs font-semibold text-green-600 mb-1">
                    {msg.sender_name || 'Interlocuteur'}
                  </p>
                )}
                {msg.file_path ? (
                  <div className="flex flex-col gap-2 p-1">
                    <span className="font-semibold text-xs text-gray-400 uppercase tracking-wider">
                      📁 Document partagé ({msg.file_type})
                    </span>
                    <a
                      href={`http://localhost:5000/${msg.file_path}`}
                      target="_blank"
                      rel="noreferrer"
                      className={`underline font-bold text-xs flex items-center gap-1 ${
                        isMine ? 'text-white' : 'text-green-600'
                      }`}
                    >
                      Ouvrir / Télécharger 📥
                    </a>
                  </div>
                ) : (
                  <p className="leading-relaxed">{msg.content}</p>
                )}
              </div>
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input bar */}
      <form
        onSubmit={handleSend}
        className="bg-white border-t p-4 flex gap-2 items-center"
      >
        {!isCompleted && (
          <>
            <button
              type="button"
              onClick={() => fileInputRef.current.click()}
              className="p-2 border border-gray-300 rounded-lg text-gray-500 hover:text-green-600 hover:border-green-300 transition-colors"
              title="Joindre un fichier"
            >
              📎
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
              accept="image/*,.pdf"
            />
          </>
        )}
        <input
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          disabled={isCompleted}
          placeholder={isCompleted ? "Cette consultation est close." : "Écrire un message…"}
          className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-green-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
        />
        <button
          type="submit"
          disabled={isCompleted || !content.trim()}
          className="bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-semibold px-5 py-2 rounded-lg transition-colors"
        >
          Envoyer
        </button>
      </form>

      {/* ============ MODAL Prescription (Ordonnance) ============ */}
      {showPrescriptionModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleCreatePrescription}
            className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-800 text-lg">Rédiger une ordonnance numérique</h3>
              <button
                type="button"
                onClick={() => setShowPrescriptionModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >
                ×
              </button>
            </div>

            <label className="block">
              <span className="text-xs text-gray-500 font-semibold uppercase">Médicaments prescrits</span>
              <textarea
                required
                rows={4}
                value={medications}
                onChange={(e) => setMedications(e.target.value)}
                placeholder="Ex: Paracétamol 1g (3x/jour pendant 5 jours), Amoxicilline 500mg..."
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500 resize-none"
              />
            </label>

            <label className="block">
              <span className="text-xs text-gray-500 font-semibold uppercase">Instructions particulières</span>
              <textarea
                rows={3}
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Ex: À prendre au milieu des repas. Bien s'hydrater..."
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500 resize-none"
              />
            </label>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowPrescriptionModal(false)}
                className="flex-1 border border-gray-200 text-gray-600 font-semibold py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={prescribing}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 rounded-xl transition-colors shadow-md disabled:opacity-50"
              >
                {prescribing ? 'Génération...' : 'Créer & Signer'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
