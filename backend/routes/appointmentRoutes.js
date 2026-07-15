const express = require('express')
const router = express.Router()
const { verifyToken, verifyDoctor, verifyPatient } = require('../middleware/authMiddleware')
const consultationController = require('../controllers/consultationController')
const multer = require('multer')

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
})
const upload = multer({ 
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }
})

/**
 * @openapi
 * /api/consultations/start:
 *   post:
 *     summary: Démarrer une consultation en ligne
 *     description: Crée une nouvelle consultation en ligne entre un patient et un médecin. Chiffrement AES-256 activé.
 *     tags: [Consultations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [doctor_id]
 *             properties:
 *               doctor_id:
 *                 type: integer
 *                 example: 3
 *               is_for_child:
 *                 type: boolean
 *                 example: false
 *               child_name:
 *                 type: string
 *                 example: "Luc Kamga"
 *               child_age:
 *                 type: integer
 *                 example: 7
 *               child_gender:
 *                 type: string
 *                 enum: [Garçon, Fille]
 *                 example: "Garçon"
 *     responses:
 *       201:
 *         description: Consultation démarrée avec succès.
 *       400:
 *         description: Données invalides.
 *       401:
 *         description: Non authentifié.
 *       500:
 *         description: Erreur serveur.
 */
router.post('/start', verifyToken, consultationController.startConsultation)

/**
 * @openapi
 * /api/consultations/my:
 *   get:
 *     summary: Mes consultations
 *     description: Retourne toutes les consultations de l'utilisateur connecté (patient ou médecin).
 *     tags: [Consultations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste des consultations récupérée.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   doctor_id:
 *                     type: integer
 *                   patient_id:
 *                     type: integer
 *                   status:
 *                     type: string
 *                     enum: [active, ended]
 *                   is_for_child:
 *                     type: boolean
 *                   child_name:
 *                     type: string
 *                     nullable: true
 *                   created_at:
 *                     type: string
 *                     format: date-time
 *       401:
 *         description: Non authentifié.
 *       500:
 *         description: Erreur serveur.
 */
router.get('/my', verifyToken, consultationController.getMyConsultations)

/**
 * @openapi
 * /api/consultations/{id}/end:
 *   patch:
 *     summary: Terminer une consultation
 *     description: Met fin à une consultation active. Déclenche la fenêtre de notation mutuelle (délai 24h).
 *     tags: [Consultations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la consultation à terminer
 *     responses:
 *       200:
 *         description: Consultation terminée avec succès.
 *       401:
 *         description: Non authentifié.
 *       404:
 *         description: Consultation introuvable.
 *       500:
 *         description: Erreur serveur.
 */
router.patch('/:id/end', verifyToken, consultationController.endConsultation)

/**
 * @openapi
 * /api/consultations/message:
 *   post:
 *     summary: Envoyer un message texte
 *     description: Envoie un message texte chiffré AES-256 dans une consultation active via Socket.io.
 *     tags: [Consultations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [consultation_id, content]
 *             properties:
 *               consultation_id:
 *                 type: integer
 *                 example: 12
 *               content:
 *                 type: string
 *                 example: "Bonjour Docteur, j'ai des douleurs depuis hier."
 *     responses:
 *       201:
 *         description: Message envoyé avec succès.
 *       401:
 *         description: Non authentifié.
 *       500:
 *         description: Erreur serveur.
 */
router.post('/message', verifyToken, consultationController.sendMessage)

/**
 * @openapi
 * /api/consultations/{consultation_id}/messages:
 *   get:
 *     summary: Historique des messages d'une consultation
 *     description: Récupère tous les messages d'une consultation, déchiffrés et triés par date.
 *     tags: [Consultations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: consultation_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la consultation
 *     responses:
 *       200:
 *         description: Messages récupérés avec succès.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   sender_id:
 *                     type: integer
 *                   content:
 *                     type: string
 *                     nullable: true
 *                   file_path:
 *                     type: string
 *                     nullable: true
 *                   file_type:
 *                     type: string
 *                     nullable: true
 *                   created_at:
 *                     type: string
 *                     format: date-time
 *       401:
 *         description: Non authentifié.
 *       500:
 *         description: Erreur serveur.
 */
router.get('/:consultation_id/messages', verifyToken, consultationController.getMessages)

/**
 * @openapi
 * /api/consultations/upload:
 *   post:
 *     summary: Envoyer un fichier dans une consultation
 *     description: Upload un fichier (image ≤10Mo, vidéo ≤50Mo/1min, PDF ≤5Mo) dans une consultation active.
 *     tags: [Consultations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [consultation_id, file_type, file]
 *             properties:
 *               consultation_id:
 *                 type: integer
 *                 example: 12
 *               file_type:
 *                 type: string
 *                 enum: [image, video, pdf]
 *                 example: "image"
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Fichier envoyé avec succès.
 *       401:
 *         description: Non authentifié.
 *       500:
 *         description: Erreur serveur.
 */
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