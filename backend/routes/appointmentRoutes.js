const express = require('express')
const router = express.Router()
const { verifyToken, verifyDoctor } = require('../middleware/authMiddleware')
const appointmentController = require('../controllers/appointmentController')

router.post('/book', verifyToken, appointmentController.bookAppointment)
router.get('/my', verifyToken, appointmentController.getMyAppointments)
router.patch('/:id/cancel', verifyToken, appointmentController.cancelAppointment)
router.patch('/:id/absent', verifyDoctor, appointmentController.markPatientAbsent)

module.exports = router