import { useRef, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Avatar from './Avatars'
import { getStoredUser, uploadProfilePhoto } from '../utils/profilePhoto'
import { SIDEBAR_TOP, SIDEBAR_HEIGHT } from '../utils/layout'

const menuItems = [
  { icon: '🏠', label: 'Accueil / Dashboard', tab: 'dashboard' },
  { icon: '📅', label: 'Mon agenda', tab: 'appointments' },
  { icon: '💬', label: 'Mes consultations', tab: 'consultations' },
  { icon: '👥', label: 'Mes patients suivis', tab: 'patients' },
  { icon: '📋', label: 'Ordonnances émises', tab: 'prescriptions' },
  { icon: '⚙️', label: 'Paramètres du compte', tab: 'settings' },
]

export default function DoctorSidebar({ activeTab }) {
  const [user, setUser] = useState(getStoredUser)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    const onUpdate = (e) => setUser(e.detail)
    window.addEventListener('user-updated', onUpdate)
    return () => window.removeEventListener('user-updated', onUpdate)
  }, [])

  const handleLogout = () => {
    localStorage.clear()
    navigate('/')
  }

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      await uploadProfilePhoto(file)
    } catch (err) {
      const msg = err.response?.data?.message
        || (err.response?.status === 404 ? 'Serveur à redémarrer (route photo manquante)' : null)
        || 'Erreur lors de l\'upload'
      alert(msg)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  return (
    <div className={`fixed left-0 w-64 z-40 flex flex-col ${SIDEBAR_TOP} ${SIDEBAR_HEIGHT}`}>
      <div className="bg-green-600 px-4 pt-4 pb-6 flex flex-col items-center flex-shrink-0">
        <div className="relative mb-3">
          <Avatar
            user={user}
            size="xl"
            className="border-4 border-white shadow-md"
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="absolute bottom-0 right-0 w-7 h-7 bg-white rounded-full flex items-center justify-center shadow border border-gray-200 hover:bg-green-50 transition-colors disabled:opacity-50"
            title="Modifier la photo"
          >
            <span className="text-sm">{uploading ? '⏳' : '✏️'}</span>
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
        </div>
        <h3 className="text-white font-extrabold text-base text-center leading-tight">
          Dr. {user.full_name || 'Médecin'}
        </h3>
        <p className="text-green-100 text-xs mt-1">{user.specialty || 'Médecin'}</p>
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-1 bg-white border-r border-gray-100 shadow-xl">
        {menuItems.map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={() => navigate(`/doctor/dashboard?tab=${item.tab}`)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all text-sm font-medium
              ${activeTab === item.tab
                ? 'bg-green-600 text-white shadow-md'
                : 'text-gray-700 hover:bg-green-50 hover:text-green-700'
              }`}
          >
            <span className="text-lg flex-shrink-0">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="px-3 py-4 border-t border-gray-100 flex-shrink-0 bg-white border-r border-gray-100">
        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 transition-colors text-sm font-medium"
        >
          <span className="text-lg">🚪</span>
          <span>Déconnexion</span>
        </button>
      </div>
    </div>
  )
}
