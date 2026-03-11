/**
 * 为报名表增加退课字段，并创建退课申请表
 * 在 backend 目录执行: node db/migrate-withdraw.js
 */
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const run = async () => {
  const { query } = await import("./connection.js");

  // 兼容已存在的 course_enrollments：尝试新增列（若已存在会报错，忽略即可）
  try {
    await query("ALTER TABLE course_enrollments ADD COLUMN withdraw_pending TINYINT NOT NULL DEFAULT 0 COMMENT '是否审核中(退课申请)'");
  } catch {}
  try {
    await query("ALTER TABLE course_enrollments ADD COLUMN withdraw_status ENUM('approved','reject') DEFAULT NULL COMMENT '退课状态'");
  } catch {}

  await query(`
CREATE TABLE IF NOT EXISTS course_withdraw_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  course_id INT NOT NULL COMMENT '课程id',
  student_id INT NOT NULL COMMENT '学生id',
  reason VARCHAR(500) NOT NULL COMMENT '退课原因',
  status ENUM('approved','reject') NOT NULL DEFAULT 'reject' COMMENT '退课状态',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '申请时间',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '修改时间',
  INDEX idx_withdraw_course (course_id),
  INDEX idx_withdraw_student (student_id),
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='课程退课申请表';
`);

  console.log("Migration done: withdraw fields + course_withdraw_requests ready.");
};

run().catch((e) => {
  console.error("Migration failed:", e.message);
  process.exit(1);
});

