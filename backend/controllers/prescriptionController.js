const pool = require('../config/db')

const PDFDocument = require('pdfkit')

const QRCode = require('qrcode')

const crypto = require('crypto')

const fs = require('fs')

require('dotenv').config()



const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173'



const generateReference = () => {

  const year = new Date().getFullYear()

  const random = Math.floor(Math.random() * 90000) + 10000

  return `ORD-${year}-${random}`

}



const generateHash = (content, doctorKey) => {

  return crypto.createHmac('sha256', doctorKey).update(content).digest('hex')

}



const formatDoctorLabel = (fullName) => {

  const name = String(fullName || '').replace(/^Dr\.?\s*/i, '').trim()

  return `Dr. ${name}`

}



const normalizeMedicationsText = (medications) => {

  if (Array.isArray(medications)) {

    return medications

      .map((med, index) => {

        if (typeof med === 'string') return `${index + 1}. ${med}`

        return `${index + 1}. ${med.name || 'Médicament'}\n   Posologie : ${med.dosage || '-'}\n   Durée : ${med.duration || '-'}`

      })

      .join('\n')

  }

  return String(medications || '').trim()

}



// ✅ Créer une ordonnance

const createPrescription = async (req, res) => {

  const { consultation_id, patient_id, medications, instructions } = req.body

  const doctor_id = req.user.id



  if (!consultation_id || !medications) {

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



    const resolvedPatientId = patient_id || consultation.rows[0].patient_id

    const medicationsText = normalizeMedicationsText(medications)

    const instructionsText = instructions ? String(instructions).trim() : null



    if (!medicationsText) {

      return res.status(400).json({ message: 'La liste des médicaments est requise.' })

    }



    const doctor = await pool.query(

      `SELECT u.full_name, d.specialty, d.onmc_number

       FROM users u JOIN doctors d ON u.id = d.user_id

       WHERE u.id = $1`,

      [doctor_id]

    )

    const patient = await pool.query(

      'SELECT full_name FROM users WHERE id = $1',

      [resolvedPatientId]

    )



    if (doctor.rows.length === 0 || patient.rows.length === 0) {

      return res.status(404).json({ message: 'Médecin ou patient introuvable.' })

    }



    const doctorInfo = doctor.rows[0]

    const patientInfo = patient.rows[0]

    const reference = generateReference()

    const date = new Date().toLocaleDateString('fr-FR')



    const content = `${reference}-${doctor_id}-${resolvedPatientId}-${medicationsText}-${instructionsText || ''}-${date}`

    const contentHash = generateHash(content, `${doctor_id}-${process.env.JWT_SECRET}`)



    const pdfPath = `uploads/prescriptions/${reference}.pdf`

    const qrPath = `uploads/prescriptions/${reference}_qr.png`



    if (!fs.existsSync('uploads/prescriptions')) {

      fs.mkdirSync('uploads/prescriptions', { recursive: true })

    }



    const verifyUrl = `${FRONTEND_URL}/verify-prescription/${reference}`

    await QRCode.toFile(qrPath, verifyUrl)



    const doc = new PDFDocument({ margin: 50 })

    const stream = fs.createWriteStream(pdfPath)

    doc.pipe(stream)



    doc.fontSize(20).fillColor('#16a34a').text('MediCam', { align: 'center' })

    doc.fontSize(10).fillColor('#666').text('"Votre santé, où que vous soyez"', { align: 'center' })

    doc.moveDown()

    doc.strokeColor('#16a34a').lineWidth(2).moveTo(50, doc.y).lineTo(550, doc.y).stroke()

    doc.moveDown()



    doc.fontSize(16).fillColor('#000').text('ORDONNANCE MÉDICALE', { align: 'center' })

    doc.moveDown()



    doc.fontSize(11).fillColor('#333')

    doc.text(`Médecin : ${formatDoctorLabel(doctorInfo.full_name)}`)

    doc.text(`Spécialité : ${doctorInfo.specialty}`)

    doc.text(`N° ONMC : ${doctorInfo.onmc_number}`)

    doc.moveDown()



    doc.text(`Patient : ${patientInfo.full_name}`)

    doc.text(`Date : ${date}`)

    doc.text(`Référence : ${reference}`)

    doc.moveDown()



    doc.strokeColor('#ccc').lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke()

    doc.moveDown()



    doc.fontSize(13).fillColor('#16a34a').text('Prescription :')

    doc.moveDown(0.5)

    doc.fontSize(11).fillColor('#000').text(medicationsText, { lineGap: 4 })



    if (instructionsText) {

      doc.moveDown()

      doc.fontSize(13).fillColor('#16a34a').text('Instructions :')

      doc.moveDown(0.5)

      doc.fontSize(11).fillColor('#000').text(instructionsText, { lineGap: 4 })

    }



    doc.moveDown()

    doc.strokeColor('#ccc').lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke()

    doc.moveDown()

    doc.fontSize(9).fillColor('#999')

    doc.text(`Signature numérique : ${contentHash.substring(0, 32)}...`)

    doc.text(`Vérifiez l'authenticité sur : ${verifyUrl}`)



    doc.image(qrPath, 450, doc.y - 30, { width: 80 })

    doc.end()



    await new Promise((resolve, reject) => {

      stream.on('finish', resolve)

      stream.on('error', reject)

    })



    const inserted = await pool.query(

      `INSERT INTO prescriptions

       (consultation_id, doctor_id, patient_id, reference, content_hash,

        qr_code_path, pdf_path, medications, instructions)

       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)

       RETURNING *`,

      [

        consultation_id,

        doctor_id,

        resolvedPatientId,

        reference,

        contentHash,

        qrPath,

        pdfPath,

        medicationsText,

        instructionsText,

      ]

    )



    res.status(201).json({

      message: '✅ Ordonnance générée !',

      reference,

      prescription: inserted.rows[0],

      pdf_url: `http://localhost:5000/${pdfPath}`,

    })

  } catch (error) {

    console.error(error)

    res.status(500).json({ message: 'Erreur génération ordonnance' })

  }

}



