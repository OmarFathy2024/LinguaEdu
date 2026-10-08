ALTER TABLE users ADD COLUMN IF NOT EXISTS language VARCHAR(5) NOT NULL DEFAULT 'en';
UPDATE users SET language = 'en' WHERE language IS NULL OR language = '';
CREATE INDEX IF NOT EXISTS users_language_idx ON users (language);
