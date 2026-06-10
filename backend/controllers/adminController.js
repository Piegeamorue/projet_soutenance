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

module.exports = {
  getPendingDoctors,
  approveDoctor,
  rejectDoctor,
  getAllUsers,
  suspendUser,
  getStats,
  getAllConsultations
}