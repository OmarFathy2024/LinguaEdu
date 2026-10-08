CREATE TABLE IF NOT EXISTS tenants (
  id INT AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(32) NOT NULL,
  name VARCHAR(80) NOT NULL,
  created_at DATETIME NOT NULL,
  UNIQUE KEY tenants_slug_unique (slug)
);

INSERT IGNORE INTO tenants (slug, name, created_at) VALUES
  ('spanish', 'Spanish', NOW()),
  ('english', 'English', NOW()),
  ('arabic', 'Arabic', NOW());

ALTER TABLE users ADD COLUMN tenant_id INT NULL;
ALTER TABLE courses ADD COLUMN tenant_id INT NULL;
ALTER TABLE access_codes ADD COLUMN tenant_id INT NULL;

UPDATE users u JOIN tenants t ON t.slug = 'spanish' SET u.tenant_id = t.id WHERE u.role = 'teacher' AND u.tenant_id IS NULL;
UPDATE courses c JOIN users u ON u.id = c.created_by SET c.tenant_id = u.tenant_id WHERE c.tenant_id IS NULL;
UPDATE access_codes a JOIN users u ON u.id = a.created_by SET a.tenant_id = u.tenant_id WHERE a.tenant_id IS NULL;

CREATE INDEX users_tenant_idx ON users (tenant_id);
CREATE INDEX courses_tenant_idx ON courses (tenant_id);
CREATE INDEX access_codes_tenant_idx ON access_codes (tenant_id);

CREATE TABLE IF NOT EXISTS admin_sessions (
  id VARCHAR(128) PRIMARY KEY,
  expires_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL
);
