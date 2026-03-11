import "dotenv/config";
import { query } from "./connection.js";

async function migrate() {
  console.log("Running migrate-course-roster...");

  // 考勤表
  await query(`
    CREATE TABLE IF NOT EXISTS course_attendance (
      id INT AUTO_INCREMENT PRIMARY KEY,
      course_id INT NOT NULL COMMENT '课程id',
      student_id INT NOT NULL COMMENT '学生id',
      attend_date DATE NOT NULL COMMENT '上课日期',
      status ENUM('present','absent','late') NOT NULL COMMENT '出勤状态',
      note VARCHAR(255) DEFAULT NULL COMMENT '备注',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uk_course_student_date (course_id, student_id, attend_date),
      INDEX idx_course_date (course_id, attend_date),
      INDEX idx_attend_student (student_id),
      FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='课程考勤表';
  `);

  // 成绩表
  await query(`
    CREATE TABLE IF NOT EXISTS course_grades (
      id INT AUTO_INCREMENT PRIMARY KEY,
      course_id INT NOT NULL COMMENT '课程id',
      student_id INT NOT NULL COMMENT '学生id',
      score DECIMAL(5,2) DEFAULT NULL COMMENT '成绩分数',
      grade_level VARCHAR(20) DEFAULT NULL COMMENT '等级(优/良/及格等)',
      comment VARCHAR(255) DEFAULT NULL COMMENT '评语',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uk_course_student_grade (course_id, student_id),
      INDEX idx_grade_course (course_id),
      INDEX idx_grade_student (student_id),
      FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='课程成绩表';
  `);

  // 课程内师生私聊消息表
  await query(`
    CREATE TABLE IF NOT EXISTS course_messages (
      id INT AUTO_INCREMENT PRIMARY KEY,
      course_id INT NOT NULL COMMENT '课程id',
      teacher_id INT NOT NULL COMMENT '老师id',
      student_id INT NOT NULL COMMENT '学生id',
      sender ENUM('teacher','student') NOT NULL COMMENT '发送方',
      content TEXT NOT NULL COMMENT '消息内容',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_thread (course_id, teacher_id, student_id, created_at),
      INDEX idx_student_inbox (student_id, course_id, created_at),
      FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
      FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE,
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='课程师生私聊消息表';
  `);

  console.log("migrate-course-roster finished.");
}

migrate()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

