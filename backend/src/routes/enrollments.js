import { Router } from "express";
import { query } from "../../db/connection.js";
import { optionalAuth, requireStudent, requireTeacher } from "../middleware/auth.js";

export const enrollmentsRouter = Router();

function parseWeeklySchedule(input) {
  if (!input || typeof input !== "string") return null;
  const s = input.trim();
  const m = s.match(/^(周[一二三四五六日天])\s*(\d{1,2}:\d{2})/);
  if (!m) return null;
  return { day: m[1], time: m[2] };
}

async function detectScheduleConflict(studentId, targetCourseId) {
  const [target] = await query(
    "SELECT id, name, schedule_weekly FROM courses WHERE id = ?",
    [targetCourseId]
  );
  if (!target?.schedule_weekly) return null;
  const t = parseWeeklySchedule(target.schedule_weekly);
  if (!t) return null;

  const rows = await query(
    `SELECT c.id, c.name, c.schedule_weekly
     FROM course_enrollments e
     JOIN courses c ON c.id = e.course_id
     WHERE e.student_id = ?
       AND e.course_id <> ?
       AND (
         e.status = 'enrolled'
         OR (e.status = 'pending' AND e.enroll_pending = 1)
       )`,
    [studentId, targetCourseId]
  );
  for (const r of rows) {
    const p = parseWeeklySchedule(r.schedule_weekly);
    if (!p) continue;
    if (p.day === t.day && p.time === t.time) {
      return { target, conflict: r };
    }
  }
  return null;
}

// -------- 老师端：课程报名名单 / 考勤 / 成绩 / 私聊 --------

// 报名名单（仅老师，包含已通过与审核中）
enrollmentsRouter.get(
  "/teacher/courses/:courseId/enrollments",
  optionalAuth,
  requireTeacher,
  async (req, res) => {
    try {
      const teacherId = req.auth.userId;
      const courseId = Number(req.params.courseId);
      if (!courseId || courseId < 1) {
        return res.status(400).json({ code: 400, message: "无效的课程id" });
      }
      const [course] = await query(
        "SELECT id, name, teacher_id FROM courses WHERE id = ?",
        [courseId]
      );
      if (!course || course.teacher_id !== teacherId) {
        return res.status(404).json({ code: 404, message: "课程不存在或无权限" });
      }
      const rows = await query(
        `SELECT e.id, e.student_id, e.status,
                e.enroll_pending, e.enroll_status, e.enroll_reason, e.enroll_form, e.enroll_reject_reason,
                e.withdraw_pending, e.withdraw_status,
                s.real_name AS student_name,
                s.student_number,
                s.major,
                s.gender,
                s.email,
                s.phone,
                s.dormitory,
                p.base_reach_cm,
                AVG(CASE WHEN sk.category = 'attack' THEN sk.value END) AS atk_avg,
                AVG(CASE WHEN sk.category = 'set' THEN sk.value END) AS set_avg,
                AVG(CASE WHEN sk.category = 'defense' THEN sk.value END) AS def_avg,
                e.created_at
         FROM course_enrollments e
         JOIN students s ON e.student_id = s.id
         LEFT JOIN student_skill_profiles p ON p.student_id = s.id
         LEFT JOIN student_skills sk ON sk.student_id = s.id
         WHERE e.course_id = ?
         GROUP BY e.id, e.student_id, e.status, e.enroll_pending, e.enroll_status, e.enroll_reason, e.enroll_form, e.enroll_reject_reason,
                  e.withdraw_pending, e.withdraw_status, s.real_name, s.student_number, s.major, s.gender, s.email, s.phone, s.dormitory, p.base_reach_cm, e.created_at
         ORDER BY e.created_at ASC`,
        [courseId]
      );
      return res.json({
        code: 0,
        data: {
          course,
          enrollments: rows,
        },
      });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ code: 500, message: "获取报名名单失败" });
    }
  }
);

// -------- 学生端：查看自己在某课程的考勤与成绩 --------

// 学生查看自己在某课程的考勤汇总与明细
enrollmentsRouter.get(
  "/student/courses/:courseId/attendance-summary",
  optionalAuth,
  requireStudent,
  async (req, res) => {
    try {
      const studentId = req.auth.userId;
      const courseId = Number(req.params.courseId);
      if (!courseId || courseId < 1) {
        return res.status(400).json({ code: 400, message: "无效的课程id" });
      }
      // 仅已报名或已结课仍保留记录的学生可查看
      const [enroll] = await query(
        `SELECT e.id, e.status, c.name AS course_name
         FROM course_enrollments e
         JOIN courses c ON e.course_id = c.id
         WHERE e.course_id = ? AND e.student_id = ?`,
        [courseId, studentId]
      );
      if (!enroll) {
        return res.status(403).json({ code: 403, message: "仅报名学生可查看考勤" });
      }
      // 课程总考勤次数
      const [totalRow] = await query(
        "SELECT COUNT(DISTINCT attend_date) AS total FROM course_attendance WHERE course_id = ?",
        [courseId]
      );
      const totalSessions = Number(totalRow?.total ?? 0) || 0;
      // 当前学生的出勤次数（present + late）
      const [attRow] = await query(
        `SELECT COUNT(*) AS cnt FROM course_attendance
         WHERE course_id = ? AND student_id = ? AND status IN ('present','late')`,
        [courseId, studentId]
      );
      const attendanceCount = Number(attRow?.cnt ?? 0) || 0;
      const attendanceRate = totalSessions > 0 ? attendanceCount / totalSessions : 0;
      const attendanceScore = attendanceRate * 40;
      const records = await query(
        `SELECT attend_date, status, note
         FROM course_attendance
         WHERE course_id = ? AND student_id = ?
         ORDER BY attend_date ASC`,
        [courseId, studentId]
      );
      return res.json({
        code: 0,
        data: {
          course_id: courseId,
          course_name: enroll.course_name,
          total_sessions: totalSessions,
          attendance_count: attendanceCount,
          attendance_rate: Number((attendanceRate * 100).toFixed(2)),
          attendance_score: Math.round(attendanceScore * 100) / 100,
          records,
        },
      });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ code: 500, message: "获取考勤信息失败" });
    }
  }
);

