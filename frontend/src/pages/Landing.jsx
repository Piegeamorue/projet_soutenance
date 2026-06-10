import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import axios from "axios";

const tousLesConseils = [
  { icon: "🤧", categorie: "Maladies & infections", titre: "Grippe", texte: "La grippe se transmet par voie aérienne. Lavez-vous les mains régulièrement et évitez les lieux bondés en période épidémique." },
  { icon: "🦟", categorie: "Maladies & infections", titre: "Paludisme", texte: "Dormez sous une moustiquaire imprégnée chaque nuit. Le paludisme est la première cause de consultation au Cameroun — il est évitable." },
  { icon: "🌡️", categorie: "Maladies & infections", titre: "Typhoïde", texte: "Buvez uniquement de l'eau potable ou bouillie. La typhoïde se transmet par l'eau et les aliments contaminés." },
  { icon: "😷", categorie: "Maladies & infections", titre: "Coronavirus", texte: "Aérez régulièrement vos pièces et adoptez les gestes barrières en cas de symptômes (toux, fièvre, fatigue intense)." },
  { icon: "💉", categorie: "Maladies & infections", titre: "Varicelle", texte: "La varicelle est très contagieuse. Évitez tout contact avec une personne infectée si vous n'êtes pas immunisé." },
  { icon: "🫁", categorie: "Maladies & infections", titre: "Bronchite", texte: "En cas de toux persistante depuis plus de 3 semaines, consultez un médecin. La bronchite chronique peut évoluer vers des complications." },
  { icon: "👃", categorie: "Maladies & infections", titre: "Rhinopharyngite", texte: "Le rhume des voies supérieures guérit souvent seul en 7 à 10 jours. Reposez-vous et hydratez-vous suffisamment." },
  { icon: "🤕", categorie: "Maladies & infections", titre: "Sinusite", texte: "Des douleurs au niveau du front ou des pommettes avec fièvre peuvent indiquer une sinusite. Consultez si cela dure plus de 5 jours." },
  { icon: "👂", categorie: "Maladies & infections", titre: "Otite", texte: "Une douleur d'oreille chez l'enfant nécessite une consultation rapide. L'otite non traitée peut affecter l'audition." },
  { icon: "👁️", categorie: "Maladies & infections", titre: "Conjonctivite", texte: "Ne touchez pas vos yeux avec des mains non lavées. La conjonctivite est très contagieuse dans les familles et les écoles." },
  { icon: "🗣️", categorie: "Maladies & infections", titre: "Angine", texte: "Une gorge rouge avec fièvre élevée peut nécessiter des antibiotiques. Consultez plutôt que de vous automédiquer." },
  { icon: "🤢", categorie: "Maladies & infections", titre: "Gastro-entérite", texte: "En cas de gastro, la priorité est l'hydratation. Buvez de l'eau en petites quantités fréquentes pour éviter la déshydratation." },
  { icon: "🚽", categorie: "Maladies & infections", titre: "Cystite", texte: "Boire beaucoup d'eau aide à prévenir les infections urinaires. Les femmes sont particulièrement concernées." },
  { icon: "💧", categorie: "Maladies & infections", titre: "Infection urinaire", texte: "Des brûlures en urinant avec envies fréquentes signalent souvent une infection urinaire. Consultez rapidement." },
  { icon: "🍄", categorie: "Maladies & infections", titre: "Mycose", texte: "Les mycoses cutanées prospèrent dans les zones humides. Séchez bien votre peau après la douche, surtout entre les orteils." },
  { icon: "⚠️", categorie: "Maladies & infections", titre: "Chlamydia", texte: "Les IST comme la chlamydia sont souvent asymptomatiques. Un dépistage régulier est recommandé pour toute personne active sexuellement." },
  { icon: "🍽️", categorie: "Maladies & infections", titre: "Intoxication alimentaire", texte: "Ne consommez pas d'aliments laissés plus de 2h à température ambiante. En cas de vomissements et diarrhée, hydratez-vous abondamment." },
  { icon: "🤧", categorie: "Maladies & infections", titre: "Rhume", texte: "Il n'existe pas de traitement contre le rhume. Reposez-vous, buvez chaud et évitez de contaminer votre entourage." },
  { icon: "🔇", categorie: "Maladies & infections", titre: "Extinction de voix", texte: "Ménagez votre voix et évitez de chuchoter — cela fatigue davantage les cordes vocales. Buvez tiède et reposez-vous." },
  { icon: "😮‍💨", categorie: "Maladies & infections", titre: "Toux", texte: "Une toux qui dure plus de 3 semaines doit être évaluée par un médecin. Elle peut cacher une infection pulmonaire." },
  { icon: "🌡️", categorie: "Maladies & infections", titre: "Fièvre", texte: "Une fièvre au-dessus de 38,5°C nécessite une attention médicale, surtout chez l'enfant. Ne laissez pas monter sans surveiller." },
  { icon: "💨", categorie: "Maladies chroniques", titre: "Asthme", texte: "Gardez toujours votre inhalateur à portée de main. Évitez les déclencheurs comme la fumée, la poussière et les allergènes." },
  { icon: "🦴", categorie: "Maladies chroniques", titre: "Arthrose", texte: "L'activité physique douce comme la marche ou la natation réduit les douleurs liées à l'arthrose et préserve la mobilité." },
  { icon: "🩸", categorie: "Maladies chroniques", titre: "Diabète", texte: "Contrôlez votre glycémie régulièrement. Une alimentation équilibrée et l'exercice physique sont vos meilleurs alliés contre le diabète." },
  { icon: "❤️", categorie: "Maladies chroniques", titre: "Hypertension", texte: "L'hypertension ne fait pas mal mais abîme silencieusement le cœur et les reins. Faites mesurer votre tension au moins une fois par an." },
  { icon: "🔙", categorie: "Maladies chroniques", titre: "Lombalgie", texte: "Évitez de rester assis plus de 45 minutes sans vous lever. Renforcez vos muscles du dos par des exercices réguliers." },
  { icon: "🔥", categorie: "Maladies chroniques", titre: "Reflux gastro-œsophagien", texte: "Évitez de vous allonger juste après un repas. Surélever la tête du lit réduit les remontées acides nocturnes." },
  { icon: "🩹", categorie: "Maladies chroniques", titre: "Hémorroïdes", texte: "Une alimentation riche en fibres et une bonne hydratation préviennent la constipation, principale cause des hémorroïdes." },
  { icon: "🤯", categorie: "Maladies chroniques", titre: "Migraine", texte: "Identifiez vos facteurs déclencheurs (stress, aliments, manque de sommeil) et tenez un journal de vos crises migraineuses." },
  { icon: "🌸", categorie: "Maladies chroniques", titre: "Allergie", texte: "En cas d'allergie saisonnière, restez informé des pics polliniques et gardez vos antihistaminiques à portée." },
  { icon: "🌬️", categorie: "Maladies chroniques", titre: "Rhinite", texte: "La rhinite allergique chronique peut être soulagée par un rinçage nasal au sérum physiologique matin et soir." },
  { icon: "💥", categorie: "Maladies chroniques", titre: "Céphalée", texte: "Des maux de tête fréquents méritent une consultation. Ne vous habituez pas aux antalgiques sans avis médical." },
  { icon: "😔", categorie: "Santé mentale", titre: "Dépression", texte: "La dépression est une vraie maladie, pas une faiblesse. Parlez-en à un médecin — des traitements efficaces existent." },
  { icon: "🔥", categorie: "Santé mentale", titre: "Burn-out", texte: "Si vous vous sentez épuisé au point de ne plus pouvoir travailler, c'est un signal d'alarme. Consultez avant d'atteindre la limite." },
  { icon: "😰", categorie: "Santé mentale", titre: "Anxiété", texte: "La respiration profonde (4 secondes inspiration, 4 rétention, 4 expiration) calme rapidement le système nerveux en cas d'anxiété." },
  { icon: "😨", categorie: "Santé mentale", titre: "Angoisse", texte: "Une crise d'angoisse est terrifiante mais pas dangereuse. Focalisez-vous sur votre respiration et un objet proche pour vous ancrer." },
  { icon: "😴", categorie: "Santé mentale", titre: "Insomnie", texte: "Évitez les écrans 1h avant le coucher. Un rituel régulier de sommeil (même heure chaque soir) améliore considérablement l'insomnie." },
  { icon: "😣", categorie: "Santé mentale", titre: "Boulimie", texte: "La boulimie n'est pas un manque de volonté. C'est un trouble qui se traite avec l'aide de spécialistes bienveillants." },
  { icon: "😱", categorie: "Santé mentale", titre: "Phobie", texte: "Les phobies peuvent être traitées efficacement par thérapie comportementale. N'évitez pas indéfiniment ce qui vous fait peur." },
  { icon: "🧩", categorie: "Santé mentale", titre: "Autisme", texte: "L'autisme est un spectre. Un diagnostic précoce permet une prise en charge adaptée qui améliore considérablement la qualité de vie." },
  { icon: "📚", categorie: "Santé mentale", titre: "Dyslexie", texte: "La dyslexie n'est pas un manque d'intelligence. Un orthophoniste peut aider à développer des stratégies efficaces de lecture." },
  { icon: "💤", categorie: "Santé mentale", titre: "Narcolepsie", texte: "Des endormissements soudains incontrôlables sont le signe d'une narcolepsie. Consultez un spécialiste du sommeil." },
  { icon: "⚡", categorie: "Santé mentale", titre: "Hypomanie", texte: "Une énergie inhabituelle, un besoin réduit de sommeil et des idées qui s'enchaînent peuvent signaler un épisode hypomaniaque." },
  { icon: "🩺", categorie: "Santé mentale", titre: "Hypocondrie", texte: "La peur excessive d'être malade peut être traitée. Un suivi psychologique réduit considérablement l'anxiété liée à la santé." },
  { icon: "🏫", categorie: "Santé mentale", titre: "Phobie scolaire", texte: "La phobie scolaire est un signal de détresse psychologique réel. Ne forcez pas l'enfant — consultez un professionnel rapidement." },
  { icon: "💧", categorie: "Nutrition & hygiène", titre: "Hydratation", texte: "En climat chaud comme au Cameroun, buvez au moins 2 litres d'eau potable par jour pour éviter la déshydratation." },
  { icon: "🥗", categorie: "Nutrition & hygiène", titre: "Alimentation équilibrée", texte: "Les légumes locaux (légumes-feuilles, plantain, haricots) apportent vitamines et minéraux essentiels à moindre coût." },
  { icon: "🍊", categorie: "Nutrition & hygiène", titre: "Vitamines", texte: "Privilégiez les fruits et légumes de saison pour un apport naturel en vitamines. Mangez varié plutôt que de vous supplémenter." },
  { icon: "🦷", categorie: "Nutrition & hygiène", titre: "Hygiène bucco-dentaire", texte: "Brossez vos dents 2 fois par jour pendant 2 minutes. Une bonne hygiène dentaire prévient les infections et maladies cardiovasculaires." },
  { icon: "🚿", categorie: "Nutrition & hygiène", titre: "Hygiène corporelle", texte: "Une douche quotidienne prévient les infections cutanées, surtout en saison chaude. Séchez bien les zones de plis." },
  { icon: "⚖️", categorie: "Nutrition & hygiène", titre: "Obésité", texte: "L'obésité augmente le risque de diabète, d'hypertension et de maladies cardiaques. Un suivi médical et diététique aide à y remédier." },
  { icon: "🍚", categorie: "Nutrition & hygiène", titre: "Sous-nutrition", texte: "La sous-nutrition affaiblit l'immunité et ralentit la croissance chez l'enfant. Consultez un nutritionniste en cas de doute." },
  { icon: "🏃", categorie: "Nutrition & hygiène", titre: "Sport et santé", texte: "30 minutes d'activité physique par jour réduisent de 30% le risque de maladies cardiovasculaires et améliorent l'humeur." },
  { icon: "🤢", categorie: "Symptômes courants", titre: "Nausée", texte: "En cas de nausée, mangez léger et froid plutôt que chaud. Le gingembre en infusion est un remède naturel efficace." },
  { icon: "🤕", categorie: "Symptômes courants", titre: "Maux de tête", texte: "Boire suffisamment d'eau, dormir et réduire le stress sont les premiers remèdes contre les maux de tête fréquents." },
  { icon: "😫", categorie: "Symptômes courants", titre: "Mal de gorge", texte: "Gargarisez-vous à l'eau salée tiède 3 fois par jour. Si la douleur est intense avec fièvre, consultez un médecin." },
  { icon: "😩", categorie: "Symptômes courants", titre: "Fatigue", texte: "Une fatigue persistante malgré un bon sommeil peut signaler une anémie, une infection ou un trouble thyroïdien. Consultez." },
  { icon: "🤧", categorie: "Symptômes courants", titre: "Nez bouché", texte: "Un spray nasal salin ou de la vapeur d'eau chaude aide à dégager le nez. Évitez les décongestionnants plus de 3 jours." },
  { icon: "😣", categorie: "Symptômes courants", titre: "Constipation", texte: "Augmentez votre consommation de fibres (fruits, légumes, céréales) et buvez davantage d'eau pour combattre la constipation." },
  { icon: "💔", categorie: "Symptômes courants", titre: "Douleur thoracique", texte: "Toute douleur thoracique intense et soudaine est une urgence médicale. Appelez le 15 ou rendez-vous aux urgences immédiatement." },
  { icon: "💉", categorie: "Prévention & vaccins", titre: "Vaccins obligatoires Cameroun", texte: "BCG, polio, hépatite B, rougeole — ces vaccins protègent vos enfants dès la naissance. Tenez le carnet vaccinal à jour." },
  { icon: "🦟", categorie: "Prévention & vaccins", titre: "Prévention paludisme", texte: "Moustiquaire imprégnée, répulsifs et élimination des eaux stagnantes sont les trois piliers de la prévention du paludisme." },
  { icon: "🧼", categorie: "Prévention & vaccins", titre: "Lavage des mains", texte: "Lavez-vous les mains à l'eau et au savon 20 secondes avant de manger et après les toilettes. Simple mais redoutablement efficace." },
  { icon: "💧", categorie: "Prévention & vaccins", titre: "Eau potable", texte: "Faites bouillir l'eau du robinet si vous n'êtes pas sûr de sa qualité. L'eau contaminée est une cause majeure de maladies au Cameroun." },
  { icon: "🛏️", categorie: "Prévention & vaccins", titre: "Moustiquaires", texte: "Dormez chaque nuit sous une moustiquaire imprégnée d'insecticide, même en saison sèche. C'est votre meilleure protection." },
  { icon: "🚬", categorie: "Prévention & vaccins", titre: "Tabac", texte: "Le tabac est la première cause de cancer évitable. Arrêter fumer à tout âge réduit immédiatement le risque cardiovasculaire." },
  { icon: "🍺", categorie: "Prévention & vaccins", titre: "Alcoolisme", texte: "Une consommation excessive d'alcool détruit le foie, le cerveau et les relations sociales. Des aides médicales existent pour arrêter." },
  { icon: "☀️", categorie: "Prévention & vaccins", titre: "Soleil", texte: "Évitez l'exposition au soleil entre 12h et 15h. Une exposition prolongée sans protection peut causer des coups de chaleur dangereux." },
];

