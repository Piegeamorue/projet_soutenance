const pool = require('../config/db')
const crypto = require('crypto')
const fs = require('fs')
const path = require('path')
const PDFDocument = require('pdfkit')
const QRCode = require('qrcode')
require('dotenv').config()

const PRESCRIPTIONS_DIR = path.join(__dirname, '..', 'uploads', 'prescriptions')

const ensurePrescriptionsDir = () => {
  if (!fs.existsSync(PRESCRIPTIONS_DIR)) {
    fs.mkdirSync(PRESCRIPTIONS_DIR, { recursive: true })
  }
}

const generateQrToken = () => crypto.randomBytes(32).toString('hex')

const generatePdf = async ({ prescription, doctor, patient, qrToken }) => {
  ensurePrescriptionsDir()

  const fileName = `ordonnance-${prescription.id}-${Date.now()}.pdf`
  const filePath = path.join(PRESCRIPTIONS_DIR, fileName)
  const verifyUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-prescription/${qrToken}`

  const qrBuffer = await QRCode.toBuffer(verifyUrl, { width: 120 })

  await new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 })
    const stream = fs.createWriteStream(filePath)

    doc.pipe(stream)

    doc.fontSize(20).fillColor('#16a34a').text('MediCam', { align: 'center' })
    doc.fontSize(14).fillColor('#000000').text('Ordonnance numérique', { align: 'center' })
    doc.moveDown()

    doc.fontSize(11)
    doc.text(`N° ordonnance : ${prescription.id}`)
    doc.text(`Date : ${new Date(prescription.created_at || Date.now()).toLocaleDateString('fr-FR')}`)
    doc.moveDown()

    doc.text(`Médecin : Dr. ${doctor.full_name}`)
    doc.text(`Patient : ${patient.full_name}`)
    doc.moveDown()

    doc.fontSize(12).text('Médicaments prescrits :', { underline: true })
    doc.moveDown(0.5)
    doc.fontSize(11).text(prescription.medications)
    doc.moveDown()

    if (prescription.instructions) {
      doc.fontSize(12).text('Instructions :', { underline: true })
      doc.moveDown(0.5)
      doc.fontSize(11).text(prescription.instructions)
      doc.moveDown()
    }

    doc.fontSize(9).fillColor('#666666').text(
      'Cette ordonnance est générée électroniquement par MediCam. Vérifiez le QR code en pharmacie.',
      { align: 'center' }
    )

    doc.image(qrBuffer, doc.page.width - 150, doc.page.height - 150, { width: 100 })

    doc.end()
    stream.on('finish', resolve)
    stream.on('error', reject)
  })

  return `uploads/prescriptions/${fileName}`
}

// ✅ Créer une ordonnance (médecin)
const createPrescription = async (req, res) => {
  const { consultation_id, medications, instructions } = req.body
  const doctor_id = req.user.id

  if (req.user.role !== 'doctor') {
    return res.status(403).json({ message: 'Seul un médecin peut créer une ordonnance.' })
  }

  if (!consultation_id || !medications?.trim()) {
    return res.status(400).json({ message: 'Consultation et médicaments requis.' })
  }

  try {
    const consultation = await pool.query(
      `SELECT * FROM consultations WHERE id = $1 AND doctor_id = $2`,
      [consultation_id, doctor_id]
    )

    if (consultation.rows.length === 0) {
      return res.status(404).json({ message: 'Consultation introuvable.' })
    }

    const { patient_id } = consultation.rows[0]
    const qr_token = generateQrToken()

    const prescription = await pool.query(
      `INSERT INTO prescriptions (consultation_id, doctor_id, patient_id, medications, instructions, qr_token)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [consultation_id, doctor_id, patient_id, medications.trim(), instructions || null, qr_token]
    )

    const doctor = await pool.query('SELECT full_name FROM users WHERE id = $1', [doctor_id])
    const patient = await pool.query('SELECT full_name FROM users WHERE id = $1', [patient_id])

    const pdf_path = await generatePdf({
      prescription: prescription.rows[0],
      doctor: doctor.rows[0],
      patient: patient.rows[0],
      qrToken: qr_token,
    })

    const updated = await pool.query(
      `UPDATE prescriptions SET pdf_path = $1 WHERE id = $2 RETURNING *`,
      [pdf_path, prescription.rows[0].id]
    )

    res.status(201).json(updated.rows[0])
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Erreur lors de la création de l\'ordonnance' })
  }
}

