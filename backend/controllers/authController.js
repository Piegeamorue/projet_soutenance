const pool = require('../config/db')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const nodemailer = require('nodemailer')
const path = require('path')
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
  const { full_name, email, password, confirm_password, gender, age, terms_accepted } = req.body

  try {
    if (password !== confirm_password) {
      return res.status(400).json({ message: 'Les mots de passe ne correspondent pas' })
    }

    if (!gender || !['Homme', 'Femme'].includes(gender)) {
      return res.status(400).json({ message: 'Le sexe est obligatoire (Homme ou Femme)' })
    }

    if (!age || isNaN(age) || age < 1 || age > 120) {
      return res.status(400).json({ message: 'L\'âge est obligatoire et doit être valide' })
    }

    if (!terms_accepted || terms_accepted === 'false' || terms_accepted === false) {
      return res.status(400).json({ message: 'Vous devez accepter les conditions d\'utilisation' })
    }

    const existingUser = await pool.query(
      'SELECT * FROM users WHERE email = $1', [email]
    )
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ message: 'Cet email est déjà utilisé' })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    await pool.query(
      `INSERT INTO users (full_name, email, password, role, status, gender, age, terms_accepted)
       VALUES ($1, $2, $3, 'patient', 'active', $4, $5, $6) RETURNING *`,
      [full_name, email, hashedPassword, gender, parseInt(age), true]
    )

    res.status(201).json({ message: '✅ Compte patient créé avec succès !' })

  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
}

// ✅ Inscription / Connexion Google (patients uniquement)
const googleAuth = async (req, res) => {
  const { full_name, email, google_id } = req.body

  try {
    if (!email || !google_id) {
      return res.status(400).json({ message: 'Données Google invalides' })
    }

    // Vérifier si l'utilisateur existe déjà
    let userResult = await pool.query(
      'SELECT * FROM users WHERE email = $1', [email]
    )

    let user

    if (userResult.rows.length > 0) {
      user = userResult.rows[0]

      // Vérifier que ce n'est pas un médecin
      if (user.role === 'doctor') {
        return res.status(400).json({ message: 'Les médecins ne peuvent pas utiliser Google OAuth' })
      }

      // Vérifier statut
      if (user.status === 'suspended') {
        return res.status(400).json({ message: 'Votre compte est suspendu' })
      }

      // Mettre à jour le google_id si pas encore enregistré
      if (!user.google_id) {
        await pool.query(
          'UPDATE users SET google_id = $1 WHERE id = $2',
          [google_id, user.id]
        )
      }

    } else {
      // Créer un nouveau compte patient
      const newUser = await pool.query(
        `INSERT INTO users (full_name, email, google_id, role, status, terms_accepted)
         VALUES ($1, $2, $3, 'patient', 'active', true) RETURNING *`,
        [full_name, email, google_id]
      )
      user = newUser.rows[0]
    }

    // Générer JWT
    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    )

    res.json({
      message: '✅ Connexion Google réussie !',
      token,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        gender: user.gender || null,
        age: user.age || null,
        photo: user.photo || null
      }
    })

  } catch (error) {
    console.error('Google Auth error:', error)
    res.status(500).json({ message: 'Erreur lors de la connexion Google' })
  }
}

