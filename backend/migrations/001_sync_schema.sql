-- MediCam — Migration de synchronisation base / backend
-- Exécuter dans PostgreSQL (base: medicam)
-- psql -U postgres -d medicam -f migrations/001_sync_schema.sql

BEGIN;

-- ── Rendez-vous : colonnes utilisées par appointmentController + cronService ──
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'En ligne';

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN DEFAULT false;

COMMENT ON COLUMN appointments.type IS 'En ligne | Cabinet | Domicile';
COMMENT ON COLUMN appointments.reminder_sent IS 'Rappel email J-2h envoyé (cron)';

-- ── Médecins : lieu de travail (inscription + affichage profil) ──
ALTER TABLE doctors
  ADD COLUMN IF NOT EXISTS workplace VARCHAR(255);

COMMENT ON COLUMN doctors.workplace IS 'Hôpital, clinique ou cabinet du médecin';

-- ── Ordonnances : instructions de prise (envoyées depuis le chat) ──
ALTER TABLE prescriptions
  ADD COLUMN IF NOT EXISTS instructions TEXT;

COMMENT ON COLUMN prescriptions.instructions IS 'Posologie et consignes complémentaires';

-- ── Valeurs par défaut sur les lignes existantes ──
UPDATE appointments
SET type = 'En ligne'
WHERE type IS NULL;

UPDATE appointments
SET reminder_sent = false
WHERE reminder_sent IS NULL;

COMMIT;

-- Vérification (optionnel)
SELECT 'appointments' AS table_name, column_name, data_type
FROM information_schema.columns
WHERE table_name = 'appointments'
  AND column_name IN ('type', 'reminder_sent')
UNION ALL
SELECT 'doctors', column_name, data_type
FROM information_schema.columns
WHERE table_name = 'doctors'
  AND column_name = 'workplace'
UNION ALL
SELECT 'prescriptions', column_name, data_type
FROM information_schema.columns
WHERE table_name = 'prescriptions'
  AND column_name = 'instructions'
ORDER BY table_name, column_name;
