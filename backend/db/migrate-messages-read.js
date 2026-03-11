import "dotenv/config";
import { query } from "./connection.js";

async function migrate() {
  console.log("Running migrate-messages-read...");
  const rows = await query(
    "SHOW COLUMNS FROM course_messages LIKE 'read_at'"
  );
  if (rows.length === 0) {
    await query(`
      ALTER TABLE course_messages
      ADD COLUMN read_at DATETIME DEFAULT NULL COMMENT '接收方已读时间'
      AFTER created_at
    `);
    console.log("Added read_at to course_messages.");
  } else {
    console.log("read_at already exists, skip.");
  }
  console.log("migrate-messages-read finished.");
}

migrate()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
