require('dotenv').config()
const pool = require('../config/db')

pool.query(
  "SELECT column_name FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'photo'"
)
  .then((r) => {
    console.log('photo column:', r.rows.length ? 'exists' : 'MISSING')
    return pool.end()
  })
  .catch((e) => {
    console.error(e.message)
    process.exit(1)
  })
