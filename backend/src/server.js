import path from "path";
import { fileURLToPath } from "url";
import http from "http";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import { WebSocketServer } from "ws";
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
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "volleyball-club-secret-change-in-production";

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

// ---------------- WebSocket：课程师生聊天实时推送 ----------------
/**
 * 客户端需在连接后发送 JSON：
 * { "type": "auth", "token": "Bearer xxx" }
 * 认证通过后再发送：
 * { "type": "join", "courseId": 1, "teacherId": 2, "studentId": 3 }
 * 服务器只负责“新消息推送”，实际写库仍通过 REST 接口完成。
 */
const wss = new WebSocketServer({ server, path: "/ws/course-chat" });

/** key: `${courseId}:${teacherId}:${studentId}` -> Set<ws> */
const roomMap = new Map();

function roomKey(courseId, teacherId, studentId) {
  return `${courseId}:${teacherId}:${studentId}`;
}

function addClientToRoom(key, ws) {
  let set = roomMap.get(key);
  if (!set) {
    set = new Set();
    roomMap.set(key, set);
  }
  set.add(ws);
}

function removeClientFromRooms(ws) {
  for (const [key, set] of roomMap.entries()) {
    if (set.has(ws)) {
      set.delete(ws);
      if (!set.size) roomMap.delete(key);
    }
  }
}

function broadcastToRoom(key, payload, except) {
  const set = roomMap.get(key);
  if (!set) return;
  const msg = JSON.stringify(payload);
  for (const client of set) {
    if (client === except) continue;
    if (client.readyState === client.OPEN) {
      client.send(msg);
    }
  }
}

wss.on("connection", (ws) => {
  ws._auth = null;
  ws._roomKey = null;

  ws.on("message", (data) => {
    let msg;
    try {
      msg = JSON.parse(data.toString());
    } catch {
      return;
    }

    if (msg.type === "auth") {
      const raw = String(msg.token || "");
      const token = raw.startsWith("Bearer ") ? raw.slice(7) : raw;
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const { userId, username, role } = decoded;
        if (!role || !["student", "teacher"].includes(role)) {
          ws.close();
          return;
        }
        ws._auth = { userId, username, role };
        ws.send(JSON.stringify({ type: "auth-ok", role }));
      } catch {
        ws.close();
      }
      return;
    }

    if (!ws._auth) {
      // 未认证的消息忽略
      return;
    }

    if (msg.type === "join") {
      const courseId = Number(msg.courseId);
      // 由服务端根据当前登录身份补全 teacherId / studentId，确保两端 key 一致
      let teacherId = ws._auth.role === "teacher" ? ws._auth.userId : Number(msg.teacherId);
      let studentId = ws._auth.role === "student" ? ws._auth.userId : Number(msg.studentId);
      if (!courseId || !teacherId || !studentId) return;
      if (ws._roomKey) {
        removeClientFromRooms(ws);
        ws._roomKey = null;
      }
      const key = roomKey(courseId, teacherId, studentId);
      ws._roomKey = key;
      addClientToRoom(key, ws);
      ws.send(JSON.stringify({ type: "joined", courseId, teacherId, studentId }));
      return;
    }

    // 发送新消息：{ type: "new-message", courseId, teacherId, studentId, content }
    if (msg.type === "new-message") {
      const courseId = Number(msg.courseId);
      let teacherId = ws._auth.role === "teacher" ? ws._auth.userId : Number(msg.teacherId);
      let studentId = ws._auth.role === "student" ? ws._auth.userId : Number(msg.studentId);
      const content = String(msg.content || "").trim();
      if (!courseId || !teacherId || !studentId || !content) return;
      const key = roomKey(courseId, teacherId, studentId);
      const sender = ws._auth.role;
      const payload = {
        type: "new-message",
        courseId,
        teacherId,
        studentId,
        sender,
        content,
        // 仅用于前端展示的本地时间戳，真实时间以数据库为准
        created_at: new Date().toISOString(),
      };
      broadcastToRoom(key, payload, null);
      return;
    }
  });

  ws.on("close", () => {
    removeClientFromRooms(ws);
  });
});

// 启动前检查数据库连接
query("SELECT 1")
  .then(() => {
    server.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
      console.log(`WebSocket listening at ws://localhost:${PORT}/ws/course-chat`);
    });
  })
  .catch((e) => {
    console.error("Database connection failed:", e.message);
    process.exit(1);
  });
