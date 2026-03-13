import dotenv from "dotenv";
import mysql from "mysql2/promise";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// 从 backend 目录加载 .env（与执行 node db/init.js 时的 cwd 无关）
dotenv.config({ path: path.join(__dirname, "..", ".env") });

async function init() {
  const config = {
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "3112686",
    multipleStatements: true,
  };
  let conn;
  try {
    conn = await mysql.createConnection(config);
  } catch (e) {
    if (e.code === "ER_ACCESS_DENIED_ERROR" && config.host === "127.0.0.1") {
      console.log("127.0.0.1 连接被拒，尝试 localhost...");
      conn = await mysql.createConnection({ ...config, host: "localhost" });
    } else {
      throw e;
    }
  }
  const schemaPath = path.join(__dirname, "schema.sql");
  const sql = await fs.readFile(schemaPath, "utf-8");
  await conn.query(sql);
  await conn.end();
  console.log("Database initialized.");
}

init().catch((e) => {
  console.error(e);
  process.exit(1);
});
