const express = require('express')
const router = express.Router()
const { verifyToken, verifyDoctor } = require('../middleware/authMiddleware')
const { createPrescription, verifyPrescription, getMyPrescriptions } = require('../controllers/prescriptionController')

/**
 * @openapi
 * /api/prescriptions/create:
 *   post:
 *     summary: Créer une ordonnance
 *     description: Permet au médecin de générer une ordonnance PDF avec référence unique (ORD-2026-XXXXX), QR Code et hash SHA-256 pour vérification d'authenticité.
 *     tags: [Ordonnances]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [consultation_id, patient_id, medications]
 *             properties:
 *               consultation_id:
 *                 type: integer
 *                 example: 12
 *               patient_id:
 *                 type: integer
 *                 example: 5
 *               medications:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                       example: "Paracétamol 500mg"
 *                     dosage:
 *                       type: string
 *                       example: "1 comprimé 3 fois par jour"
 *                     duration:
 *                       type: string
 *                       example: "5 jours"
 *               notes:
 *                 type: string
 *                 example: "Éviter l'alcool pendant le traitement."
 *     responses:
 *       201:
 *         description: Ordonnance créée avec succès. PDF généré.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Ordonnance créée avec succès"
 *                 reference:
 *                   type: string
 *                   example: "ORD-2026-48291"
 *                 pdf_path:
 *                   type: string
 *                   example: "uploads/ORD-2026-48291.pdf"
 *       403:
 *         description: Accès refusé (rôle Médecin requis).
 *       500:
 *         description: Erreur serveur.
 */
router.post('/create', verifyDoctor, createPrescription)

/**
 * @openapi
 * /api/prescriptions/verify/{reference}:
 *   get:
 *     summary: Vérifier l'authenticité d'une ordonnance
 *     description: Route publique permettant à un pharmacien de vérifier qu'une ordonnance est authentique via sa référence unique et son hash SHA-256.
 *     tags: [Ordonnances]
 *     parameters:
 *       - in: path
 *         name: reference
 *         required: true
 *         schema:
 *           type: string
 *         description: Référence unique de l'ordonnance (ex. ORD-2026-48291)
 *         example: "ORD-2026-48291"
 *     responses:
 *       200:
 *         description: Ordonnance authentique et valide.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 valid:
 *                   type: boolean
 *                   example: true
 *                 prescription:
 *                   type: object
 *                   properties:
 *                     reference:
 *                       type: string
 *                     doctor_name:
 *                       type: string
 *                     patient_name:
 *                       type: string
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *       404:
 *         description: Ordonnance introuvable ou falsifiée.
 *       500:
 *         description: Erreur serveur.
 */
router.get('/verify/:reference', verifyPrescription)

/**
 * @openapi
 * /api/prescriptions/my:
 *   get:
 *     summary: Mes ordonnances
 *     description: Retourne toutes les ordonnances du patient connecté, triées par date décroissante.
 *     tags: [Ordonnances]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste des ordonnances récupérée.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   reference:
 *                     type: string
 *                     example: "ORD-2026-48291"
 *                   doctor_name:
 *                     type: string
 *                   pdf_path:
 *                     type: string
 *                   created_at:
 *                     type: string
 *                     format: date-time
 *       401:
 *         description: Non authentifié.
 *       500:
 *         description: Erreur serveur.
 */
router.get('/my', verifyToken, getMyPrescriptions)

module.exports = router