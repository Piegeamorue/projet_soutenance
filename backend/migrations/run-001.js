require('dotenv').config()
const fs = require('fs')
const path = require('path')
const pool = require('../config/db')

const sqlPath = path.join(__dirname, '001_sync_schema.sql')
const raw = fs.readFileSync(sqlPath, 'utf8')

// Exécuter uniquement le bloc entre BEGIN et COMMIT
const migration = raw
  .split('\n')
  .filter((line) => !line.trim().startsWith('--'))
  .join('\n')
  .match(/BEGIN;[\s\S]*?COMMIT;/)[0]

async function main() {
  await pool.query(migration)
  console.log('✅ Migration 001_sync_schema.sql appliquée avec succès')

  const check = await pool.query(`
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE (table_name = 'appointments' AND column_name IN ('type', 'reminder_sent'))
       OR (table_name = 'doctors' AND column_name = 'workplace')
       OR (table_name = 'prescriptions' AND column_name = 'instructions')
    ORDER BY table_name, column_name
  `)
  check.rows.forEach((r) => console.log(`  • ${r.table_name}.${r.column_name}`))
  process.exit(0)
}

main().catch((err) => {
  console.error('❌ Erreur migration:', err.message)
  process.exit(1)
})
