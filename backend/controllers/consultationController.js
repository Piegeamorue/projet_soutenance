const pool = require('../config/db')
require('dotenv').config()

const TYPE_MAPPING = {
  'En ligne': 'online', 'en ligne': 'online', 'Online': 'online',
  'Présentiel': 'physical', 'présentiel': 'physical', 'Physical': 'physical',
  'Cabinet': 'physical', 'cabinet': 'physical',
  'À domicile': 'home', 'à domicile': 'home', 'Domicile': 'home', 'Home': 'home',
  'online': 'online', 'physical': 'physical', 'home': 'home',
}

const TYPE_DISPLAY = {
  'online': 'En ligne',
  'physical': 'Présentiel',
  'home': 'À domicile',
}

// ✅ Envoyer une demande de consultation (patient → médecin)
const requestConsultation = async (req, res) => {
  const { doctor_id, type } = req.body
  const patient_id = req.user.id

  const typeDB = TYPE_MAPPING[type] || 'online'

  try {
    // Vérifier si le patient est bloqué pour ce médecin (anti-spam 3 refus)
    const blockCheck = await pool.query(
      `SELECT * FROM consultation_blocks 
       WHERE patient_id = $1 AND doctor_id = $2 AND blocked_until > NOW()`,
      [patient_id, doctor_id]
    )
    if (blockCheck.rows.length > 0) {
      const until = new Date(blockCheck.rows[0].blocked_until).toLocaleString('fr-FR')
      return res.status(403).json({
        message: `Vous êtes bloqué pour ce médecin jusqu'au ${until} suite à trop de demandes refusées.`
      })
    }

    // Anti-spam : délai 1h entre 2 demandes au même médecin
    const spamCheck = await pool.query(
      `SELECT * FROM consultations 
       WHERE patient_id = $1 AND doctor_id = $2 
       AND status IN ('pending', 'active')
       AND created_at > NOW() - INTERVAL '1 hour'`,
      [patient_id, doctor_id]
    )
    if (spamCheck.rows.length > 0) {
      return res.status(429).json({
        message: 'Vous avez déjà une demande en cours pour ce médecin. Attendez 1h avant de renvoyer.'
      })
    }

    // Vérifier que le médecin n'a pas déjà 5 patients en attente
    const waitingCount = await pool.query(
      `SELECT COUNT(*) FROM consultations 
       WHERE doctor_id = $1 AND status = 'pending'`,
      [doctor_id]
    )
    if (parseInt(waitingCount.rows[0].count) >= 5) {
      return res.status(400).json({
        message: 'La salle d\'attente de ce médecin est pleine (5/5). Réessayez plus tard.'
      })
    }

    // Créer la consultation en statut 'pending'
    const result = await pool.query(
      `INSERT INTO consultations (patient_id, doctor_id, type, status)
       VALUES ($1, $2, $3, 'pending') RETURNING *`,
      [patient_id, doctor_id, typeDB]
    )
    const row = result.rows[0]
    res.status(201).json({
      ...row,
      type_display: TYPE_DISPLAY[row.type] || row.type
    })
  } catch (error) {
    console.error('Erreur requestConsultation:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
}

// ✅ Médecin accepte une demande
const acceptConsultation = async (req, res) => {
  const { id } = req.params
  const doctor_id = req.user.id

  try {
    const result = await pool.query(
      `UPDATE consultations 
       SET status = 'active'
       WHERE id = $1 AND doctor_id = $2 AND status = 'pending'
       RETURNING *`,
      [id, doctor_id]
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Demande introuvable ou déjà traitée' })
    }
    const row = result.rows[0]
    res.json({ ...row, type_display: TYPE_DISPLAY[row.type] || row.type })
  } catch (error) {
    console.error('Erreur acceptConsultation:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
}

// ✅ Médecin refuse une demande
const rejectConsultation = async (req, res) => {
  const { id } = req.params
  const doctor_id = req.user.id

  try {
    const result = await pool.query(
      `UPDATE consultations 
       SET status = 'cancelled', rejected_at = NOW()
       WHERE id = $1 AND doctor_id = $2 AND status = 'pending'
       RETURNING *`,
      [id, doctor_id]
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Demande introuvable ou déjà traitée' })
    }

    const consultation = result.rows[0]
    const patient_id = consultation.patient_id

    // Compter les refus récents de ce médecin envers ce patient (7 derniers jours)
    const rejectCount = await pool.query(
      `SELECT COUNT(*) FROM consultations 
       WHERE patient_id = $1 AND doctor_id = $2 
       AND status = 'cancelled' AND rejected_at IS NOT NULL
       AND rejected_at > NOW() - INTERVAL '7 days'`,
      [patient_id, doctor_id]
    )

    // Si 3 refus → bloquer le patient 24h pour ce médecin
    if (parseInt(rejectCount.rows[0].count) >= 3) {
      await pool.query(
        `INSERT INTO consultation_blocks (patient_id, doctor_id, blocked_until)
         VALUES ($1, $2, NOW() + INTERVAL '24 hours')
         ON CONFLICT DO NOTHING`,
        [patient_id, doctor_id]
      )
    }

    res.json({ ...consultation, type_display: TYPE_DISPLAY[consultation.type] || consultation.type })
  } catch (error) {
    console.error('Erreur rejectConsultation:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
}

// ✅ Médecin met en salle d'attente (waiting, max 5)
const waitConsultation = async (req, res) => {
  const { id } = req.params
  const doctor_id = req.user.id

  try {
    // Vérifier max 5 en salle d'attente
    const waitingCount = await pool.query(
      `SELECT COUNT(*) FROM consultations 
       WHERE doctor_id = $1 AND status = 'waiting'`,
      [doctor_id]
    )
    if (parseInt(waitingCount.rows[0].count) >= 5) {
      return res.status(400).json({
        message: 'La salle d\'attente est pleine (5/5). Acceptez ou refusez une demande avant d\'en mettre une autre en attente.'
      })
    }

    const result = await pool.query(
      `UPDATE consultations 
       SET status = 'waiting'
       WHERE id = $1 AND doctor_id = $2 AND status = 'pending'
       RETURNING *`,
      [id, doctor_id]
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Demande introuvable ou déjà traitée' })
    }
    const row = result.rows[0]
    res.json({ ...row, type_display: TYPE_DISPLAY[row.type] || row.type })
  } catch (error) {
    console.error('Erreur waitConsultation:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
}

// ✅ Récupérer les demandes en attente pour le médecin (pending + waiting)
const getPendingConsultations = async (req, res) => {
  const doctor_id = req.user.id

  try {
    const result = await pool.query(
      `SELECT c.*, u.full_name as patient_name
       FROM consultations c
       JOIN users u ON c.patient_id = u.id
       WHERE c.doctor_id = $1 AND c.status IN ('pending', 'waiting')
       AND c.archived = false
       ORDER BY c.created_at ASC`,
      [doctor_id]
    )
    const rows = result.rows.map(row => ({
      ...row,
      type_display: TYPE_DISPLAY[row.type] || row.type
    }))
    res.json(rows)
  } catch (error) {
    console.error('Erreur getPendingConsultations:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
}

// ✅ Démarrer une consultation (gardé pour compatibilité)
const startConsultation = async (req, res) => {
  const { doctor_id, type } = req.body
  const patient_id = req.user.id

  const typeDB = TYPE_MAPPING[type]
  if (!typeDB) {
    return res.status(400).json({
      message: `Type invalide : "${type}". Valeurs acceptées : online, physical, home`
    })
  }

  try {
    const consultation = await pool.query(
      `INSERT INTO consultations (patient_id, doctor_id, type, status)
       VALUES ($1, $2, $3, 'active') RETURNING *`,
      [patient_id, doctor_id, typeDB]
    )
    const row = consultation.rows[0]
    res.status(201).json({ ...row, type_display: TYPE_DISPLAY[row.type] || row.type })
  } catch (error) {
    console.error('Erreur startConsultation:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
}

// ✅ Patients suivis par le médecin
const getMyPatients = async (req, res) => {
  const doctor_id = req.user.id

  try {
    const result = await pool.query(
      `SELECT u.id, u.full_name, u.gender, u.age,
        COUNT(c.id)::int as total_consultations,
        MAX(c.created_at) as last_consultation
       FROM users u
       JOIN consultations c ON c.patient_id = u.id
       WHERE c.doctor_id = $1 AND c.archived = false
       GROUP BY u.id, u.full_name, u.gender, u.age
       ORDER BY last_consultation DESC`,
      [doctor_id]
    )
    res.json(result.rows)
  } catch (error) {
    console.error('Erreur getMyPatients:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
}

// ✅ Récupérer mes consultations (patient ou médecin)
const getMyConsultations = async (req, res) => {
  const user_id = req.user.id
  const role = req.user.role

  try {
    const consultations = await pool.query(
      `SELECT c.*, 
        u1.full_name as patient_name,
        u2.full_name as doctor_name,
        d.specialty
       FROM consultations c
       JOIN users u1 ON c.patient_id = u1.id
       JOIN users u2 ON c.doctor_id = u2.id
       JOIN doctors d ON c.doctor_id = d.user_id
       WHERE ${role === 'patient' ? 'c.patient_id' : 'c.doctor_id'} = $1
       AND c.archived = false
       ORDER BY c.created_at DESC`,
      [user_id]
    )
    const rows = consultations.rows.map(row => ({
      ...row,
      type_display: TYPE_DISPLAY[row.type] || row.type
    }))
    res.json(rows)
  } catch (error) {
    console.error('Erreur getMyConsultations:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
}

// ✅ Terminer une consultation
const endConsultation = async (req, res) => {
  const { id } = req.params

  try {
    const consultation = await pool.query(
      `UPDATE consultations 
       SET status = 'completed', ended_at = CURRENT_TIMESTAMP
       WHERE id = $1 RETURNING *`,
      [id]
    )
    if (consultation.rows.length === 0) {
      return res.status(404).json({ message: 'Consultation introuvable' })
    }
    const row = consultation.rows[0]
    res.json({ ...row, type_display: TYPE_DISPLAY[row.type] || row.type })
  } catch (error) {
    console.error('Erreur endConsultation:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
}

// ✅ Envoyer un message (avec vérif statut)
const sendMessage = async (req, res) => {
  const { consultation_id, content } = req.body
  const sender_id = req.user.id

  try {
    const check = await pool.query(
      'SELECT status FROM consultations WHERE id = $1',
      [consultation_id]
    )
    if (check.rows.length === 0) {
      return res.status(404).json({ message: 'Consultation introuvable' })
    }
    if (check.rows[0].status !== 'active') {
      return res.status(403).json({ message: 'Cette consultation n\'est pas active.' })
    }

    const message = await pool.query(
      `INSERT INTO messages (consultation_id, sender_id, content, file_type)
       VALUES ($1, $2, $3, 'text') RETURNING *`,
      [consultation_id, sender_id, content]
    )
    res.status(201).json(message.rows[0])
  } catch (error) {
    console.error('Erreur sendMessage:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
}

// ✅ Récupérer les messages
const getMessages = async (req, res) => {
  const { consultation_id } = req.params

  try {
    const messages = await pool.query(
      `SELECT m.*, u.full_name as sender_name
       FROM messages m
       JOIN users u ON m.sender_id = u.id
       WHERE m.consultation_id = $1
       AND m.archived = false
       ORDER BY m.created_at ASC`,
      [consultation_id]
    )
    res.json(messages.rows)
  } catch (error) {
    console.error('Erreur getMessages:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
}

module.exports = {
  requestConsultation,
  acceptConsultation,
  waitConsultation,
  rejectConsultation,
  getPendingConsultations,
  startConsultation,
  getMyConsultations,
  getMyPatients,
  endConsultation,
  sendMessage,
  getMessages
}