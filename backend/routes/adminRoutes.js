const express = require('express')
const router = express.Router()
const { verifyAdmin } = require('../middleware/authMiddleware')
const adminController = require('../controllers/adminController')

/**
 * @openapi
 * /api/admin/doctors/pending:
 *   get:
 *     summary: Liste des médecins en attente de validation
 *     description: Retourne tous les médecins avec le statut 'pending' en attente de validation KYC par l'admin.
 *     tags: [Administration]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste des médecins en attente récupérée.
 *       403:
 *         description: Accès refusé (rôle Admin requis).
 *       500:
 *         description: Erreur serveur.
 */
router.get('/doctors/pending', verifyAdmin, adminController.getPendingDoctors)

/**
 * @openapi
 * /api/admin/doctors/{id}/approve:
 *   patch:
 *     summary: Approuver un médecin
 *     description: Valide le dossier KYC d'un médecin et passe son statut à 'active'.
 *     tags: [Administration]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de l'utilisateur médecin à approuver
 *     responses:
 *       200:
 *         description: Médecin approuvé avec succès.
 *       403:
 *         description: Accès refusé (rôle Admin requis).
 *       404:
 *         description: Médecin introuvable.
 *       500:
 *         description: Erreur serveur.
 */
router.patch('/doctors/:id/approve', verifyAdmin, adminController.approveDoctor)

/**
 * @openapi
 * /api/admin/doctors/{id}/reject:
 *   patch:
 *     summary: Rejeter un médecin
 *     description: Rejette le dossier KYC d'un médecin et passe son statut à 'rejected'.
 *     tags: [Administration]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de l'utilisateur médecin à rejeter
 *     responses:
 *       200:
 *         description: Médecin rejeté avec succès.
 *       403:
 *         description: Accès refusé (rôle Admin requis).
 *       404:
 *         description: Médecin introuvable.
 *       500:
 *         description: Erreur serveur.
 */
router.patch('/doctors/:id/reject', verifyAdmin, adminController.rejectDoctor)

/**
 * @openapi
 * /api/admin/users:
 *   get:
 *     summary: Liste de tous les utilisateurs
 *     description: Retourne l'ensemble des utilisateurs de la plateforme (patients et médecins).
 *     tags: [Administration]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste des utilisateurs récupérée.
 *       403:
 *         description: Accès refusé (rôle Admin requis).
 *       500:
 *         description: Erreur serveur.
 */
router.get('/users', verifyAdmin, adminController.getAllUsers)

/**
 * @openapi
 * /api/admin/users/{id}/suspend:
 *   patch:
 *     summary: Suspendre un utilisateur
 *     description: Passe le statut d'un utilisateur à 'suspended'. L'utilisateur ne pourra plus se connecter.
 *     tags: [Administration]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de l'utilisateur à suspendre
 *     responses:
 *       200:
 *         description: Utilisateur suspendu avec succès.
 *       403:
 *         description: Accès refusé (rôle Admin requis).
 *       404:
 *         description: Utilisateur introuvable.
 *       500:
 *         description: Erreur serveur.
 */
router.patch('/users/:id/suspend', verifyAdmin, adminController.suspendUser)

/**
 * @openapi
 * /api/admin/stats:
 *   get:
 *     summary: Statistiques globales de la plateforme
 *     description: Retourne les statistiques clés — nombre d'utilisateurs, consultations, médecins actifs, etc.
 *     tags: [Administration]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistiques récupérées avec succès.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total_users:
 *                   type: integer
 *                   example: 120
 *                 total_doctors:
 *                   type: integer
 *                   example: 15
 *                 total_consultations:
 *                   type: integer
 *                   example: 340
 *                 pending_doctors:
 *                   type: integer
 *                   example: 3
 *       403:
 *         description: Accès refusé (rôle Admin requis).
 *       500:
 *         description: Erreur serveur.
 */
router.get('/stats', verifyAdmin, adminController.getStats)

/**
 * @openapi
 * /api/admin/consultations:
 *   get:
 *     summary: Liste de toutes les consultations
 *     description: Retourne l'ensemble des consultations de la plateforme avec leurs détails.
 *     tags: [Administration]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste des consultations récupérée.
 *       403:
 *         description: Accès refusé (rôle Admin requis).
 *       500:
 *         description: Erreur serveur.
 */
router.get('/consultations', verifyAdmin, adminController.getAllConsultations)

router.get('/change-requests', verifyAdmin, adminController.getPendingChangeRequests)
router.patch('/change-requests/:id/approve', verifyAdmin, adminController.approveChangeRequest)
router.patch('/change-requests/:id/reject', verifyAdmin, adminController.rejectChangeRequest)

module.exports = router