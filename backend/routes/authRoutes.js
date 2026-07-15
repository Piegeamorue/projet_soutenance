const express = require('express')
const router = express.Router()
const authController = require('../controllers/authController')
const multer = require('multer')
const fs = require('fs')
const path = require('path')
const { verifyToken, verifyAdmin, verifyDoctor, verifyPatient } = require('../middleware/authMiddleware')
const pool = require('../config/db')

const uploadsDir = path.join(__dirname, '..', 'uploads')
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => { cb(null, uploadsDir) },
  filename: (req, file, cb) => { cb(null, Date.now() + '-' + file.originalname.replace(/[^\w.\-() ]/g, '_')) }
})

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true)
    else cb(new Error('Seules les images sont acceptées'))
  },
})

/**
 * @openapi
 * /api/auth/register/patient:
 *   post:
 *     summary: Inscription d'un Patient
 *     description: Crée un compte patient avec accès immédiat.
 *     tags: [Authentification]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [full_name, email, password, confirm_password, gender, age, terms_accepted]
 *             properties:
 *               full_name:
 *                 type: string
 *                 example: "Inès Kamga"
 *               email:
 *                 type: string
 *                 example: "patient@medicam.cm"
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 example: "Mypassword123"
 *               confirm_password:
 *                 type: string
 *                 example: "Mypassword123"
 *               gender:
 *                 type: string
 *                 enum: [Homme, Femme]
 *                 example: "Femme"
 *               age:
 *                 type: integer
 *                 example: 25
 *               terms_accepted:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       201:
 *         description: Compte patient créé avec succès !
 *       400:
 *         description: Erreur de validation.
 *       500:
 *         description: Erreur serveur.
 */
router.post('/register/patient', authController.registerPatient)

/**
 * @openapi
 * /api/auth/google:
 *   post:
 *     summary: Inscription / Connexion via Google OAuth (patients uniquement)
 *     description: Crée ou connecte un compte patient via Google. Si le compte existe déjà, connecte directement.
 *     tags: [Authentification]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [full_name, email, google_id]
 *             properties:
 *               full_name:
 *                 type: string
 *                 example: "Inès Kamga"
 *               email:
 *                 type: string
 *                 example: "ines@gmail.com"
 *               google_id:
 *                 type: string
 *                 example: "108234567890123456789"
 *     responses:
 *       200:
 *         description: Connexion Google réussie. Retourne le token JWT.
 *       400:
 *         description: Données invalides ou compte médecin.
 *       500:
 *         description: Erreur serveur.
 */
router.post('/google', authController.googleAuth)

/**
 * @openapi
 * /api/auth/register/doctor:
 *   post:
 *     summary: Inscription d'un Médecin (KYC)
 *     description: Crée un compte médecin avec statut 'pending'. Documents obligatoires.
 *     tags: [Authentification]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [full_name, email, password, confirm_password, onmc_number, specialty, gender, age, terms_accepted, cni, attestation, selfie]
 *             properties:
 *               full_name:
 *                 type: string
 *                 example: "Dr. Jean Marc"
 *               email:
 *                 type: string
 *                 example: "jeanmarc@medicam.cm"
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 example: "Docpassword123"
 *               confirm_password:
 *                 type: string
 *                 example: "Docpassword123"
 *               onmc_number:
 *                 type: string
 *                 example: "ONMC-2026-8945"
 *               specialty:
 *                 type: string
 *                 example: "Cardiologue"
 *               gender:
 *                 type: string
 *                 enum: [Homme, Femme]
 *                 example: "Homme"
 *               age:
 *                 type: integer
 *                 example: 38
 *               workplace:
 *                 type: string
 *                 example: "Hôpital Central de Yaoundé"
 *               terms_accepted:
 *                 type: boolean
 *                 example: true
 *               cni:
 *                 type: string
 *                 format: binary
 *               attestation:
 *                 type: string
 *                 format: binary
 *               selfie:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Dossier soumis, en attente de validation admin.
 *       400:
 *         description: Fichiers manquants ou erreurs de validation.
 *       500:
 *         description: Erreur serveur.
 */
