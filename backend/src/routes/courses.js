import { Router } from "express";
import { query } from "../../db/connection.js";
import { optionalAuth, requireTeacher } from "../middleware/auth.js";

/** 转为 MySQL DATE 格式 YYYY-MM-DD，支持 ISO 日期时间字符串 */
function toDateOnly(val) {
  if (val == null || val === "") return null;
  const s = String(val).trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const match = s.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
}

/** 推荐指数：未设置或为 0 时存 null，否则存有效数字 */
function toRecommendIndex(val) {
  if (val == null || val === "") return null;
  const n = Number(val);
  if (!Number.isFinite(n) || n === 0) return null;
  return n;
}

export const coursesRouter = Router();

// 课程列表：学生看可见课程，教师可传 ?my=1 只看自己的
coursesRouter.get("/courses", optionalAuth, async (req, res) => {
  try {
    const { category_id, my } = req.query;
    const auth = req.auth;
    const isTeacher = auth && auth.role === "teacher";
    const onlyMy = isTeacher && my === "1";

    let sql = `
      SELECT c.id, c.name, c.credits, c.capacity, c.current_enrollment, c.location,
             c.schedule_weekly, c.enroll_start_date, c.enroll_end_date, c.start_date, c.end_date,
             c.description, c.tags, c.requirements, c.syllabus, c.difficulty, c.lesson_count,
             c.recommend_index, c.is_visible, c.teacher_id, c.category_id, c.created_at, c.updated_at,
             cat.name AS category_name,
             t.real_name AS teacher_name
      FROM courses c
      LEFT JOIN course_categories cat ON c.category_id = cat.id
      LEFT JOIN teachers t ON c.teacher_id = t.id
      WHERE 1=1
    `;
    const params = [];

    if (onlyMy) {
      sql += " AND c.teacher_id = ?";
      params.push(auth.userId);
    } else if (!isTeacher) {
      sql += " AND c.is_visible = 1";
    }

    if (category_id) {
      sql += " AND c.category_id = ?";
      params.push(category_id);
    }

    sql += " ORDER BY c.id DESC";
    const rows = await query(sql, params);
    res.json({ code: 0, data: rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ code: 500, message: "获取课程列表失败" });
  }
});

