-- 课程报名表迁移（若已执行过 init 可单独执行本文件）
USE volleyball_club;

CREATE TABLE IF NOT EXISTS course_enrollments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  course_id INT NOT NULL COMMENT '课程id',
  student_id INT NOT NULL COMMENT '学生id',
  status ENUM('enrolled','cancelled') NOT NULL DEFAULT 'enrolled' COMMENT '报名状态',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '报名时间',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '修改时间',
  UNIQUE KEY uk_course_student_enroll (course_id, student_id),
  INDEX idx_enroll_course (course_id),
  INDEX idx_enroll_student (student_id),
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='课程报名表';

