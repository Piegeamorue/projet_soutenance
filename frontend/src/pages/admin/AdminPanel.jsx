import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { formatDoctorName } from "../../utils/formatDoctor";

const API = 'http://localhost:5000/api';

export default function AdminPanel() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("approvals");
  const [doctors, setDoctors] = useState([]);
  const [users, setUsers] = useState([]);
  const [consultations, setConsultations] = useState([]);
  const [changeRequests, setChangeRequests] = useState([]);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalDoctors: 0,
    totalConsultations: 0,
    pendingApprovals: 0,
    todayConsultations: 0,
    revenue: "0 FCFA",
    avgRating: 0.0,
    missedAppointments: 0
  });

  const [docModal, setDocModal] = useState(null);
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [notification, setNotification] = useState(null);
  const [loading, setLoading] = useState(false);

  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    if (!token || user.role !== 'admin') {
      navigate('/login');
    }
  }, [token, user, navigate]);

  const showNotif = (msg, type = "success") => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const fetchData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      if (activeTab === "approvals") {
        const res = await axios.get(`${API}/admin/doctors/pending`, { headers });
        setDoctors(res.data);
      } else if (activeTab === "users") {
        const res = await axios.get(`${API}/admin/users`, { headers });
        setUsers(res.data);
      } else if (activeTab === "consultations") {
        const res = await axios.get(`${API}/admin/consultations`, { headers });
        setConsultations(res.data);
        const statsRes = await axios.get(`${API}/admin/stats`, { headers });
        setStats(prev => ({
          ...prev,
          todayConsultations: statsRes.data.today_consultations || 0,
          avgRating: statsRes.data.avg_rating || 4.5,
          missedAppointments: statsRes.data.missed_appointments || 0
        }));
      } else if (activeTab === "stats") {
        const statsRes = await axios.get(`${API}/admin/stats`, { headers });
        const totalU = Number(statsRes.data.total_patients || 0) + Number(statsRes.data.total_doctors || 0);
        setStats({
          totalUsers: totalU,
          totalDoctors: Number(statsRes.data.total_doctors || 0),
          totalConsultations: Number(statsRes.data.total_consultations || 0),
          pendingApprovals: Number(statsRes.data.pending_doctors || 0),
          todayConsultations: Number(statsRes.data.today_consultations || 0),
          revenue: (Number(statsRes.data.total_consultations || 0) * 10000).toLocaleString() + " FCFA",
          avgRating: 4.5,
          missedAppointments: Number(statsRes.data.missed_appointments || 0)
        });
      } else if (activeTab === "suspended") {
        const res = await axios.get(`${API}/admin/users`, { headers });
        setUsers(res.data.filter(u => u.status === 'suspended'));
      } else if (activeTab === "requests") {
        const res = await axios.get(`${API}/admin/change-requests`, { headers });
        setChangeRequests(res.data);
      }
    } catch (err) {
      console.error(err);
      showNotif("Erreur lors du chargement des données", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const handleApprove = async (id) => {
    try {
      await axios.patch(`${API}/admin/doctors/${id}/approve`, {}, { headers });
      setDoctors((d) => d.filter((doc) => doc.id !== id));
      showNotif("Médecin approuvé avec succès ✅");
    } catch (err) {
      showNotif("Erreur lors de l'approbation du médecin", "error");
    }
  };

  const handleReject = async () => {
    try {
      await axios.patch(`${API}/admin/doctors/${rejectModal}/reject`, { reason: rejectReason }, { headers });
      setDoctors((d) => d.filter((doc) => doc.id !== rejectModal));
      setRejectModal(null);
      setRejectReason("");
      showNotif("Médecin rejeté ❌", "error");
    } catch (err) {
      showNotif("Erreur lors du rejet du médecin", "error");
    }
  };

  const handleToggleSuspend = async (id) => {
    try {
      const res = await axios.patch(`${API}/admin/users/${id}/suspend`, {}, { headers });
      showNotif(res.data.message);
      fetchData();
    } catch (err) {
      showNotif("Erreur lors du changement de statut", "error");
    }
  };

  const handleApproveRequest = async (id) => {
    try {
      await axios.patch(`${API}/admin/change-requests/${id}/approve`, {}, { headers });
      setChangeRequests((r) => r.filter((x) => x.id !== id));
      showNotif("Demande approuvée ✅");
    } catch (err) {
      showNotif(err.response?.data?.message || "Erreur", "error");
    }
  };

  const handleRejectRequest = async (id) => {
    try {
      await axios.patch(`${API}/admin/change-requests/${id}/reject`, { reason: "Refus administrateur" }, { headers });
      setChangeRequests((r) => r.filter((x) => x.id !== id));
      showNotif("Demande refusée", "error");
    } catch (err) {
      showNotif("Erreur", "error");
    }
  };

  const tabs = [
    { id: "approvals", label: "Approbations", icon: "🩺", count: activeTab === "approvals" ? doctors.length : null },
    { id: "users", label: "Utilisateurs", icon: "👥", count: null },
    { id: "consultations", label: "Consultations", icon: "📋", count: null },
    { id: "stats", label: "Statistiques", icon: "📊", count: null },
    { id: "suspended", label: "Suspensions", icon: "🔐", count: null },
    { id: "requests", label: "Demandes profil", icon: "📝", count: activeTab === "requests" ? changeRequests.length : null },
  ];

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* Notification Toast */}
      {notification && (
        <div
          className={`fixed top-6 right-6 z-50 px-6 py-3 rounded-xl shadow-xl text-white font-semibold text-sm transition-all ${
            notification.type === "error" ? "bg-red-500" : "bg-green-600"
          }`}
        >
          {notification.msg}
        </div>
      )}

      {/* Sidebar + Main layout */}
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside className="w-64 bg-white shadow-lg flex flex-col fixed h-full z-10">
          {/* Logo */}
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-600 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-lg">M</span>
              </div>
              <div>
                <h1 className="font-bold text-gray-800 text-lg leading-none">MediCam</h1>
                <p className="text-xs text-green-600 font-medium">Panel Admin</p>
              </div>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 p-4 space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? "bg-green-600 text-white shadow-md"
                    : "text-gray-600 hover:bg-green-50 hover:text-green-700"
                }`}
              >
                <span className="flex items-center gap-3">
                  <span>{tab.icon}</span>
                  {tab.label}
                </span>
                {tab.count !== null && (
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                      activeTab === tab.id ? "bg-white text-green-600" : "bg-red-100 text-red-600"
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>

          {/* Admin info */}
          <div className="p-4 border-t border-gray-100 flex flex-col gap-2">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <div className="w-9 h-9 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-green-700 font-bold text-sm">A</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">Administrateur</p>
                <p className="text-xs text-gray-500 truncate">{user.email || 'contact@medicam.com'}</p>
              </div>
            </div>
            <button
              onClick={() => { localStorage.clear(); navigate('/login'); }}
              className="w-full bg-red-50 hover:bg-red-100 text-red-600 font-semibold py-2 rounded-xl text-xs transition-colors"
            >
              Déconnexion
            </button>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 ml-64 p-8">
          {loading && (
            <div className="text-center py-4 text-green-600 font-medium">Chargement...</div>
          )}

          {/* ============ APPROBATIONS ============ */}
          {activeTab === "approvals" && !loading && (
            <div>
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-800">Médecins en attente d'approbation</h2>
                <p className="text-gray-500 mt-1">{doctors.length} dossier(s) à traiter</p>
              </div>

              {doctors.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-sm p-16 text-center">
                  <div className="text-5xl mb-4">🎉</div>
                  <h3 className="text-xl font-semibold text-gray-700">Tous les dossiers ont été traités</h3>
                  <p className="text-gray-400 mt-2">Aucun médecin en attente d'approbation</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {doctors.map((doc) => (
                    <div key={doc.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                      <div className="flex items-start justify-between flex-wrap gap-4">
                        {/* Doctor info */}
                        <div className="flex items-start gap-4">
                          <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center flex-shrink-0">
                            <span className="text-2xl">👨‍⚕️</span>
                          </div>
                          <div>
                            <h3 className="font-bold text-gray-800 text-lg">{doc.full_name}</h3>
                            <p className="text-green-600 font-medium text-sm">{doc.specialty}</p>
                            <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-500">
                              <span>📧 {doc.email}</span>
                              <span>🏥 ONMC: {doc.onmc_number}</span>
                              <span>📅 Soumis le {new Date(doc.created_at).toLocaleDateString('fr-FR')}</span>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3">
                          <button
                            onClick={() => handleApprove(doc.id)}
                            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-colors"
                          >
                            ✅ Approuver
                          </button>
                          <button
                            onClick={() => setRejectModal(doc.id)}
                            className="flex items-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-5 py-2.5 rounded-xl font-semibold text-sm transition-colors"
                          >
                            ❌ Rejeter
                          </button>
                        </div>
                      </div>

                      {/* Documents */}
                      <div className="mt-5 pt-5 border-t border-gray-100">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Documents KYC</p>
                        <div className="flex flex-wrap gap-3">
                          {[
                            { key: "cni", label: "Carte Nationale d'Identité", icon: "🪪" },
                            { key: "attestation", label: "Attestation ONMC", icon: "📜" },
                            { key: "selfie", label: "Selfie avec CNI", icon: "🤳" },
                          ].map((d) => {
                            const path = doc[d.key + '_path'];
                            return (
                              <button
                                key={d.key}
                                onClick={() => setDocModal({ doctor: doc.full_name, type: d.label, path })}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                                  path
                                    ? "bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                                    : "bg-red-50 border-red-200 text-red-600 cursor-not-allowed"
                                }`}
                                disabled={!path}
                              >
                                <span>{d.icon}</span>
                                {d.label}
                                {path ? (
                                  <span className="text-green-500 font-bold">✓</span>
                                ) : (
                                  <span className="text-red-500 font-bold">✗</span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ============ UTILISATEURS ============ */}
          {activeTab === "users" && !loading && (
            <div>
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-800">Gestion des utilisateurs</h2>
                <p className="text-gray-500 mt-1">{users.length} utilisateurs enregistrés</p>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      {["Nom", "Rôle", "Email", "Statut", "Inscription", "Actions"].map((h) => (
                        <th key={h} className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 font-medium text-gray-800 text-sm">{u.full_name}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                            u.role === "doctor" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"
                          }`}>
                            {u.role === "doctor" ? "Médecin" : "Patient"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-500 text-sm">{u.email}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                            u.status === "active" ? "bg-green-100 text-green-700" :
                            u.status === "pending" ? "bg-yellow-100 text-yellow-700" :
                            "bg-red-100 text-red-700"
                          }`}>
                            {u.status === "active" ? "Actif" : u.status === "pending" ? "En attente" : "Suspendu"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-500 text-sm">
                          {new Date(u.created_at).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleToggleSuspend(u.id)}
                              className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                                u.status === "suspended"
                                  ? "text-green-600 bg-green-50 hover:bg-green-100"
                                  : "text-red-500 bg-red-50 hover:bg-red-100"
                              }`}
                            >
                              {u.status === "suspended" ? "Réactiver" : "Suspendre"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ============ CONSULTATIONS ============ */}
          {activeTab === "consultations" && !loading && (
            <div>
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-800">Suivi des consultations</h2>
                <p className="text-gray-500 mt-1">{consultations.length} consultations récentes</p>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-8">
                {[
                  { label: "Aujourd'hui", value: stats.todayConsultations, icon: "📋", color: "green" },
                  { label: "Note moyenne", value: stats.avgRating + " ⭐", icon: "⭐", color: "yellow" },
                  { label: "RDV manqués", value: stats.missedAppointments, icon: "⚠️", color: "red" },
                ].map((s) => (
                  <div key={s.label} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">{s.icon}</span>
                      <p className="text-sm text-gray-500 font-medium">{s.label}</p>
                    </div>
                    <p className="text-3xl font-bold text-gray-800">{s.value}</p>
                  </div>
                ))}
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      {["Patient", "Médecin", "Type", "Date", "Statut", "Note"].map((h) => (
                        <th key={h} className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {consultations.map((c) => (
                      <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 text-sm font-medium text-gray-800">{c.patient_name}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{formatDoctorName(c.doctor_name)}</td>
                        <td className="px-6 py-4">
                          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-blue-50 text-blue-700">{c.type}</span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {new Date(c.created_at).toLocaleString('fr-FR')}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                            c.status === "completed" ? "bg-green-100 text-green-700" :
                            c.status === "active" ? "bg-blue-100 text-blue-700" :
                            "bg-red-100 text-red-700"
                          }`}>{c.status === 'completed' ? 'Terminée' : c.status === 'active' ? 'En cours' : c.status}</span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">
                          —
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ============ STATISTIQUES ============ */}
          {activeTab === "stats" && !loading && (
            <div>
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-800">Tableau de bord — Statistiques</h2>
                <p className="text-gray-500 mt-1">Vue d'ensemble de la plateforme MediCam</p>
              </div>

              {/* KPI cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {[
                  { label: "Utilisateurs totaux", value: stats.totalUsers, icon: "👥", bg: "bg-blue-50", icon_bg: "bg-blue-100", text: "text-blue-700" },
                  { label: "Médecins approuvés", value: stats.totalDoctors, icon: "👨‍⚕️", bg: "bg-green-50", icon_bg: "bg-green-100", text: "text-green-700" },
                  { label: "Consultations totales", value: stats.totalConsultations, icon: "📋", bg: "bg-purple-50", icon_bg: "bg-purple-100", text: "text-purple-700" },
                  { label: "Revenus (est. 10k/cons)", value: stats.revenue, icon: "💰", bg: "bg-yellow-50", icon_bg: "bg-yellow-100", text: "text-yellow-700" },
                ].map((s) => (
                  <div key={s.label} className={`${s.bg} rounded-2xl p-6`}>
                    <div className={`w-10 h-10 ${s.icon_bg} rounded-xl flex items-center justify-center mb-3`}>
                      <span className="text-xl">{s.icon}</span>
                    </div>
                    <p className={`text-3xl font-bold ${s.text}`}>{s.value}</p>
                    <p className="text-sm text-gray-500 mt-1 font-medium">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Charts placeholder */}
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <h3 className="font-bold text-gray-700 mb-5">Consultations</h3>
                  <div className="space-y-4">
                    {[
                      { label: "En ligne", value: 70, color: "bg-green-500" },
                      { label: "Cabinet", value: 20, color: "bg-blue-500" },
                      { label: "Domicile", value: 10, color: "bg-orange-400" },
                    ].map((item) => (
                      <div key={item.label}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-600 font-medium">{item.label}</span>
                          <span className="text-gray-500">{item.value}%</span>
                        </div>
                        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full ${item.color} rounded-full`} style={{ width: `${item.value}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <h3 className="font-bold text-gray-700 mb-5">Inscriptions (30 derniers jours)</h3>
                  <div className="flex items-end gap-2 h-32">
                    {[12, 18, 8, 24, 16, 30, 22, 14, 28, 20, 35, 25, 18, 32].map((v, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <div
                          className="w-full bg-green-500 rounded-t-md opacity-80 hover:opacity-100 transition-opacity"
                          style={{ height: `${(v / 35) * 100}%` }}
                        />
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 mt-3 text-center">Tendance haussière +23% vs mois précédent</p>
                </div>
              </div>
            </div>
          )}

          {/* ============ SUSPENSIONS ============ */}
          {activeTab === "suspended" && !loading && (
            <div>
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-800">Comptes suspendus</h2>
                <p className="text-gray-500 mt-1">{users.length} compte(s) suspendu(s)</p>
              </div>

              {users.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-sm p-16 text-center">
                  <div className="text-5xl mb-4">🛡️</div>
                  <h3 className="text-xl font-semibold text-gray-700">Aucun compte n'est suspendu</h3>
                  <p className="text-gray-400 mt-2">La plateforme fonctionne parfaitement</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {users.map((acc) => (
                    <div key={acc.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                      <div className="flex items-start justify-between flex-wrap gap-4">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center text-xl">
                            🔐
                          </div>
                          <div>
                            <h3 className="font-bold text-gray-800">{acc.full_name}</h3>
                            <p className="text-sm text-gray-500">{acc.email}</p>
                            <div className="flex gap-4 mt-2 text-xs text-gray-400">
                              <span>Rôle : <span className="font-medium text-gray-600">{acc.role === "doctor" ? "Médecin" : "Patient"}</span></span>
                              <span>Inscrit le : <span className="font-medium text-gray-600">{new Date(acc.created_at).toLocaleDateString('fr-FR')}</span></span>
                              <span>Statut : <span className="font-medium text-red-500">Suspendu</span></span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleToggleSuspend(acc.id)}
                            className="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                          >
                            Réactiver le compte
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "requests" && !loading && (
            <div>
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-800">Demandes de modification (médecins)</h2>
                <p className="text-gray-500 mt-1">{changeRequests.length} demande(s) en attente</p>
              </div>
              {changeRequests.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-sm p-16 text-center">
                  <p className="text-gray-500">Aucune demande en attente</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {changeRequests.map((req) => (
                    <div key={req.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-wrap justify-between gap-4">
                      <div>
                        <h3 className="font-bold text-gray-800">{req.full_name}</h3>
                        <p className="text-sm text-gray-500">{req.current_email}</p>
                        <p className="text-sm mt-2"><b>{req.request_type}</b> : {req.old_value || '—'} → {req.new_value}</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleApproveRequest(req.id)} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl text-sm font-semibold">Approuver</button>
                        <button onClick={() => handleRejectRequest(req.id)} className="bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2 rounded-xl text-sm font-semibold">Refuser</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* ============ MODAL Document ============ */}
      {docModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-gray-800 text-lg">{docModal.type}</h3>
              <button onClick={() => setDocModal(null)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
            </div>
            <div className="bg-gray-100 rounded-xl h-56 flex flex-col items-center justify-center gap-3 overflow-hidden p-2">
              {docModal.path ? (
                docModal.path.toLowerCase().endsWith('.pdf') ? (
                  <div className="text-center p-4">
                    <span className="text-5xl block mb-2">📄</span>
                    <a
                      href={`http://localhost:5000/${docModal.path}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-green-600 hover:underline font-semibold"
                    >
                      Ouvrir le PDF
                    </a>
                  </div>
                ) : (
                  <img
                    src={`http://localhost:5000/${docModal.path}`}
                    className="max-h-full max-w-full object-contain rounded"
                    alt={docModal.type}
                  />
                )
              ) : (
                <>
                  <span className="text-5xl">📄</span>
                  <p className="text-gray-500 text-sm font-medium">{docModal.type}</p>
                </>
              )}
            </div>
            <p className="text-xs text-center text-gray-400 mt-3">
              {docModal.doctor} — Documents transmis par le candidat
            </p>
            <button
              onClick={() => setDocModal(null)}
              className="w-full mt-5 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              Fermer
            </button>
          </div>
        </div>
      )}

      {/* ============ MODAL Rejet ============ */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                <span className="text-xl">❌</span>
              </div>
              <h3 className="font-bold text-gray-800 text-lg">Rejeter la demande</h3>
            </div>
            <p className="text-gray-600 text-sm mb-4">Veuillez indiquer le motif du rejet (obligatoire) :</p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-red-400 resize-none"
              rows={4}
              placeholder="Ex: Documents incomplets, attestation ONMC non valide, photo floue..."
            />
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => { setRejectModal(null); setRejectReason(""); }}
                className="flex-1 border border-gray-200 text-gray-600 font-semibold py-3 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectReason.trim()}
                className="flex-1 bg-red-500 hover:bg-red-600 disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold py-3 rounded-xl transition-colors"
              >
                Confirmer le rejet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
