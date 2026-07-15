import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import Navbar from '../../components/Navbar'

// ── Fix icônes Leaflet avec Vite ──────────────────────────────────────────────
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const API = 'http://localhost:5000/api'
const YAOUNDE = [3.848, 11.502]
const OVERPASS_RADIUS = 15000 // 15 km pour couvrir toute la ville

// ── Haversine ─────────────────────────────────────────────────────────────────
function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371
  const dLat = (lat2 - lat1) * (Math.PI / 180)
  const dLng = (lng2 - lng1) * (Math.PI / 180)
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// ── Styles injectés une seule fois ────────────────────────────────────────────
const GLOBAL_STYLE = `
@keyframes mc-pulse-green {
  0%,100% { box-shadow: 0 0 0 4px #16a34a55; }
  50%      { box-shadow: 0 0 0 8px #16a34a22; }
}
@keyframes mc-pulse-gold {
  0%,100% { box-shadow: 0 0 0 4px #f59e0b55; }
  50%      { box-shadow: 0 0 0 8px #f59e0b22; }
}
@keyframes mc-spin {
  to { transform: rotate(360deg); }
}
.mc-spin { animation: mc-spin 0.8s linear infinite; }

/* Marqueurs médecins */
.mc-closest {
  width:30px; height:30px; border-radius:50%;
  background:#16a34a; border:3px solid #fff;
  display:flex; align-items:center; justify-content:center;
  font-size:14px; animation: mc-pulse-green 1.4s ease-in-out infinite;
}
.mc-best {
  width:30px; height:30px; border-radius:6px;
  background:#f59e0b; border:3px solid #fff;
  display:flex; align-items:center; justify-content:center;
  font-size:14px; animation: mc-pulse-gold 1.6s ease-in-out infinite;
}
.mc-online {
  width:26px; height:26px; border-radius:50%;
  background:#10b981; border:3px solid #fff;
  display:flex; align-items:center; justify-content:center;
  font-size:12px; animation: mc-pulse-green 2s ease-in-out infinite;
}
.mc-normal {
  width:24px; height:24px; border-radius:50%;
  background:#3b82f6; border:3px solid #fff;
  display:flex; align-items:center; justify-content:center;
  font-size:12px;
}
.mc-patient {
  width:24px; height:24px; border-radius:50%;
  background:#dc2626; border:3px solid #fff;
  display:flex; align-items:center; justify-content:center;
  font-size:12px; animation: mc-pulse-green 2s ease-in-out infinite;
}
/* Marqueurs établissements */
.mc-pharmacy { width:30px; height:30px; border-radius:50%; background:#16a34a; border:3px solid #fff; display:flex; align-items:center; justify-content:center; font-size:16px; }
.mc-hospital  { width:30px; height:30px; border-radius:50%; background:#dc2626; border:3px solid #fff; display:flex; align-items:center; justify-content:center; font-size:16px; }
.mc-dentist   { width:30px; height:30px; border-radius:50%; background:#8b5cf6; border:3px solid #fff; display:flex; align-items:center; justify-content:center; font-size:16px; }
.mc-optician  { width:30px; height:30px; border-radius:50%; background:#0ea5e9; border:3px solid #fff; display:flex; align-items:center; justify-content:center; font-size:16px; }
`

function injectStyle() {
  if (!document.getElementById('mc-global-style')) {
    const s = document.createElement('style')
    s.id = 'mc-global-style'
    s.textContent = GLOBAL_STYLE
    document.head.appendChild(s)
  }
}

function createDocIcon(type) {
  const classes = { closest: 'mc-closest', best: 'mc-best', online: 'mc-online', normal: 'mc-normal', patient: 'mc-patient' }
  const emojis  = { closest: '🟢', best: '⭐', online: '🟢', normal: '🔵', patient: '📍' }
  return L.divIcon({
    className: '',
    html: `<div class="${classes[type] || 'mc-normal'}">${emojis[type] || ''}</div>`,
    iconSize: [32, 32], iconAnchor: [16, 16], popupAnchor: [0, -20],
  })
}

function createEstabIcon(type, emoji) {
  return L.divIcon({
    className: '',
    html: `<div class="mc-${type}">${emoji}</div>`,
    iconSize: [32, 32], iconAnchor: [16, 16], popupAnchor: [0, -20],
  })
}