const specialites = [
  "Médecin Généraliste", "Cardiologue", "Pédiatre", "Gynécologue-Obstétricien",
  "Neurologue", "Psychiatre", "Ophtalmologue", "ORL", "Pneumologue",
  "Dermatologue", "Néphrologue", "Endocrinologue", "Hépato-Gastro-Entérologue",
  "Oncologue", "Interniste", "Urologue", "Radiologue", "Médecin de Santé Publique",
  "Rhumatologue", "Gériatre", "Médecin du Sport", "Infectiologue", "Hématologue",
  "Allergologue", "Gastro-Entérologue Pédiatrique", "Médecin Nutritionniste",
  "Médecin Rééducateur", "Médecin du Travail",
];

const fonctionnalites = [
  { icon: "🏠", titre: "Consultation à domicile", texte: "Un médecin se déplace chez vous. Idéal pour les personnes à mobilité réduite ou les situations d'urgence." },
  { icon: "💬", titre: "Messagerie sécurisée", texte: "Échangez avec votre médecin par messagerie chiffrée. Envoyez photos et documents médicaux en toute sécurité." },
  { icon: "📋", titre: "Ordonnance numérique", texte: "Recevez votre ordonnance en PDF sécurisé avec QR Code vérifiable par n'importe quelle pharmacie partenaire." },
  { icon: "🤖", titre: "Que ressentez-vous ?", texte: "Décrivez vos symptômes, notre IA vous oriente vers la bonne spécialité et évalue l'urgence de votre situation." },
  { icon: "📅", titre: "Agenda intelligent", texte: "Choisissez vous-même le créneau qui vous convient dans l'agenda du médecin. Rappel automatique par email." },
  { icon: "🗺️", titre: "Carte des soins", texte: "Trouvez les hôpitaux et pharmacies les plus proches de vous grâce à la carte interactive." },
];

