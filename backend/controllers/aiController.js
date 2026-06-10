require('dotenv').config()

const Anthropic = require('@anthropic-ai/sdk')
const client = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY,
})

const SPECIALTIES = [
  'Médecin Généraliste',
  'Cardiologue',
  'Pédiatre',
  'Gynécologue-Obstétricien',
  'Neurologue',
  'Psychiatre',
  'Ophtalmologue',
  'ORL',
  'Dermatologue',
  'Pneumologue',
  'Hépato-Gastro-Entérologue',
  'Urologue',
  'Néphrologue',
  'Endocrinologue',
  'Oncologue',
  'Interniste',
  'Radiologue',
  'Médecin de Santé Publique',
  'Rhumatologue',
  'Gériatre',
  'Médecin du Sport',
  'Infectiologue',
  'Hématologue',
  'Médecin du Travail',
  'Allergologue',
  'Gastro-Entérologue Pédiatrique',
  'Médecin Nutritionniste',
  'Médecin Rééducateur',
]

const KEYWORD_MAP = [
  { specialty: 'Cardiologue', keywords: ['coeur', 'cœur', 'poitrine', 'palpitation', 'hypertension', 'arythmie', 'infarctus'] },
  { specialty: 'Pédiatre', keywords: ['enfant', 'bébé', 'bebe', 'nourrisson', 'adolescent'] },
  { specialty: 'Gynécologue-Obstétricien', keywords: ['grossesse', 'règles', 'regles', 'utérus', 'uterus', 'ovaire', 'accouchement'] },
  { specialty: 'Neurologue', keywords: ['migraine', 'épilepsie', 'epilepsie', 'convulsion', 'paralysie', 'engourdissement'] },
  { specialty: 'Psychiatre', keywords: ['dépression', 'depression', 'anxiété', 'anxiete', 'stress', 'insomnie', 'suicide', 'burn-out'] },
  { specialty: 'Ophtalmologue', keywords: ['oeil', 'œil', 'vue', 'vision', 'conjonctivite'] },
  { specialty: 'ORL', keywords: ['oreille', 'gorge', 'sinus', 'otite', 'angine', 'rhinite'] },
  { specialty: 'Dermatologue', keywords: ['peau', 'bouton', 'eczéma', 'eczema', 'démangeaison', 'demangeaison'] },
  { specialty: 'Pneumologue', keywords: ['toux', 'asthme', 'poumon', 'respiration', 'essoufflement', 'bronchite'] },
  {
    specialty: 'Hépato-Gastro-Entérologue',
    keywords: ['ventre', 'digestion', 'diarrhée', 'diarrhee', 'vomissement', 'foie', 'estomac', 'hépatite', 'hepatite', 'cirrhose'],
  },
  { specialty: 'Urologue', keywords: ['urine', 'rein', 'vessie', 'cystite', 'prostate'] },
  { specialty: 'Néphrologue', keywords: ['rein', 'dialyse', 'insuffisance rénale', 'insuffisance renale'] },
  { specialty: 'Endocrinologue', keywords: ['diabète', 'diabete', 'thyroïde', 'thyroide', 'hormone'] },
  { specialty: 'Oncologue', keywords: ['cancer', 'tumeur', 'chimiothérapie', 'chimiotherapie'] },
  { specialty: 'Interniste', keywords: ['maladie chronique', 'bilan général', 'bilan general'] },
  { specialty: 'Radiologue', keywords: ['radio', 'scanner', 'échographie', 'echographie', 'irm'] },
  { specialty: 'Médecin de Santé Publique', keywords: ['vaccination', 'prévention', 'prevention', 'épidémie', 'epidemie'] },
  { specialty: 'Rhumatologue', keywords: ['articulation', 'arthrite', 'dos', 'rhumatisme'] },
  { specialty: 'Gériatre', keywords: ['vieux', 'âgé', 'age', 'senior', 'alzheimer', 'démence', 'demence'] },
  { specialty: 'Médecin du Sport', keywords: ['sport', 'blessure', 'muscle', 'tendon', 'fracture'] },
  { specialty: 'Infectiologue', keywords: ['infection', 'paludisme', 'typhoïde', 'typhoide', 'vih', 'tuberculose'] },
  { specialty: 'Hématologue', keywords: ['sang', 'anémie', 'anemie', 'leucémie', 'leucemie', 'drépanocytose', 'drepanocytose'] },
  { specialty: 'Médecin du Travail', keywords: ['travail', 'accident travail', 'stress professionnel'] },
  { specialty: 'Allergologue', keywords: ['allergie', 'urticaire', 'intolérance', 'intolerance', 'rhinite allergique'] },
  { specialty: 'Gastro-Entérologue Pédiatrique', keywords: ['enfant ventre', 'diarrhée enfant', 'diarrhee enfant'] },
  { specialty: 'Médecin Nutritionniste', keywords: ['nutrition', 'obésité', 'obesite', 'régime', 'regime', 'poids', 'alimentation'] },
  { specialty: 'Médecin Rééducateur', keywords: ['rééducation', 'reeducation', 'paralysie', 'kiné', 'kine', 'récupération', 'recuperation'] },
]

