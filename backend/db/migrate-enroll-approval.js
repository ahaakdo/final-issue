/**
 * 报名改为先审核：为 course_enrollments 增加 pending 状态与审核字段
 * 在 backend 目录执行: node db/migrate-enroll-approval.js
 */
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const run = async () => {
  const { query } = await import("./connection.js");

  // 1) 扩展 status enum，加入 pending，并设默认 pending
  // 若表已存在且已有数据，MySQL 允许直接 modify enum
  await query(
    "ALTER TABLE course_enrollments MODIFY COLUMN status ENUM('pending','enrolled','cancelled') NOT NULL DEFAULT 'pending' COMMENT '报名状态'"
  ).catch(() => {});

  // 2) 新增审核字段（若已存在则忽略）
  await query("ALTER TABLE course_enrollments ADD COLUMN enroll_pending TINYINT NOT NULL DEFAULT 1 COMMENT '报名是否审核中'").catch(() => {});
  await query("ALTER TABLE course_enrollments ADD COLUMN enroll_status ENUM('approved','reject') DEFAULT NULL COMMENT '报名审核结果'").catch(() => {});
  await query("ALTER TABLE course_enrollments ADD COLUMN enroll_reason VARCHAR(500) DEFAULT NULL COMMENT '报名理由(可选)'").catch(() => {});

  // 3) 将历史数据兼容：若旧数据 status=enrolled/cancelled，则默认为已通过/不审核
  await query("UPDATE course_enrollments SET enroll_pending = 0, enroll_status = 'approved' WHERE status = 'enrolled' AND (enroll_pending IS NULL OR enroll_pending = 1)").catch(() => {});
  await query("UPDATE course_enrollments SET enroll_pending = 0 WHERE status = 'cancelled' AND (enroll_pending IS NULL OR enroll_pending = 1)").catch(() => {});

  console.log("Migration done: enroll approval fields ready.");
};

run().catch((e) => {
  console.error("Migration failed:", e.message);
  process.exit(1);
});

