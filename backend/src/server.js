import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { authRouter } from "./routes/auth.js";
import { categoriesRouter } from "./routes/categories.js";
import { coursesRouter } from "./routes/courses.js";
import { commentsRouter } from "./routes/comments.js";
import { enrollmentsRouter } from "./routes/enrollments.js";
import { notificationsRouter } from "./routes/notifications.js";
import { rioRouter } from "./routes/rio.js";
import { classicMatchesRouter } from "./routes/classic-matches.js";
import { query } from "../db/connection.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.use("/api", coursesRouter);
app.use("/api", categoriesRouter);
app.use("/api", commentsRouter);
app.use("/api", enrollmentsRouter);
app.use("/api", notificationsRouter);
app.use("/api", rioRouter);
app.use("/api", classicMatchesRouter);
app.use("/api", authRouter);

app.get("/api/health", (_, res) => {
  res.json({ ok: true, message: "volleyball-club-api" });
});

app.use("/api", (req, res) => {
  res.status(404).json({ code: 404, message: "接口不存在: " + req.method + " " + req.path });
});

// 启动前检查数据库连接
query("SELECT 1")
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });
  })
  .catch((e) => {
    console.error("Database connection failed:", e.message);
    process.exit(1);
  });
