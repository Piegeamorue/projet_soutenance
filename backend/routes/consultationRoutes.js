const express = require('express')
const router = express.Router()
const { verifyToken } = require('../middleware/authMiddleware')
const consultationController = require('../controllers/consultationController')
const multer = require('multer')

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
})
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } })

// ── Salle d'attente ──────────────────────────────────────────
// Patient envoie une demande
router.post('/request', verifyToken, consultationController.requestConsultation)

// Médecin accepte
router.patch('/:id/accept', verifyToken, consultationController.acceptConsultation)

// Médecin met en salle d'attente
router.patch('/:id/wait', verifyToken, consultationController.waitConsultation)

// Médecin refuse
router.patch('/:id/reject', verifyToken, consultationController.rejectConsultation)

// Médecin voit les demandes en attente
router.get('/pending', verifyToken, consultationController.getPendingConsultations)

// ── Consultation ─────────────────────────────────────────────
router.post('/start', verifyToken, consultationController.startConsultation)
router.get('/my', verifyToken, consultationController.getMyConsultations)
router.get('/my-patients', verifyToken, consultationController.getMyPatients)
router.patch('/:id/end', verifyToken, consultationController.endConsultation)
router.post('/message', verifyToken, consultationController.sendMessage)
router.get('/:consultation_id/messages', verifyToken, consultationController.getMessages)

// ── Upload fichier ───────────────────────────────────────────
router.post('/upload', verifyToken, upload.single('file'), async (req, res) => {
  try {
    const { consultation_id, file_type } = req.body
    const sender_id = req.user.id
    const db = require('../config/db')

    const check = await db.query(
      'SELECT status FROM consultations WHERE id = $1',
      [consultation_id]
    )
    if (check.rows.length === 0) {
      return res.status(404).json({ message: 'Consultation introuvable' })
    }
    if (check.rows[0].status !== 'active') {
      return res.status(403).json({ message: 'Cette consultation n\'est pas active.' })
    }

    // Corriger chemin Windows
    const filePath = req.file.path.replace(/\\/g, '/')

    const message = await db.query(
      `INSERT INTO messages (consultation_id, sender_id, file_path, file_type)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [consultation_id, sender_id, filePath, file_type]
    )
    res.status(201).json(message.rows[0])
  } catch (error) {
    console.error('Erreur upload:', error)
    res.status(500).json({ message: 'Erreur serveur lors de l\'upload' })
  }
})

module.exports = router