// 学生查看自己在某课程的成绩（含出勤得分与总评）
enrollmentsRouter.get(
  "/student/courses/:courseId/grade",
  optionalAuth,
  requireStudent,
  async (req, res) => {
    try {
      const studentId = req.auth.userId;
      const courseId = Number(req.params.courseId);
      if (!courseId || courseId < 1) {
        return res.status(400).json({ code: 400, message: "无效的课程id" });
      }
      const [enroll] = await query(
        `SELECT e.id, e.status, c.name AS course_name
         FROM course_enrollments e
         JOIN courses c ON e.course_id = c.id
         WHERE e.course_id = ? AND e.student_id = ?`,
        [courseId, studentId]
      );
      if (!enroll) {
        return res.status(403).json({ code: 403, message: "仅报名学生可查看成绩" });
      }
      const [grade] = await query(
        `SELECT score, grade_level, comment
         FROM course_grades
         WHERE course_id = ? AND student_id = ?`,
        [courseId, studentId]
      );
      // 出勤相关
      const [totalRow] = await query(
        "SELECT COUNT(DISTINCT attend_date) AS total FROM course_attendance WHERE course_id = ?",
        [courseId]
      );
      const totalSessions = Number(totalRow?.total ?? 0) || 0;
      const [attRow] = await query(
        `SELECT COUNT(*) AS cnt FROM course_attendance
         WHERE course_id = ? AND student_id = ? AND status IN ('present','late')`,
        [courseId, studentId]
      );
      const attendanceCount = Number(attRow?.cnt ?? 0) || 0;
      const attendanceScore =
        totalSessions > 0 ? (attendanceCount / totalSessions) * 40 : 0;
      const examScore = grade?.score != null ? Number(grade.score) : 0;
      const totalScore = attendanceScore + examScore * 0.6;
      return res.json({
        code: 0,
        data: {
          course_id: courseId,
          course_name: enroll.course_name,
          score: grade?.score != null ? Number(grade.score) : null,
          grade_level: grade?.grade_level || "",
          comment: grade?.comment || "",
          total_sessions: totalSessions,
          attendance_count: attendanceCount,
          attendance_score: Math.round(attendanceScore * 100) / 100,
          total_score: Math.round(totalScore * 100) / 100,
        },
      });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ code: 500, message: "获取成绩信息失败" });
    }
  }
);

// 考勤列表（指定日期）
enrollmentsRouter.get(
  "/teacher/courses/:courseId/attendance",
  optionalAuth,
  requireTeacher,
  async (req, res) => {
    try {
      const teacherId = req.auth.userId;
      const courseId = Number(req.params.courseId);
      const attendDate = req.query.date;
      if (!courseId || courseId < 1) {
        return res.status(400).json({ code: 400, message: "无效的课程id" });
      }
      if (!attendDate) {
        return res.status(400).json({ code: 400, message: "缺少考勤日期" });
      }
      const [course] = await query(
        "SELECT id, name, teacher_id FROM courses WHERE id = ?",
        [courseId]
      );
      if (!course || course.teacher_id !== teacherId) {
        return res.status(404).json({ code: 404, message: "课程不存在或无权限" });
      }
      const rows = await query(
        `SELECT e.student_id,
                s.real_name AS student_name,
                s.student_number,
                a.status,
                a.note
         FROM course_enrollments e
         JOIN students s ON e.student_id = s.id
         LEFT JOIN course_attendance a
           ON a.course_id = e.course_id
          AND a.student_id = e.student_id
          AND a.attend_date = ?
         WHERE e.course_id = ? AND e.status = 'enrolled'
         ORDER BY s.student_number ASC`,
        [attendDate, courseId]
      );
      return res.json({ code: 0, data: rows });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ code: 500, message: "获取考勤列表失败" });
    }
  }
);

// 批量保存考勤
enrollmentsRouter.post(
  "/teacher/courses/:courseId/attendance",
  optionalAuth,
  requireTeacher,
  async (req, res) => {
    try {
      const teacherId = req.auth.userId;
      const courseId = Number(req.params.courseId);
      const { date, records } = req.body || {};
      if (!courseId || courseId < 1) {
        return res.status(400).json({ code: 400, message: "无效的课程id" });
      }
      if (!date || !Array.isArray(records)) {
        return res.status(400).json({ code: 400, message: "缺少日期或记录" });
      }
      const [course] = await query(
        "SELECT id, name, teacher_id FROM courses WHERE id = ?",
        [courseId]
      );
      if (!course || course.teacher_id !== teacherId) {
        return res.status(404).json({ code: 404, message: "课程不存在或无权限" });
      }
      for (const r of records) {
        if (!r.student_id || !r.status) continue;
        await query(
          `INSERT INTO course_attendance
             (course_id, student_id, attend_date, status, note)
           VALUES (?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE status = VALUES(status), note = VALUES(note), updated_at = NOW()`,
          [courseId, r.student_id, date, r.status, r.note || null]
        );
      }
      return res.json({ code: 0, message: "保存考勤成功" });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ code: 500, message: "保存考勤失败" });
    }
  }
);

// 成绩列表（含出勤、总成绩：出勤率*40 + 考试成绩*0.6）
enrollmentsRouter.get(
  "/teacher/courses/:courseId/grades",
  optionalAuth,
  requireTeacher,
  async (req, res) => {
    try {
      const teacherId = req.auth.userId;
      const courseId = Number(req.params.courseId);
      if (!courseId || courseId < 1) {
        return res.status(400).json({ code: 400, message: "无效的课程id" });
      }
      const [course] = await query(
        "SELECT id, name, teacher_id FROM courses WHERE id = ?",
        [courseId]
      );
      if (!course || course.teacher_id !== teacherId) {
        return res.status(404).json({ code: 404, message: "课程不存在或无权限" });
      }
      const rows = await query(
        `SELECT e.student_id,
                s.real_name AS student_name,
                s.student_number,
                g.score,
                g.grade_level,
                g.comment
         FROM course_enrollments e
         JOIN students s ON e.student_id = s.id
         LEFT JOIN course_grades g
           ON g.course_id = e.course_id
          AND g.student_id = e.student_id
         WHERE e.course_id = ? AND e.status = 'enrolled'
         ORDER BY s.student_number ASC`,
        [courseId]
      );
      // 课程总考勤次数（有考勤记录的日期数）
      const [totalSessionRow] = await query(
        `SELECT COUNT(DISTINCT attend_date) AS total FROM course_attendance WHERE course_id = ?`,
        [courseId]
      );
      const totalSessions = Number(totalSessionRow?.total ?? 0) || 0;
      // 每个学生的出勤次数（present + late 计为出勤）
      const attendanceRows = await query(
        `SELECT student_id, COUNT(*) AS cnt FROM course_attendance
         WHERE course_id = ? AND status IN ('present','late')
         GROUP BY student_id`,
        [courseId]
      );
      const attendanceMap = {};
      for (const r of attendanceRows || []) {
        attendanceMap[r.student_id] = Number(r.cnt) || 0;
      }
      const data = (rows || []).map((r) => {
        const attendanceCount = attendanceMap[r.student_id] ?? 0;
        const attendanceScore =
          totalSessions > 0 ? (attendanceCount / totalSessions) * 40 : 0;
        const examScore = r.score != null ? Number(r.score) : 0;
        const totalScore = attendanceScore + examScore * 0.6;
        return {
          ...r,
          total_sessions: totalSessions,
          attendance_count: attendanceCount,
          attendance_score: Math.round(attendanceScore * 100) / 100,
          total_score: Math.round(totalScore * 100) / 100,
        };
      });
      return res.json({ code: 0, data: { total_sessions: totalSessions, rows: data } });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ code: 500, message: "获取成绩列表失败" });
    }
  }
);