const medecins = [
  { nom: "Dr. Nguemo Paul", specialite: "Médecin Généraliste", ville: "Yaoundé", statut: "En ligne", creneaux: ["10h00", "11h30", "14h00", "15h30"] },
  { nom: "Dr. Abena Marie", specialite: "Pédiatre", ville: "Douala", statut: "En ligne", creneaux: ["09h00", "10h30", "13h00"] },
  { nom: "Dr. Fotso Jean", specialite: "Cardiologue", ville: "Yaoundé", statut: "Disponible", creneaux: ["11h00", "14h30", "16h00"] },
];

// Top 3 mois précédent pour "En vedette"
const vedette = [
  { nom: "Dr. Abena Marie", hopital: "Hôpital Central Yaoundé", specialite: "Pédiatre", note: 4.9, consultations: 312, emoji: "👩‍⚕️" },
  { nom: "Dr. Fotso Jean", hopital: "Clinique La Grâce Douala", specialite: "Cardiologue", note: 4.8, consultations: 287, emoji: "👨‍⚕️" },
  { nom: "Dr. Nguemo Paul", hopital: "Centre Médical Bastos", specialite: "Généraliste", note: 4.8, consultations: 156, emoji: "👨‍⚕️" },
];

function melangerConseils(conseils, graine) {
  const arr = [...conseils];
  let seed = graine;
  const rand = () => { seed = (seed * 1664525 + 1013904223) & 0xffffffff; return (seed >>> 0) / 0xffffffff; };
  for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
  return arr;
}

