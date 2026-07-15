require('dotenv').config()
const Groq = require('groq-sdk')

const groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY })

const SPECIALTIES = [
  'Médecin Généraliste', 'Cardiologue', 'Pédiatre', 'Gynécologue-Obstétricien',
  'Neurologue', 'Psychiatre', 'Ophtalmologue', 'ORL', 'Pneumologue',
  'Dermatologue', 'Néphrologue', 'Endocrinologue', 'Hépato-Gastro-Entérologue',
  'Oncologue', 'Interniste', 'Urologue', 'Radiologue', 'Médecin de Santé Publique',
  'Rhumatologue', 'Gériatre', 'Médecin du Sport', 'Infectiologue', 'Hématologue',
  'Allergologue', 'Gastro-Entérologue Pédiatrique', 'Médecin Nutritionniste',
  'Médecin Rééducateur', 'Médecin du Travail', 'Addictologue',
  'Médecin Esthétique', 'Sexologue', 'Anesthésiste-Réanimateur',
]

const AI_SYSTEM_PROMPT = `Tu es un assistant d'orientation médicale pour MediCam, une plateforme de téléconsultation au Cameroun.
Un patient va décrire ses symptômes. Tu dois :
1. Analyser les symptômes même avec des fautes d'orthographe ou en français camerounais
2. Détecter si c'est une urgence vitale, urgence élevée ou non urgent
3. Orienter vers la spécialité médicale la plus adaptée

Réponds UNIQUEMENT en JSON valide avec exactement ces clés :
{
  "specialty": "une spécialité parmi la liste fournie",
  "urgency_level": "emergency | high | low",
  "urgency_label": "Urgence vitale | Urgence élevée | Non urgent",
  "message": "message clair et bienveillant pour le patient en 2-3 phrases",
  "disclaimer": "Cette orientation est informative et ne remplace pas une consultation médicale."
}

Spécialités disponibles : ${SPECIALTIES.join(', ')}

IMPORTANT : 
- urgency_level "emergency" = aller aux urgences immédiatement
- urgency_level "high" = consulter aujourd'hui
- urgency_level "low" = prendre rendez-vous normalement
- Ne pose pas de diagnostic précis
- Sois bienveillant et rassurant`

const parseAiJson = (raw) => {
  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  return JSON.parse(jsonMatch ? jsonMatch[0] : raw)
}

const orientSymptoms = async (req, res) => {
  const { symptoms } = req.body

  if (!symptoms || !String(symptoms).trim()) {
    return res.status(400).json({ message: 'Veuillez décrire vos symptômes.' })
  }

  try {
    const completion = await groqClient.chat.completions.create({
      model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
      temperature: 0.2,
      max_tokens: 1024,
      messages: [
        { role: 'system', content: AI_SYSTEM_PROMPT },
        { role: 'user', content: `Symptômes du patient : ${symptoms}` }
      ]
    })

    const raw = completion.choices[0]?.message?.content
    if (!raw) throw new Error('Réponse vide')

    const result = parseAiJson(raw)
    result.source = 'groq'
    return res.json(result)

  } catch (error) {
    console.error('Groq error:', error.message)

    // Fallback local si Groq échoue
    return res.json({
      specialty: 'Médecin Généraliste',
      urgency_level: 'low',
      urgency_label: 'Non urgent',
      message: 'Nous n\'avons pas pu analyser vos symptômes automatiquement. Consultez un médecin généraliste qui pourra vous orienter.',
      disclaimer: 'Cette orientation est informative et ne remplace pas une consultation médicale.',
      source: 'fallback'
    })
  }
}

module.exports = { orientSymptoms }