// ✅ Vérifier authenticité ordonnance (public)

const verifyPrescription = async (req, res) => {

  const { reference } = req.params



  try {

    const prescription = await pool.query(

      `SELECT p.*,

        u1.full_name AS doctor_name,

        u2.full_name AS patient_name,

        d.specialty, d.onmc_number

       FROM prescriptions p

       JOIN users u1 ON p.doctor_id = u1.id

       JOIN users u2 ON p.patient_id = u2.id

       JOIN doctors d ON p.doctor_id = d.user_id

       WHERE p.reference = $1

       AND COALESCE(p.archived, false) = false`,

      [reference]

    )



    if (prescription.rows.length === 0) {

      return res.status(404).json({

        valid: false,

        message: '❌ Ordonnance introuvable ou falsifiée',

      })

    }



    const p = prescription.rows[0]



    res.json({

      valid: true,

      message: '✅ Ordonnance authentique',

      prescription: {

        id: p.id,

        reference: p.reference,

        doctor_name: String(p.doctor_name || '').replace(/^Dr\.?\s*/i, '').trim(),

        patient_name: p.patient_name,

        specialty: p.specialty,

        onmc_number: p.onmc_number,

        medications: p.medications,

        instructions: p.instructions,

        created_at: p.created_at,

        pdf_path: p.pdf_path,

      },

    })

  } catch (error) {

    console.error(error)

    res.status(500).json({ message: 'Erreur vérification' })

  }

}



// ✅ Mes ordonnances (patient ou médecin)

const getMyPrescriptions = async (req, res) => {

  const user_id = req.user.id

  const role = req.user.role

  const column = role === 'doctor' ? 'doctor_id' : 'patient_id'



  try {

    const prescriptions = await pool.query(

      `SELECT p.*,

        u1.full_name AS doctor_name,

        u2.full_name AS patient_name,

        d.specialty

       FROM prescriptions p

       JOIN users u1 ON p.doctor_id = u1.id

       JOIN users u2 ON p.patient_id = u2.id

       JOIN doctors d ON p.doctor_id = d.user_id

       WHERE p.${column} = $1

       AND COALESCE(p.archived, false) = false

       ORDER BY p.created_at DESC`,

      [user_id]

    )

    res.json(
      prescriptions.rows.map((row) => ({
        ...row,
        doctor_name: String(row.doctor_name || '').replace(/^Dr\.?\s*/i, '').trim(),
      }))
    )

  } catch (error) {

    console.error(error)

    res.status(500).json({ message: 'Erreur serveur' })

  }

}



module.exports = {

  createPrescription,

  verifyPrescription,

  getMyPrescriptions,

}


