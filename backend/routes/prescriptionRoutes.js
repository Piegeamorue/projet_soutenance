const express = require('express')
const router = express.Router()
const { verifyToken, verifyDoctor } = require('../middleware/authMiddleware')
const { createPrescription, verifyPrescription, getMyPrescriptions } = require('../controllers/prescriptionController')

// Créer une ordonnance (médecin uniquement)
router.post('/create', verifyDoctor, createPrescription)

// Vérifier authenticité (public - pour pharmaciens)
router.get('/verify/:reference', verifyPrescription)

// Mes ordonnances (patient)
router.get('/my', verifyToken, getMyPrescriptions)

module.exports = router