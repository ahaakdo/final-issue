import { Router } from "express";
import { query } from "../../db/connection.js";
import { optionalAuth, requireAuth, requireStudent } from "../middleware/auth.js";

export const commentsRouter = Router();

/** 获取课程评论列表（分页，树形：一级评论 + 回复） */
commentsRouter.get("/courses/:courseId/comments", optionalAuth, async (req, res) => {
  try {
    const courseId = Number(req.params.courseId);
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(50, Math.max(10, Number(req.query.pageSize) || 20));
    if (!courseId || courseId < 1) {
      return res.status(400).json({ code: 400, message: "无效的课程id" });
    }

    const [course] = await query("SELECT id FROM courses WHERE id = ?", [courseId]);
    if (!course) {
      return res.status(404).json({ code: 404, message: "课程不存在" });
    }

    const sql = `
      SELECT c.id, c.course_id, c.author_type, c.author_id, c.parent_id, c.content, c.created_at,
             CASE WHEN c.author_type = 'student' THEN s.real_name ELSE t.real_name END AS author_name
      FROM course_comments c
      LEFT JOIN students s ON c.author_type = 'student' AND c.author_id = s.id
      LEFT JOIN teachers t ON c.author_type = 'teacher' AND c.author_id = t.id
      WHERE c.course_id = ?
      ORDER BY c.parent_id ASC, c.created_at ASC
    `;
    const rows = await query(sql, [courseId]);

    const byId = new Map();
    const topLevel = [];
    for (const r of rows) {
      const item = {
        id: r.id,
        course_id: r.course_id,
        author_type: r.author_type,
        author_id: r.author_id,
        author_name: r.author_name || "未知",
        parent_id: r.parent_id,
        content: r.content,
        created_at: r.created_at,
        replies: [],
      };
      byId.set(r.id, item);
      if (r.parent_id == null) {
        topLevel.push(item);
      } else {
        const parent = byId.get(r.parent_id);
        if (parent) {
          item.parent_author_name = parent.author_name;
          parent.replies.push(item);
        }
      }
    }

    // 一级评论按时间倒序（新的在前）；每条下的回复按时间正序（对话顺序）
    topLevel.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    topLevel.forEach((root) => {
      root.replies.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    });

    const total = topLevel.length;
    const start = (page - 1) * pageSize;
    const list = topLevel.slice(start, start + pageSize);

    res.json({
      code: 0,
      data: { list, total, page, pageSize },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ code: 500, message: "获取评论失败" });
  }
});

/** 发布评论（登录用户，学生/教师均可） */
commentsRouter.post("/courses/:courseId/comments", optionalAuth, requireAuth, async (req, res) => {
  try {
    const courseId = Number(req.params.courseId);
    const { content, parent_id } = req.body || {};
    if (!courseId || courseId < 1) {
      return res.status(400).json({ code: 400, message: "无效的课程id" });
    }
    if (!content || !String(content).trim()) {
      return res.status(400).json({ code: 400, message: "评论内容不能为空" });
    }

    const [course] = await query("SELECT id FROM courses WHERE id = ?", [courseId]);
    if (!course) {
      return res.status(404).json({ code: 404, message: "课程不存在" });
    }

    const authorType = req.auth.role;
    const authorId = req.auth.userId;
    let parentId = null;
    if (parent_id != null && parent_id !== "") {
      const pid = Number(parent_id);
      const [parent] = await query("SELECT id FROM course_comments WHERE id = ? AND course_id = ?", [pid, courseId]);
      if (!parent) {
        return res.status(400).json({ code: 400, message: "父评论不存在" });
      }
      parentId = pid;
    }

    const result = await query(
      `INSERT INTO course_comments (course_id, author_type, author_id, parent_id, content) VALUES (?, ?, ?, ?, ?)`,
      [courseId, authorType, authorId, parentId, String(content).trim()]
    );

    const [row] = await query(
      `SELECT c.id, c.course_id, c.author_type, c.author_id, c.parent_id, c.content, c.created_at,
              CASE WHEN c.author_type = 'student' THEN s.real_name ELSE t.real_name END AS author_name
       FROM course_comments c
       LEFT JOIN students s ON c.author_type = 'student' AND c.author_id = s.id
       LEFT JOIN teachers t ON c.author_type = 'teacher' AND c.author_id = t.id
       WHERE c.id = ?`,
      [result.insertId]
    );
    res.status(201).json({ code: 0, data: { ...row, replies: [] } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ code: 500, message: "发布评论失败" });
  }
});

/** 获取课程评分汇总 + 当前用户评分（学生才有 my_rating） */
commentsRouter.get("/courses/:courseId/rating", optionalAuth, async (req, res) => {
  try {
    const courseId = Number(req.params.courseId);
    if (!courseId || courseId < 1) {
      return res.status(400).json({ code: 400, message: "无效的课程id" });
    }

    const [course] = await query("SELECT id, recommend_index FROM courses WHERE id = ?", [courseId]);
    if (!course) {
      return res.status(404).json({ code: 404, message: "课程不存在" });
    }

    const [agg] = await query(
      "SELECT COUNT(*) AS count, ROUND(AVG(rating), 1) AS average FROM course_ratings WHERE course_id = ?",
      [courseId]
    );
    const count = Number(agg?.count) || 0;
    const average = count > 0 ? Number(agg.average) : (course.recommend_index != null ? Number(course.recommend_index) : 0);

    let myRating = null;
    if (req.auth && req.auth.role === "student") {
      const [r] = await query("SELECT rating FROM course_ratings WHERE course_id = ? AND student_id = ?", [
        courseId,
        req.auth.userId,
      ]);
      if (r) myRating = r.rating;
    }

    res.json({
      code: 0,
      data: { average, count, my_rating: myRating },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ code: 500, message: "获取评分失败" });
  }
});

/** 学生提交/更新评分（1-5），并同步更新 course.recommend_index */
commentsRouter.post("/courses/:courseId/rating", optionalAuth, requireAuth, requireStudent, async (req, res) => {
  try {
    const courseId = Number(req.params.courseId);
    let rating = Number(req.body?.rating);
    if (!courseId || courseId < 1) {
      return res.status(400).json({ code: 400, message: "无效的课程id" });
    }
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ code: 400, message: "评分须为 1～5 的整数" });
    }
    rating = Math.round(rating);

    const [course] = await query("SELECT id FROM courses WHERE id = ?", [courseId]);
    if (!course) {
      return res.status(404).json({ code: 404, message: "课程不存在" });
    }

    const studentId = req.auth.userId;
    await query(
      `INSERT INTO course_ratings (course_id, student_id, rating) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE rating = VALUES(rating)`,
      [courseId, studentId, rating]
    );

    const [agg] = await query("SELECT ROUND(AVG(rating), 1) AS avg_rating FROM course_ratings WHERE course_id = ?", [
      courseId,
    ]);
    const avgRating = agg?.avg_rating != null ? Number(agg.avg_rating) : null;
    await query("UPDATE courses SET recommend_index = ? WHERE id = ?", [avgRating, courseId]);

    res.json({
      code: 0,
      data: { rating, average: avgRating },
      message: "评分已更新",
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ code: 500, message: "提交评分失败" });
  }
});