// 新增课程（仅教师）
coursesRouter.post("/courses", optionalAuth, requireTeacher, async (req, res) => {
  try {
    const body = req.body || {};
    const {
      name,
      credits,
      capacity,
      location,
      schedule_weekly,
      enroll_start_date,
      enroll_end_date,
      start_date,
      end_date,
      description,
      tags,
      requirements,
      syllabus,
      difficulty,
      lesson_count,
      recommend_index,
      is_visible,
      category_id,
    } = body;

    if (!name || !name.trim()) {
      return res.status(400).json({ code: 400, message: "课程名字不能为空" });
    }
    if (!category_id) {
      return res.status(400).json({ code: 400, message: "请选择课程分类" });
    }

    const teacherId = req.auth.userId;
    const result = await query(
      `INSERT INTO courses (
        name, credits, capacity, current_enrollment, location, schedule_weekly,
        enroll_start_date, enroll_end_date, start_date, end_date, description, tags,
        requirements, syllabus, difficulty, lesson_count, recommend_index, is_visible,
        teacher_id, category_id
      ) VALUES (?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name.trim(),
        Number(credits) || 0,
        Number(capacity) || 0,
        location ? String(location).trim() : null,
        schedule_weekly ? String(schedule_weekly).trim() : null,
        toDateOnly(enroll_start_date),
        toDateOnly(enroll_end_date),
        toDateOnly(start_date),
        toDateOnly(end_date),
        description ? String(description).trim() : null,
        tags ? String(tags).trim() : null,
        requirements ? String(requirements).trim() : null,
        syllabus ? String(syllabus).trim() : null,
        difficulty !== undefined && difficulty !== null && difficulty !== "" ? Number(difficulty) : 1,
        Number(lesson_count) || 0,
        toRecommendIndex(recommend_index),
        is_visible === 0 || is_visible === "0" ? 0 : 1,
        teacherId,
        Number(category_id),
      ]
    );

    const rows = await query(
      `SELECT c.id, c.name, c.credits, c.capacity, c.current_enrollment, c.location, c.schedule_weekly,
              c.enroll_start_date, c.enroll_end_date, c.start_date, c.end_date, c.description, c.tags,
              c.requirements, c.syllabus, c.difficulty, c.lesson_count, c.recommend_index, c.is_visible,
              c.teacher_id, c.category_id, c.created_at, c.updated_at,
              cat.name AS category_name, t.real_name AS teacher_name
       FROM courses c
       LEFT JOIN course_categories cat ON c.category_id = cat.id
       LEFT JOIN teachers t ON c.teacher_id = t.id
       WHERE c.id = ?`,
      [result.insertId]
    );
    res.status(201).json({ code: 0, data: rows[0] });
  } catch (e) {
    console.error(e);
    res.status(500).json({ code: 500, message: "新增课程失败" });
  }
});

// 更新课程（仅教师且本人）
coursesRouter.put("/courses/:id", optionalAuth, requireTeacher, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id || id < 1) {
      return res.status(400).json({ code: 400, message: "无效的课程id" });
    }

    const [existing] = await query("SELECT id, teacher_id FROM courses WHERE id = ?", [id]);
    if (!existing) {
      return res.status(404).json({ code: 404, message: "课程不存在" });
    }
    if (existing.teacher_id !== req.auth.userId) {
      return res.status(403).json({ code: 403, message: "只能修改自己发布的课程" });
    }

    const body = req.body || {};
    const {
      name,
      credits,
      capacity,
      location,
      schedule_weekly,
      enroll_start_date,
      enroll_end_date,
      start_date,
      end_date,
      description,
      tags,
      requirements,
      syllabus,
      difficulty,
      lesson_count,
      recommend_index,
      is_visible,
      category_id,
    } = body;

    if (!name || !name.trim()) {
      return res.status(400).json({ code: 400, message: "课程名字不能为空" });
    }
    if (!category_id) {
      return res.status(400).json({ code: 400, message: "请选择课程分类" });
    }

    const numCredits = Number(credits);
    const numCapacity = Number(capacity);
    const numDifficulty = Number(difficulty);
    const numLessonCount = Number(lesson_count);
    const numCategoryId = Number(category_id);

    await query(
      `UPDATE courses SET
        name = ?, credits = ?, capacity = ?, location = ?, schedule_weekly = ?,
        enroll_start_date = ?, enroll_end_date = ?, start_date = ?, end_date = ?,
        description = ?, tags = ?, requirements = ?, syllabus = ?, difficulty = ?,
        lesson_count = ?, recommend_index = ?, is_visible = ?, category_id = ?
       WHERE id = ?`,
      [
        name.trim(),
        Number.isFinite(numCredits) ? numCredits : 0,
        Number.isFinite(numCapacity) ? numCapacity : 0,
        location != null && location !== "" ? String(location).trim() : null,
        schedule_weekly != null && schedule_weekly !== "" ? String(schedule_weekly).trim() : null,
        toDateOnly(enroll_start_date),
        toDateOnly(enroll_end_date),
        toDateOnly(start_date),
        toDateOnly(end_date),
        description != null && description !== "" ? String(description).trim() : null,
        tags != null && tags !== "" ? String(tags).trim() : null,
        requirements != null && requirements !== "" ? String(requirements).trim() : null,
        syllabus != null && syllabus !== "" ? String(syllabus).trim() : null,
        Number.isFinite(numDifficulty) && numDifficulty >= 1 && numDifficulty <= 3 ? numDifficulty : 1,
        Number.isFinite(numLessonCount) && numLessonCount >= 0 ? numLessonCount : 0,
        toRecommendIndex(recommend_index),
        is_visible === 0 || is_visible === "0" ? 0 : 1,
        Number.isFinite(numCategoryId) ? numCategoryId : category_id,
        id,
      ]
    );

    const rows = await query(
      `SELECT c.id, c.name, c.credits, c.capacity, c.current_enrollment, c.location, c.schedule_weekly,
              c.enroll_start_date, c.enroll_end_date, c.start_date, c.end_date, c.description, c.tags,
              c.requirements, c.syllabus, c.difficulty, c.lesson_count, c.recommend_index, c.is_visible,
              c.teacher_id, c.category_id, c.created_at, c.updated_at,
              cat.name AS category_name, t.real_name AS teacher_name
       FROM courses c
       LEFT JOIN course_categories cat ON c.category_id = cat.id
       LEFT JOIN teachers t ON c.teacher_id = t.id
       WHERE c.id = ?`,
      [id]
    );
    res.json({ code: 0, data: rows[0] });
  } catch (e) {
    console.error("更新课程失败:", e);
    res.status(500).json({ code: 500, message: "更新课程失败", detail: process.env.NODE_ENV !== "production" ? e.message : undefined });
  }
});

// 删除课程（仅教师且本人）
coursesRouter.delete("/courses/:id", optionalAuth, requireTeacher, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id || id < 1) {
      return res.status(400).json({ code: 400, message: "无效的课程id" });
    }

    const [existing] = await query("SELECT id, teacher_id FROM courses WHERE id = ?", [id]);
    if (!existing) {
      return res.status(404).json({ code: 404, message: "课程不存在" });
    }
    if (existing.teacher_id !== req.auth.userId) {
      return res.status(403).json({ code: 403, message: "只能删除自己发布的课程" });
    }

    await query("DELETE FROM courses WHERE id = ?", [id]);
    res.json({ code: 0, message: "删除成功" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ code: 500, message: "删除课程失败" });
  }
});
