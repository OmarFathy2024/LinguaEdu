CREATE TABLE IF NOT EXISTS lesson_views (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  lesson_id INT NOT NULL,
  viewed_at DATETIME NOT NULL,
  KEY lesson_views_lesson_viewed_idx (lesson_id, viewed_at),
  KEY lesson_views_user_viewed_idx (user_id, viewed_at)
);
