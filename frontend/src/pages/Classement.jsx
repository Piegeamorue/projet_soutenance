import { useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";

const top20Notes = [
  { nom: "Dr. Abena Marie", hopital: "Hôpital Central Yaoundé", specialite: "Pédiatre", note: 4.9, consultations: 312 },
  { nom: "Dr. Fotso Jean", hopital: "Clinique La Grâce Douala", specialite: "Cardiologue", note: 4.8, consultations: 287 },
  { nom: "Dr. Nguemo Paul", hopital: "Centre Médical Bastos", specialite: "Généraliste", note: 4.8, consultations: 156 },
  { nom: "Dr. Kamga Sophie", hopital: "Hôpital Général Douala", specialite: "Gynécologue", note: 4.7, consultations: 198 },
  { nom: "Dr. Mvondo Eric", hopital: "Clinique Bethesda Yaoundé", specialite: "Neurologue", note: 4.7, consultations: 134 },
  { nom: "Dr. Biya Clarisse", hopital: "Hôpital Central Yaoundé", specialite: "Dermatologue", note: 4.6, consultations: 221 },
  { nom: "Dr. Talla Roger", hopital: "Clinique La Croix Bafoussam", specialite: "ORL", note: 4.6, consultations: 167 },
  { nom: "Dr. Nkomo Alice", hopital: "Centre Médical Akwa", specialite: "Psychiatre", note: 4.6, consultations: 143 },
  { nom: "Dr. Essomba Luc", hopital: "Hôpital Laquintinie Douala", specialite: "Pneumologue", note: 4.5, consultations: 189 },
  { nom: "Dr. Ondoa Sarah", hopital: "Clinique Pasteur Yaoundé", specialite: "Endocrinologue", note: 4.5, consultations: 112 },
  { nom: "Dr. Manga Thierry", hopital: "Hôpital Général Douala", specialite: "Urologue", note: 4.5, consultations: 128 },
  { nom: "Dr. Zang Patricia", hopital: "Centre Médical Bastos", specialite: "Ophtalmologue", note: 4.4, consultations: 205 },
  { nom: "Dr. Mba Christophe", hopital: "Hôpital Central Yaoundé", specialite: "Néphrologue", note: 4.4, consultations: 98 },
  { nom: "Dr. Ateba Joëlle", hopital: "Clinique Bethesda Yaoundé", specialite: "Rhumatologue", note: 4.4, consultations: 115 },
  { nom: "Dr. Fouda Marcel", hopital: "Hôpital Laquintinie Douala", specialite: "Infectiologue", note: 4.3, consultations: 176 },
  { nom: "Dr. Bello Fatima", hopital: "Centre Médical Akwa", specialite: "Gériatre", note: 4.3, consultations: 134 },
  { nom: "Dr. Nanga Pierre", hopital: "Clinique La Grâce Douala", specialite: "Allergologue", note: 4.3, consultations: 89 },
  { nom: "Dr. Eyenga Rose", hopital: "Hôpital Général Douala", specialite: "Nutritionniste", note: 4.2, consultations: 201 },
  { nom: "Dr. Abomo Jules", hopital: "Clinique Pasteur Yaoundé", specialite: "Hématologue", note: 4.2, consultations: 77 },
  { nom: "Dr. Tchoupo Anne", hopital: "Centre Médical Bastos", specialite: "Médecin du Sport", note: 4.2, consultations: 143 },
];

const top20Consultations = [...top20Notes].sort((a, b) => b.consultations - a.consultations);

function podiumStyle(i) {
  if (i === 0) return { row: "bg-yellow-50 border-l-4 border-yellow-400", badge: "bg-yellow-400 text-white", label: "🥇" };
  if (i === 1) return { row: "bg-gray-100 border-l-4 border-gray-400", badge: "bg-gray-400 text-white", label: "🥈" };
  if (i === 2) return { row: "bg-orange-50 border-l-4 border-orange-400", badge: "bg-orange-400 text-white", label: "🥉" };
  return { row: "bg-white border-l-4 border-transparent hover:bg-gray-50", badge: "bg-green-100 text-green-700", label: `${i + 1}` };
}

function joursRestants() {
  const now = new Date();
  const finMois = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return finMois.getDate() - now.getDate();
}

export default function Classement() {
  const [onglet, setOnglet] = useState("notes");
  const liste = onglet === "notes" ? top20Notes : top20Consultations;
  const jours = joursRestants();

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <Navbar />
      <div className="pt-24 pb-20 max-w-4xl mx-auto px-4">

        {/* Header */}
        <div className="text-center mb-10">
          <span className="text-green-600 font-bold text-sm uppercase tracking-widest">Top médecins</span>
          <h1 className="text-3xl font-extrabold text-gray-900 mt-2">Classement du mois</h1>
          <p className="text-gray-500 mt-2">
            Éligibilité à partir de 10 consultations —{" "}
            <span className="text-green-600 font-semibold">Fin du mois dans {jours} jour{jours > 1 ? "s" : ""}</span>
          </p>
        </div>

        {/* Onglets */}
        <div className="flex justify-center gap-3 mb-8">
          <button
            onClick={() => setOnglet("notes")}
            className={`px-6 py-2 rounded-full font-bold text-sm transition-colors ${onglet === "notes" ? "bg-green-600 text-white" : "bg-white border border-gray-200 text-gray-600 hover:border-green-300"}`}
          >
            ⭐ Meilleures notes
          </button>
          <button
            onClick={() => setOnglet("consultations")}
            className={`px-6 py-2 rounded-full font-bold text-sm transition-colors ${onglet === "consultations" ? "bg-green-600 text-white" : "bg-white border border-gray-200 text-gray-600 hover:border-green-300"}`}
          >
            📊 Plus de consultations
          </button>
        </div>

        {/* Liste */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {liste.map((doc, i) => {
            const style = podiumStyle(i);
            return (
              <div key={doc.nom + i} className={`flex items-center gap-4 px-5 py-4 border-b border-gray-50 last:border-0 transition-colors ${style.row}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${style.badge}`}>
                  {i < 3 ? style.label : i + 1}
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-xl flex-shrink-0 border-2 border-green-200">
                  👨‍⚕️
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-gray-800 truncate">{doc.nom}</div>
                  <div className="text-xs text-gray-500 truncate">{doc.hopital}</div>
                  <div className="text-xs text-green-600 font-medium">{doc.specialite}</div>
                </div>
                <div className="text-right flex-shrink-0">
                  {onglet === "notes" ? (
                    <div>
                      <div className="text-lg font-extrabold text-yellow-500">⭐ {doc.note}</div>
                      <div className="text-xs text-gray-400">{doc.consultations} consult.</div>
                    </div>
                  ) : (
                    <div>
                      <div className="text-lg font-extrabold text-green-600">{doc.consultations}</div>
                      <div className="text-xs text-gray-400">consultations</div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="text-center mt-6">
          <Link to="/" className="text-sm text-green-600 hover:underline font-medium">← Retour à l'accueil</Link>
        </div>
      </div>
    </div>
  );
}
