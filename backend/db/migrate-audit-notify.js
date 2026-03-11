/**
 * 审核历史与通知表迁移
 * 在 backend 目录执行: node db/migrate-audit-notify.js
 */
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const run = async () => {
  const { query } = await import("./connection.js");

  // 为报名表增加驳回原因字段
  await query(
    "ALTER TABLE course_enrollments ADD COLUMN enroll_reject_reason VARCHAR(500) DEFAULT NULL COMMENT '报名驳回原因'"
  ).catch(() => {});

  // 为退课申请表增加驳回原因字段
  await query(
    "ALTER TABLE course_withdraw_requests ADD COLUMN reject_reason VARCHAR(500) DEFAULT NULL COMMENT '退课驳回原因'"
  ).catch(() => {});

  // 审核历史表
  await query(`
CREATE TABLE IF NOT EXISTS audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  type ENUM('enroll','withdraw') NOT NULL COMMENT '审核类型',
  course_id INT NOT NULL,
  student_id INT NOT NULL,
  teacher_id INT NOT NULL,
  result ENUM('approved','reject') NOT NULL COMMENT '结果',
  reason VARCHAR(500) DEFAULT NULL COMMENT '学生提交的理由',
  reject_reason VARCHAR(500) DEFAULT NULL COMMENT '教师驳回原因',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_type_course (type, course_id),
  INDEX idx_audit_student (student_id),
  INDEX idx_audit_teacher (teacher_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='审核历史表';
`);

  // 通知表
  await query(`
CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_type ENUM('student','teacher') NOT NULL COMMENT '用户类型',
  user_id INT NOT NULL COMMENT '用户id',
  title VARCHAR(100) NOT NULL COMMENT '标题',
  content VARCHAR(500) NOT NULL COMMENT '内容',
  is_read TINYINT NOT NULL DEFAULT 0 COMMENT '是否已读',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_notify_user (user_type, user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='通知表';
`);

  console.log("Migration done: audit_logs + notifications + reject_reason fields ready.");
};

run().catch((e) => {
  console.error("Migration failed:", e.message);
  process.exit(1);
});

