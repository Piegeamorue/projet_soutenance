const express = require('express')
const router = express.Router()
const { verifyToken, verifyDoctor, verifyPatient } = require('../middleware/authMiddleware')
const consultationController = require('../controllers/consultationController')
const multer = require('multer')

// Configuration upload fichiers
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
})
const upload = multer({ 
  storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50 Mo max
})

// Routes consultations
router.post('/start', verifyToken, consultationController.startConsultation)
router.get('/my', verifyToken, consultationController.getMyConsultations)
router.patch('/:id/end', verifyToken, consultationController.endConsultation)

// Routes messages
router.post('/message', verifyToken, consultationController.sendMessage)
router.get('/:consultation_id/messages', verifyToken, consultationController.getMessages)

// Upload fichier dans consultation
router.post('/upload', verifyToken, upload.single('file'), async (req, res) => {
  try {
    const { consultation_id, file_type } = req.body
    const sender_id = req.user.id

    const message = await require('../config/db').query(
      `INSERT INTO messages (consultation_id, sender_id, file_path, file_type)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [consultation_id, sender_id, req.file.path, file_type]
    )
    res.status(201).json(message.rows[0])
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

module.exports = router