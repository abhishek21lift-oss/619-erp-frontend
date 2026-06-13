-- ──────────────────────────────────────────────────────────────────────────────
-- Migration 00001: Biometric Attendance System
-- WebAuthn credentials, biometric attendance records, gym settings, challenges
-- ──────────────────────────────────────────────────────────────────────────────

-- 1. WebAuthn Credentials ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS webauthn_credentials (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id     TEXT NOT NULL,
  member_name   TEXT NOT NULL DEFAULT '',
  credential_id TEXT NOT NULL UNIQUE,
  device_name   TEXT NOT NULL,
  public_key    TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_webauthn_credentials_member_id ON webauthn_credentials (member_id);
CREATE INDEX IF NOT EXISTS idx_webauthn_credentials_credential_id ON webauthn_credentials (credential_id);

-- 2. WebAuthn Challenges (ephemeral, cleaned up periodically) ─────────────────
CREATE TABLE IF NOT EXISTS webauthn_challenges (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge  TEXT NOT NULL,
  member_id  TEXT,
  type       TEXT NOT NULL CHECK (type IN ('registration', 'authentication')),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_webauthn_challenges_expires ON webauthn_challenges (expires_at);

-- 3. Biometric Attendance ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS biometric_attendance (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id             TEXT NOT NULL,
  member_name           TEXT NOT NULL DEFAULT '',
  date                  DATE NOT NULL DEFAULT CURRENT_DATE,
  check_in_time         TIME NOT NULL,
  check_out_time        TIME,
  day                   TEXT NOT NULL,
  gps_lat               DOUBLE PRECISION,
  gps_lng               DOUBLE PRECISION,
  verification_method   TEXT NOT NULL CHECK (verification_method IN ('Face ID', 'Touch ID', 'Fingerprint', 'Passkey')),
  device_name           TEXT NOT NULL DEFAULT '',
  attendance_status     TEXT NOT NULL DEFAULT 'present' CHECK (attendance_status IN ('present', 'late', 'absent')),
  session_duration_minutes INTEGER,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_biometric_attendance_member_id ON biometric_attendance (member_id);
CREATE INDEX IF NOT EXISTS idx_biometric_attendance_date ON biometric_attendance (date);
CREATE INDEX IF NOT EXISTS idx_biometric_attendance_status ON biometric_attendance (attendance_status);

-- Prevent duplicate attendance within configurable window (application-level check recommended)
CREATE UNIQUE INDEX IF NOT EXISTS idx_biometric_attendance_member_date
  ON biometric_attendance (member_id, date);

-- 4. Gym Settings (singleton row) ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS gym_settings (
  id                      INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  geofence_lat            DOUBLE PRECISION NOT NULL DEFAULT 19.0760,
  geofence_lng            DOUBLE PRECISION NOT NULL DEFAULT 72.8777,
  geofence_radius         INTEGER NOT NULL DEFAULT 100,
  enable_face_id          BOOLEAN NOT NULL DEFAULT true,
  enable_touch_id         BOOLEAN NOT NULL DEFAULT true,
  enable_gps              BOOLEAN NOT NULL DEFAULT true,
  duplicate_window_minutes INTEGER NOT NULL DEFAULT 60,
  auto_checkout           BOOLEAN NOT NULL DEFAULT false,
  auto_checkout_minutes   INTEGER NOT NULL DEFAULT 120,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert default settings row
INSERT INTO gym_settings (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

-- Auto-update updated_at on row change
CREATE OR REPLACE FUNCTION update_gym_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_gym_settings_updated_at ON gym_settings;
CREATE TRIGGER trg_gym_settings_updated_at
  BEFORE UPDATE ON gym_settings
  FOR EACH ROW EXECUTE FUNCTION update_gym_settings_updated_at();

-- 5. Row-Level Security (optional — enable if using Supabase directly) ────────
ALTER TABLE webauthn_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE webauthn_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE biometric_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE gym_settings ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read/insert their own credentials
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'webauthn_credentials' AND policyname = 'webauthn_credentials_member_policy') THEN
    CREATE POLICY webauthn_credentials_member_policy ON webauthn_credentials
      USING (member_id = current_setting('app.member_id', true) OR current_setting('app.role', true) = 'admin')
      WITH CHECK (member_id = current_setting('app.member_id', true) OR current_setting('app.role', true) = 'admin');
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'biometric_attendance' AND policyname = 'biometric_attendance_member_policy') THEN
    CREATE POLICY biometric_attendance_member_policy ON biometric_attendance
      USING (member_id = current_setting('app.member_id', true) OR current_setting('app.role', true) = 'admin')
      WITH CHECK (member_id = current_setting('app.member_id', true) OR current_setting('app.role', true) = 'admin');
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'webauthn_challenges' AND policyname = 'webauthn_challenges_member_policy') THEN
    CREATE POLICY webauthn_challenges_member_policy ON webauthn_challenges
      USING (member_id = current_setting('app.member_id', true) OR current_setting('app.role', true) = 'admin')
      WITH CHECK (member_id = current_setting('app.member_id', true) OR current_setting('app.role', true) = 'admin');
  END IF;
END;
$$;

-- Admin-only for gym_settings
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'gym_settings' AND policyname = 'gym_settings_admin_policy') THEN
    CREATE POLICY gym_settings_admin_policy ON gym_settings
      USING (current_setting('app.role', true) = 'admin')
      WITH CHECK (current_setting('app.role', true) = 'admin');
  END IF;
END;
$$;