// 批量保存成绩
enrollmentsRouter.post(
  "/teacher/courses/:courseId/grades",
  optionalAuth,
  requireTeacher,
  async (req, res) => {
    try {
      const teacherId = req.auth.userId;
      const courseId = Number(req.params.courseId);
      const { records } = req.body || {};
      if (!courseId || courseId < 1) {
        return res.status(400).json({ code: 400, message: "无效的课程id" });
      }
      if (!Array.isArray(records)) {
        return res.status(400).json({ code: 400, message: "缺少成绩记录" });
      }
      const [course] = await query(
        "SELECT id, name, teacher_id FROM courses WHERE id = ?",
        [courseId]
      );
      if (!course || course.teacher_id !== teacherId) {
        return res.status(404).json({ code: 404, message: "课程不存在或无权限" });
      }
      for (const r of records) {
        if (!r.student_id) continue;
        await query(
          `INSERT INTO course_grades
             (course_id, student_id, score, grade_level, comment)
           VALUES (?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             score = VALUES(score),
             grade_level = VALUES(grade_level),
             comment = VALUES(comment),
             updated_at = NOW()`,
          [
            courseId,
            r.student_id,
            r.score != null ? r.score : null,
            r.grade_level || null,
            r.comment || null,
          ]
        );
      }
      return res.json({ code: 0, message: "保存成绩成功" });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ code: 500, message: "保存成绩失败" });
    }
  }
);

// 课程内师生私聊：老师视角获取对话
enrollmentsRouter.get(
  "/teacher/courses/:courseId/messages/:studentId",
  optionalAuth,
  requireTeacher,
  async (req, res) => {
    try {
      const teacherId = req.auth.userId;
      const courseId = Number(req.params.courseId);
      const studentId = Number(req.params.studentId);
      if (!courseId || !studentId) {
        return res.status(400).json({ code: 400, message: "参数错误" });
      }
      const [course] = await query(
        "SELECT id, teacher_id FROM courses WHERE id = ?",
        [courseId]
      );
      if (!course || course.teacher_id !== teacherId) {
        return res.status(404).json({ code: 404, message: "课程不存在或无权限" });
      }
      const messages = await query(
        `SELECT id, course_id, teacher_id, student_id, sender, content, created_at
         FROM course_messages
         WHERE course_id = ? AND teacher_id = ? AND student_id = ?
         ORDER BY created_at ASC, id ASC`,
        [courseId, teacherId, studentId]
      );
      // 老师打开对话时，将学生发来的消息标记为已读
      await query(
        `UPDATE course_messages SET read_at = NOW()
         WHERE course_id = ? AND teacher_id = ? AND student_id = ? AND sender = 'student' AND read_at IS NULL`,
        [courseId, teacherId, studentId]
      ).catch(() => {});
      return res.json({ code: 0, data: messages });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ code: 500, message: "获取聊天记录失败" });
    }
  }
);

// 老师发送消息给某学生
enrollmentsRouter.post(
  "/teacher/courses/:courseId/messages/:studentId",
  optionalAuth,
  requireTeacher,
  async (req, res) => {
    try {
      const teacherId = req.auth.userId;
      const courseId = Number(req.params.courseId);
      const studentId = Number(req.params.studentId);
      const content = String(req.body?.content ?? "").trim();
      if (!courseId || !studentId) {
        return res.status(400).json({ code: 400, message: "参数错误" });
      }
      if (!content) {
        return res.status(400).json({ code: 400, message: "消息内容不能为空" });
      }
      const [course] = await query(
        "SELECT id, teacher_id FROM courses WHERE id = ?",
        [courseId]
      );
      if (!course || course.teacher_id !== teacherId) {
        return res.status(404).json({ code: 404, message: "课程不存在或无权限" });
      }
      await query(
        `INSERT INTO course_messages
           (course_id, teacher_id, student_id, sender, content)
         VALUES (?, ?, ?, 'teacher', ?)`,
        [courseId, teacherId, studentId, content]
      );
      return res.json({ code: 0, message: "发送成功" });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ code: 500, message: "发送消息失败" });
    }
  }
);

// 老师端：课程消息会话列表（与谁的聊天 + 未读数）
enrollmentsRouter.get(
  "/teacher/course-messages/conversations",
  optionalAuth,
  requireTeacher,
  async (req, res) => {
    try {
      const teacherId = req.auth.userId;
      const rows = await query(
        `SELECT m.course_id, m.student_id,
                c.name AS course_name,
                s.real_name AS student_name,
                SUM(CASE WHEN m.sender = 'student' AND m.read_at IS NULL THEN 1 ELSE 0 END) AS unread_count
         FROM course_messages m
         JOIN courses c ON c.id = m.course_id
         JOIN students s ON s.id = m.student_id
         WHERE m.teacher_id = ?
         GROUP BY m.course_id, m.student_id, c.name, s.real_name
         ORDER BY MAX(m.created_at) DESC`,
        [teacherId]
      );
      return res.json({ code: 0, data: rows || [] });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ code: 500, message: "获取会话列表失败" });
    }
  }
);

