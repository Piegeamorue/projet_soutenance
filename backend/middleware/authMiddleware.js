const jwt = require('jsonwebtoken')
require('dotenv').config()

const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]

  if (!token) {
    return res.status(401).json({ message: 'Accès refusé. Token manquant.' })
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.user = decoded
    next()
  } catch (error) {
    return res.status(403).json({ message: 'Token invalide ou expiré.' })
  }
}

const verifyAdmin = (req, res, next) => {
  verifyToken(req, res, () => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Accès réservé aux admins.' })
    }
    next()
  })
}

const verifyDoctor = (req, res, next) => {
  verifyToken(req, res, () => {
    if (req.user.role !== 'doctor') {
      return res.status(403).json({ message: 'Accès réservé aux médecins.' })
    }
    next()
  })
}

const verifyPatient = (req, res, next) => {
  verifyToken(req, res, () => {
    if (req.user.role !== 'patient') {
      return res.status(403).json({ message: 'Accès réservé aux patients.' })
    }
    next()
  })
}

module.exports = { verifyToken, verifyAdmin, verifyDoctor, verifyPatient }