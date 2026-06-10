const express = require('express')
const router = express.Router()
const { orientSymptoms } = require('../controllers/aiController')

router.post('/symptoms', orientSymptoms)

module.exports = router