// 学生端：课程消息会话列表（与谁的聊天 + 未读数）
enrollmentsRouter.get(
  "/student/course-messages/conversations",
  optionalAuth,
  requireStudent,
  async (req, res) => {
    try {
      const studentId = req.auth.userId;
      const rows = await query(
        `SELECT m.course_id, m.teacher_id,
                c.name AS course_name,
                t.real_name AS teacher_name,
                SUM(CASE WHEN m.sender = 'teacher' AND m.read_at IS NULL THEN 1 ELSE 0 END) AS unread_count
         FROM course_messages m
         JOIN courses c ON c.id = m.course_id
         JOIN teachers t ON t.id = m.teacher_id
         WHERE m.student_id = ?
         GROUP BY m.course_id, m.teacher_id, c.name, t.real_name
         ORDER BY MAX(m.created_at) DESC`,
        [studentId]
      );
      return res.json({ code: 0, data: rows || [] });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ code: 500, message: "获取会话列表失败" });
    }
  }
);

// 老师端：课程消息未读数
enrollmentsRouter.get(
  "/teacher/course-messages/unread-count",
  optionalAuth,
  requireTeacher,
  async (req, res) => {
    try {
      const teacherId = req.auth.userId;
      const [row] = await query(
        `SELECT COUNT(*) AS cnt FROM course_messages
         WHERE teacher_id = ? AND sender = 'student' AND read_at IS NULL`,
        [teacherId]
      );
      return res.json({ code: 0, data: { count: Number(row?.cnt) || 0 } });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ code: 500, message: "获取未读数失败" });
    }
  }
);

// 学生端：课程消息未读数
enrollmentsRouter.get(
  "/student/course-messages/unread-count",
  optionalAuth,
  requireStudent,
  async (req, res) => {
    try {
      const studentId = req.auth.userId;
      const [row] = await query(
        `SELECT COUNT(*) AS cnt FROM course_messages
         WHERE student_id = ? AND sender = 'teacher' AND read_at IS NULL`,
        [studentId]
      );
      return res.json({ code: 0, data: { count: Number(row?.cnt) || 0 } });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ code: 500, message: "获取未读数失败" });
    }
  }
);

// 学生端查看与老师的对话
enrollmentsRouter.get(
  "/student/courses/:courseId/messages/:teacherId",
  optionalAuth,
  requireStudent,
  async (req, res) => {
    try {
      const studentId = req.auth.userId;
      const courseId = Number(req.params.courseId);
      const teacherId = Number(req.params.teacherId);
      if (!courseId || !teacherId) {
        return res.status(400).json({ code: 400, message: "参数错误" });
      }
      const [course] = await query(
        "SELECT id, teacher_id FROM courses WHERE id = ?",
        [courseId]
      );
      if (!course || course.teacher_id !== teacherId) {
        return res.status(404).json({ code: 404, message: "课程不存在或无权限" });
      }
      // 仅已报名或审核中的学生才可查看
      const [enroll] = await query(
        "SELECT id FROM course_enrollments WHERE course_id = ? AND student_id = ?",
        [courseId, studentId]
      );
      if (!enroll) {
        return res.status(403).json({ code: 403, message: "仅报名学生可查看消息" });
      }
      const messages = await query(
        `SELECT id, course_id, teacher_id, student_id, sender, content, created_at
         FROM course_messages
         WHERE course_id = ? AND teacher_id = ? AND student_id = ?
         ORDER BY created_at ASC, id ASC`,
        [courseId, teacherId, studentId]
      );
      // 学生打开对话时，将老师发来的消息标记为已读
      await query(
        `UPDATE course_messages SET read_at = NOW()
         WHERE course_id = ? AND teacher_id = ? AND student_id = ? AND sender = 'teacher' AND read_at IS NULL`,
        [courseId, teacherId, studentId]
      ).catch(() => {});
      return res.json({ code: 0, data: messages });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ code: 500, message: "获取聊天记录失败" });
    }
  }
);

// 学生端回复老师消息
enrollmentsRouter.post(
  "/student/courses/:courseId/messages/:teacherId",
  optionalAuth,
  requireStudent,
  async (req, res) => {
    try {
      const studentId = req.auth.userId;
      const courseId = Number(req.params.courseId);
      const teacherId = Number(req.params.teacherId);
      const content = String(req.body?.content ?? "").trim();
      if (!courseId || !teacherId) {
        return res.status(400).json({ code: 400, message: "参数错误" });
      }
      if (!content) {
        return res.status(400).json({ code: 400, message: "消息内容不能为空" });
      }
      const [course] = await query(
        "SELECT id, teacher_id FROM courses WHERE id = ?",
        [courseId]
      );
      if (!course || course.teacher_id !== teacherId) {
        return res.status(404).json({ code: 404, message: "课程不存在或无权限" });
      }
      const [enroll] = await query(
        "SELECT id FROM course_enrollments WHERE course_id = ? AND student_id = ?",
        [courseId, studentId]
      );
      if (!enroll) {
        return res.status(403).json({ code: 403, message: "仅报名学生可发送消息" });
      }
      await query(
        `INSERT INTO course_messages
           (course_id, teacher_id, student_id, sender, content)
         VALUES (?, ?, ?, 'student', ?)`,
        [courseId, teacherId, studentId, content]
      );
      return res.json({ code: 0, message: "发送成功" });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ code: 500, message: "发送消息失败" });
    }
  }
);

