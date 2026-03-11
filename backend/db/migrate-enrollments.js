/**
 * 单独创建课程报名表（若已执行过 db:init 可运行此脚本）
 * 在 backend 目录执行: node db/migrate-enrollments.js
 */
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const run = async () => {
  const { query } = await import("./connection.js");
  const sql = `
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
`;
  await query(sql);
  console.log("Migration done: course_enrollments table ready.");
};

run().catch((e) => {
  console.error("Migration failed:", e.message);
  process.exit(1);
});