const EMERGENCY_KEYWORDS = [
  'douleur thoracique',
  'paralysie',
  'perte de connaissance',
  'saignement abondant',
  'difficulté à respirer',
  'difficulte a respirer',
  'convulsion',
]

const HIGH_URGENCY_KEYWORDS = [
  'fièvre élevée',
  'fievre elevee',
  'vomissement sang',
  'confusion',
  'douleur intense',
]

const normalize = (text) =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')

const detectUrgency = (text) => {
  const n = normalize(text)
  if (EMERGENCY_KEYWORDS.some((k) => n.includes(normalize(k)))) {
    return {
      level: 'emergency',
      label: 'Urgence vitale',
      message: 'Consultez immédiatement les urgences ou appelez le 15.',
    }
  }
  if (HIGH_URGENCY_KEYWORDS.some((k) => n.includes(normalize(k)))) {
    return {
      level: 'high',
      label: 'Urgence élevée',
      message: 'Consultez un médecin dans les plus brefs délais (aujourd’hui si possible).',
    }
  }
  return {
    level: 'low',
    label: 'Non urgent',
    message: 'Vous pouvez prendre rendez-vous avec un spécialiste adapté.',
  }
}

const detectSpecialty = (text) => {
  const n = normalize(text)
  let best = { specialty: 'Médecin Généraliste', score: 0 }

  for (const entry of KEYWORD_MAP) {
    const score = entry.keywords.reduce(
      (acc, kw) => (n.includes(normalize(kw)) ? acc + 1 : acc),
      0
    )
    if (score > best.score) {
      best = { specialty: entry.specialty, score }
    }
  }

  return best.specialty
}

const callClaude = async (symptoms) => {
  if (!process.env.CLAUDE_API_KEY) return null

  const response = await client.messages.create({
    model: process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    temperature: 0.2,
    system: `Tu es un assistant d'orientation médicale pour MediCam (Cameroun).
Réponds UNIQUEMENT en JSON valide avec les clés: specialty (une de: ${SPECIALTIES.join(', ')}),
urgency_level (emergency|high|low), urgency_label, message, disclaimer.
Ne pose pas de diagnostic. Rappelle que ce n'est pas un avis médical définitif.`,
    messages: [
      {
        role: 'user',
        content: `Symptômes décrits par le patient: ${symptoms}`,
      },
    ],
  })

  const raw = response.content[0]?.text
  if (!raw) throw new Error('Réponse Claude vide')

  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  return JSON.parse(jsonMatch ? jsonMatch[0] : raw)
}

// ✅ Orientation symptômes → spécialité + urgence
const orientSymptoms = async (req, res) => {
  const { symptoms } = req.body

  if (!symptoms || !String(symptoms).trim()) {
    return res.status(400).json({ message: 'Veuillez décrire vos symptômes.' })
  }

  const disclaimer =
    'Cette orientation est informative et ne remplace pas une consultation médicale.'

  try {
    let result = null

    if (process.env.CLAUDE_API_KEY) {
      try {
        result = await callClaude(symptoms)
      } catch (aiError) {
        console.error('Claude fallback:', aiError.message)
      }
    }

    if (!result) {
      const urgency = detectUrgency(symptoms)
      result = {
        specialty: detectSpecialty(symptoms),
        urgency_level: urgency.level,
        urgency_label: urgency.label,
        message: urgency.message,
        disclaimer,
        source: 'rules',
      }
    } else {
      result.disclaimer = result.disclaimer || disclaimer
      result.source = 'claude'
    }

    res.json(result)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Erreur lors de l\'orientation IA' })
  }
}

module.exports = {
  orientSymptoms,
}