// 当前学生在某课程的报名状态（用于前端按钮展示）
enrollmentsRouter.get("/courses/:courseId/enrollment-status", optionalAuth, requireStudent, async (req, res) => {
  try {
    const courseId = Number(req.params.courseId);
    const studentId = req.auth.userId;
    if (!courseId || courseId < 1) {
      return res.status(400).json({ code: 400, message: "无效的课程id" });
    }
    const [course] = await query("SELECT id, start_date FROM courses WHERE id = ?", [courseId]);
    if (!course) {
      return res.status(404).json({ code: 404, message: "课程不存在" });
    }
    const [row] = await query(
      `SELECT course_id, student_id, status,
              enroll_pending, enroll_status, enroll_reason,
              withdraw_pending, withdraw_status,
              created_at, updated_at
       FROM course_enrollments
       WHERE course_id = ? AND student_id = ?`,
      [courseId, studentId]
    );
    res.json({
      code: 0,
      data: {
        course_id: courseId,
        start_date: course.start_date,
        enrollment: row || null,
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ code: 500, message: "获取报名状态失败" });
  }
});

// 学生报名课程（改为提交申请：审核中，不占名额）
enrollmentsRouter.post("/courses/:courseId/enroll", optionalAuth, requireStudent, async (req, res) => {
  try {
    const courseId = Number(req.params.courseId);
    const studentId = req.auth.userId;
    const enrollReason = req.body?.reason != null ? String(req.body.reason).trim() : null;
    const enrollForm = req.body?.form != null ? req.body.form : null;
    if (!courseId || courseId < 1) {
      return res.status(400).json({ code: 400, message: "无效的课程id" });
    }
    if (enrollReason && enrollReason.length > 500) {
      return res.status(400).json({ code: 400, message: "报名理由最多 500 字" });
    }
    if (enrollForm != null) {
      const str = JSON.stringify(enrollForm);
      if (str.length > 4000) {
        return res.status(400).json({ code: 400, message: "申请表内容过长" });
      }
    }

    const [course] = await query(
      `SELECT id, name, capacity, current_enrollment, is_visible,
              enroll_start_date, enroll_end_date, schedule_weekly
       FROM courses WHERE id = ?`,
      [courseId]
    );
    if (!course || !course.is_visible) {
      return res.status(404).json({ code: 404, message: "课程不存在或未上架" });
    }
    if (course.capacity > 0 && course.current_enrollment >= course.capacity) {
      return res.status(400).json({ code: 400, message: "课程已满员" });
    }

    const now = new Date();
    if (course.enroll_start_date) {
      const start = new Date(course.enroll_start_date);
      if (now < start) {
        return res.status(400).json({ code: 400, message: "报名尚未开始" });
      }
    }
    if (course.enroll_end_date) {
      const end = new Date(course.enroll_end_date);
      if (now > end) {
        return res.status(400).json({ code: 400, message: "报名已截止" });
      }
    }

    const conflict = await detectScheduleConflict(studentId, courseId);
    if (conflict) {
      return res.status(400).json({
        code: 400,
        message: `课程时间冲突：已选「${conflict.conflict.name}」与当前课程同一时间`,
      });
    }

    const existing = await query(
      "SELECT id, status, enroll_pending FROM course_enrollments WHERE course_id = ? AND student_id = ?",
      [courseId, studentId]
    );
    if (existing.length) {
      if (existing[0].status === "enrolled") {
        return res.status(400).json({ code: 400, message: "已报名该课程" });
      }
      if (existing[0].status === "pending" || existing[0].enroll_pending) {
        return res.status(400).json({ code: 400, message: "报名审核中，请勿重复提交" });
      }
    }

    if (existing.length) {
      await query(
        `UPDATE course_enrollments
         SET status = 'pending',
             enroll_pending = 1,
             enroll_status = 'reject',
             enroll_reason = ?,
             enroll_form = ?,
             updated_at = NOW()
         WHERE id = ?`,
        [enrollReason, enrollForm ? JSON.stringify(enrollForm) : null, existing[0].id]
      );
    } else {
      await query(
        `INSERT INTO course_enrollments
          (course_id, student_id, status, enroll_pending, enroll_status, enroll_reason, enroll_form, withdraw_pending, withdraw_status)
         VALUES (?, ?, 'pending', 1, 'reject', ?, ?, 0, NULL)`,
        [courseId, studentId, enrollReason, enrollForm ? JSON.stringify(enrollForm) : null]
      );
    }

    return res.json({
      code: 0,
      data: {
        course_id: courseId,
        student_id: studentId,
        status: "pending",
        enroll_pending: 1,
        enroll_status: "reject",
        enroll_reason: enrollReason,
        capacity: course.capacity,
      },
      message: "已提交报名申请（审核中）",
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ code: 500, message: "报名失败" });
  }
});

// 学生取消报名
enrollmentsRouter.post("/courses/:courseId/cancel-enroll", optionalAuth, requireStudent, async (req, res) => {
  try {
    const courseId = Number(req.params.courseId);
    const studentId = req.auth.userId;
    if (!courseId || courseId < 1) {
      return res.status(400).json({ code: 400, message: "无效的课程id" });
    }

    const [course] = await query("SELECT id, capacity FROM courses WHERE id = ?", [courseId]);
    if (!course) {
      return res.status(404).json({ code: 404, message: "课程不存在" });
    }

    const [enroll] = await query(
      "SELECT id, status FROM course_enrollments WHERE course_id = ? AND student_id = ?",
      [courseId, studentId]
    );
    if (!enroll || (enroll.status !== "enrolled" && enroll.status !== "pending")) {
      return res.status(400).json({ code: 400, message: "当前没有可取消的报名/申请" });
    }

    await query(
      "UPDATE course_enrollments SET status = 'cancelled', enroll_pending = 0, updated_at = NOW() WHERE id = ?",
      [enroll.id]
    );

    // 仅已通过报名才会占名额，因此这里根据 enrolled 重新统计回写
    const [agg] = await query(
      "SELECT COUNT(*) AS cnt FROM course_enrollments WHERE course_id = ? AND status = 'enrolled'",
      [courseId]
    );
    const enrolledCount = Number(agg.cnt) || 0;
    await query("UPDATE courses SET current_enrollment = ? WHERE id = ?", [enrolledCount, courseId]);

    return res.json({
      code: 0,
      data: {
        course_id: courseId,
        student_id: studentId,
        status: "cancelled",
        current_enrollment: enrolledCount,
        capacity: course.capacity,
      },
      message: "已取消报名",
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ code: 500, message: "取消报名失败" });
  }
});

// 当前学生的报名列表
enrollmentsRouter.get("/student/enrollments", optionalAuth, requireStudent, async (req, res) => {
  try {
    const studentId = req.auth.userId;
    const rows = await query(
      `SELECT e.id, e.course_id, e.status,
              e.enroll_pending, e.enroll_status, e.enroll_reason, e.enroll_reject_reason,
              e.withdraw_pending, e.withdraw_status,
              e.created_at, e.updated_at,
              c.name, c.credits, c.capacity, c.current_enrollment,
              c.location, c.schedule_weekly,
              c.enroll_start_date, c.enroll_end_date,
              c.start_date, c.end_date,
              cat.name AS category_name,
              t.id AS teacher_id,
              t.real_name AS teacher_name
       FROM course_enrollments e
       JOIN courses c ON e.course_id = c.id
       LEFT JOIN course_categories cat ON c.category_id = cat.id
       LEFT JOIN teachers t ON c.teacher_id = t.id
       WHERE e.student_id = ?
       ORDER BY e.created_at DESC`,
      [studentId]
    );
    return res.json({ code: 0, data: rows });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ code: 500, message: "获取报名列表失败" });
  }
});

