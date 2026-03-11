import express from "express";
import { query } from "../../db/connection.js";
import { optionalAuth, requireTeacher } from "../middleware/auth.js";

export const classicMatchesRouter = express.Router();

// 获取经典女排赛事列表（公开）
classicMatchesRouter.get("/classic-matches", async (_req, res) => {
  try {
    const matches = await query(
      `SELECT id, title, event_name, match_date, opponent, round, video_url, description
       FROM classic_volleyball_matches
       ORDER BY match_date DESC, id DESC`
    );
    res.json({ code: 0, data: matches });
  } catch (err) {
    console.error("GET /classic-matches error:", err);
    res.status(500).json({ code: 500, message: "获取经典赛事列表失败" });
  }
});

// 新增经典赛事（教师）
classicMatchesRouter.post("/classic-matches", optionalAuth, requireTeacher, async (req, res) => {
  const { title, event_name, match_date, opponent, round, video_url, description } = req.body || {};
  if (!title || !event_name) {
    return res.status(400).json({ code: 400, message: "比赛标题和赛事名称为必填项" });
  }
  try {
    const result = await query(
      `INSERT INTO classic_volleyball_matches
       (title, event_name, match_date, opponent, round, video_url, description)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        title,
        event_name,
        match_date || null,
        opponent || null,
        round || null,
        video_url || null,
        description || null,
      ]
    );
    res.json({ code: 0, data: { id: result.insertId } });
  } catch (err) {
    console.error("POST /classic-matches error:", err);
    res.status(500).json({ code: 500, message: "新增经典赛事失败" });
  }
});