function getGroupeActif(conseils) {
  const now = new Date();
  const graine = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
  const melanges = melangerConseils(conseils, graine);
  const heure = now.getHours();
  const totalGroupes = Math.ceil(melanges.length / 5);
  const groupeIndex = heure % totalGroupes;
  return { groupe: melanges.slice(groupeIndex * 5, groupeIndex * 5 + 5) };
}

export default function Landing() {
  const navigate = useNavigate();
  const [indexMedecin, setIndexMedecin] = useState(0);
  const [{ groupe }, setGroupeData] = useState(() => getGroupeActif(tousLesConseils));
  const [indexConseil, setIndexConseil] = useState(0);
  const [ongletSidebar, setOngletSidebar] = useState("nouveautes");
  const [symptomes, setSymptomes] = useState("");
  const [recherche, setRecherche] = useState("");

  const [analyseResult, setAnalyseResult] = useState(null);
  const [analysing, setAnalysing] = useState(false);

  const handleAnalyze = async (e) => {
    e.preventDefault();
    if (!symptomes.trim()) {
      alert("Veuillez décrire vos symptômes.");
      return;
    }
    setAnalysing(true);
    try {
      const { data } = await axios.post("http://localhost:5000/api/ai/symptoms", { symptoms: symptomes });
      setAnalyseResult(data);
    } catch (err) {
      console.error(err);
      alert("Erreur lors de l'analyse.");
    } finally {
      setAnalysing(false);
    }
  };

  useEffect(() => {
    const t = setInterval(() => setIndexMedecin((p) => (p + 1) % medecins.length), 4000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    setIndexConseil(0);
    const t = setInterval(() => setIndexConseil((p) => (p + 1) % groupe.length), 10000);
    return () => clearInterval(t);
  }, [groupe]);

  useEffect(() => {
    const now = new Date();
    const ms = (60 - now.getMinutes()) * 60000 - now.getSeconds() * 1000;
    const timeout = setTimeout(() => {
      setGroupeData(getGroupeActif(tousLesConseils));
      const interval = setInterval(() => setGroupeData(getGroupeActif(tousLesConseils)), 3600000);
      return () => clearInterval(interval);
    }, ms);
    return () => clearTimeout(timeout);
  }, []);

  const medecin = medecins[indexMedecin];
  const conseil = groupe[indexConseil];

  return (
    <div className="min-h-screen bg-white font-sans">
      <Navbar />

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="pt-24 pb-16 bg-gradient-to-br from-green-50 via-white to-emerald-50 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-green-100 rounded-full opacity-40 translate-x-32 -translate-y-32" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-100 rounded-full opacity-30 -translate-x-20 translate-y-20" />

        <div className="max-w-6xl mx-auto px-4 relative">
          <div className="flex flex-col lg:flex-row items-start gap-10">

            {/* Gauche : slogan + IA */}
            <div className="flex-1 flex flex-col items-center text-center">
              <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 leading-tight mb-4">
                Votre santé,{" "}
                <span className="text-green-600">où que vous soyez</span>
              </h1>
              <p className="text-lg text-gray-600 mb-6 max-w-lg">
                Consultez un médecin en ligne, prenez rendez-vous et recevez votre ordonnance numérique — depuis chez vous, au bureau, ou n'importe où au Cameroun.
              </p>

              {/* Barre de recherche */}
              <form onSubmit={(e) => { e.preventDefault(); navigate('/login'); }} className="flex gap-2 mb-6 w-full max-w-lg">
                <input
                  type="text"
                  value={recherche}
                  onChange={(e) => setRecherche(e.target.value)}
                  placeholder="Rechercher un médecin ou une spécialité..."
                  className="flex-1 border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-green-500 text-sm"
                />
                <button type="submit" className="px-4 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-colors text-sm whitespace-nowrap">
                  Rechercher
                </button>
              </form>

              {/* Zone IA symptômes */}
              <form onSubmit={handleAnalyze} className="bg-white rounded-2xl shadow-md border border-green-100 p-5 w-full max-w-lg">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <span className="text-xl">🤖</span>
                  <span className="font-bold text-gray-800">Comment vous sentez-vous aujourd'hui ?</span>
                </div>
                <textarea
                  value={symptomes}
                  onChange={(e) => setSymptomes(e.target.value)}
                  placeholder="Décrivez vos symptômes... (ex: j'ai mal à la tête et de la fièvre depuis 2 jours)"
                  className="w-full border border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:border-green-500 text-sm resize-none h-24"
                />
                <button type="submit" disabled={analysing} className="w-full mt-3 bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition-colors disabled:opacity-50">
                  {analysing ? "Analyse en cours..." : "Analyser mes symptômes"}
                </button>
                <p className="text-xs text-gray-400 text-center mt-2">
                  Notre assistant IA vous oriente vers le bon spécialiste
                </p>
              </form>

              <div className="flex gap-8 mt-6 justify-center">
                {[{ chiffre: "28", label: "Spécialités" }, { chiffre: "3", label: "Types de consultation" }, { chiffre: "24/7", label: "Disponible" }].map((s) => (
                  <div key={s.label} className="text-center">
                    <div className="text-2xl font-extrabold text-green-600">{s.chiffre}</div>
                    <div className="text-xs text-gray-500 font-medium">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Droite : carte médecin + sidebar */}
            <div className="w-full lg:w-96 flex flex-col gap-4 lg:ml-auto">

              {/* Carte médecin */}
              <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-2xl">👨‍⚕️</div>
                  <div className="flex-1">
                    <div className="font-bold text-gray-800">{medecin.nom}</div>
                    <div className="text-sm text-gray-500">{medecin.specialite} · {medecin.ville}</div>
                  </div>
                  <span className="text-xs font-bold text-green-600 bg-green-50 border border-green-200 px-2 py-1 rounded-full">{medecin.statut}</span>
                </div>
                <p className="text-sm text-gray-500 mb-3">Prochain créneau disponible :</p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {medecin.creneaux.map((c) => (
                    <span key={c} className="text-sm border border-gray-200 rounded-lg px-3 py-1 text-gray-700">{c}</span>
                  ))}
                </div>
                <button onClick={() => navigate('/login')} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition-colors">
                  Prendre rendez-vous
                </button>
              </div>

              {/* Sidebar Nouveautés / En vedette */}
              <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
                <div className="flex border-b border-gray-100">
                  <button
                    onClick={() => setOngletSidebar("nouveautes")}
                    className={`flex-1 py-3 text-sm font-bold transition-colors ${ongletSidebar === "nouveautes" ? "text-green-600 border-b-2 border-green-600" : "text-gray-400 hover:text-gray-600"}`}
                  >
                    🔔 Nouveautés
                  </button>
                  <button
                    onClick={() => setOngletSidebar("vedette")}
                    className={`flex-1 py-3 text-sm font-bold transition-colors ${ongletSidebar === "vedette" ? "text-green-600 border-b-2 border-green-600" : "text-gray-400 hover:text-gray-600"}`}
                  >
                    ⭐ En vedette
                  </button>
                </div>

                <div className="p-4">
                  {ongletSidebar === "nouveautes" ? (
                    <div className="space-y-3">
                      <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-lg">🏆</span>
                          <span className="font-bold text-green-700 text-sm">Classement MediCam — Mai 2026</span>
                        </div>
                        <p className="text-xs text-gray-600 leading-relaxed">
                          MediCam lance son premier classement mensuel ! Les 3 premiers de chaque catégorie reçoivent un badge d'excellence visible sur leur profil.
                        </p>
                      </div>
                      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-lg">🎁</span>
                          <span className="font-bold text-yellow-700 text-sm">Primes aux meilleurs médecins</span>
                        </div>
                        <p className="text-xs text-gray-600 leading-relaxed">
                          N°1 → <strong>50 000 FCFA</strong> · N°2 → <strong>30 000 FCFA</strong> · N°3 → <strong>20 000 FCFA</strong>
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs text-gray-400 mb-3 font-medium">🏅 Top 3 — Avril 2026</p>
                      <div className="space-y-3">
                        {vedette.map((doc, i) => {
                          const tailles = [
                            { photo: "w-14 h-14 text-2xl", nom: "text-base font-extrabold", hopital: "text-xs", note: "text-base font-extrabold", bg: "bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-300" },
                            { photo: "w-11 h-11 text-xl", nom: "text-sm font-bold", hopital: "text-xs", note: "text-sm font-bold", bg: "bg-gray-50 border-gray-200" },
                            { photo: "w-9 h-9 text-lg", nom: "text-xs font-bold", hopital: "text-xs", note: "text-xs font-bold", bg: "bg-orange-50 border-orange-200" },
                          ][i];
                          const medailles = ["🥇", "🥈", "🥉"];
                          return (
                            <div key={doc.nom} className={`flex items-center gap-3 border rounded-xl p-3 ${tailles.bg}`}>
                              <div className={`${tailles.photo} bg-white rounded-full flex items-center justify-center border-2 border-gray-200 flex-shrink-0`}>
                                {doc.emoji}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className={`${tailles.nom} text-gray-800 truncate`}>{doc.nom}</div>
                                <div className={`${tailles.hopital} text-gray-500 truncate`}>{doc.hopital}</div>
                                <div className={`${tailles.note} text-yellow-500`}>⭐ {doc.note}</div>
                              </div>
                              <span className="text-xl flex-shrink-0">{medailles[i]}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CONSEILS SANTÉ ───────────────────────────────────────────────── */}
      <section id="conseils" className="py-20 bg-white">
        <div className="max-w-2xl mx-auto px-4">
          <div className="text-center mb-10">
            <span className="text-green-600 font-bold text-sm uppercase tracking-widest">Santé au quotidien</span>
            <h2 className="text-3xl font-extrabold text-gray-900 mt-2">Conseils santé</h2>
            <p className="text-gray-500 mt-2">
              Des conseils adaptés au contexte camerounais —{" "}
              <Link to="/conseils" className="text-green-600 font-semibold hover:underline">Voir tous les conseils →</Link>
            </p>
          </div>
          <div className="relative">
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-100 rounded-2xl p-8 shadow-sm">
              <div className="flex items-start justify-between mb-4">
                <span className="text-xs font-bold text-green-600 uppercase tracking-wide bg-green-100 px-3 py-1 rounded-full">{conseil.categorie}</span>
                <span className="text-xs text-gray-400 font-medium">{indexConseil + 1}/{groupe.length}</span>
              </div>
              <div className="text-5xl mb-4">{conseil.icon}</div>
              <h3 className="text-xl font-bold text-gray-800 mb-3">{conseil.titre}</h3>
              <p className="text-gray-600 leading-relaxed">{conseil.texte}</p>
            </div>
            <div className="mt-3 bg-gradient-to-br from-green-50 to-emerald-50 border border-green-100 rounded-2xl p-4 opacity-30 scale-95 blur-[1px] pointer-events-none">
              <div className="text-2xl mb-2">{groupe[(indexConseil + 1) % groupe.length].icon}</div>
              <div className="text-sm font-bold text-gray-600">{groupe[(indexConseil + 1) % groupe.length].titre}</div>
            </div>
          </div>
          <div className="flex items-center justify-center gap-3 mt-6">
            <button onClick={() => setIndexConseil((p) => (p - 1 + groupe.length) % groupe.length)}
              className="w-9 h-9 rounded-full border border-green-300 text-green-600 hover:bg-green-50 flex items-center justify-center text-lg transition-colors">‹</button>
            <div className="flex gap-2">
              {groupe.map((_, i) => (
                <button key={i} onClick={() => setIndexConseil(i)}
                  className={`w-2.5 h-2.5 rounded-full transition-colors ${i === indexConseil ? "bg-green-600" : "bg-green-200"}`} />
              ))}
            </div>
            <button onClick={() => setIndexConseil((p) => (p + 1) % groupe.length)}
              className="w-9 h-9 rounded-full border border-green-300 text-green-600 hover:bg-green-50 flex items-center justify-center text-lg transition-colors">›</button>
          </div>
        </div>
      </section>

      {/* ── FONCTIONNALITÉS ──────────────────────────────────────────────── */}
      <section id="fonctionnalites" className="py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <span className="text-green-600 font-bold text-sm uppercase tracking-widest">Ce que nous offrons</span>
            <h2 className="text-3xl font-extrabold text-gray-900 mt-2">Tout ce dont vous avez besoin</h2>
            <p className="text-gray-500 mt-2">Une plateforme complète pour prendre soin de votre santé</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {fonctionnalites.map((f) => (
              <div key={f.titre} className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md border border-gray-100 hover:border-green-200 transition-all group">
                <div className="text-3xl mb-4">{f.icon}</div>
                <h3 className="text-base font-bold text-gray-800 mb-2 group-hover:text-green-600 transition-colors">{f.titre}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.texte}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SPÉCIALITÉS ──────────────────────────────────────────────────── */}
      <section id="specialites" className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <span className="text-green-600 font-bold text-sm uppercase tracking-widest">Nos médecins</span>
            <h2 className="text-3xl font-extrabold text-gray-900 mt-2">28 spécialités disponibles</h2>
            <p className="text-gray-500 mt-2">Des médecins qualifiés dans toutes les disciplines médicales</p>
          </div>
          <div className="flex flex-wrap gap-3 justify-center">
            {specialites.map((s) => (
              <span key={s} className="px-4 py-2 bg-green-50 text-green-700 font-semibold text-sm rounded-full border border-green-200 hover:bg-green-100 transition-colors cursor-default">{s}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section className="py-20 bg-gradient-to-r from-green-600 to-emerald-600">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-extrabold text-white mb-4">Prêt à prendre soin de votre santé ?</h2>
          <p className="text-green-100 mb-8 text-lg">Rejoignez MediCam et consultez un médecin dès aujourd'hui, où que vous soyez au Cameroun.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register" className="px-8 py-3 bg-white text-green-700 font-bold rounded-lg hover:bg-green-50 transition-colors shadow-lg">Créer un compte patient</Link>
            <Link to="/register" className="px-8 py-3 border-2 border-white text-white font-bold rounded-lg hover:bg-white/10 transition-colors">Rejoindre en tant que médecin</Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────────── */}
      <footer className="bg-gray-900 text-gray-400 py-10">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-start gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                  </svg>
                </div>
                <span className="text-white font-bold text-lg">MediCam</span>
              </div>
              <p className="text-sm max-w-xs">Votre santé, où que vous soyez. Plateforme médicale en ligne au Cameroun.</p>
            </div>
            <div className="grid grid-cols-2 gap-8">
              <div>
                <h4 className="text-white font-semibold mb-3 text-sm">Légal</h4>
                <ul className="space-y-2 text-sm">
                  <li><Link to="/politique-confidentialite" className="hover:text-green-400 transition-colors">Politique de confidentialité</Link></li>
                  <li><Link to="/conditions-utilisation" className="hover:text-green-400 transition-colors">Conditions d'utilisation</Link></li>
                </ul>
              </div>
              <div>
                <h4 className="text-white font-semibold mb-3 text-sm">Support</h4>
                <ul className="space-y-2 text-sm">
                  <li><Link to="/aide" className="hover:text-green-400 transition-colors">Aide & Assistance</Link></li>
                  <li><Link to="/faq" className="hover:text-green-400 transition-colors">FAQ</Link></li>
                </ul>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-6 text-center text-xs text-gray-600">
            © 2026 MediCam. Tous droits réservés.
          </div>
        </div>
      </footer>

      {/* ============ MODAL Orientation Symptômes ============ */}
      {analyseResult && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🤖</span>
                <h3 className="font-bold text-gray-800 text-lg">Analyse de vos symptômes</h3>
              </div>
              <button onClick={() => setAnalyseResult(null)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center bg-gray-50 p-3 rounded-xl border">
                <span className="text-sm font-semibold text-gray-500">Spécialiste recommandé</span>
                <span className="text-sm font-bold text-green-700 bg-green-50 px-3 py-1 rounded-full border border-green-200">
                  {analyseResult.specialty}
                </span>
              </div>

              <div className="flex justify-between items-center bg-gray-50 p-3 rounded-xl border">
                <span className="text-sm font-semibold text-gray-500">Niveau d'urgence</span>
                <span className={`text-xs font-bold px-3 py-1 rounded-full border ${
                  analyseResult.urgency_level === 'emergency' 
                    ? 'bg-red-50 text-red-700 border-red-200' 
                    : analyseResult.urgency_level === 'high'
                    ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                    : 'bg-blue-50 text-blue-700 border-blue-200'
                }`}>
                  {analyseResult.urgency_label || (analyseResult.urgency_level === 'emergency' ? 'Urgence Vitale' : 'Normal')}
                </span>
              </div>

              <div className="bg-gray-50 border border-gray-150 rounded-xl p-4 text-sm text-gray-700 leading-relaxed font-light">
                {analyseResult.message}
              </div>

              <p className="text-[11px] text-gray-400 italic bg-amber-50/50 border border-amber-100 rounded-xl p-3">
                ⚠️ {analyseResult.disclaimer}
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setAnalyseResult(null)}
                className="flex-1 border border-gray-200 text-gray-600 font-semibold py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Fermer
              </button>
              <button
                type="button"
                onClick={() => { setAnalyseResult(null); navigate('/login'); }}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 rounded-xl transition-colors shadow-md text-center"
              >
                Prendre RDV 📅
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