// 学生申请退课（开课后才可申请；申请后进入审核中，不改变报名状态）
enrollmentsRouter.post("/courses/:courseId/withdraw-apply", optionalAuth, requireStudent, async (req, res) => {
  try {
    const courseId = Number(req.params.courseId);
    const studentId = req.auth.userId;
    const reason = String(req.body?.reason ?? "").trim();
    if (!courseId || courseId < 1) {
      return res.status(400).json({ code: 400, message: "无效的课程id" });
    }
    if (!reason) {
      return res.status(400).json({ code: 400, message: "请填写退课原因" });
    }
    if (reason.length > 500) {
      return res.status(400).json({ code: 400, message: "退课原因最多 500 字" });
    }

    const [course] = await query("SELECT id, start_date FROM courses WHERE id = ?", [courseId]);
    if (!course) return res.status(404).json({ code: 404, message: "课程不存在" });

    if (!course.start_date) {
      return res.status(400).json({ code: 400, message: "课程未设置开课时间，暂不可申请退课" });
    }
    const now = new Date();
    const start = new Date(course.start_date);
    if (now < start) {
      return res.status(400).json({ code: 400, message: "未到开课时间，暂不可申请退课" });
    }

    const [enroll] = await query(
      "SELECT id, status, withdraw_pending FROM course_enrollments WHERE course_id = ? AND student_id = ?",
      [courseId, studentId]
    );
    if (!enroll || enroll.status !== "enrolled") {
      return res.status(400).json({ code: 400, message: "仅已报名课程可申请退课" });
    }
    if (enroll.withdraw_pending) {
      return res.status(400).json({ code: 400, message: "退课申请审核中，请勿重复提交" });
    }

    await query(
      "INSERT INTO course_withdraw_requests (course_id, student_id, reason, status) VALUES (?, ?, ?, 'reject')",
      [courseId, studentId, reason]
    );
    await query(
      "UPDATE course_enrollments SET withdraw_pending = 1, withdraw_status = 'reject', updated_at = NOW() WHERE id = ?",
      [enroll.id]
    );

    res.json({
      code: 0,
      data: { course_id: courseId, withdraw_pending: 1, withdraw_status: "reject" },
      message: "已提交退课申请（审核中）",
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ code: 500, message: "提交退课申请失败" });
  }
});

// ---------------- 教师审核入口 ----------------

// 教师查看自己课程的报名申请（默认仅 pending）
enrollmentsRouter.get("/teacher/enroll-requests", optionalAuth, requireTeacher, async (req, res) => {
  try {
    const teacherId = req.auth.userId;
    const onlyPending = (req.query.pending ?? "1") !== "0";
    let where = "c.teacher_id = ?";
    const params = [teacherId];
    if (onlyPending) {
      where += " AND e.status = 'pending' AND e.enroll_pending = 1";
    }
    const rows = await query(
      `SELECT e.id, e.course_id, e.student_id, e.status, e.enroll_pending, e.enroll_status, e.enroll_reason, e.enroll_form, e.created_at,
              c.name AS course_name,
              c.schedule_weekly,
              s.real_name AS student_name, s.student_number, s.major, s.gender, s.email, s.phone, s.dormitory,
              p.base_reach_cm,
              AVG(CASE WHEN sk.category = 'attack' THEN sk.value END) AS atk_avg,
              AVG(CASE WHEN sk.category = 'set' THEN sk.value END) AS set_avg,
              AVG(CASE WHEN sk.category = 'defense' THEN sk.value END) AS def_avg
       FROM course_enrollments e
       JOIN courses c ON e.course_id = c.id
       JOIN students s ON e.student_id = s.id
       LEFT JOIN student_skill_profiles p ON p.student_id = s.id
       LEFT JOIN student_skills sk ON sk.student_id = s.id
       WHERE ${where}
       GROUP BY e.id, e.course_id, e.student_id, e.status, e.enroll_pending, e.enroll_status, e.enroll_reason, e.enroll_form, e.created_at,
                c.name, c.schedule_weekly,
                s.real_name, s.student_number, s.major, s.gender, s.email, s.phone, s.dormitory, p.base_reach_cm
       ORDER BY e.created_at DESC`,
      params
    );
    res.json({ code: 0, data: rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ code: 500, message: "获取报名申请失败" });
  }
});

// 教师查看某条报名申请详情（含学生技能明细与档案）
enrollmentsRouter.get("/teacher/enroll-requests/:id", optionalAuth, requireTeacher, async (req, res) => {
  try {
    const teacherId = req.auth.userId;
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ code: 400, message: "无效的申请ID" });
    const [row] = await query(
      `SELECT e.id, e.course_id, e.student_id, e.status, e.enroll_pending, e.enroll_status, e.enroll_reason, e.enroll_form, e.created_at,
              c.name AS course_name, c.schedule_weekly, c.teacher_id,
              s.real_name AS student_name, s.student_number, s.major, s.gender, s.email, s.phone, s.dormitory
       FROM course_enrollments e
       JOIN courses c ON c.id = e.course_id
       JOIN students s ON s.id = e.student_id
       WHERE e.id = ?`,
      [id]
    );
    if (!row) return res.status(404).json({ code: 404, message: "申请不存在" });
    if (row.teacher_id !== teacherId) return res.status(403).json({ code: 403, message: "无权限" });
    const [profile] = await query(
      "SELECT student_id, base_reach_cm, notes FROM student_skill_profiles WHERE student_id = ?",
      [row.student_id]
    );
    const skills = await query(
      "SELECT skill_code, skill_name, category, value, max_value FROM student_skills WHERE student_id = ? ORDER BY category, id",
      [row.student_id]
    );
    res.json({
      code: 0,
      data: {
        enrollment: row,
        profile: profile || null,
        skills,
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ code: 500, message: "获取申请详情失败" });
  }
});

async function recomputeCourseEnrollment(courseId) {
  const [agg] = await query(
    "SELECT COUNT(*) AS cnt FROM course_enrollments WHERE course_id = ? AND status = 'enrolled'",
    [courseId]
  );
  const enrolledCount = Number(agg.cnt) || 0;
  await query("UPDATE courses SET current_enrollment = ? WHERE id = ?", [enrolledCount, courseId]);
  return enrolledCount;
}

