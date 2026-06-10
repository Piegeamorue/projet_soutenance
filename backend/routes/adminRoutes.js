const express = require('express')
const router = express.Router()
const { verifyAdmin } = require('../middleware/authMiddleware')
const adminController = require('../controllers/adminController')

// Médecins en attente
router.get('/doctors/pending', verifyAdmin, adminController.getPendingDoctors)
router.patch('/doctors/:id/approve', verifyAdmin, adminController.approveDoctor)
router.patch('/doctors/:id/reject', verifyAdmin, adminController.rejectDoctor)

// Utilisateurs
router.get('/users', verifyAdmin, adminController.getAllUsers)
router.patch('/users/:id/suspend', verifyAdmin, adminController.suspendUser)

// Statistiques
router.get('/stats', verifyAdmin, adminController.getStats)

// Consultations
router.get('/consultations', verifyAdmin, adminController.getAllConsultations)

module.exports = router