// ✅ Mes ordonnances (patient ou médecin)
const getMyPrescriptions = async (req, res) => {
  const user_id = req.user.id
  const role = req.user.role

  try {
    const column = role === 'patient' ? 'patient_id' : 'doctor_id'

    const prescriptions = await pool.query(
      `SELECT p.*,
        u1.full_name AS patient_name,
        u2.full_name AS doctor_name
       FROM prescriptions p
       JOIN users u1 ON p.patient_id = u1.id
       JOIN users u2 ON p.doctor_id = u2.id
       WHERE p.${column} = $1
       AND p.archived = false
       ORDER BY p.created_at DESC`,
      [user_id]
    )

    res.json(prescriptions.rows)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
}

// ✅ Détail d'une ordonnance
const getPrescriptionById = async (req, res) => {
  const { id } = req.params
  const user_id = req.user.id

  try {
    const prescription = await pool.query(
      `SELECT p.*,
        u1.full_name AS patient_name,
        u2.full_name AS doctor_name
       FROM prescriptions p
       JOIN users u1 ON p.patient_id = u1.id
       JOIN users u2 ON p.doctor_id = u2.id
       WHERE p.id = $1
       AND p.archived = false
       AND (p.patient_id = $2 OR p.doctor_id = $2)`,
      [id, user_id]
    )

    if (prescription.rows.length === 0) {
      return res.status(404).json({ message: 'Ordonnance introuvable.' })
    }

    res.json(prescription.rows[0])
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
}

// ✅ Vérifier une ordonnance via QR token (pharmacie / public)
const verifyPrescription = async (req, res) => {
  const { token } = req.params

  try {
    const prescription = await pool.query(
      `SELECT p.id, p.created_at, p.medications, p.instructions, p.verified_at,
        u1.full_name AS patient_name,
        u2.full_name AS doctor_name
       FROM prescriptions p
       JOIN users u1 ON p.patient_id = u1.id
       JOIN users u2 ON p.doctor_id = u2.id
       WHERE p.qr_token = $1 AND p.archived = false`,
      [token]
    )

    if (prescription.rows.length === 0) {
      return res.status(404).json({ valid: false, message: 'Ordonnance invalide ou expirée.' })
    }

    res.json({
      valid: true,
      message: 'Ordonnance authentique — MediCam',
      prescription: prescription.rows[0],
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
}

// ✅ Télécharger le PDF
const downloadPrescription = async (req, res) => {
  const { id } = req.params
  const user_id = req.user.id

  try {
    const prescription = await pool.query(
      `SELECT * FROM prescriptions
       WHERE id = $1 AND archived = false
       AND (patient_id = $2 OR doctor_id = $2)`,
      [id, user_id]
    )

    if (prescription.rows.length === 0) {
      return res.status(404).json({ message: 'Ordonnance introuvable.' })
    }

    const { pdf_path } = prescription.rows[0]
    if (!pdf_path) {
      return res.status(404).json({ message: 'PDF non disponible.' })
    }

    const absolutePath = path.join(__dirname, '..', pdf_path)
    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({ message: 'Fichier PDF introuvable.' })
    }

    res.download(absolutePath, `ordonnance-medicam-${id}.pdf`)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
}

module.exports = {
  createPrescription,
  getMyPrescriptions,
  getPrescriptionById,
  verifyPrescription,
  downloadPrescription,
}