// 教师通过报名申请
enrollmentsRouter.post("/teacher/enroll-requests/:id/approve", optionalAuth, requireTeacher, async (req, res) => {
  try {
    const teacherId = req.auth.userId;
    const id = Number(req.params.id);
    const [row] = await query(
      `SELECT e.id, e.course_id, e.student_id, e.status, e.enroll_pending, e.enroll_reason,
              c.capacity, c.teacher_id, c.name AS course_name
       FROM course_enrollments e
       JOIN courses c ON e.course_id = c.id
       WHERE e.id = ?`,
      [id]
    );
    if (!row) return res.status(404).json({ code: 404, message: "申请不存在" });
    if (row.teacher_id !== teacherId) return res.status(403).json({ code: 403, message: "无权限" });
    if (row.status !== "pending" || !row.enroll_pending) {
      return res.status(400).json({ code: 400, message: "该申请不在审核中" });
    }
    const conflict = await detectScheduleConflict(row.student_id, row.course_id);
    if (conflict) {
      return res.status(400).json({
        code: 400,
        message: `无法通过：学生课程时间冲突（已选「${conflict.conflict.name}」）`,
      });
    }
    const current = await recomputeCourseEnrollment(row.course_id);
    if (row.capacity > 0 && current >= row.capacity) {
      return res.status(400).json({ code: 400, message: "课程已满员，无法通过" });
    }
    await query(
      `UPDATE course_enrollments
       SET status = 'enrolled',
           enroll_pending = 0,
           enroll_status = 'approved',
           updated_at = NOW()
       WHERE id = ?`,
      [id]
    );

    // 写入审核历史
    await query(
      `INSERT INTO audit_logs (type, course_id, student_id, teacher_id, result, reason, reject_reason)
       VALUES ('enroll', ?, ?, ?, 'approved', ?, NULL)`,
      [row.course_id, row.student_id, teacherId, row.enroll_reason || null]
    );

    // 写入学生通知
    await query(
      `INSERT INTO notifications (user_type, user_id, title, content)
       VALUES ('student', ?, '报名审核通过', CONCAT('你报名的课程「', ?, '」已通过审核'))`,
      [row.student_id, row.course_name]
    );
    const after = await recomputeCourseEnrollment(row.course_id);
    res.json({ code: 0, data: { id, status: "enrolled", current_enrollment: after }, message: "已通过" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ code: 500, message: "审核失败" });
  }
});

// 教师驳回报名申请
enrollmentsRouter.post("/teacher/enroll-requests/:id/reject", optionalAuth, requireTeacher, async (req, res) => {
  try {
    const teacherId = req.auth.userId;
    const id = Number(req.params.id);
    const rejectReasonRaw = req.body?.reject_reason ?? req.body?.reason;
    const rejectReason = rejectReasonRaw != null ? String(rejectReasonRaw).trim() : "";
    if (!rejectReason) {
      return res.status(400).json({ code: 400, message: "请填写驳回原因" });
    }
    if (rejectReason.length > 500) {
      return res.status(400).json({ code: 400, message: "驳回原因最多 500 字" });
    }

    const [row] = await query(
      `SELECT e.id, e.course_id, e.student_id, e.status, e.enroll_pending,
              e.enroll_reason, c.teacher_id, c.name AS course_name
       FROM course_enrollments e
       JOIN courses c ON e.course_id = c.id
       WHERE e.id = ?`,
      [id]
    );
    if (!row) return res.status(404).json({ code: 404, message: "申请不存在" });
    if (row.teacher_id !== teacherId) return res.status(403).json({ code: 403, message: "无权限" });
    if (row.status !== "pending" || !row.enroll_pending) {
      return res.status(400).json({ code: 400, message: "该申请不在审核中" });
    }
    await query(
      `UPDATE course_enrollments
       SET status = 'cancelled',
           enroll_pending = 0,
           enroll_status = 'reject',
           enroll_reject_reason = ?,
           updated_at = NOW()
       WHERE id = ?`,
      [rejectReason, id]
    );

    // 审核历史
    await query(
      `INSERT INTO audit_logs (type, course_id, student_id, teacher_id, result, reason, reject_reason)
       VALUES ('enroll', ?, ?, ?, 'reject', ?, ?)`,
      [row.course_id, row.student_id, teacherId, row.enroll_reason || null, rejectReason]
    );

    // 通知学生
    await query(
      `INSERT INTO notifications (user_type, user_id, title, content)
       VALUES ('student', ?, '报名未通过',
               CONCAT('你报名的课程「', ?, '」未通过，原因：', ?))`,
      [row.student_id, row.course_name, rejectReason]
    );

    res.json({ code: 0, data: { id, status: "cancelled" }, message: "已驳回" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ code: 500, message: "审核失败" });
  }
});

// 教师查看自己课程的退课申请（审核中）
enrollmentsRouter.get("/teacher/withdraw-requests", optionalAuth, requireTeacher, async (req, res) => {
  try {
    const teacherId = req.auth.userId;
    const rows = await query(
      `SELECT e.id AS enrollment_id, e.course_id, e.student_id, e.withdraw_pending, e.withdraw_status, e.updated_at,
              c.name AS course_name,
              s.real_name AS student_name, s.student_number,
              wr.id AS request_id, wr.reason, wr.created_at AS request_time
       FROM course_enrollments e
       JOIN courses c ON e.course_id = c.id
       JOIN students s ON e.student_id = s.id
       LEFT JOIN course_withdraw_requests wr
         ON wr.id = (
           SELECT id FROM course_withdraw_requests
           WHERE course_id = e.course_id AND student_id = e.student_id
           ORDER BY id DESC LIMIT 1
         )
       WHERE c.teacher_id = ? AND e.withdraw_pending = 1 AND e.status = 'enrolled'
       ORDER BY wr.created_at DESC`,
      [teacherId]
    );
    res.json({ code: 0, data: rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ code: 500, message: "获取退课申请失败" });
  }
});

