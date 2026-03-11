import express from "express";
import { query } from "../../db/connection.js";
import { optionalAuth, requireTeacher } from "../middleware/auth.js";

export const rioRouter = express.Router();

// 获取里约奥运会女排阵容列表（公开给前台展示）
rioRouter.get("/rio-players", async (_req, res) => {
  try {
    const players = await query(
      `SELECT id, name, position, number, birthday, height_cm, club, intro,
              avatar_url, gallery1_url, gallery2_url, gallery3_url, honors
       FROM rio_women_volleyball_players
       ORDER BY number ASC`
    );
    res.json({ code: 0, data: players });
  } catch (err) {
    console.error("GET /rio-players error:", err);
    res.status(500).json({ code: 500, message: "获取女排队员列表失败" });
  }
});

// 新增/编辑接口仅教师可用
rioRouter.post("/rio-players", optionalAuth, requireTeacher, async (req, res) => {
  const {
    name,
    position,
    number,
    birthday,
    height_cm,
    club,
    intro,
    avatar_url,
    gallery1_url,
    gallery2_url,
    gallery3_url,
    honors,
  } = req.body || {};
  if (!name || !position || !number) {
    return res.status(400).json({ code: 400, message: "姓名、位置、球衣号码为必填项" });
  }
  try {
    const result = await query(
      `INSERT INTO rio_women_volleyball_players
       (name, position, number, birthday, height_cm, club, intro,
        avatar_url, gallery1_url, gallery2_url, gallery3_url, honors)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        position,
        number,
        birthday || null,
        height_cm || null,
        club || null,
        intro || null,
        avatar_url || null,
        gallery1_url || null,
        gallery2_url || null,
        gallery3_url || null,
        honors || null,
      ]
    );
    res.json({ code: 0, data: { id: result.insertId } });
  } catch (err) {
    console.error("POST /rio-players error:", err);
    res.status(500).json({ code: 500, message: "新增队员失败" });
  }
});

rioRouter.put("/rio-players/:id", optionalAuth, requireTeacher, async (req, res) => {
  const { id } = req.params;
  const {
    name,
    position,
    number,
    birthday,
    height_cm,
    club,
    intro,
    avatar_url,
    gallery1_url,
    gallery2_url,
    gallery3_url,
    honors,
  } = req.body || {};
  if (!name || !position || !number) {
    return res.status(400).json({ code: 400, message: "姓名、位置、球衣号码为必填项" });
  }
  try {
    await query(
      `UPDATE rio_women_volleyball_players
       SET name = ?, position = ?, number = ?, birthday = ?, height_cm = ?, club = ?, intro = ?,
           avatar_url = ?, gallery1_url = ?, gallery2_url = ?, gallery3_url = ?, honors = ?
       WHERE id = ?`,
      [
        name,
        position,
        number,
        birthday || null,
        height_cm || null,
        club || null,
        intro || null,
        avatar_url || null,
        gallery1_url || null,
        gallery2_url || null,
        gallery3_url || null,
        honors || null,
        id,
      ]
    );
    res.json({ code: 0, message: "更新成功" });
  } catch (err) {
    console.error("PUT /rio-players/:id error:", err);
    res.status(500).json({ code: 500, message: "更新队员失败" });
  }
});

