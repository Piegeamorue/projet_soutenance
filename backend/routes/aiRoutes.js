const express = require('express')
const router = express.Router()
const { orientSymptoms } = require('../controllers/aiController')

/**
 * @openapi
 * /api/ai/symptoms:
 *   post:
 *     summary: Orientation médicale par IA
 *     description: >
 *       Analyse les symptômes du patient et retourne une orientation vers la spécialité médicale adaptée.
 *       Utilise Gemini (gemini-2.5-flash) en priorité, avec fallback sur un moteur de règles local.
 *       Ne remplace pas une consultation médicale.
 *     tags: [Intelligence Artificielle]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [symptoms]
 *             properties:
 *               symptoms:
 *                 type: string
 *                 example: "J'ai des douleurs à la poitrine et des palpitations depuis ce matin."
 *     responses:
 *       200:
 *         description: Orientation médicale générée avec succès.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 specialty:
 *                   type: string
 *                   example: "Cardiologue"
 *                 urgency_level:
 *                   type: string
 *                   enum: [emergency, high, low]
 *                   example: "emergency"
 *                 urgency_label:
 *                   type: string
 *                   example: "Urgence vitale"
 *                 message:
 *                   type: string
 *                   example: "Consultez immédiatement les urgences ou appelez le 15."
 *                 disclaimer:
 *                   type: string
 *                   example: "Cette orientation est informative et ne remplace pas une consultation médicale."
 *                 source:
 *                   type: string
 *                   enum: [gemini, rules]
 *                   example: "gemini"
 *       400:
 *         description: Symptômes manquants ou vides.
 *       500:
 *         description: Erreur serveur lors de l'orientation IA.
 */
router.post('/symptoms', orientSymptoms)

module.exports = router