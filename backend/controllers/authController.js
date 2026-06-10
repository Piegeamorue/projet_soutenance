const pool = require('../config/db')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const nodemailer = require('nodemailer')
require('dotenv').config()

// Configuration email
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
})

// ✅ Inscription Patient
const registerPatient = async (req, res) => {
  const { full_name, email, password, confirm_password } = req.body

  try {
    // Vérifier que les mots de passe correspondent
    if (password !== confirm_password) {
      return res.status(400).json({ message: 'Les mots de passe ne correspondent pas' })
    }

    // Vérifier si email déjà utilisé
    const existingUser = await pool.query(
      'SELECT * FROM users WHERE email = $1', [email]
    )
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ message: 'Cet email est déjà utilisé' })
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 10)

     // Créer le patient
    const newUser = await pool.query(
      `INSERT INTO users (full_name, email, password, role, status)
       VALUES ($1, $2, $3, 'patient', 'active') RETURNING *`,
      [full_name, email, hashedPassword]
    )

    res.status(201).json({ message: '✅ Compte patient créé avec succès !' })

  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
}

// ✅ Inscription Médecin
const registerDoctor = async (req, res) => {
  const { full_name, email, password, confirm_password, onmc_number, specialty, workplace } = req.body

  try {
    if (password !== confirm_password) {
      return res.status(400).json({ message: 'Les mots de passe ne correspondent pas' })
    }

    const existingUser = await pool.query(
      'SELECT * FROM users WHERE email = $1', [email]
    )
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ message: 'Cet email est déjà utilisé' })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    // Créer le compte utilisateur
    const newUser = await pool.query(
      `INSERT INTO users (full_name, email, password, role, status)
       VALUES ($1, $2, $3, 'doctor', 'pending') RETURNING *`,
      [full_name, email, hashedPassword]
    )

    const userId = newUser.rows[0].id

    // Sauvegarder les infos du médecin
    await pool.query(
      `INSERT INTO doctors (user_id, onmc_number, specialty, cni_path, attestation_path, selfie_path)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        userId,
        onmc_number,
        specialty,
        req.files['cni'] ? req.files['cni'][0].path : null,
        req.files['attestation'] ? req.files['attestation'][0].path : null,
        req.files['selfie'] ? req.files['selfie'][0].path : null
      ]
    )

    // Envoyer email de confirmation
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'MediCam — Dossier reçu',
      html: `
        <h2>Bonjour Dr. ${full_name},</h2>
        <p>Votre dossier a bien été reçu et est en cours de vérification.</p>
        <p>Vous recevrez un email dès que votre compte sera activé.</p>
        <p>L'équipe MediCam</p>
      `
    })

    res.status(201).json({ message: '✅ Dossier soumis ! En attente de validation.' })

  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
}

// ✅ Connexion
const login = async (req, res) => {
  const { email, password } = req.body

  try {
    // Chercher l'utilisateur
    const user = await pool.query(
      'SELECT * FROM users WHERE email = $1', [email]
    )

    if (user.rows.length === 0) {
      return res.status(400).json({ message: 'Email ou mot de passe incorrect' })
    }

    const foundUser = user.rows[0]

    // Vérifier mot de passe
    const isMatch = await bcrypt.compare(password, foundUser.password)
    if (!isMatch) {
      return res.status(400).json({ message: 'Email ou mot de passe incorrect' })
    }

    // Vérifier statut
    if (foundUser.status === 'pending') {
      return res.status(400).json({ message: 'Votre compte est en attente de validation' })
    }
    if (foundUser.status === 'rejected') {
      return res.status(400).json({ message: 'Votre compte a été rejeté' })
    }
    if (foundUser.status === 'suspended') {
      return res.status(400).json({ message: 'Votre compte est suspendu' })
    }

    // Générer JWT
    const token = jwt.sign(
      { id: foundUser.id, role: foundUser.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    )

    res.json({
      message: '✅ Connexion réussie !',
      token,
      user: {
        id: foundUser.id,
        full_name: foundUser.full_name,
        email: foundUser.email,
        role: foundUser.role
      }
    })

  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
}

// ✅ Mot de passe oublié
const forgotPassword = async (req, res) => {
  const { email } = req.body

  try {
    const user = await pool.query(
      'SELECT * FROM users WHERE email = $1', [email]
    )

    if (user.rows.length === 0) {
      return res.status(400).json({ message: 'Aucun compte trouvé avec cet email' })
    }

    // Générer token de réinitialisation
    const resetToken = jwt.sign(
      { id: user.rows[0].id },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    )

    // Envoyer email
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'MediCam — Réinitialisation du mot de passe',
      html: `
        <h2>Réinitialisation de votre mot de passe</h2>
        <p>Cliquez sur le lien ci-dessous pour réinitialiser votre mot de passe :</p>
        <a href="http://localhost:5173/reset-password?token=${resetToken}">
          Réinitialiser mon mot de passe
        </a>
        <p>Ce lien expire dans 1 heure.</p>
        <p>L'équipe MediCam</p>
      `
    })

    res.json({ message: '✅ Email de réinitialisation envoyé !' })

  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
}

// ✅ Réinitialisation mot de passe
const resetPassword = async (req, res) => {
  const { token, password, confirm_password } = req.body

  try {
    if (password !== confirm_password) {
      return res.status(400).json({ message: 'Les mots de passe ne correspondent pas' })
    }

    // Vérifier token
    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    // Hasher nouveau mot de passe
    const hashedPassword = await bcrypt.hash(password, 10)

    // Mettre à jour
    await pool.query(
      'UPDATE users SET password = $1 WHERE id = $2',
      [hashedPassword, decoded.id]
    )

    res.json({ message: '✅ Mot de passe réinitialisé avec succès !' })

  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Token invalide ou expiré' })
  }
}

// ✅ Récupération compte médecin suspendu
const recoverAccount = async (req, res) => {
  const { email } = req.body

  try {
    // Vérifier si le compte existe et est suspendu
    const user = await pool.query(
      `SELECT * FROM users WHERE email = $1 AND role = 'doctor'`,
      [email]
    )

    if (user.rows.length === 0) {
      return res.status(400).json({ 
        message: 'Aucun compte médecin trouvé avec cet email' 
      })
    }

    if (user.rows[0].status !== 'suspended') {
      return res.status(400).json({ 
        message: 'Ce compte n\'est pas suspendu' 
      })
    }

    // Envoyer email à l'admin
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER,
      subject: 'MediCam — Demande de récupération de compte',
      html: `
        <h2>Demande de récupération de compte</h2>
        <p>Le médecin avec l'email <b>${email}</b> demande la récupération de son compte suspendu.</p>
        <p>Frais de récupération : <b>5 000 FCFA</b></p>
        <p>Connectez-vous au panel admin pour traiter cette demande.</p>
      `
    })

    // Envoyer email au médecin
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'MediCam — Demande de récupération reçue',
      html: `
        <h2>Demande reçue !</h2>
        <p>Votre demande de récupération de compte a été reçue.</p>
        <p>Notre équipe vous contactera sous 24-48h avec les instructions de paiement des <b>5 000 FCFA</b>.</p>
        <p>L'équipe MediCam</p>
      `
    })

    res.json({ message: '✅ Demande envoyée avec succès !' })

  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
}

module.exports = {
  registerPatient,
  registerDoctor,
  login,
  forgotPassword,
  resetPassword,
  recoverAccount
}