// ── Types établissements ───────────────────────────────────────────────────────
const ESTAB = {
  pharmacy: {
    label: 'Pharmacies', icon: '💊', color: '#16a34a', gmaps: 'pharmacie',
    query: (lat, lng, r) => `[out:json][timeout:30];(node["amenity"="pharmacy"](around:${r},${lat},${lng});way["amenity"="pharmacy"](around:${r},${lat},${lng}););out center;`,
  },
  hospital: {
    label: 'Hôpitaux', icon: '🏥', color: '#dc2626', gmaps: 'hôpital',
    query: (lat, lng, r) => `[out:json][timeout:30];(node["amenity"="hospital"](around:${r},${lat},${lng});way["amenity"="hospital"](around:${r},${lat},${lng});node["amenity"="clinic"](around:${r},${lat},${lng}););out center;`,
  },
  dentist: {
    label: 'Dentistes', icon: '🦷', color: '#8b5cf6', gmaps: 'cabinet dentaire',
    query: (lat, lng, r) => `[out:json][timeout:30];(node["amenity"="dentist"](around:${r},${lat},${lng});way["amenity"="dentist"](around:${r},${lat},${lng});node["healthcare"="dentist"](around:${r},${lat},${lng}););out center;`,
  },
  optician: {
    label: 'Opticiens', icon: '👁️', color: '#0ea5e9', gmaps: 'opticien',
    query: (lat, lng, r) => `[out:json][timeout:30];(node["shop"="optician"](around:${r},${lat},${lng});way["shop"="optician"](around:${r},${lat},${lng});node["healthcare"="optometrist"](around:${r},${lat},${lng}););out center;`,
  },
}

// ── Spécialités ───────────────────────────────────────────────────────────────
const SPECIALITES = [
  'Toutes','Médecin Généraliste','Cardiologue','Pédiatre',
  'Gynécologue-Obstétricien','Neurologue','Psychiatre','Ophtalmologue',
  'ORL','Pneumologue','Dermatologue','Endocrinologue','Urologue',
  'Infectiologue','Gastro-Entérologue','Rhumatologue',
]

// ── Composants utilitaires carte ──────────────────────────────────────────────
function MapCenterController({ center, zoom }) {
  const map = useMap()
  useEffect(() => {
    if (center) map.setView(center, zoom || map.getZoom(), { animate: true })
  }, [center, zoom, map])
  return null
}

function FlyToPatient({ trigger, patientPos }) {
  const map = useMap()
  useEffect(() => {
    if (trigger && patientPos) map.flyTo(patientPos, 16, { duration: 1.2 })
  }, [trigger])
  return null
}

