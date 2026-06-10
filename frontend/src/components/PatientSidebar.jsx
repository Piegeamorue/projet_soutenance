import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

function PatientSidebar() {
  const [isOpen, setIsOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const user = JSON.parse(localStorage.getItem('user') || '{}')

  const menuItems = [
    { icon: '🏠', label: 'Accueil', path: '/home' },
    { icon: '🔍', label: 'Trouver un médecin', path: '/home' },
    { icon: '📅', label: 'Mes rendez-vous', path: '/home?tab=appointments' },
    { icon: '💬', label: 'Mes consultations', path: '/home?tab=consultations' },
    { icon: '📋', label: 'Mes ordonnances', path: '/home?tab=prescriptions' },
    { icon: '📊', label: 'Mon suivi santé', path: '/tracking' },
    { icon: '🌐', label: 'Accueil public', path: '/' },
  ]

  const handleLogout = () => {
    localStorage.clear()
    navigate('/login')
  }

  return (
    <>
      {/* Bouton hamburger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-50 bg-white rounded-lg p-2 shadow-md hover:bg-gray-50"
      >
        <div className="w-6 h-0.5 bg-gray-700 mb-1"></div>
        <div className="w-6 h-0.5 bg-gray-700 mb-1"></div>
        <div className="w-6 h-0.5 bg-gray-700"></div>
      </button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-30 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed top-0 left-0 h-full w-64 bg-white shadow-xl z-50 transform transition-transform duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        
        {/* Header profil */}
        <div className="bg-green-600 p-6 flex flex-col items-center">
          <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center text-4xl mb-3">
            {user.photo ? (
              <img src={user.photo} alt="profil" className="w-full h-full rounded-full object-cover" />
            ) : '👤'}
          </div>
          <h3 className="text-white font-bold text-lg text-center">{user.full_name}</h3>
          <p className="text-green-100 text-sm">Patient</p>
        </div>

        {/* Menu items */}
        <nav className="p-4 space-y-1">
          {menuItems.map((item) => (
            <button
              key={item.path}
              onClick={() => { navigate(item.path); setIsOpen(false) }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors
                ${location.pathname === item.path 
                  ? 'bg-green-50 text-green-600 font-semibold' 
                  : 'text-gray-700 hover:bg-gray-50'}`}
            >
              <span className="text-xl">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Déconnexion */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
          >
            <span className="text-xl">🚪</span>
            <span>Déconnexion</span>
          </button>
        </div>
      </div>
    </>
  )
}

export default PatientSidebar