const bcrypt = require('bcryptjs')
const pool = require('./config/db')

const createAdmin = async () => {
  try {
    const hashedPassword = await bcrypt.hash('Admin@MediCam2026', 10)

    const result = await pool.query(
      `INSERT INTO users (full_name, email, password, role, status)
       VALUES ($1, $2, $3, 'admin', 'active')
       ON CONFLICT (email) DO NOTHING
       RETURNING *`,
      ['Administrateur MediCam', 'contact.medicam237@gmail.com', hashedPassword]
    )

    if (result.rows.length > 0) {
      console.log('✅ Compte admin créé avec succès !')
      console.log('Email :', result.rows[0].email)
      console.log('Mot de passe : Admin@MediCam2026')
    } else {
      console.log('⚠️ Ce compte admin existe déjà !')
    }

    process.exit()
  } catch (error) {
    console.error('❌ Erreur :', error)
    process.exit(1)
  }
}

createAdmin()