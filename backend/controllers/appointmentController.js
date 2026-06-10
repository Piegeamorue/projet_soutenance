const pool = require('../config/db')
const nodemailer = require('nodemailer')
require('dotenv').config()

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
})

// ✅ Prendre un rendez-vous
const bookAppointment = async (req, res) => {
  const { doctor_id, appointment_date, duration, type } = req.body
  const patient_id = req.user.id

  try {
    // Vérifier si créneau disponible
    const existing = await pool.query(
      `SELECT * FROM appointments 
       WHERE doctor_id = $1 
       AND appointment_date = $2
       AND status NOT IN ('cancelled', 'missed')`,
      [doctor_id, appointment_date]
    )

    if (existing.rows.length > 0) {
      return res.status(400).json({ message: 'Ce créneau est déjà pris' })
    }

    // Créer le rendez-vous
    const appointment = await pool.query(
      `INSERT INTO appointments 
       (patient_id, doctor_id, appointment_date, duration, status, type)
       VALUES ($1, $2, $3, $4, 'confirmed', $5) RETURNING *`,
      [patient_id, doctor_id, appointment_date, duration, type]
    )

    // Récupérer infos patient et médecin
    const patient = await pool.query(
      'SELECT full_name, email FROM users WHERE id = $1', [patient_id]
    )
    const doctor = await pool.query(
      'SELECT full_name, email FROM users WHERE id = $1', [doctor_id]
    )

    // Email patient
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: patient.rows[0].email,
      subject: 'MediCam — Rendez-vous confirmé',
      html: `
        <h2>Rendez-vous confirmé !</h2>
        <p>Votre rendez-vous avec <b>Dr. ${doctor.rows[0].full_name}</b></p>
        <p>Date : <b>${new Date(appointment_date).toLocaleString('fr-FR')}</b></p>
        <p>Durée : ${duration} minutes</p>
        <p>L'équipe MediCam</p>
      `
    })

    // Email médecin
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: doctor.rows[0].email,
      subject: 'MediCam — Nouveau rendez-vous',
      html: `
        <h2>Nouveau rendez-vous !</h2>
        <p>Patient : <b>${patient.rows[0].full_name}</b></p>
        <p>Date : <b>${new Date(appointment_date).toLocaleString('fr-FR')}</b></p>
        <p>Durée : ${duration} minutes</p>
        <p>L'équipe MediCam</p>
      `
    })

    res.status(201).json(appointment.rows[0])

  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
}

// ✅ Mes rendez-vous
const getMyAppointments = async (req, res) => {
  const user_id = req.user.id
  const role = req.user.role

  try {
    const appointments = await pool.query(
      `SELECT a.*,
        u1.full_name as patient_name,
        u2.full_name as doctor_name,
        d.specialty
       FROM appointments a
       JOIN users u1 ON a.patient_id = u1.id
       JOIN users u2 ON a.doctor_id = u2.id
       JOIN doctors d ON a.doctor_id = d.user_id
       WHERE ${role === 'patient' ? 'a.patient_id' : 'a.doctor_id'} = $1
       AND a.archived = false
       ORDER BY a.appointment_date ASC`,
      [user_id]
    )
    res.json(appointments.rows)
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur' })
  }
}

// ✅ Annuler un rendez-vous
const cancelAppointment = async (req, res) => {
  const { id } = req.params

  try {
    // Vérifier délai 2h
    const appointment = await pool.query(
      'SELECT * FROM appointments WHERE id = $1', [id]
    )

    const appointmentDate = new Date(appointment.rows[0].appointment_date)
    const now = new Date()
    const diffHours = (appointmentDate - now) / (1000 * 60 * 60)

    if (diffHours < 2) {
      return res.status(400).json({ 
        message: 'Annulation impossible moins de 2h avant le rendez-vous' 
      })
    }

    await pool.query(
      `UPDATE appointments SET status = 'cancelled' WHERE id = $1`,
      [id]
    )

    res.json({ message: '✅ Rendez-vous annulé' })

  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur' })
  }
}

// ✅ Marquer patient absent
const markPatientAbsent = async (req, res) => {
  const { id } = req.params

  try {
    await pool.query(
      `UPDATE appointments SET status = 'missed' WHERE id = $1`,
      [id]
    )

    // Impacter score fiabilité patient
    const appointment = await pool.query(
      'SELECT patient_id FROM appointments WHERE id = $1', [id]
    )

    await pool.query(
      `UPDATE users SET reliability_score = GREATEST(1, reliability_score - 1)
       WHERE id = $1`,
      [appointment.rows[0].patient_id]
    )

    res.json({ message: '✅ Patient marqué absent' })

  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur' })
  }
}

module.exports = {
  bookAppointment,
  getMyAppointments,
  cancelAppointment,
  markPatientAbsent
}