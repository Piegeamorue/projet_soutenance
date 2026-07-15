const express = require('express')
const cors = require('cors')
const dotenv = require('dotenv')
const http = require('http')
const { Server } = require('socket.io')
const cron = require('node-cron')
const pool = require('./config/db')

const swaggerUi = require('swagger-ui-express')
const swaggerJsdoc = require('swagger-jsdoc')

dotenv.config()

const app = express()
const server = http.createServer(app)
const io = new Server(server, {
  cors: { origin: 'http://localhost:5173', methods: ['GET', 'POST', 'PATCH'] }
})

// ── Médecins en ligne (en mémoire) ──────────────────────────────────────────
const onlineDoctors = new Set() // Set<doctor_user_id (string)>

// Expose io & onlineDoctors pour les routes
app.locals.io = io
app.locals.onlineDoctors = onlineDoctors

app.use(cors())
app.use(express.json())
app.use('/uploads', express.static('uploads'))

const PORT = process.env.PORT || 5000

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: { title: 'API MediCam - Soutenance', version: '1.0.0', description: 'Documentation MediCam' },
    servers: [{ url: `http://localhost:${PORT}` }],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }
      }
    }
  },
  apis: ['./routes/*.js', './server.js']
}

const swaggerDocs = swaggerJsdoc(swaggerOptions)
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs, { explorer: true }))
app.get('/swagger.json', (req, res) => { res.setHeader('Content-Type', 'application/json'); res.send(swaggerDocs) })

app.use('/api/auth', require('./routes/authRoutes'))
app.use('/api/consultations', require('./routes/consultationRoutes'))
app.use('/api/appointments', require('./routes/appointmentRoutes'))
app.use('/api/admin', require('./routes/adminRoutes'))
app.use('/api/ai', require('./routes/aiRoutes'))
app.use('/api/prescriptions', require('./routes/prescriptionRoutes'))

app.get('/', (req, res) => res.json({ message: '✅ Serveur MediCam en ligne !' }))

/**
 * @openapi
 * /api/doctors/online:
 *   get:
 *     summary: Liste des IDs de médecins actuellement en ligne
 *     tags: [Présence]
 *     responses:
 *       200:
 *         description: Tableau d'IDs de médecins en ligne.
 */
app.get('/api/doctors/online', (req, res) => {
  res.json({ online: Array.from(onlineDoctors).map(Number) })
})

// ============================================================
// CRON — Expiration automatique des demandes après 30 minutes
// ============================================================
cron.schedule('* * * * *', async () => {
  try {
    const result = await pool.query(
      `UPDATE consultations
       SET status = 'cancelled'
       WHERE status = 'pending'
       AND created_at < NOW() - INTERVAL '30 minutes'
       RETURNING id, patient_id, doctor_id`
    )
    if (result.rows.length > 0) {
      result.rows.forEach(c => {
        console.log(`⏰ Consultation #${c.id} expirée (30 min)`)
        // Notifier le patient via socket
        io.to(`user_${c.patient_id}`).emit('consultation_expired', {
          consultation_id: c.id,
          message: 'Votre demande de consultation a expiré (30 min sans réponse).'
        })
      })
    }
  } catch (err) {
    console.error('Erreur cron expiration:', err)
  }
})

// ============================================================
// Socket.io
// ============================================================
io.on('connection', (socket) => {
  console.log('🔌 Connecté:', socket.id)

  // Rejoindre sa salle personnelle (pour notifs patient)
  socket.on('join_user', (user_id) => {
    socket.join(`user_${user_id}`)
    console.log(`👤 user_${user_id} connecté`)
  })

  // Rejoindre salle de consultation
  socket.on('join_consultation', (consultation_id) => {
    const room = `consultation_${consultation_id}`
    if (!socket.rooms.has(room)) {
      socket.join(room)
      console.log(`👤 Rejoint consultation_${consultation_id}`)
    }
  })

  // Rejoindre salle médecin (pour recevoir les demandes en attente)
  socket.on('join_doctor', (doctor_user_id) => {
    socket.join(`doctor_${doctor_user_id}`)
    socket.data.doctorId = String(doctor_user_id)
    onlineDoctors.add(String(doctor_user_id))
    // Notifier tous les clients du nouveau statut
    io.emit('doctors_status_update', Array.from(onlineDoctors).map(Number))
    console.log(`🩺 Médecin doctor_${doctor_user_id} connecté — en ligne: ${onlineDoctors.size}`)
  })

  // Envoyer un message (vérifie statut BDD)
  socket.on('send_message', async (data) => {
    try {
      const result = await pool.query(
        'SELECT status FROM consultations WHERE id = $1',
        [data.consultation_id]
      )
      const consultation = result.rows[0]
      if (!consultation || consultation.status !== 'active') {
        socket.emit('message_blocked', {
          message: 'Cette consultation n\'est pas active. Vous ne pouvez pas envoyer de messages.'
        })
        return
      }
      // Envoyer aux autres seulement
      socket.to(`consultation_${data.consultation_id}`).emit('receive_message', data)
    } catch (err) {
      console.error('Erreur socket send_message:', err)
    }
  })

  // Médecin accepte → notifier le patient
  socket.on('accept_consultation', (data) => {
    // Notifier la salle de consultation + salle personnelle du patient
    io.to(`consultation_${data.consultation_id}`).emit('consultation_accepted', {
      consultation_id: data.consultation_id
    })
    io.to(`user_${data.patient_id}`).emit('consultation_accepted', {
      consultation_id: data.consultation_id
    })
    console.log(`✅ Consultation #${data.consultation_id} acceptée`)
  })

  // Médecin met en attente → notifier le patient
  socket.on('wait_consultation', (data) => {
    io.to(`user_${data.patient_id}`).emit('consultation_waiting', {
      consultation_id: data.consultation_id,
      message: 'Le médecin vous a placé en salle d\'attente. Vous serez pris en charge prochainement.'
    })
    console.log(`⏳ Consultation #${data.consultation_id} mise en attente`)
  })

  // Médecin refuse → notifier le patient
  socket.on('reject_consultation', (data) => {
    io.to(`user_${data.patient_id}`).emit('consultation_rejected', {
      consultation_id: data.consultation_id,
      message: 'Le médecin a refusé votre demande de consultation.'
    })
    console.log(`❌ Consultation #${data.consultation_id} refusée`)
  })

  // Clore la consultation
  socket.on('end_consultation', (data) => {
    io.to(`consultation_${data.consultation_id}`).emit('consultation_ended', {
      consultation_id: data.consultation_id
    })
    console.log(`🔒 Consultation #${data.consultation_id} terminée`)
  })

  socket.on('disconnect', () => {
    console.log('❌ Déconnecté:', socket.id)
    if (socket.data.doctorId) {
      onlineDoctors.delete(socket.data.doctorId)
      io.emit('doctors_status_update', Array.from(onlineDoctors).map(Number))
      console.log(`🩺 Médecin ${socket.data.doctorId} déconnecté — en ligne: ${onlineDoctors.size}`)
    }
  })
})

server.listen(PORT, () => {
  console.log(`✅ Serveur démarré sur le port ${PORT}`)
  console.log(`🚀 Swagger: http://localhost:${PORT}/api-docs`)
})