router.post('/register/doctor', upload.fields([
  { name: 'cni' }, { name: 'attestation' }, { name: 'selfie' }
]), authController.registerDoctor)

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     summary: Connexion utilisateur
 *     description: Authentifie un Patient ou Médecin. Renvoie un JWT valable 24h.
 *     tags: [Authentification]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 example: "patient@medicam.cm"
 *               password:
 *                 type: string
 *                 example: "Mypassword123"
 *     responses:
 *       200:
 *         description: Connexion réussie. Retourne le token JWT et le profil.
 *       401:
 *         description: Identifiants invalides ou compte suspendu.
 *       500:
 *         description: Erreur serveur.
 */
router.post('/login', authController.login)

/**
 * @openapi
 * /api/auth/forgot-password:
 *   post:
 *     summary: Mot de passe oublié
 *     description: Envoie un lien de réinitialisation par email, valable 1 heure.
 *     tags: [Authentification]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 example: "patient@medicam.cm"
 *     responses:
 *       200:
 *         description: Email de réinitialisation envoyé.
 *       404:
 *         description: Aucun utilisateur trouvé.
 *       500:
 *         description: Erreur lors de l'envoi de l'email.
 */
router.post('/forgot-password', authController.forgotPassword)

/**
 * @openapi
 * /api/auth/reset-password:
 *   post:
 *     summary: Réinitialisation du mot de passe
 *     description: Définit un nouveau mot de passe via le token reçu par email.
 *     tags: [Authentification]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, password, confirm_password]
 *             properties:
 *               token:
 *                 type: string
 *                 example: "abcdef123456..."
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 example: "Newpassword123"
 *               confirm_password:
 *                 type: string
 *                 example: "Newpassword123"
 *     responses:
 *       200:
 *         description: Mot de passe réinitialisé avec succès.
 *       400:
 *         description: Token invalide ou expiré.
 *       500:
 *         description: Erreur serveur.
 */
router.post('/reset-password', authController.resetPassword)

/**
 * @openapi
 * /api/auth/recover-account:
 *   post:
 *     summary: Récupération d'un compte suspendu
 *     description: Soumet une demande à l'admin. Frais fixes de 5 000 FCFA. Traitement 24-48h.
 *     tags: [Authentification]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, reason]
 *             properties:
 *               email:
 *                 type: string
 *                 example: "patient@medicam.cm"
 *               reason:
 *                 type: string
 *                 example: "Je souhaite régulariser ma situation."
 *     responses:
 *       200:
 *         description: Demande transmise à l'administrateur.
 *       404:
 *         description: Utilisateur introuvable.
 *       500:
 *         description: Erreur serveur.
 */
router.post('/recover-account', authController.recoverAccount)

/**
 * @openapi
 * /api/auth/check-onmc:
 *   get:
 *     summary: Vérifier l'unicité d'un numéro ONMC
 *     tags: [Authentification]
 *     parameters:
 *       - in: query
 *         name: onmc
 *         required: true
 *         schema:
 *           type: string
 *         example: "ONMC-2026-8945"
 *     responses:
 *       200:
 *         description: Résultat de la vérification.
 *       500:
 *         description: Erreur serveur.
 */
