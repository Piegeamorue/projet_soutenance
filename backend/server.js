const express = require('express')
const cors = require('cors')
const dotenv = require('dotenv')
const http = require('http')
const { Server } = require('socket.io')

dotenv.config()

const app = express()
const server = http.createServer(app)
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
})

// Middlewares
app.use(cors())
app.use(express.json())
app.use('/uploads', express.static('uploads'))

// Routes
app.use('/api/auth', require('./routes/authRoutes'))
app.use('/api/consultations', require('./routes/consultationRoutes'))
app.use('/api/appointments', require('./routes/appointmentRoutes'))
app.use('/api/admin', require('./routes/adminRoutes'))
app.use('/api/ai', require('./routes/aiRoutes'))
app.use('/api/prescriptions', require('./routes/prescriptionRoutes'))

// Test route
app.get('/', (req, res) => {
  res.json({ message: '✅ Serveur MediCam en ligne !' })
})

// Socket.io — Messagerie temps réel
io.on('connection', (socket) => {
  console.log('🔌 Utilisateur connecté:', socket.id)

  // Rejoindre une salle de consultation
  socket.on('join_consultation', (consultation_id) => {
    socket.join(`consultation_${consultation_id}`)
    console.log(`👤 Rejoint consultation_${consultation_id}`)
  })

  // Envoyer un message
  socket.on('send_message', (data) => {
    io.to(`consultation_${data.consultation_id}`).emit('receive_message', data)
  })

  // Déconnexion
  socket.on('disconnect', () => {
    console.log('❌ Utilisateur déconnecté:', socket.id)
  })
})

const PORT = process.env.PORT || 5000
server.listen(PORT, () => {
  console.log(`✅ Serveur démarré sur le port ${PORT}`)
})