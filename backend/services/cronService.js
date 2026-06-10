const cron = require('node-cron')
const pool = require('../config/db')
const nodemailer = require('nodemailer')
require('dotenv').config()

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
})

const startCronJobs = () => {

  // Vérification toutes les minutes
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date()
      const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000)

      // Trouver rendez-vous dans 2h
      const appointments = await pool.query(
        `SELECT a.*,
          u1.full_name as patient_name, u1.email as patient_email,
          u2.full_name as doctor_name, u2.email as doctor_email
         FROM appointments a
         JOIN users u1 ON a.patient_id = u1.id
         JOIN users u2 ON a.doctor_id = u2.id
         WHERE a.status = 'confirmed'
         AND a.appointment_date BETWEEN $1 AND $2
         AND a.reminder_sent = false`,
        [now, twoHoursLater]
      )

      for (const apt of appointments.rows) {
        // Email patient
        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: apt.patient_email,
          subject: 'MediCam — Rappel rendez-vous dans 2h',
          html: `
            <h2>Rappel de rendez-vous !</h2>
            <p>Vous avez un rendez-vous avec <b>Dr. ${apt.doctor_name}</b> dans 2 heures.</p>
            <p>Date : <b>${new Date(apt.appointment_date).toLocaleString('fr-FR')}</b></p>
            <a href="http://localhost:5173/confirm-appointment/${apt.id}">
              ✅ Confirmer ma présence
            </a>
            &nbsp;&nbsp;
            <a href="http://localhost:5173/cancel-appointment/${apt.id}">
              ❌ Annuler
            </a>
            <p>L'équipe MediCam</p>
          `
        })

        // Email médecin
        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: apt.doctor_email,
          subject: 'MediCam — Rappel rendez-vous dans 2h',
          html: `
            <h2>Rappel rendez-vous !</h2>
            <p>Vous avez un rendez-vous avec <b>${apt.patient_name}</b> dans 2 heures.</p>
            <p>Date : <b>${new Date(apt.appointment_date).toLocaleString('fr-FR')}</b></p>
            <p>L'équipe MediCam</p>
          `
        })

        // Marquer rappel envoyé
        await pool.query(
          'UPDATE appointments SET reminder_sent = true WHERE id = $1',
          [apt.id]
        )
      }

    } catch (error) {
      console.error('Cron error:', error)
    }
  })

  console.log('✅ Cron jobs démarrés')
}

module.exports = { startCronJobs }