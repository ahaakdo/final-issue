import { Router } from "express";
import { query } from "../../db/connection.js";
import { optionalAuth, requireStudent } from "../middleware/auth.js";

export const notificationsRouter = Router();

// 学生查看通知列表（可选 unread=1 只看未读）
notificationsRouter.get("/student/notifications", optionalAuth, requireStudent, async (req, res) => {
  try {
    const studentId = req.auth.userId;
    const onlyUnread = (req.query.unread ?? "0") === "1";
    let sql =
      "SELECT id, title, content, is_read, created_at FROM notifications WHERE user_type = 'student' AND user_id = ? ";
    const params = [studentId];
    if (onlyUnread) {
      sql += "AND is_read = 0 ";
    }
    sql += "ORDER BY created_at DESC LIMIT 200";
    const rows = await query(sql, params);
    res.json({ code: 0, data: rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ code: 500, message: "获取通知失败" });
  }
});

notificationsRouter.post("/student/notifications/:id/read", optionalAuth, requireStudent, async (req, res) => {
  try {
    const studentId = req.auth.userId;
    const id = Number(req.params.id);
    await query(
      "UPDATE notifications SET is_read = 1 WHERE id = ? AND user_type = 'student' AND user_id = ?",
      [id, studentId]
    );
    res.json({ code: 0, message: "已标记为已读" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ code: 500, message: "更新通知失败" });
  }
});