// 教师通过退课申请：取消报名并扣减人数
enrollmentsRouter.post("/teacher/withdraw-requests/:enrollmentId/approve", optionalAuth, requireTeacher, async (req, res) => {
  try {
    const teacherId = req.auth.userId;
    const enrollmentId = Number(req.params.enrollmentId);
    const [row] = await query(
      `SELECT e.id, e.course_id, e.student_id, e.withdraw_pending, e.status,
              c.teacher_id, c.name AS course_name
       FROM course_enrollments e
       JOIN courses c ON e.course_id = c.id
       WHERE e.id = ?`,
      [enrollmentId]
    );
    if (!row) return res.status(404).json({ code: 404, message: "记录不存在" });
    if (row.teacher_id !== teacherId) return res.status(403).json({ code: 403, message: "无权限" });
    if (!row.withdraw_pending || row.status !== "enrolled") {
      return res.status(400).json({ code: 400, message: "该退课申请不在审核中" });
    }

    await query(
      "UPDATE course_enrollments SET status='cancelled', withdraw_pending=0, withdraw_status='approved', updated_at=NOW() WHERE id = ?",
      [enrollmentId]
    );
    await query(
      `UPDATE course_withdraw_requests
       SET status='approved', updated_at=NOW()
       WHERE course_id = ? AND student_id = ?
       ORDER BY id DESC LIMIT 1`,
      [row.course_id, row.student_id]
    ).catch(() => {});

    const after = await recomputeCourseEnrollment(row.course_id);

    // 更新退课申请记录
    res.json({ code: 0, data: { enrollment_id: enrollmentId, status: "approved", current_enrollment: after }, message: "已通过退课" });

    // 写入审核历史
    await query(
      `INSERT INTO audit_logs (type, course_id, student_id, teacher_id, result, reason, reject_reason)
       VALUES ('withdraw', ?, ?, ?, 'approved',
               (SELECT reason FROM course_withdraw_requests
                WHERE course_id = ? AND student_id = ?
                ORDER BY id DESC LIMIT 1),
               NULL)`,
      [row.course_id, row.student_id, teacherId, row.course_id, row.student_id]
    ).catch(() => {});

    // 通知学生
    await query(
      `INSERT INTO notifications (user_type, user_id, title, content)
       VALUES ('student', ?, '退课审核通过',
               CONCAT('你申请退选的课程「', ?, '」已通过审核'))`,
      [row.student_id, row.course_name]
    ).catch(() => {});
  } catch (e) {
    console.error(e);
    res.status(500).json({ code: 500, message: "审核失败" });
  }
});

// 教师驳回退课申请：保持报名不变
enrollmentsRouter.post("/teacher/withdraw-requests/:enrollmentId/reject", optionalAuth, requireTeacher, async (req, res) => {
  try {
    const teacherId = req.auth.userId;
    const enrollmentId = Number(req.params.enrollmentId);
    const rejectReasonRaw = req.body?.reject_reason ?? req.body?.reason;
    const rejectReason = rejectReasonRaw != null ? String(rejectReasonRaw).trim() : "";
    if (!rejectReason) {
      return res.status(400).json({ code: 400, message: "请填写驳回原因" });
    }
    if (rejectReason.length > 500) {
      return res.status(400).json({ code: 400, message: "驳回原因最多 500 字" });
    }

    const [row] = await query(
      `SELECT e.id, e.course_id, e.student_id, e.withdraw_pending, e.status,
              c.teacher_id, c.name AS course_name
       FROM course_enrollments e
       JOIN courses c ON e.course_id = c.id
       WHERE e.id = ?`,
      [enrollmentId]
    );
    if (!row) return res.status(404).json({ code: 404, message: "记录不存在" });
    if (row.teacher_id !== teacherId) return res.status(403).json({ code: 403, message: "无权限" });
    if (!row.withdraw_pending || row.status !== "enrolled") {
      return res.status(400).json({ code: 400, message: "该退课申请不在审核中" });
    }
    await query(
      "UPDATE course_enrollments SET withdraw_pending=0, withdraw_status='reject', updated_at=NOW() WHERE id = ?",
      [enrollmentId]
    );
    await query(
      `UPDATE course_withdraw_requests
       SET reject_reason = ?, status='reject', updated_at=NOW()
       WHERE course_id = ? AND student_id = ?
       ORDER BY id DESC LIMIT 1`,
      [rejectReason, row.course_id, row.student_id]
    ).catch(() => {});

    await query(
      `INSERT INTO audit_logs (type, course_id, student_id, teacher_id, result, reason, reject_reason)
       VALUES ('withdraw', ?, ?, ?, 'reject',
               (SELECT reason FROM course_withdraw_requests
                WHERE course_id = ? AND student_id = ?
                ORDER BY id DESC LIMIT 1),
               ?)`,
      [row.course_id, row.student_id, teacherId, row.course_id, row.student_id, rejectReason]
    ).catch(() => {});

    await query(
      `INSERT INTO notifications (user_type, user_id, title, content)
       VALUES ('student', ?, '退课未通过',
               CONCAT('你申请退选的课程「', ?, '」未通过，原因：', ?))`,
      [row.student_id, row.course_name, rejectReason]
    );
    res.json({ code: 0, data: { enrollment_id: enrollmentId, status: "reject" }, message: "已驳回退课" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ code: 500, message: "审核失败" });
  }
});

// 教师审核历史（默认最近 200 条）
enrollmentsRouter.get("/teacher/audit-history", optionalAuth, requireTeacher, async (req, res) => {
  try {
    const teacherId = req.auth.userId;
    const type = req.query.type === "withdraw" ? "withdraw" : req.query.type === "enroll" ? "enroll" : null;
    const result = req.query.result === "approved" ? "approved" : req.query.result === "reject" ? "reject" : null;

    let sql = `
      SELECT l.id, l.type, l.course_id, l.student_id, l.teacher_id, l.result,
             l.reason, l.reject_reason, l.created_at,
             c.name AS course_name,
             s.real_name AS student_name, s.student_number
      FROM audit_logs l
      JOIN courses c ON l.course_id = c.id
      JOIN students s ON l.student_id = s.id
      WHERE l.teacher_id = ?
    `;
    const params = [teacherId];
    if (type) {
      sql += " AND l.type = ?";
      params.push(type);
    }
    if (result) {
      sql += " AND l.result = ?";
      params.push(result);
    }
    sql += " ORDER BY l.created_at DESC LIMIT 200";
    const rows = await query(sql, params);
    res.json({ code: 0, data: rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ code: 500, message: "获取历史记录失败" });
  }
});