// ✅ Inscription Médecin
const registerDoctor = async (req, res) => {
  const { full_name, email, password, confirm_password, onmc_number, specialty, workplace, gender, age, terms_accepted } = req.body

  try {
    if (password !== confirm_password) {
      return res.status(400).json({ message: 'Les mots de passe ne correspondent pas' })
    }

    if (!gender || !['Homme', 'Femme'].includes(gender)) {
      return res.status(400).json({ message: 'Le sexe est obligatoire (Homme ou Femme)' })
    }

    if (!age || isNaN(age) || age < 1 || age > 120) {
      return res.status(400).json({ message: 'L\'âge est obligatoire et doit être valide' })
    }

    if (!terms_accepted || terms_accepted === 'false' || terms_accepted === false) {
      return res.status(400).json({ message: 'Vous devez accepter les conditions d\'utilisation et la charte de déontologie' })
    }

    const existingUser = await pool.query(
      'SELECT * FROM users WHERE email = $1', [email]
    )
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ message: 'Cet email est déjà utilisé' })
    }

    const existingOnmc = await pool.query(
      'SELECT id FROM doctors WHERE onmc_number = $1', [onmc_number]
    )
    if (existingOnmc.rows.length > 0) {
      return res.status(400).json({ message: 'Ce numéro ONMC est déjà enregistré sur MediCam' })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const newUser = await pool.query(
      `INSERT INTO users (full_name, email, password, role, status, gender, age, terms_accepted)
       VALUES ($1, $2, $3, 'doctor', 'pending', $4, $5, $6) RETURNING *`,
      [full_name, email, hashedPassword, gender, parseInt(age), true]
    )

    const userId = newUser.rows[0].id

    await pool.query(
      `INSERT INTO doctors (user_id, onmc_number, specialty, workplace, cni_path, attestation_path, selfie_path)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        userId,
        onmc_number,
        specialty,
        workplace || null,
        req.files['cni'] ? req.files['cni'][0].path : null,
        req.files['attestation'] ? req.files['attestation'][0].path : null,
        req.files['selfie'] ? req.files['selfie'][0].path : null
      ]
    )

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
    const user = await pool.query(
      'SELECT * FROM users WHERE email = $1', [email]
    )

    if (user.rows.length === 0) {
      return res.status(400).json({ message: 'Email ou mot de passe incorrect' })
    }

    const foundUser = user.rows[0]

    // Si compte Google sans mot de passe
    if (!foundUser.password) {
      return res.status(400).json({ message: 'Ce compte utilise la connexion Google. Connectez-vous avec Google.' })
    }

    const isMatch = await bcrypt.compare(password, foundUser.password)
    if (!isMatch) {
      return res.status(400).json({ message: 'Email ou mot de passe incorrect' })
    }

    if (foundUser.status === 'pending') {
      return res.status(400).json({ message: 'Votre compte est en attente de validation' })
    }
    if (foundUser.status === 'rejected') {
      return res.status(400).json({ message: 'Votre compte a été rejeté' })
    }
    if (foundUser.status === 'suspended') {
      return res.status(400).json({ message: 'Votre compte est suspendu' })
    }

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
        role: foundUser.role,
        gender: foundUser.gender,
        age: foundUser.age,
        photo: foundUser.photo || null
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

    const resetToken = jwt.sign(
      { id: user.rows[0].id },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    )

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

    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const hashedPassword = await bcrypt.hash(password, 10)

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

// ✅ Récupération compte suspendu
const recoverAccount = async (req, res) => {
  const { email } = req.body

  try {
    const user = await pool.query(
      `SELECT * FROM users WHERE email = $1 AND role = 'doctor'`,
      [email]
    )

    if (user.rows.length === 0) {
      return res.status(400).json({ message: 'Aucun compte médecin trouvé avec cet email' })
    }

    if (user.rows[0].status !== 'suspended') {
      return res.status(400).json({ message: 'Ce compte n\'est pas suspendu' })
    }

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

// ✅ Photo de profil
const uploadProfilePhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Photo requise' })
    }

    const photoPath = `uploads/${path.basename(req.file.path)}`

    const result = await pool.query(
      `UPDATE users SET photo = $1 WHERE id = $2
       RETURNING id, full_name, email, role, gender, age, photo`,
      [photoPath, req.user.id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Utilisateur introuvable' })
    }

    res.json({
      message: '✅ Photo de profil mise à jour',
      photo: photoPath,
      user: result.rows[0],
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Erreur lors de l\'upload' })
  }
}

// ✅ Modifier mot de passe
const changePassword = async (req, res) => {
  const { current_password, new_password, confirm_password } = req.body

  try {
    if (!current_password || !new_password || !confirm_password) {
      return res.status(400).json({ message: 'Tous les champs sont obligatoires' })
    }
    if (new_password !== confirm_password) {
      return res.status(400).json({ message: 'Les mots de passe ne correspondent pas' })
    }
    if (new_password.length < 8) {
      return res.status(400).json({ message: 'Le mot de passe doit contenir au moins 8 caractères' })
    }

    const user = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id])
    if (user.rows.length === 0) {
      return res.status(404).json({ message: 'Utilisateur introuvable' })
    }

    if (!user.rows[0].password) {
      return res.status(400).json({ message: 'Ce compte utilise Google OAuth, pas de mot de passe à modifier' })
    }

    const isMatch = await bcrypt.compare(current_password, user.rows[0].password)
    if (!isMatch) {
      return res.status(400).json({ message: 'Mot de passe actuel incorrect' })
    }

    const hashedPassword = await bcrypt.hash(new_password, 10)
    await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, req.user.id])

    res.json({ message: '✅ Mot de passe modifié avec succès' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
}

// ✅ Patient — demande changement email
const requestEmailChange = async (req, res) => {
  const { new_email } = req.body

  try {
    if (!new_email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(new_email)) {
      return res.status(400).json({ message: 'Adresse email invalide' })
    }

    const current = await pool.query('SELECT email FROM users WHERE id = $1', [req.user.id])
    if (current.rows[0]?.email === new_email) {
      return res.status(400).json({ message: 'Cette adresse est déjà la vôtre' })
    }

    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [new_email])
    if (existing.rows.length > 0) {
      return res.status(400).json({ message: 'Cet email est déjà utilisé' })
    }

    const changeToken = jwt.sign(
      { id: req.user.id, new_email, purpose: 'email_change' },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    )

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: new_email,
      subject: 'MediCam — Confirmez votre nouvelle adresse email',
      html: `
        <h2>Confirmation de changement d'email</h2>
        <p>Cliquez sur le lien ci-dessous pour confirmer votre nouvelle adresse :</p>
        <a href="http://localhost:5173/confirm-email-change?token=${changeToken}">
          Confirmer mon email
        </a>
        <p>Ce lien expire dans 24 heures.</p>
        <p>L'équipe MediCam</p>
      `
    })

    res.json({ message: '✅ Un email de confirmation a été envoyé à la nouvelle adresse' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Erreur lors de l\'envoi de l\'email' })
  }
}

// ✅ Patient — confirmer changement email
const confirmEmailChange = async (req, res) => {
  const { token } = req.body

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    if (decoded.purpose !== 'email_change') {
      return res.status(400).json({ message: 'Token invalide' })
    }

    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [decoded.new_email])
    if (existing.rows.length > 0) {
      return res.status(400).json({ message: 'Cet email est déjà utilisé' })
    }

    const updated = await pool.query(
      'UPDATE users SET email = $1 WHERE id = $2 RETURNING id, full_name, email, role, gender, age, photo',
      [decoded.new_email, decoded.id]
    )

    res.json({
      message: '✅ Adresse email mise à jour avec succès',
      user: updated.rows[0]
    })
  } catch (error) {
    console.error(error)
    res.status(400).json({ message: 'Lien invalide ou expiré' })
  }
}

// ✅ Médecin — soumettre une demande de modification
const submitDoctorChangeRequest = async (req, res) => {
  const { request_type, new_value } = req.body
  const allowed = ['email', 'workplace', 'specialty']

  try {
    if (!allowed.includes(request_type)) {
      return res.status(400).json({ message: 'Type de demande invalide' })
    }
    if (!new_value || !String(new_value).trim()) {
      return res.status(400).json({ message: 'La nouvelle valeur est obligatoire' })
    }

    const userResult = await pool.query(
      `SELECT u.email, d.specialty, d.workplace
       FROM users u
       LEFT JOIN doctors d ON d.user_id = u.id
       WHERE u.id = $1`,
      [req.user.id]
    )
    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'Utilisateur introuvable' })
    }
    const profile = userResult.rows[0]

    let old_value = profile.email
    if (request_type === 'workplace') old_value = profile.workplace || ''
    if (request_type === 'specialty') old_value = profile.specialty || ''

    if (String(new_value).trim() === String(old_value || '').trim()) {
      return res.status(400).json({ message: 'La nouvelle valeur est identique à l\'actuelle' })
    }

    if (request_type === 'email') {
      const existing = await pool.query('SELECT id FROM users WHERE email = $1', [new_value.trim()])
      if (existing.rows.length > 0) {
        return res.status(400).json({ message: 'Cet email est déjà utilisé' })
      }
    }

    const pending = await pool.query(
      `SELECT id FROM profile_change_requests
       WHERE user_id = $1 AND request_type = $2 AND status = 'pending'`,
      [req.user.id, request_type]
    )
    if (pending.rows.length > 0) {
      return res.status(400).json({ message: 'Une demande est déjà en attente pour ce champ' })
    }

    await pool.query(
      `INSERT INTO profile_change_requests (user_id, request_type, old_value, new_value)
       VALUES ($1, $2, $3, $4)`,
      [req.user.id, request_type, old_value, String(new_value).trim()]
    )

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER,
      subject: `MediCam — Demande de modification (${request_type})`,
      html: `
        <p>Le médecin #${req.user.id} demande une modification : <b>${request_type}</b></p>
        <p>Ancienne valeur : ${old_value || '—'}</p>
        <p>Nouvelle valeur : ${new_value}</p>
        <p>Traitez la demande depuis le panel admin.</p>
      `
    })

    res.json({ message: '✅ Demande envoyée. En attente de validation par l\'administrateur.' })
  } catch (error) {
    console.error(error)
    if (error.code === '42P01') {
      return res.status(500).json({ message: 'Table profile_change_requests manquante. Exécutez la migration 002.' })
    }
    res.status(500).json({ message: 'Erreur serveur' })
  }
}

// ✅ Médecin — voir ses demandes en cours
const getMyChangeRequests = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, request_type, old_value, new_value, status, created_at
       FROM profile_change_requests
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 20`,
      [req.user.id]
    )
    res.json(result.rows)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
}

module.exports = {
  registerPatient,
  registerDoctor,
  googleAuth,
  login,
  forgotPassword,
  resetPassword,
  recoverAccount,
  uploadProfilePhoto,
  changePassword,
  requestEmailChange,
  confirmEmailChange,
  submitDoctorChangeRequest,
  getMyChangeRequests
}