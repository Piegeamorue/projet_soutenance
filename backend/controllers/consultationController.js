const pool = require('../config/db')
require('dotenv').config()

// ✅ Démarrer une consultation
const startConsultation = async (req, res) => {
  const { doctor_id, type } = req.body
  const patient_id = req.user.id

  try {
    const consultation = await pool.query(
      `INSERT INTO consultations (patient_id, doctor_id, type, status)
       VALUES ($1, $2, $3, 'active') RETURNING *`,
      [patient_id, doctor_id, type]
    )
    res.status(201).json(consultation.rows[0])
  } catch (error) {
    console.error(error)
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
    res.json(consultations.rows)
  } catch (error) {
    console.error(error)
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
    res.json(consultation.rows[0])
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
}

// ✅ Envoyer un message
const sendMessage = async (req, res) => {
  const { consultation_id, content } = req.body
  const sender_id = req.user.id

  try {
    const message = await pool.query(
      `INSERT INTO messages (consultation_id, sender_id, content, file_type)
       VALUES ($1, $2, $3, 'text') RETURNING *`,
      [consultation_id, sender_id, content]
    )
    res.status(201).json(message.rows[0])
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
}

// ✅ Récupérer les messages d'une consultation
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
    console.error(error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
}

module.exports = {
  startConsultation,
  getMyConsultations,
  endConsultation,
  sendMessage,
  getMessages
}