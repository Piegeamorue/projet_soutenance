import { useState, useEffect, useRef } from "react"
import { Link, useNavigate, useLocation } from "react-router-dom"
import Avatar from "./Avatars"
import { getStoredUser } from "../utils/profilePhoto"

function MediCamLogo({ className = "w-8 h-8" }) {
  return (
    <div className={`${className} bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0`}>
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
      </svg>
    </div>
  )
}

function ProfileSilhouetteIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" strokeLinecap="round" />
    </svg>
  )
}

export default function Navbar() {
  const [langue, setLangue] = useState("FR")
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const notifRef = useRef(null)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const profileRef = useRef(null)
  const token = localStorage.getItem("token")
  const [user, setUser] = useState(getStoredUser)

  useEffect(() => {
    const onUpdate = (e) => setUser(e.detail)
    window.addEventListener("user-updated", onUpdate)
    return () => window.removeEventListener("user-updated", onUpdate)
  }, [])

  useEffect(() => {
    setUser(getStoredUser())
  }, [location.pathname, location.search])

  const isConnected = !!token && token !== "undefined" && token !== "null" && !!user && (user.role === "patient" || user.role === "doctor" || user.role === "admin")
  const isPatient = isConnected && user.role === "patient"
  const isDoctor = isConnected && user.role === "doctor"
  const isAdmin = isConnected && user.role === "admin"

  useEffect(() => {
    const hasToken = localStorage.getItem("token")
    const storedUser = localStorage.getItem("user")
    let parsedUser = null
    try {
      if (storedUser && storedUser !== "undefined" && storedUser !== "null") {
        parsedUser = JSON.parse(storedUser)
      }
    } catch (e) {}

    const hasValidSession = hasToken && 
                            hasToken !== "undefined" && 
                            hasToken !== "null" && 
                            parsedUser && 
                            (parsedUser.role === "patient" || parsedUser.role === "doctor" || parsedUser.role === "admin")

    if (hasToken && !hasValidSession) {
      console.warn("Invalid or conflicting session detected. Clearing localStorage.")
      localStorage.removeItem("token")
      localStorage.removeItem("user")
      window.location.reload()
    }
  }, [])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false)
      }
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  useEffect(() => {
    setAuthModalOpen(false)
    setNotifOpen(false)
    setProfileMenuOpen(false)
  }, [location.pathname])

  const scrollToSection = (id) => {
    if (location.pathname === "/") {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth" })
    } else {
      navigate("/")
      setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth" })
      }, 150)
    }
  }

  const handleSearchDoctor = () => {
    if (isPatient) navigate("/home?tab=search")
    else if (isDoctor) navigate("/doctor/dashboard")
    else setAuthModalOpen(true)
  }

  const handleProfileClick = () => {
    if (isConnected) {
      if (isPatient) navigate('/home')
      else if (isDoctor) navigate('/doctor/dashboard')
      else if (isAdmin) navigate('/admin')
    } else {
      setAuthModalOpen(true)
    }
  }

  const navLinks = [
    { label: "Fonctionnalités", action: () => scrollToSection("fonctionnalites") },
    { label: "Spécialités", action: () => scrollToSection("specialites") },
    { label: "Conseils santé", action: () => scrollToSection("conseils") },
    { label: "Classement", action: () => navigate("/classement") },
    { label: "Rechercher un médecin", action: handleSearchDoctor },
    { label: "Hôpitaux", action: () => navigate("/map") },
  ]

  const NavLinkButton = ({ children, onClick, className = "" }) => (
    <button
      onClick={onClick}
      className={`text-sm font-semibold text-white/90 hover:text-white whitespace-nowrap transition-colors ${className}`}
    >
      {children}
    </button>
  )

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#16a34a] shadow-md">
        {/* Barre principale */}
        <div className="flex items-center justify-between px-4 lg:px-6 h-14">
          {/* Logo — extrême gauche */}
          <Link to="/" className="flex items-center gap-2 flex-shrink-0 mr-4">
            <MediCamLogo />
            <span className="text-lg font-bold text-white tracking-tight hidden sm:inline">
              MediCam
            </span>
          </Link>

          {/* Liens desktop */}
          <div className="hidden xl:flex items-center gap-5 flex-1 justify-center">
            {navLinks.map((link) => (
              <NavLinkButton key={link.label} onClick={link.action}>
                {link.label}
              </NavLinkButton>
            ))}
          </div>

          {/* Actions droite */}
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <button
              onClick={() => setLangue(langue === "FR" ? "EN" : "FR")}
              className="flex items-center gap-1 text-xs sm:text-sm font-bold text-white border border-white/30 rounded-full px-2.5 sm:px-3 py-1.5 hover:bg-white/10 transition-colors"
              aria-label="Changer la langue"
            >
              {langue}
            </button>

            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className="relative w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
                aria-label="Notifications"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-400 rounded-full" />
              </button>
              {notifOpen && (
                <div className="absolute right-0 top-11 w-72 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 p-4">
                  <h4 className="font-bold text-gray-800 text-sm mb-3">Notifications</h4>
                  <p className="text-sm text-gray-400 text-center py-4">Aucune notification pour l'instant</p>
                </div>
              )}
            </div>

            <div className="relative" ref={profileRef}>
              <button
                onClick={handleProfileClick}
                className="w-9 h-9 rounded-full border-2 border-white/60 flex items-center justify-center overflow-hidden hover:border-white transition-colors flex-shrink-0"
                aria-label="Profil"
                title={isConnected ? 'Mon espace' : 'Connexion'}
              >
                {isConnected ? (
                  <Avatar user={user} size="sm" className="w-full h-full border-0" />
                ) : (
                  <ProfileSilhouetteIcon />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Liens mobile / tablette — scroll horizontal, sans hamburger */}
        <div className="xl:hidden border-t border-white/20 overflow-x-auto scrollbar-hide">
          <div className="flex items-center gap-4 px-4 py-2 min-w-max">
            {navLinks.map((link) => (
              <NavLinkButton key={link.label} onClick={link.action} className="text-xs">
                {link.label}
              </NavLinkButton>
            ))}
          </div>
        </div>
      </nav>

      {/* Modal Connexion / Inscription — style FIFA */}
      {authModalOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4"
          onClick={() => setAuthModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center space-y-6"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => navigate("/login")}
              className="w-full bg-[#16a34a] hover:bg-green-700 text-white font-bold py-3.5 rounded-full transition-colors text-sm tracking-wide"
            >
              CONNEXION
            </button>
            <p className="text-sm text-gray-600">
              Vous n'avez pas de compte ?{" "}
              <button
                onClick={() => navigate("/register")}
                className="font-bold text-gray-900 hover:text-green-600 transition-colors underline-offset-2 hover:underline"
              >
                S'INSCRIRE
              </button>
            </p>
          </div>
        </div>
      )}
    </>
  )
}
