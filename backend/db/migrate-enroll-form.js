import { query } from "./connection.js";

async function migrate() {
  await query(
    "ALTER TABLE course_enrollments ADD COLUMN enroll_form TEXT DEFAULT NULL COMMENT '报名申请表(JSON字符串)'"
  ).catch(() => {});
  console.log("migrate-enroll-form done");
}

migrate().catch((e) => {
  console.error(e);
  process.exit(1);
});

