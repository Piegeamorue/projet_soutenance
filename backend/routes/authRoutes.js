const express = require('express')
const router = express.Router()
const authController = require('../controllers/authController')
const multer = require('multer')
const { verifyToken, verifyAdmin, verifyDoctor, verifyPatient } = require('../middleware/authMiddleware')
const pool = require('../config/db')

// Configuration Multer pour les uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/')
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname)
  }
})

const upload = multer({ storage })

// Routes Patient
router.post('/register/patient', authController.registerPatient)

// Routes Médecin
router.post('/register/doctor', upload.fields([
  { name: 'cni' },
  { name: 'attestation' },
  { name: 'selfie' }
]), authController.registerDoctor)

// Connexion
router.post('/login', authController.login)

// Mot de passe oublié
router.post('/forgot-password', authController.forgotPassword)

// Réinitialisation mot de passe
router.post('/reset-password', authController.resetPassword)

// Récupération compte
router.post('/recover-account', authController.recoverAccount)

// Route protégée test
router.get('/me', verifyToken, async (req, res) => {
  try {
    const userResult = await pool.query(
      'SELECT id, full_name, email, role, status FROM users WHERE id = $1',
      [req.user.id]
    )
    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'Utilisateur introuvable' })
    }
    
    const user = userResult.rows[0]
    if (user.role === 'doctor') {
      const docResult = await pool.query(
        'SELECT specialty, onmc_number, tarif, bio, years_experience FROM doctors WHERE user_id = $1',
        [user.id]
      )
      if (docResult.rows.length > 0) {
        Object.assign(user, docResult.rows[0])
      }
    }
    res.json(user)
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

// Liste des médecins approuvés
router.get('/doctors', verifyToken, async (req, res) => {
  try {
    const doctors = await pool.query(
      `SELECT u.id, u.full_name, u.photo,
        d.specialty,
        d.onmc_number,
        d.tarif,
        d.avg_rating,
        d.total_consultations,
        d.bio,
        d.experience,
        d.years_experience,
        NULL::text AS workplace
       FROM users u
       INNER JOIN doctors d ON u.id = d.user_id
       WHERE u.role = 'doctor' AND u.status = 'active'
       ORDER BY d.avg_rating DESC NULLS LAST, u.full_name ASC`
    )
    res.json(doctors.rows)
  } catch (error) {
    console.error('GET /auth/doctors:', error.message)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

// Détail d'un médecin spécifique
router.get('/doctors/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params
    const doctor = await pool.query(
      `SELECT u.id, u.full_name, u.photo,
        d.specialty,
        d.onmc_number,
        d.tarif,
        d.avg_rating,
        d.total_consultations,
        d.bio,
        d.experience,
        d.years_experience,
        NULL::text AS workplace
       FROM users u
       INNER JOIN doctors d ON u.id = d.user_id
       WHERE u.role = 'doctor' AND u.status = 'active' AND u.id = $1`,
      [id]
    )
    if (doctor.rows.length === 0) {
      return res.status(404).json({ message: 'Médecin introuvable' })
    }
    res.json(doctor.rows[0])
  } catch (error) {
    console.error('GET /auth/doctors/:id:', error.message)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

// Mettre à jour les informations du médecin connecté
router.put('/doctors/profile', verifyDoctor, async (req, res) => {
  const { tarif, bio, years_experience } = req.body
  const user_id = req.user.id
  try {
    await pool.query(
      `UPDATE doctors 
       SET tarif = $1, bio = $2, years_experience = $3
       WHERE user_id = $4`,
      [tarif || 0, bio || '', years_experience || 0, user_id]
    )
    res.json({ message: '✅ Profil médecin mis à jour avec succès' })
  } catch (error) {
    console.error('PUT /auth/doctors/profile:', error.message)
    res.status(500).json({ message: 'Erreur serveur lors de la mise à jour' })
  }
})

module.exports = router