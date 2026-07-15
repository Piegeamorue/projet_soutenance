import { useState, useEffect, useRef, useCallback } from 'react'
import axios from 'axios'

const API = 'http://localhost:5000/api'

const labels = { email: 'Email', workplace: 'Lieu de travail', specialty: 'Spécialité' }

export default function DoctorSettings() {
  const token = localStorage.getItem('token')
  const headers = { Authorization: `Bearer ${token}` }
  const user = JSON.parse(localStorage.getItem('user') || '{}')

  const [profile, setProfile] = useState({ email: user.email, workplace: '', specialty: '' })
  const [requests, setRequests] = useState([])
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newWorkplace, setNewWorkplace] = useState('')
  const [newSpecialty, setNewSpecialty] = useState('')
  const [tarif, setTarif] = useState('')
  const [bio, setBio] = useState('')
  const [yearsExp, setYearsExp] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  // ── Lieu de travail avec géolocalisation Nominatim ────────────────────────
  const [locationQuery, setLocationQuery] = useState('')
  const [locationSuggestions, setLocationSuggestions] = useState([])
  const [selectedLocation, setSelectedLocation] = useState(null) // { address, lat, lng }
  const [locationLoading, setLocationLoading] = useState(false)
  const [locationMessage, setLocationMessage] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const locationDebounceRef = useRef(null)
  const suggestionBoxRef = useRef(null)

  useEffect(() => {
    axios.get(`${API}/auth/me`, { headers }).then((res) => {
      setProfile({
        email: res.data.email,
        workplace: res.data.workplace || '',
        specialty: res.data.specialty || '',
      })
      setTarif(res.data.tarif ? String(res.data.tarif) : '')
      setBio(res.data.bio || '')
      setYearsExp(res.data.years_experience ? String(res.data.years_experience) : '')
      // Préremplir le champ lieu si déjà sauvegardé
      if (res.data.address) {
        setLocationQuery(res.data.address)
        setSelectedLocation({
          address: res.data.address,
          lat: res.data.latitude,
          lng: res.data.longitude,
        })
      } else if (res.data.workplace) {
        setLocationQuery(res.data.workplace)
      }
    }).catch(() => {})
    axios.get(`${API}/auth/doctor/change-requests`, { headers }).then((res) => {
      setRequests(res.data)
    }).catch(() => {})
  }, [])

  const submitRequest = async (request_type, new_value) => {
    setLoading(true)
    setMessage('')
    try {
      const { data } = await axios.post(`${API}/auth/doctor/change-request`, { request_type, new_value }, { headers })
      setMessage(data.message)
      const res = await axios.get(`${API}/auth/doctor/change-requests`, { headers })
      setRequests(res.data)
    } catch (err) {
      setMessage(err.response?.data?.message || 'Erreur')
    } finally {
      setLoading(false)
    }
  }

  // ── Nominatim autocomplete ───────────────────────────────────────────────────
  const fetchNominatim = useCallback(async (query) => {
    if (query.length < 3) { setLocationSuggestions([]); return }
    setLocationLoading(true)
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=6&countrycodes=cm&accept-language=fr`,
        { headers: { 'Accept-Language': 'fr' } }
      )
      const data = await res.json()
      setLocationSuggestions(data)
      setShowSuggestions(true)
    } catch {
      setLocationSuggestions([])
    } finally {
      setLocationLoading(false)
    }
  }, [])

  const handleLocationInput = (e) => {
    const val = e.target.value
    setLocationQuery(val)
    setSelectedLocation(null) // reset selection quand on retape
    if (locationDebounceRef.current) clearTimeout(locationDebounceRef.current)
    locationDebounceRef.current = setTimeout(() => fetchNominatim(val), 400)
  }

  const handleSelectSuggestion = (item) => {
    const addr = item.display_name
    setLocationQuery(addr)
    setSelectedLocation({ address: addr, lat: parseFloat(item.lat), lng: parseFloat(item.lon) })
    setLocationSuggestions([])
    setShowSuggestions(false)
  }

  const handleSaveLocation = async () => {
    if (!selectedLocation) {
      setLocationMessage('⚠️ Veuillez sélectionner une adresse dans la liste de suggestions.')
      return
    }
    setLocationLoading(true)
    setLocationMessage('')
    try {
      const { data } = await axios.put(`${API}/auth/doctors/profile`, {
        address: selectedLocation.address,
        latitude: selectedLocation.lat,
        longitude: selectedLocation.lng,
      }, { headers })
      setLocationMessage('✅ ' + data.message)
    } catch (err) {
      setLocationMessage(err.response?.data?.message || 'Erreur lors de la sauvegarde')
    } finally {
      setLocationLoading(false)
    }
  }

  // Fermer suggestions au clic extérieur
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (suggestionBoxRef.current && !suggestionBoxRef.current.contains(e.target)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleChangePassword = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    try {
      const { data } = await axios.post(`${API}/auth/change-password`, {
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      }, { headers })
      setMessage(data.message)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setMessage(err.response?.data?.message || 'Erreur')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateProfile = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    try {
      const { data } = await axios.put(`${API}/auth/doctors/profile`, {
        tarif: Number(tarif) || 0,
        bio,
        years_experience: Number(yearsExp) || 0,
      }, { headers })
      setMessage(data.message)
    } catch (err) {
      setMessage(err.response?.data?.message || 'Erreur')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-800">Paramètres du compte</h2>
        <p className="text-sm text-gray-500">Les modifications sensibles nécessitent l'approbation de l'administrateur.</p>
      </div>

      {message && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 text-sm">{message}</div>
      )}

      <form onSubmit={handleChangePassword} className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4">
        <h3 className="font-bold text-gray-800">Modifier mot de passe</h3>
        <input type="password" placeholder="Mot de passe actuel" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-green-500" />
        <input type="password" placeholder="Nouveau mot de passe" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-green-500" />
        <input type="password" placeholder="Confirmer" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-green-500" />
        <button type="submit" disabled={loading} className="bg-green-600 hover:bg-green-700 text-white font-bold px-6 py-2.5 rounded-xl text-sm disabled:opacity-50">Enregistrer</button>
      </form>

      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4">
        <h3 className="font-bold text-gray-800">Changer email</h3>
        <p className="text-xs text-gray-500">Actuel : {profile.email}</p>
        <input type="email" placeholder="Nouvel email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-green-500" />
        <button type="button" disabled={loading || !newEmail} onClick={() => submitRequest('email', newEmail)} className="bg-green-600 hover:bg-green-700 text-white font-bold px-6 py-2.5 rounded-xl text-sm disabled:opacity-50">Demander à l'admin</button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4">
        <h3 className="font-bold text-gray-800">Lieu de travail</h3>
        <p className="text-xs text-gray-500">Actuel : {profile.workplace || '—'}</p>

        {/* Champ autocomplete Nominatim */}
        <div className="relative" ref={suggestionBoxRef}>
          <div className="relative">
            <input
              type="text"
              placeholder="Tapez le nom de votre clinique ou adresse..."
              value={locationQuery}
              onChange={handleLocationInput}
              onFocus={() => locationSuggestions.length > 0 && setShowSuggestions(true)}
              className={`w-full border rounded-lg px-4 py-2.5 pr-10 text-sm focus:outline-none transition-colors ${
                selectedLocation ? 'border-green-500 bg-green-50' : 'border-gray-300 focus:border-green-500'
              }`}
            />
            {locationLoading && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">⏳</span>
            )}
            {selectedLocation && !locationLoading && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500 text-sm">✓</span>
            )}
          </div>

          {/* Suggestions dropdown */}
          {showSuggestions && locationSuggestions.length > 0 && (
            <ul className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-52 overflow-y-auto">
              {locationSuggestions.map((item) => (
                <li
                  key={item.place_id}
                  onClick={() => handleSelectSuggestion(item)}
                  className="px-4 py-3 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 cursor-pointer border-b border-gray-50 last:border-0 flex items-start gap-2"
                >
                  <span className="text-gray-400 mt-0.5 flex-shrink-0">📍</span>
                  <span className="line-clamp-2">{item.display_name}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {locationMessage && (
          <div className={`text-sm rounded-xl px-4 py-2.5 border ${
            locationMessage.startsWith('✅') ? 'bg-green-50 border-green-200 text-green-700'
            : locationMessage.startsWith('⚠') ? 'bg-yellow-50 border-yellow-200 text-yellow-700'
            : 'bg-red-50 border-red-200 text-red-600'
          }`}>{locationMessage}</div>
        )}

        <p className="text-xs text-gray-400 italic">
          Recherchez et sélectionnez votre adresse dans la liste — vos patients vous retrouveront sur la carte.
        </p>

        <button
          type="button"
          disabled={locationLoading || !selectedLocation}
          onClick={handleSaveLocation}
          className="bg-green-600 hover:bg-green-700 text-white font-bold px-6 py-2.5 rounded-xl text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {locationLoading ? 'Enregistrement...' : '📍 Enregistrer le lieu'}
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4">
        <h3 className="font-bold text-gray-800">Changer de spécialité</h3>
        <p className="text-xs text-gray-500">Actuelle : {profile.specialty || '—'}</p>
        <input type="text" placeholder="Nouvelle spécialité" value={newSpecialty} onChange={(e) => setNewSpecialty(e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-green-500" />
        <button type="button" disabled={loading || !newSpecialty} onClick={() => submitRequest('specialty', newSpecialty)} className="bg-green-600 hover:bg-green-700 text-white font-bold px-6 py-2.5 rounded-xl text-sm disabled:opacity-50">Demander à l'admin</button>
      </div>

      {requests.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <h3 className="font-bold text-gray-800 mb-3">Mes demandes</h3>
          <div className="space-y-2">
            {requests.map((r) => (
              <div key={r.id} className="text-sm border border-gray-100 rounded-lg p-3 flex justify-between gap-2">
                <span>{labels[r.request_type] || r.request_type} → {r.new_value}</span>
                <span className={`text-xs font-bold ${r.status === 'pending' ? 'text-yellow-600' : r.status === 'approved' ? 'text-green-600' : 'text-red-600'}`}>{r.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleUpdateProfile} className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4">
        <h3 className="font-bold text-gray-800">Profil professionnel</h3>
        <p className="text-xs text-gray-500">Tarif, bio et expérience (modifiables directement).</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="block">
            <span className="text-xs text-gray-500 font-semibold uppercase">Tarif (FCFA)</span>
            <input type="number" required min="0" value={tarif} onChange={(e) => setTarif(e.target.value.replace(/^0+(?=\d)/, ''))} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500" />
          </label>
          <label className="block">
            <span className="text-xs text-gray-500 font-semibold uppercase">Années d'expérience</span>
            <input type="number" required min="0" value={yearsExp} onChange={(e) => setYearsExp(e.target.value.replace(/^0+(?=\d)/, ''))} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500" />
          </label>
        </div>
        <textarea rows={4} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Biographie professionnelle..." className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500 resize-none" />
        <button type="submit" disabled={loading} className="bg-green-600 hover:bg-green-700 text-white font-bold px-6 py-2.5 rounded-xl text-sm disabled:opacity-50">Enregistrer le profil</button>
      </form>
    </div>
  )
}
