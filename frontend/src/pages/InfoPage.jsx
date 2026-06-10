import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'

export default function InfoPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('faq')

  // Set active tab based on route on mount
  useEffect(() => {
    const path = location.pathname
    if (path.includes('faq')) setActiveTab('faq')
    else if (path.includes('aide')) setActiveTab('help')
    else if (path.includes('confidentialite')) setActiveTab('privacy')
    else if (path.includes('conditions')) setActiveTab('terms')
  }, [location])

  const tabs = [
    { id: 'faq', label: 'FAQ', icon: '❓' },
    { id: 'help', label: 'Centre d\'aide', icon: '🆘' },
    { id: 'privacy', label: 'Confidentialité', icon: '🛡️' },
    { id: 'terms', label: 'Conditions d\'utilisation', icon: '📜' },
  ]

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <Navbar />
      
      <div className="pt-28 pb-20 max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-10">
          <span className="text-green-600 font-bold text-sm uppercase tracking-widest">Informations</span>
          <h1 className="text-4xl font-extrabold text-gray-900 mt-2">Support & Légal</h1>
          <p className="text-gray-500 mt-2">Tout ce que vous devez savoir sur la plateforme MediCam.</p>
        </div>

        {/* Tab Selector */}
        <div className="flex flex-wrap justify-center gap-3 mb-8">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-5 py-2.5 rounded-full font-bold text-sm transition-all flex items-center gap-2 border ${
                activeTab === t.id
                  ? 'bg-green-600 text-white border-green-600 shadow-md'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-green-300'
              }`}
            >
              <span>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm space-y-6">
          {/* ============ FAQ ============ */}
          {activeTab === 'faq' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-800 border-b pb-3 border-gray-100">Foire Aux Questions (FAQ)</h2>
              
              <div className="space-y-4">
                <div>
                  <h3 className="font-bold text-gray-800 text-base">Comment fonctionne MediCam ?</h3>
                  <p className="text-sm text-gray-500 mt-1 font-light leading-relaxed">
                    MediCam est une plateforme qui connecte les patients avec des médecins agréés au Cameroun. Vous pouvez rechercher un spécialiste, réserver un créneau, consulter en ligne via notre messagerie sécurisée temps réel et recevoir une ordonnance numérique signée.
                  </p>
                </div>

                <div>
                  <h3 className="font-bold text-gray-800 text-base">Les ordonnances numériques sont-elles acceptées en pharmacie ?</h3>
                  <p className="text-sm text-gray-500 mt-1 font-light leading-relaxed">
                    Oui. Chaque ordonnance générée contient un QR Code unique contenant un jeton d'authentification sécurisé. Les pharmaciens partenaires scannent le code pour valider la signature cryptographique et vérifier la liste exacte des médicaments prescrits.
                  </p>
                </div>

                <div>
                  <h3 className="font-bold text-gray-800 text-base">Comment se déroule le paiement des consultations ?</h3>
                  <p className="text-sm text-gray-500 mt-1 font-light leading-relaxed">
                    Le tarif est fixé par chaque médecin. Le règlement s'effectue via Mobile Money (MTN / Orange) directement avant ou pendant la consultation. Les fonds sont sécurisés jusqu'à la fin de la séance.
                  </p>
                </div>

                <div>
                  <h3 className="font-bold text-gray-800 text-base">Quels sont les prérequis pour s'inscrire comme médecin ?</h3>
                  <p className="text-sm text-gray-500 mt-1 font-light leading-relaxed">
                    Tous les médecins doivent soumettre leur numéro ONMC, leur CNI, ainsi qu'une attestation d'inscription au tableau de l'Ordre National des Médecins du Cameroun en vigueur. Les dossiers sont validés manuellement par nos administrateurs sous 24-48h.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ============ HELP CENTER ============ */}
          {activeTab === 'help' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-800 border-b pb-3 border-gray-100">Centre d'aide & Assistance</h2>
              
              <div className="space-y-4">
                <div className="bg-red-50 border border-red-200 rounded-2xl p-5 flex gap-4">
                  <span className="text-3xl">🚨</span>
                  <div>
                    <h3 className="font-bold text-red-800 text-base">En cas d'urgence médicale</h3>
                    <p className="text-sm text-red-700 mt-1 leading-relaxed">
                      MediCam n'est pas un service d'urgences de réanimation. Si votre situation est critique (douleur thoracique vive, perte de conscience, difficultés respiratoires graves), veuillez vous rendre immédiatement au centre hospitalier le plus proche ou appeler les services de secours publics.
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="font-bold text-gray-800 text-base">Mon compte médecin est suspendu, que faire ?</h3>
                  <p className="text-sm text-gray-500 mt-1 font-light leading-relaxed">
                    Si votre compte a été suspendu (par exemple suite à des absences répétées à vos rendez-vous), vous pouvez demander sa réactivation en vous rendant sur la page de récupération de compte. Des frais administratifs de 5 000 FCFA sont requis pour réactiver le compte.
                  </p>
                </div>

                <div>
                  <h3 className="font-bold text-gray-800 text-base">Contactez notre support technique</h3>
                  <p className="text-sm text-gray-500 mt-1 font-light leading-relaxed">
                    Pour toute question technique liée à l'utilisation du chat, des visuels ou des comptes d'accès, vous pouvez écrire à notre adresse de contact officielle : <b className="text-green-600">contact.medicam237@gmail.com</b>. Notre équipe vous répondra sous 24h.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ============ PRIVACY ============ */}
          {activeTab === 'privacy' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-800 border-b pb-3 border-gray-100">Politique de confidentialité & Données médicales</h2>
              <div className="space-y-4 text-sm text-gray-600 leading-relaxed font-light">
                <p>
                  Chez <b>MediCam</b>, nous considérons la protection de vos données de santé comme une priorité absolue. Toutes les informations partagées sur cette plateforme sont soumises au secret médical le plus strict.
                </p>
                <h3 className="font-bold text-gray-800 text-base mt-4">1. Données collectées</h3>
                <p>
                  Nous collectons uniquement les informations nécessaires au bon déroulement de vos téléconsultations : votre nom, adresse e-mail, historique des consultations, pièces jointes partagées dans le chat et ordonnances émises par vos praticiens.
                </p>
                <h3 className="font-bold text-gray-800 text-base mt-4">2. Sécurité et Hébergement</h3>
                <p>
                  Les échanges de messages et fichiers au sein d'une consultation sont chiffrés. Aucun tiers, en dehors de vous et de votre médecin traitant, ne peut consulter le contenu des messages ou de vos ordonnances.
                </p>
                <h3 className="font-bold text-gray-800 text-base mt-4">3. Vos droits</h3>
                <p>
                  Conformément aux réglementations relatives à la protection des données personnelles, vous disposez d'un droit d'accès, de rectification et de suppression de vos données personnelles sur simple demande par email.
                </p>
              </div>
            </div>
          )}

          {/* ============ TERMS ============ */}
          {activeTab === 'terms' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-800 border-b pb-3 border-gray-100">Conditions Générales d'Utilisation (CGU)</h2>
              <div className="space-y-4 text-sm text-gray-600 leading-relaxed font-light">
                <p>
                  Les présentes Conditions Générales d'Utilisation régissent l'accès et l'utilisation de l'application MediCam. En créant un compte sur notre plateforme, vous acceptez pleinement et sans réserve ces conditions.
                </p>
                <h3 className="font-bold text-gray-800 text-base mt-4">1. Rôle de la plateforme</h3>
                <p>
                  MediCam est un intermédiaire technologique mettant en relation des professionnels de santé indépendants et des patients. La plateforme n'exerce pas la médecine et ne saurait être tenue pour responsable des avis, diagnostics ou prescriptions rédigés par les praticiens.
                </p>
                <h3 className="font-bold text-gray-800 text-base mt-4">2. Engagement des utilisateurs</h3>
                <p>
                  Chaque utilisateur s'engage à fournir des informations réelles et valides (identité, diplômes pour les médecins, etc.). L'usurpation d'identité ou la falsification de documents entraîne la suspension définitive et immédiate du compte ainsi que des poursuites judiciaires.
                </p>
                <h3 className="font-bold text-gray-800 text-base mt-4">3. Tarifs et Honoraires</h3>
                <p>
                  Les tarifs affichés sont fixés librement par les médecins inscrits au Conseil de l'Ordre. Le paiement est une transaction directe entre le patient et le médecin, initiée par l'intermédiaire de la plateforme.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="text-center mt-8">
          <button
            onClick={() => navigate(-1)}
            className="text-sm font-semibold text-green-600 hover:underline"
          >
            ← Retourner à la page précédente
          </button>
        </div>
      </div>
    </div>
  )
}