router.get('/check-onmc', async (req, res) => {
  const { onmc } = req.query
  if (!onmc || !onmc.trim()) {
    return res.status(400).json({ message: 'Numéro ONMC requis' })
  }
  try {
    const result = await pool.query(
      'SELECT id FROM doctors WHERE onmc_number = $1', [onmc.trim()]
    )
    res.json({ exists: result.rows.length > 0 })
  } catch (error) {
    console.error('GET /check-onmc:', error.message)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

/**
 * @openapi
 * /api/auth/me:
 *   get:
 *     summary: Profil de l'utilisateur connecté
 *     tags: [Profil & Médecins]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profil récupéré avec succès.
 *       401:
 *         description: Token manquant ou invalide.
 *       404:
 *         description: Utilisateur introuvable.
 *       500:
 *         description: Erreur serveur.
 */
router.get('/me', verifyToken, async (req, res) => {
  try {
    const userResult = await pool.query(
      'SELECT id, full_name, email, role, status, gender, age, photo FROM users WHERE id = $1',
      [req.user.id]
    )
    if (userResult.rows.length === 0) return res.status(404).json({ message: 'Utilisateur introuvable' })
    const user = userResult.rows[0]
    if (user.role === 'doctor') {
      const docResult = await pool.query(
        'SELECT specialty, onmc_number, tarif, bio, years_experience, workplace, address, latitude, longitude FROM doctors WHERE user_id = $1',
        [user.id]
      )
      if (docResult.rows.length > 0) Object.assign(user, docResult.rows[0])
    }
    res.json(user)
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

/**
 * @openapi
 * /api/auth/doctors:
 *   get:
 *     summary: Liste de tous les médecins actifs
 *     tags: [Profil & Médecins]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste des médecins récupérée.
 *       500:
 *         description: Erreur serveur.
 */
router.get('/doctors', verifyToken, async (req, res) => {
  try {
    const doctors = await pool.query(
      `SELECT u.id, u.full_name, u.photo, u.gender,
        d.specialty, d.onmc_number, d.tarif, d.avg_rating,
        d.total_consultations, d.bio, d.experience, d.years_experience,
        d.workplace, d.address, d.latitude, d.longitude
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

/**
 * @openapi
 * /api/auth/doctors/{id}:
 *   get:
 *     summary: Détail d'un médecin spécifique
 *     tags: [Profil & Médecins]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Détails du médecin récupérés.
 *       404:
 *         description: Médecin introuvable.
 *       500:
 *         description: Erreur serveur.
 */
router.get('/doctors/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params
    const doctor = await pool.query(
      `SELECT u.id, u.full_name, u.photo, u.gender,
        d.specialty, d.onmc_number, d.tarif, d.avg_rating,
        d.total_consultations, d.bio, d.experience, d.years_experience,
        d.workplace, d.address, d.latitude, d.longitude
       FROM users u
       INNER JOIN doctors d ON u.id = d.user_id
       WHERE u.role = 'doctor' AND u.status = 'active' AND u.id = $1`,
      [id]
    )
    if (doctor.rows.length === 0) return res.status(404).json({ message: 'Médecin introuvable' })
    res.json(doctor.rows[0])
  } catch (error) {
    console.error('GET /auth/doctors/:id:', error.message)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

/**
 * @openapi
 * /api/auth/doctors/profile:
 *   put:
 *     summary: Mettre à jour le profil médecin
 *     tags: [Profil & Médecins]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               tarif:
 *                 type: integer
 *                 example: 5000
 *               bio:
 *                 type: string
 *               years_experience:
 *                 type: integer
 *                 example: 10
 *     responses:
 *       200:
 *         description: Profil médecin mis à jour.
 *       403:
 *         description: Accès refusé.
 *       500:
 *         description: Erreur serveur.
 */
router.put('/doctors/profile', verifyDoctor, async (req, res) => {
  const { tarif, bio, years_experience, address, latitude, longitude } = req.body
  const user_id = req.user.id
  try {
    // Si des coordonnées sont fournies, on les met à jour aussi
    if (address !== undefined && latitude !== undefined && longitude !== undefined) {
      await pool.query(
        `UPDATE doctors SET tarif = $1, bio = $2, years_experience = $3,
          address = $4, latitude = $5, longitude = $6
         WHERE user_id = $7`,
        [tarif || 0, bio || '', years_experience || 0,
         address, parseFloat(latitude), parseFloat(longitude), user_id]
      )
    } else {
      await pool.query(
        `UPDATE doctors SET tarif = $1, bio = $2, years_experience = $3 WHERE user_id = $4`,
        [tarif || 0, bio || '', years_experience || 0, user_id]
      )
    }
    res.json({ message: '✅ Profil médecin mis à jour avec succès' })
  } catch (error) {
    console.error('PUT /auth/doctors/profile:', error.message)
    res.status(500).json({ message: 'Erreur serveur lors de la mise à jour' })
  }
})

router.post('/change-password', verifyToken, authController.changePassword)

router.post('/profile/photo', verifyToken, (req, res, next) => {
  upload.single('photo')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'Image trop lourde. Maximum 10MB autorisé.' })
      }
      return res.status(400).json({ message: `Erreur upload : ${err.message}` })
    }
    if (err) {
      return res.status(400).json({ message: err.message })
    }
    next()
  })
}, authController.uploadProfilePhoto)

router.post('/request-email-change', verifyPatient, authController.requestEmailChange)
router.post('/confirm-email-change', authController.confirmEmailChange)
router.post('/doctor/change-request', verifyDoctor, authController.submitDoctorChangeRequest)
router.get('/doctor/change-requests', verifyDoctor, authController.getMyChangeRequests)

module.exports = router