ALTER TABLE access_codes ADD COLUMN target_subject VARCHAR(24) NULL;
ALTER TABLE access_codes ADD COLUMN target_grade VARCHAR(120) NULL;
ALTER TABLE access_codes ADD COLUMN unlock_scope VARCHAR(16) NULL;
ALTER TABLE access_codes ADD COLUMN target_course_ids JSON NULL;
ALTER TABLE access_codes ADD COLUMN target_module_ids JSON NULL;
ALTER TABLE access_codes ADD COLUMN expires_at DATETIME NULL;

CREATE TABLE IF NOT EXISTS entitlements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  course_id INT NOT NULL,
  module_id INT NULL,
  access_code_id INT NOT NULL,
  created_at DATETIME NOT NULL,
  KEY entitlements_user_course_module_idx (user_id, course_id, module_id)
);
