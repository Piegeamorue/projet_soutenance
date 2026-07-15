-- Demandes de modification profil médecin + table générique
BEGIN;

CREATE TABLE IF NOT EXISTS profile_change_requests (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  request_type VARCHAR(50) NOT NULL,
  old_value TEXT,
  new_value TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_profile_change_requests_status
  ON profile_change_requests(status);

COMMIT;
