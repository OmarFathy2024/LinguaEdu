CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  role VARCHAR(24) NOT NULL,
  username VARCHAR(80) NULL,
  email VARCHAR(190) NULL,
  password_hash TEXT NOT NULL,
  full_name VARCHAR(160) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  created_at DATETIME NOT NULL,
  UNIQUE KEY users_username_unique (username),
  UNIQUE KEY users_email_unique (email),
  KEY users_role_idx (role)
);

CREATE TABLE IF NOT EXISTS student_profiles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  first_name VARCHAR(80) NOT NULL,
  last_name VARCHAR(80) NOT NULL,
  whatsapp VARCHAR(50) NOT NULL,
  created_at DATETIME NOT NULL,
  UNIQUE KEY student_profiles_user_unique (user_id)
);

CREATE TABLE IF NOT EXISTS courses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  subject VARCHAR(24) NOT NULL,
  title VARCHAR(190) NOT NULL,
  grade VARCHAR(120) NOT NULL,
  created_by INT NOT NULL,
  created_at DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS modules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  course_id INT NOT NULL,
  unit_number INT NOT NULL,
  title VARCHAR(190) NOT NULL,
  created_at DATETIME NOT NULL,
  UNIQUE KEY modules_course_unit_unique (course_id, unit_number)
);

CREATE TABLE IF NOT EXISTS lessons (
  id INT AUTO_INCREMENT PRIMARY KEY,
  course_id INT NOT NULL,
  module_id INT NULL,
  unit_number INT NOT NULL,
  title VARCHAR(190) NOT NULL,
  video_url TEXT NULL,
  pdf_url TEXT NULL,
  cover_url TEXT NULL,
  created_by INT NOT NULL,
  created_at DATETIME NOT NULL,
  KEY lessons_course_idx (course_id)
);

CREATE TABLE IF NOT EXISTS question_banks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  lesson_id INT NOT NULL,
  raw_text TEXT NOT NULL,
  questions JSON NOT NULL,
  created_at DATETIME NOT NULL,
  UNIQUE KEY question_banks_lesson_unique (lesson_id)
);

CREATE TABLE IF NOT EXISTS access_codes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(64) NOT NULL,
  course_id INT NOT NULL,
  created_by INT NOT NULL,
  redeemed_by INT NULL,
  redeemed_at DATETIME NULL,
  created_at DATETIME NOT NULL,
  UNIQUE KEY access_codes_code_unique (code)
);

CREATE TABLE IF NOT EXISTS enrollments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  course_id INT NOT NULL,
  created_at DATETIME NOT NULL,
  UNIQUE KEY enrollments_user_course_unique (user_id, course_id)
);

CREATE TABLE IF NOT EXISTS sessions (
  id VARCHAR(128) PRIMARY KEY,
  user_id INT NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS lesson_progress (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  lesson_id INT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at DATETIME NULL,
  UNIQUE KEY lesson_progress_user_lesson_unique (user_id, lesson_id)
);

CREATE TABLE IF NOT EXISTS quiz_attempts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  lesson_id INT NOT NULL,
  score INT NOT NULL,
  total INT NOT NULL,
  passed BOOLEAN NOT NULL,
  quiz_data JSON NOT NULL,
  created_at DATETIME NOT NULL,
  KEY quiz_attempts_user_lesson_idx (user_id, lesson_id)
);
