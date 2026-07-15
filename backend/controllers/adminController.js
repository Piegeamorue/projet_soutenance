const pool = require('../config/db')
require('dotenv').config()
const nodemailer = require('nodemailer')

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
})

// ✅ Liste médecins en attente
const getPendingDoctors = async (req, res) => {
  try {
    const doctors = await pool.query(
      `SELECT u.id, u.full_name, u.email, u.created_at,
        d.onmc_number, d.specialty, d.cni_path, 
        d.attestation_path, d.selfie_path
       FROM users u
       JOIN doctors d ON u.id = d.user_id
       WHERE u.role = 'doctor' AND u.status = 'pending'
       ORDER BY u.created_at DESC`
    )
    res.json(doctors.rows)
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur' })
  }
}

// ✅ Approuver un médecin
const approveDoctor = async (req, res) => {
  const { id } = req.params
  try {
    const user = await pool.query(
      `UPDATE users SET status = 'active'
       WHERE id = $1 RETURNING *`,
      [id]
    )
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: user.rows[0].email,
      subject: 'MediCam — Compte approuvé !',
      html: `
        <h2>Félicitations Dr. ${user.rows[0].full_name} !</h2>
        <p>Votre compte a été approuvé. Vous pouvez maintenant vous connecter.</p>
        <p>L'équipe MediCam</p>
      `
    })
    res.json({ message: '✅ Médecin approuvé !' })
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur' })
  }
}

// ✅ Rejeter un médecin
const rejectDoctor = async (req, res) => {
  const { id } = req.params
  const { reason } = req.body
  try {
    const user = await pool.query(
      `UPDATE users SET status = 'rejected'
       WHERE id = $1 RETURNING *`,
      [id]
    )
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: user.rows[0].email,
      subject: 'MediCam — Dossier rejeté',
      html: `
        <h2>Bonjour Dr. ${user.rows[0].full_name},</h2>
        <p>Votre dossier a été rejeté pour la raison suivante :</p>
        <p><b>${reason}</b></p>
        <p>Vous pouvez soumettre à nouveau votre dossier.</p>
        <p>L'équipe MediCam</p>
      `
    })
    res.json({ message: '✅ Médecin rejeté !' })
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur' })
  }
}

// ✅ Liste tous les utilisateurs
const getAllUsers = async (req, res) => {
  try {
    const users = await pool.query(
      `SELECT id, full_name, email, role, status, created_at
       FROM users ORDER BY created_at DESC`
    )
    res.json(users.rows)
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur' })
  }
}

// ✅ Suspendre ou réactiver un utilisateur
const suspendUser = async (req, res) => {
  const { id } = req.params
  try {
    const user = await pool.query('SELECT status FROM users WHERE id = $1', [id])
    if (user.rows.length === 0) {
      return res.status(404).json({ message: 'Utilisateur introuvable' })
    }
    
    const currentStatus = user.rows[0].status
    const newStatus = currentStatus === 'suspended' ? 'active' : 'suspended'

    await pool.query(
      `UPDATE users SET status = $1 WHERE id = $2`,
      [newStatus, id]
    )
    res.json({ message: `✅ Statut mis à jour : ${newStatus}`, status: newStatus })
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur' })
  }
}

// ✅ Statistiques générales
const getStats = async (req, res) => {
  try {
    const stats = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM users WHERE role = 'patient') as total_patients,
        (SELECT COUNT(*) FROM users WHERE role = 'doctor' AND status = 'active') as total_doctors,
        (SELECT COUNT(*) FROM consultations) as total_consultations,
        (SELECT COUNT(*) FROM users WHERE status = 'pending') as pending_doctors,
        (SELECT COUNT(*) FROM appointments WHERE status = 'missed') as missed_appointments
    `)
    res.json(stats.rows[0])
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur' })
  }
}

// ✅ Liste toutes les consultations (pour l'admin)
const getAllConsultations = async (req, res) => {
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
       ORDER BY c.created_at DESC`
    )
    res.json(consultations.rows)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
}

// ✅ Demandes de modification profil médecin
const getPendingChangeRequests = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT r.*, u.full_name, u.email AS current_email
       FROM profile_change_requests r
       JOIN users u ON r.user_id = u.id
       WHERE r.status = 'pending'
       ORDER BY r.created_at ASC`
    )
    res.json(result.rows)
  } catch (error) {
    if (error.code === '42P01') {
      return res.json([])
    }
    res.status(500).json({ message: 'Erreur serveur' })
  }
}

const approveChangeRequest = async (req, res) => {
  const { id } = req.params
  try {
    const request = await pool.query(
      `SELECT * FROM profile_change_requests WHERE id = $1 AND status = 'pending'`,
      [id]
    )
    if (request.rows.length === 0) {
      return res.status(404).json({ message: 'Demande introuvable' })
    }

    const row = request.rows[0]

    if (row.request_type === 'email') {
      const existing = await pool.query('SELECT id FROM users WHERE email = $1', [row.new_value])
      if (existing.rows.length > 0) {
        return res.status(400).json({ message: 'Cet email est déjà utilisé' })
      }
      await pool.query('UPDATE users SET email = $1 WHERE id = $2', [row.new_value, row.user_id])
    } else if (row.request_type === 'workplace') {
      await pool.query('UPDATE doctors SET workplace = $1 WHERE user_id = $2', [row.new_value, row.user_id])
    } else if (row.request_type === 'specialty') {
      await pool.query('UPDATE doctors SET specialty = $1 WHERE user_id = $2', [row.new_value, row.user_id])
    }

    await pool.query(
      `UPDATE profile_change_requests SET status = 'approved' WHERE id = $1`,
      [id]
    )

    const user = await pool.query('SELECT email, full_name FROM users WHERE id = $1', [row.user_id])
    if (user.rows.length > 0) {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: user.rows[0].email,
        subject: 'MediCam — Demande approuvée',
        html: `<p>Bonjour Dr. ${user.rows[0].full_name},</p>
               <p>Votre demande de modification (<b>${row.request_type}</b>) a été approuvée.</p>`
      })
    }

    res.json({ message: '✅ Demande approuvée' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
}

const rejectChangeRequest = async (req, res) => {
  const { id } = req.params
  const { reason } = req.body
  try {
    const request = await pool.query(
      `UPDATE profile_change_requests SET status = 'rejected'
       WHERE id = $1 AND status = 'pending'
       RETURNING *`,
      [id]
    )
    if (request.rows.length === 0) {
      return res.status(404).json({ message: 'Demande introuvable' })
    }

    const row = request.rows[0]
    const user = await pool.query('SELECT email, full_name FROM users WHERE id = $1', [row.user_id])
    if (user.rows.length > 0) {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: user.rows[0].email,
        subject: 'MediCam — Demande refusée',
        html: `<p>Bonjour Dr. ${user.rows[0].full_name},</p>
               <p>Votre demande de modification (<b>${row.request_type}</b>) a été refusée.</p>
               ${reason ? `<p>Raison : ${reason}</p>` : ''}`
      })
    }

    res.json({ message: 'Demande refusée' })
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur' })
  }
}

module.exports = {
  getPendingDoctors,
  approveDoctor,
  rejectDoctor,
  getAllUsers,
  suspendUser,
  getStats,
  getAllConsultations,
  getPendingChangeRequests,
  approveChangeRequest,
  rejectChangeRequest
}