// ── Spinner inline ────────────────────────────────────────────────────────────
function Spinner({ size = 18, color = '#16a34a' }) {
  return (
    <svg className="mc-spin" width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="3" strokeDasharray="40 60" strokeLinecap="round"/>
    </svg>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
export default function MapPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = localStorage.getItem('token')

  const [doctors, setDoctors]         = useState([])
  const [onlineIds, setOnlineIds]     = useState([])
  const [patientPos, setPatientPos]   = useState(null)
  const [loading, setLoading]         = useState(true)
  const [mapMode, setMapMode]         = useState('default')
  const [specialty, setSpecialty]     = useState(searchParams.get('specialty') || 'Toutes')
  const [selectedDoc, setSelectedDoc] = useState(null)
  const [mapCenter, setMapCenter]     = useState(YAOUNDE)
  const [mapZoom, setMapZoom]         = useState(13)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [flyTrigger, setFlyTrigger]   = useState(0)
  const socketRef = useRef(null)

  // États établissements
  const [activeEstab, setActiveEstab]   = useState(null)
  const [estabMarkers, setEstabMarkers] = useState([])
  const [estabLoading, setEstabLoading] = useState(false)
  const [estabError, setEstabError]     = useState('')

  // ── Injection style ──────────────────────────────────────────────────────────
  useEffect(injectStyle, [])

  // ── Géolocalisation ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!navigator.geolocation) return
    const id = navigator.geolocation.watchPosition(
      pos => setPatientPos([pos.coords.latitude, pos.coords.longitude]),
      () => {},
      { enableHighAccuracy: true, maximumAge: 30000, timeout: 10000 }
    )
    return () => navigator.geolocation.clearWatch(id)
  }, [])

  // ── Médecins ─────────────────────────────────────────────────────────────────
  const fetchDoctors = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await fetch(`${API}/auth/doctors`, { headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json()
      setDoctors(data.filter(d => d.latitude != null && d.longitude != null))
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [token])

  const fetchOnline = useCallback(async () => {
    try {
      const res  = await fetch('http://localhost:5000/api/doctors/online')
      const data = await res.json()
      setOnlineIds(data.online || [])
    } catch {}
  }, [])

  useEffect(() => { fetchDoctors(); fetchOnline() }, [fetchDoctors, fetchOnline])

  // ── Socket ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    import('socket.io-client').then(({ io }) => {
      const s = io('http://localhost:5000', { autoConnect: true, transports: ['websocket'] })
      socketRef.current = s
      s.on('doctors_status_update', ids => setOnlineIds(Array.isArray(ids) ? ids : []))
    }).catch(() => {})
    return () => socketRef.current?.disconnect()
  }, [])

  // ── Overpass ─────────────────────────────────────────────────────────────────
  const fetchEstab = useCallback(async (type) => {
    const center = patientPos || YAOUNDE
    const [lat, lng] = center
    const def = ESTAB[type]
    const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(def.query(lat, lng, OVERPASS_RADIUS))}`

    setEstabLoading(true)
    setEstabError('')
    setEstabMarkers([])
    try {
      const res  = await fetch(url)
      const data = await res.json()
      const markers = (data.elements || []).map(el => {
        const elLat = el.lat ?? el.center?.lat
        const elLng = el.lon  ?? el.center?.lon
        if (!elLat || !elLng) return null
        return {
          id: el.id, lat: elLat, lng: elLng, type,
          name: el.tags?.name || def.label.slice(0, -1),
          address: el.tags?.['addr:full'] || el.tags?.['addr:street'] || '',
        }
      }).filter(Boolean)

      setEstabMarkers(markers)
      if (markers.length === 0) setEstabError(`Aucun résultat dans un rayon de ${OVERPASS_RADIUS/1000} km`)
      else {
        setMapCenter([markers[0].lat, markers[0].lng])
        setMapZoom(14)
      }
    } catch {
      setEstabError('Erreur de connexion à Overpass API')
    } finally {
      setEstabLoading(false)
    }
  }, [patientPos])

  const handleEstabToggle = (type) => {
    if (activeEstab === type) { setActiveEstab(null); setEstabMarkers([]); setEstabError('') }
    else { setActiveEstab(type); fetchEstab(type) }
  }

  // ── Liste médecins filtrés ────────────────────────────────────────────────────
  const filteredDoctors = (() => {
    let list = doctors.filter(d => specialty === 'Toutes' || d.specialty === specialty)
    if (patientPos) {
      list = list.map(d => ({
        ...d,
        distance: haversine(patientPos[0], patientPos[1], parseFloat(d.latitude), parseFloat(d.longitude))
      }))
    }
    if (mapMode === 'nearest' && patientPos) list = [...list].sort((a, b) => (a.distance || 999) - (b.distance || 999))
    else if (mapMode === 'best')            list = [...list].sort((a, b) => (b.avg_rating || 0) - (a.avg_rating || 0))

    // En ligne toujours en tête
    return [
      ...list.filter(d =>  onlineIds.includes(d.id)),
      ...list.filter(d => !onlineIds.includes(d.id)),
    ]
  })()

  const nearestDoc = patientPos && filteredDoctors.length > 0
    ? filteredDoctors.reduce((best, d) => {
        const dist = haversine(patientPos[0], patientPos[1], parseFloat(d.latitude), parseFloat(d.longitude))
        return (!best || dist < best._dist) ? { ...d, _dist: dist } : best
      }, null)
    : null

  const bestDoc = filteredDoctors.length > 0
    ? filteredDoctors.reduce((best, d) => (d.avg_rating || 0) > (best?.avg_rating || 0) ? d : best, null)
    : null

  const getMarkerType = (doc) => {
    if (nearestDoc && doc.id === nearestDoc.id && mapMode !== 'best') return 'closest'
    if (bestDoc   && doc.id === bestDoc.id   && mapMode !== 'nearest') return 'best'
    if (onlineIds.includes(doc.id)) return 'online'
    return 'normal'
  }

  const getTravelTime = (dist) => {
    if (!dist && dist !== 0) return null
    return { dist: dist.toFixed(1), car: Math.round((dist / 50) * 60), walk: Math.round((dist / 5) * 60) }
  }

  const getGmapsUrl = (type) => {
    const [lat, lng] = patientPos || YAOUNDE
    return `https://www.google.com/maps/search/${encodeURIComponent(ESTAB[type]?.gmaps || type)}/@${lat},${lng},14z`
  }

  const getPhotoUrl = (doc) => doc.photo ? `http://localhost:5000/${doc.photo}` : null

  // ══════════════════════════════════════════════════════════════════════════════
  return (
    <div style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', fontFamily: 'sans-serif' }}>
      <Navbar />

      {/* Zone principale sous navbar */}
      <div
        className="mt-[88px] xl:mt-14"
        style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}
      >
        {/* ── SIDEBAR ──────────────────────────────────────────────────────── */}
        <aside style={{
          width: sidebarOpen ? 272 : 0,
          minWidth: sidebarOpen ? 272 : 0,
          transition: 'width 0.25s, min-width 0.25s',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          background: '#fff',
          borderRight: '1px solid #e5e7eb',
          boxShadow: '2px 0 16px #0001',
          zIndex: 20,
          flexShrink: 0,
        }}>
          {sidebarOpen && (
            <>
              {/* Header */}
              <div style={{ background: '#16a34a', padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                <div>
                  <h2 style={{ color: '#fff', fontWeight: 800, fontSize: 14, margin: 0 }}>🗺️ Carte des soins</h2>
                  <p style={{ color: '#bbf7d0', fontSize: 11, margin: '2px 0 0' }}>
                    {filteredDoctors.length} médecin{filteredDoctors.length !== 1 ? 's' : ''} géolocalisé{filteredDoctors.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <button onClick={() => navigate(-1)} style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,.2)', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 14 }}>←</button>
              </div>

              {/* Boutons établissements */}
              <div style={{ padding: '10px 10px 6px', borderBottom: '1px solid #f0f0f0', flexShrink: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>À proximité</p>
                  {estabLoading && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#16a34a', fontWeight: 600 }}>
                      <Spinner size={14} />
                      Recherche…
                    </div>
                  )}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
                  {Object.entries(ESTAB).map(([key, def]) => (
                    <button
                      key={key}
                      onClick={() => handleEstabToggle(key)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 5,
                        padding: '6px 8px', borderRadius: 10,
                        border: activeEstab === key ? `2px solid ${def.color}` : '1.5px solid #e5e7eb',
                        background: activeEstab === key ? `${def.color}18` : '#f9fafb',
                        color: activeEstab === key ? def.color : '#374151',
                        fontWeight: 700, fontSize: 11, cursor: 'pointer', transition: 'all 0.15s',
                      }}
                    >
                      <span style={{ fontSize: 14 }}>{def.icon}</span>
                      <span>{def.label}</span>
                    </button>
                  ))}
                </div>

                {/* Résultats / erreur */}
                {activeEstab && !estabLoading && (
                  <p style={{ fontSize: 10, color: estabError ? '#ef4444' : '#6b7280', margin: '5px 0 0', textAlign: 'center' }}>
                    {estabError || `${estabMarkers.length} trouvé${estabMarkers.length !== 1 ? 's' : ''} (rayon ${OVERPASS_RADIUS/1000} km)`}
                  </p>
                )}

                {/* Bouton Google Maps */}
                {activeEstab && !estabLoading && (
                  <a
                    href={getGmapsUrl(activeEstab)}
                    target="_blank" rel="noopener noreferrer"
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                      marginTop: 6, padding: '6px 10px', borderRadius: 10,
                      background: '#1a73e8', color: '#fff',
                      fontWeight: 700, fontSize: 11, textDecoration: 'none',
                    }}
                  >
                    🗺️ Voir sur Google Maps — {ESTAB[activeEstab]?.label}
                  </a>
                )}
              </div>

              {/* Filtre spécialité */}
              <div style={{ padding: '8px 12px', borderBottom: '1px solid #f0f0f0', flexShrink: 0 }}>
                <select
                  value={specialty}
                  onChange={e => setSpecialty(e.target.value)}
                  style={{ width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 10, padding: '6px 10px', fontSize: 12, background: '#f9fafb', outline: 'none', color: '#374151', fontWeight: 600 }}
                >
                  {SPECIALITES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              {/* Position patient */}
              {patientPos && (
                <div style={{ padding: '5px 12px', borderBottom: '1px solid #f0f0f0', background: '#eff6ff', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#3b82f6', display: 'inline-block', flexShrink: 0 }}></span>
                  <span style={{ fontSize: 11, color: '#1d4ed8', fontWeight: 600 }}>Position détectée</span>
                </div>
              )}

              {/* ── Liste médecins (compacte) ───────────────────────────────── */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '6px 0' }}>
                {loading && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '24px 0', color: '#16a34a', fontSize: 13, fontWeight: 600 }}>
                    <Spinner />
                    Chargement…
                  </div>
                )}
                {!loading && filteredDoctors.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '40px 16px' }}>
                    <span style={{ fontSize: 28, display: 'block', marginBottom: 6 }}>🩺</span>
                    <p style={{ color: '#6b7280', fontSize: 12 }}>Aucun médecin géolocalisé.</p>
                  </div>
                )}
                {filteredDoctors.map(doc => {
                  const isOnline   = onlineIds.includes(doc.id)
                  const isNearest  = nearestDoc?.id === doc.id && patientPos
                  const isBest     = bestDoc?.id === doc.id
                  const photo      = getPhotoUrl(doc)
                  const isSelected = selectedDoc?.id === doc.id
                  const travel     = getTravelTime(doc.distance)

                  return (
                    <div
                      key={doc.id}
                      onClick={() => {
                        setSelectedDoc(doc)
                        setMapCenter([parseFloat(doc.latitude), parseFloat(doc.longitude)])
                        setMapZoom(16)
                      }}
                      style={{
                        margin: '4px 8px',
                        padding: '8px 10px',
                        borderRadius: 12,
                        cursor: 'pointer',
                        border: isSelected ? '2px solid #16a34a' : '1.5px solid #f0f0f0',
                        background: isSelected ? '#f0fdf4' : '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        transition: 'all 0.12s',
                        position: 'relative',
                      }}
                    >
                      {/* Indicateur en ligne */}
                      {isOnline && (
                        <span style={{
                          position: 'absolute', top: 6, right: 8,
                          width: 8, height: 8, borderRadius: '50%',
                          background: '#22c55e', border: '1.5px solid #fff',
                        }}></span>
                      )}

                      {/* Photo */}
                      <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#dcfce7', flexShrink: 0, overflow: 'hidden', border: isOnline ? '2px solid #22c55e' : '2px solid #e5e7eb' }}>
                        {photo
                          ? <img src={photo} alt={doc.full_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>👨‍⚕️</div>
                        }
                      </div>

                      {/* Infos */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 12, color: '#1f2937', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {doc.full_name}
                        </div>
                        <div style={{ fontSize: 11, color: '#16a34a', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {doc.specialty}
                        </div>
                        {travel && (
                          <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 1 }}>
                            📍 {travel.dist} km · 🚗 {travel.car}m · 🚶 {travel.walk}m
                          </div>
                        )}
                        {/* Badges */}
                        <div style={{ display: 'flex', gap: 3, marginTop: 3, flexWrap: 'wrap' }}>
                          {isOnline  && <span style={{ fontSize: 9, background: '#dcfce7', color: '#15803d', padding: '1px 5px', borderRadius: 10, fontWeight: 700 }}>● En ligne</span>}
                          {isNearest && <span style={{ fontSize: 9, background: '#dbeafe', color: '#1d4ed8', padding: '1px 5px', borderRadius: 10, fontWeight: 700 }}>📍 Le plus proche</span>}
                          {isBest    && <span style={{ fontSize: 9, background: '#fef9c3', color: '#a16207', padding: '1px 5px', borderRadius: 10, fontWeight: 700 }}>⭐ Mieux noté</span>}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </aside>

        {/* ── ZONE CARTE ───────────────────────────────────────────────────── */}
        <div style={{ flex: 1, position: 'relative', minWidth: 0, minHeight: 0 }}>

          {/* Toggle sidebar */}
          <button
            onClick={() => setSidebarOpen(o => !o)}
            style={{
              position: 'absolute', top: 12, left: 12, zIndex: 1000,
              background: '#fff', border: '1.5px solid #e5e7eb',
              boxShadow: '0 2px 10px #0002', borderRadius: 10,
              width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#16a34a', cursor: 'pointer', fontSize: 14, fontWeight: 700,
            }}
          >
            {sidebarOpen ? '◀' : '▶'}
          </button>

          {/* ── NAVBAR MODES — overlay haut droite ──────────────────────────── */}
          <div style={{
            position: 'absolute', top: 12, right: 12, zIndex: 1000,
            display: 'flex', gap: 3,
            background: 'rgba(255,255,255,0.95)',
            backdropFilter: 'blur(8px)',
            border: '1.5px solid #e5e7eb',
            borderRadius: 16,
            boxShadow: '0 4px 20px #0002',
            padding: 5,
          }}>
            {[
              { key: 'default',   label: 'Par défaut', icon: '🗺️' },
              { key: 'nearest',   label: 'Plus proche', icon: '📍' },
              { key: 'best',      label: 'Mieux noté',  icon: '⭐' },
              { key: 'itinerary', label: 'Itinéraire',  icon: '🧭' },
            ].map(m => (
              <button
                key={m.key}
                onClick={() => setMapMode(m.key)}
                title={m.label}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '5px 10px', borderRadius: 11, border: 'none',
                  background: mapMode === m.key ? '#16a34a' : 'transparent',
                  color: mapMode === m.key ? '#fff' : '#4b5563',
                  fontWeight: 700, fontSize: 11, cursor: 'pointer',
                  transition: 'all 0.15s',
                  boxShadow: mapMode === m.key ? '0 2px 8px #16a34a44' : 'none',
                }}
              >
                <span style={{ fontSize: 14 }}>{m.icon}</span>
                <span style={{ display: 'none' }}>{m.label}</span>
              </button>
            ))}
          </div>

          {/* ── BOUTON MA POSITION ─────────────────────────────────────────── */}
          <button
            onClick={() => { if (patientPos) { setFlyTrigger(t => t + 1) } }}
            title="Ma position"
            style={{
              position: 'absolute', top: 60, right: 12, zIndex: 1000,
              background: patientPos ? 'rgba(255,255,255,0.95)' : 'rgba(220,220,220,0.9)',
              backdropFilter: 'blur(8px)',
              border: '1.5px solid #e5e7eb',
              borderRadius: 10, width: 36, height: 36,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: patientPos ? 'pointer' : 'not-allowed',
              boxShadow: '0 2px 10px #0002',
              fontSize: 18,
              transition: 'background 0.15s',
            }}
          >
            📍
          </button>

          {/* ── LÉGENDE — overlay bas droite ─────────────────────────────────── */}
          <div style={{
            position: 'absolute', bottom: 28, right: 12, zIndex: 1000,
            background: 'rgba(255,255,255,0.95)',
            backdropFilter: 'blur(8px)',
            border: '1.5px solid #e5e7eb',
            borderRadius: 14,
            boxShadow: '0 4px 20px #0002',
            padding: '10px 13px',
            minWidth: 140,
          }}>
            <p style={{ fontWeight: 800, fontSize: 10, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 7px' }}>Légende</p>
            {[
              { color: '#16a34a', label: 'Plus proche',   shape: 'circle' },
              { color: '#f59e0b', label: 'Mieux noté',    shape: 'square' },
              { color: '#10b981', label: 'En ligne',      shape: 'circle' },
              { color: '#3b82f6', label: 'Autre médecin', shape: 'circle' },
              { color: '#dc2626', label: 'Vous',          shape: 'circle' },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span style={{
                  display: 'inline-block', width: 11, height: 11, flexShrink: 0,
                  background: item.color, border: '2px solid #fff',
                  borderRadius: item.shape === 'circle' ? '50%' : 3,
                  boxShadow: `0 0 0 2px ${item.color}44`,
                }}></span>
                <span style={{ fontSize: 11, color: '#4b5563' }}>{item.label}</span>
              </div>
            ))}
            <div style={{ height: 1, background: '#f0f0f0', margin: '6px 0' }}/>
            {Object.entries(ESTAB).map(([, def]) => (
              <div key={def.label} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span style={{ fontSize: 13 }}>{def.icon}</span>
                <span style={{ fontSize: 11, color: '#4b5563' }}>{def.label}</span>
              </div>
            ))}
          </div>

          {/* Spinner Overpass centré sur la carte */}
          {estabLoading && (
            <div style={{
              position: 'absolute', top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 1001,
              background: 'rgba(255,255,255,0.96)',
              backdropFilter: 'blur(10px)',
              borderRadius: 16,
              boxShadow: '0 8px 32px #0003',
              padding: '16px 24px',
              display: 'flex', alignItems: 'center', gap: 12,
              fontSize: 14, fontWeight: 600, color: '#374151',
            }}>
              <Spinner size={22} />
              Recherche en cours…
            </div>
          )}

          {/* ── CARTE LEAFLET ─────────────────────────────────────────────── */}
          <MapContainer
            center={YAOUNDE}
            zoom={13}
            style={{ width: '100%', height: '100%' }}
            zoomControl={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapCenterController center={mapCenter} zoom={mapZoom} />
            <FlyToPatient trigger={flyTrigger} patientPos={patientPos} />

            {/* Marqueur patient */}
            {patientPos && (
              <Marker position={patientPos} icon={createDocIcon('patient')}>
                <Popup>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>📍 Vous êtes ici</div>
                </Popup>
              </Marker>
            )}

            {/* Marqueurs médecins */}
            {filteredDoctors.map(doc => {
              const lat    = parseFloat(doc.latitude)
              const lng    = parseFloat(doc.longitude)
              const type   = getMarkerType(doc)
              const isOnline = onlineIds.includes(doc.id)
              const travel = getTravelTime(doc.distance)
              const photo  = getPhotoUrl(doc)

              return (
                <Marker
                  key={doc.id}
                  position={[lat, lng]}
                  icon={createDocIcon(type)}
                  eventHandlers={{ click: () => setSelectedDoc(doc) }}
                >
                  <Popup maxWidth={270} minWidth={230}>
                    <div style={{ fontFamily: 'sans-serif' }}>
                      <div style={{ display: 'flex', gap: 10, marginBottom: 10, alignItems: 'flex-start' }}>
                        <div style={{ width: 44, height: 44, borderRadius: '50%', overflow: 'hidden', border: '2px solid #e5e7eb', flexShrink: 0, background: '#dcfce7' }}>
                          {photo
                            ? <img src={photo} alt={doc.full_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>👨‍⚕️</div>
                          }
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 13 }}>{doc.full_name}</div>
                          <div style={{ fontSize: 11, color: '#16a34a', fontWeight: 600 }}>{doc.specialty}</div>
                          <div style={{ display: 'flex', gap: 4, marginTop: 3 }}>
                            {isOnline && <span style={{ fontSize: 9, background: '#dcfce7', color: '#15803d', padding: '1px 5px', borderRadius: 10, fontWeight: 700 }}>🟢 En ligne</span>}
                            {doc.avg_rating && <span style={{ fontSize: 9, color: '#d97706', fontWeight: 700 }}>⭐ {parseFloat(doc.avg_rating).toFixed(1)}</span>}
                          </div>
                        </div>
                      </div>

                      {/* Infos */}
                      <div style={{ background: '#f9fafb', borderRadius: 8, padding: '7px 9px', marginBottom: 9, fontSize: 11, color: '#4b5563' }}>
                        {doc.tarif && <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}><span>Tarif</span><span style={{ fontWeight: 700 }}>{parseInt(doc.tarif).toLocaleString('fr-FR')} FCFA</span></div>}
                        {travel && (
                          <>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}><span>📍 Distance</span><span style={{ fontWeight: 700 }}>{travel.dist} km</span></div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}><span>🚗 En voiture</span><span style={{ fontWeight: 700 }}>~{travel.car} min</span></div>
                            <div style={{ display: 'flex', justifyContent: 'space-between'                }}><span>🚶 À pied</span><span style={{ fontWeight: 700 }}>~{travel.walk} min</span></div>
                          </>
                        )}
                        {doc.address && <div style={{ marginTop: 3, fontSize: 10, color: '#6b7280' }}>📍 {doc.address.length > 55 ? doc.address.slice(0, 55) + '…' : doc.address}</div>}
                      </div>

                      {/* Actions */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5, marginBottom: 5 }}>
                        <button onClick={() => navigate(`/doctor/${doc.id}`)}          style={{ background: '#16a34a', color: '#fff', border: 'none', borderRadius: 9, padding: '7px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>👤 Consulter</button>
                        <button onClick={() => navigate(`/doctor/${doc.id}?tab=rdv`)} style={{ background: '#fff', color: '#16a34a', border: '1.5px solid #16a34a', borderRadius: 9, padding: '7px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>📅 RDV</button>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: patientPos ? '1fr 1fr' : '1fr', gap: 5 }}>
                        {patientPos && (
                          <a href={`https://www.google.com/maps/dir/?api=1&origin=${patientPos[0]},${patientPos[1]}&destination=${lat},${lng}`} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, background: '#eff6ff', color: '#1d4ed8', border: '1.5px solid #bfdbfe', borderRadius: 9, padding: '7px', fontSize: 11, fontWeight: 700, textDecoration: 'none' }}>🧭 Itinéraire</a>
                        )}
                        <a href={`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, background: '#f9fafb', color: '#374151', border: '1.5px solid #e5e7eb', borderRadius: 9, padding: '7px', fontSize: 11, fontWeight: 700, textDecoration: 'none' }}>🔍 Voir</a>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              )
            })}

            {/* Marqueurs établissements Overpass */}
            {estabMarkers.map(estab => {
              const def = ESTAB[estab.type]
              return (
                <Marker
                  key={`${estab.type}-${estab.id}`}
                  position={[estab.lat, estab.lng]}
                  icon={createEstabIcon(estab.type, def?.icon || '🏥')}
                >
                  <Popup maxWidth={220}>
                    <div style={{ fontFamily: 'sans-serif' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <span style={{ fontSize: 24 }}>{def?.icon}</span>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 13 }}>{estab.name}</div>
                          <div style={{ fontSize: 11, color: def?.color, fontWeight: 600 }}>{def?.label?.slice(0, -1)}</div>
                        </div>
                      </div>
                      {estab.address && <p style={{ fontSize: 11, color: '#6b7280', marginBottom: 8 }}>📍 {estab.address}</p>}
                      {patientPos && (() => {
                        const t = getTravelTime(haversine(patientPos[0], patientPos[1], estab.lat, estab.lng))
                        return t ? (
                          <div style={{ background: '#f9fafb', borderRadius: 8, padding: '6px 8px', fontSize: 11, color: '#4b5563', marginBottom: 8 }}>
                            📍 {t.dist} km &nbsp;·&nbsp; 🚗 {t.car} min &nbsp;·&nbsp; 🚶 {t.walk} min
                          </div>
                        ) : null
                      })()}
                      <div style={{ display: 'grid', gridTemplateColumns: patientPos ? '1fr 1fr' : '1fr', gap: 5 }}>
                        {patientPos && <a href={`https://www.google.com/maps/dir/?api=1&origin=${patientPos[0]},${patientPos[1]}&destination=${estab.lat},${estab.lng}`} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#eff6ff', color: '#1d4ed8', border: '1.5px solid #bfdbfe', borderRadius: 8, padding: '6px', fontSize: 11, fontWeight: 700, textDecoration: 'none' }}>🧭 Itinéraire</a>}
                        <a href={`https://www.google.com/maps/search/?api=1&query=${estab.lat},${estab.lng}`} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb', color: '#374151', border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '6px', fontSize: 11, fontWeight: 700, textDecoration: 'none' }}>🔍 Voir</a>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              )
            })}
          </MapContainer>

          {/* Panneau itinéraire */}
          {mapMode === 'itinerary' && (
            <div style={{
              position: 'absolute', top: 60, left: '50%', transform: 'translateX(-50%)',
              zIndex: 1000, background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(10px)',
              borderRadius: 16, boxShadow: '0 8px 32px #0003',
              border: '1.5px solid #e5e7eb', padding: 16, width: 290,
            }}>
              <h3 style={{ fontWeight: 700, fontSize: 14, margin: '0 0 10px' }}>🧭 Mode Itinéraire</h3>
              {!patientPos
                ? <p style={{ fontSize: 12, color: '#6b7280' }}>Activez la géolocalisation pour calculer des itinéraires.</p>
                : selectedDoc
                  ? (
                    <div>
                      <p style={{ fontSize: 12, color: '#4b5563', marginBottom: 8 }}>Vers <strong>{selectedDoc.full_name}</strong></p>
                      {selectedDoc.distance && <p style={{ fontSize: 11, color: '#6b7280', marginBottom: 10 }}>Distance : {selectedDoc.distance.toFixed(1)} km</p>}
                      <a href={`https://www.google.com/maps/dir/?api=1&origin=${patientPos[0]},${patientPos[1]}&destination=${selectedDoc.latitude},${selectedDoc.longitude}`} target="_blank" rel="noopener noreferrer" style={{ display: 'block', background: '#16a34a', color: '#fff', textAlign: 'center', borderRadius: 10, padding: '9px', fontWeight: 700, fontSize: 12, textDecoration: 'none' }}>
                        Ouvrir dans Google Maps →
                      </a>
                    </div>
                  )
                  : <p style={{ fontSize: 12, color: '#6b7280' }}>Cliquez sur un médecin pour calculer l'itinéraire.</p>
              }
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
