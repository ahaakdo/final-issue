-- 课程评论与评分表迁移（若已执行过 init 可单独执行本文件）
USE volleyball_club;

CREATE TABLE IF NOT EXISTS course_comments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  course_id INT NOT NULL COMMENT '课程id',
  author_type ENUM('student','teacher') NOT NULL COMMENT '作者类型',
  author_id INT NOT NULL COMMENT '作者id(学生id或教师id)',
  parent_id INT DEFAULT NULL COMMENT '父评论id，NULL表示一级评论',
  content TEXT NOT NULL COMMENT '评论内容',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_course (course_id),
  INDEX idx_parent (parent_id),
  INDEX idx_created (created_at),
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='课程评论表';

CREATE TABLE IF NOT EXISTS course_ratings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  course_id INT NOT NULL COMMENT '课程id',
  student_id INT NOT NULL COMMENT '学生id',
  rating TINYINT NOT NULL COMMENT '评分1-5',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_course_student (course_id, student_id),
  INDEX idx_course (course_id),
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='课程评分表';
