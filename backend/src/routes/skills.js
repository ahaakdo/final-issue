import { Router } from "express";
import { query } from "../../db/connection.js";
import { optionalAuth, requireStudent, requireTeacher } from "../middleware/auth.js";

export const skillsRouter = Router();

// 固定技能定义（在首次访问时为学生初始化）
const ATTACK_SKILLS = [
  { code: "atk_line", name: "直线扣球" },
  { code: "atk_small_diagonal", name: "小斜线扣球" },
  { code: "atk_waist_line", name: "腰线扣球" },
  { code: "atk_big_diagonal", name: "大斜线扣球" },
];

const SET_SKILLS = [
  { code: "set_flat", name: "平拉开" },
  { code: "set_quick", name: "快攻" },
  { code: "set_back_quick", name: "背快" },
  { code: "set_chase_in", name: "冲进" },
  { code: "set_short", name: "短球" },
  { code: "set_gap", name: "加塞" },
  { code: "set_back_fly", name: "背飞" },
  { code: "set_two_back", name: "后二" },
];

// 防守技能细分（根据需求补充）
const DEFENSE_SKILLS = [
  { code: "def_pass_accuracy", name: "一传到位率" },
  { code: "def_ball_quality", name: "起球质量" },
  { code: "def_positioning", name: "卡位意识" },
  { code: "def_heavy_spike", name: "防重扣" },
  { code: "def_tipping", name: "防吊球" },
  { code: "def_tip_over", name: "防探头" },
  { code: "def_dig", name: "救球能力" },
  { code: "def_coverage", name: "防守覆盖范围" },
];

const ALL_FIXED_SKILLS = [
  ...ATTACK_SKILLS.map((s) => ({ ...s, category: "attack" })),
  ...SET_SKILLS.map((s) => ({ ...s, category: "set" })),
  ...DEFENSE_SKILLS.map((s) => ({ ...s, category: "defense" })),
];

async function ensureStudentSkillsInitialized(studentId) {
  const rows = await query(
    "SELECT COUNT(*) AS cnt FROM student_skills WHERE student_id = ?",
    [studentId]
  );
  if (rows[0]?.cnt > 0) {
    return;
  }
  const values = [];
  for (const s of ALL_FIXED_SKILLS) {
    values.push(
      studentId,
      s.code,
      s.name,
      s.category,
      0,
      100
    );
  }
  await query(
    `INSERT INTO student_skills (student_id, skill_code, skill_name, category, value, max_value)
     VALUES ${ALL_FIXED_SKILLS.map(() => "(?, ?, ?, ?, ?, ?)").join(", ")}`,
    values
  );
}

async function touchOnline(studentId) {
  await query(
    `INSERT INTO student_online_logs (student_id, last_active_at)
     VALUES (?, NOW())
     ON DUPLICATE KEY UPDATE last_active_at = VALUES(last_active_at)`,
    [studentId]
  );
}

// 获取当前学生的技能档案 + 技能点
skillsRouter.get(
  "/student/skills",
  optionalAuth,
  requireStudent,
  async (req, res) => {
    try {
      const studentId = req.auth.userId;
      await ensureStudentSkillsInitialized(studentId);
      await touchOnline(studentId);

      const [profileRows, skillRows] = await Promise.all([
        query(
          "SELECT student_id, base_reach_cm, notes FROM student_skill_profiles WHERE student_id = ?",
          [studentId]
        ),
        query(
          "SELECT skill_code, skill_name, category, value, max_value FROM student_skills WHERE student_id = ? ORDER BY category, id",
          [studentId]
        ),
      ]);

      const profile =
        profileRows[0] || {
          student_id: studentId,
          base_reach_cm: null,
          notes: null,
        };

      const grouped = {
        attack: [],
        set: [],
        defense: [],
        custom: [],
      };
      for (const row of skillRows) {
        if (!grouped[row.category]) {
          grouped[row.category] = [];
        }
        grouped[row.category].push(row);
      }

      res.json({
        code: 0,
        data: {
          profile,
          skills: grouped,
        },
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ code: 500, message: "获取技能数据失败" });
    }
  }
);

// 更新基础档案（如摸高）
skillsRouter.post(
  "/student/skills/profile",
  optionalAuth,
  requireStudent,
  async (req, res) => {
    try {
      const studentId = req.auth.userId;
      const { base_reach_cm, notes } = req.body || {};
      await touchOnline(studentId);

      await query(
        `INSERT INTO student_skill_profiles (student_id, base_reach_cm, notes)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE base_reach_cm = VALUES(base_reach_cm), notes = VALUES(notes)`,
        [
          studentId,
          base_reach_cm == null || base_reach_cm === ""
            ? null
            : Number(base_reach_cm),
          notes || null,
        ]
      );

      const [row] = await query(
        "SELECT student_id, base_reach_cm, notes FROM student_skill_profiles WHERE student_id = ?",
        [studentId]
      );
      res.json({ code: 0, message: "保存成功", data: row });
    } catch (e) {
      console.error(e);
      res.status(500).json({ code: 500, message: "保存技能档案失败" });
    }
  }
);

// 批量更新技能点（支持课程训练后手动/半自动升级）
skillsRouter.post(
  "/student/skills/batch-update",
  optionalAuth,
  requireStudent,
  async (req, res) => {
    try {
      const studentId = req.auth.userId;
      const { updates } = req.body || {};
      if (!Array.isArray(updates) || !updates.length) {
        return res
          .status(400)
          .json({ code: 400, message: "缺少技能更新列表" });
      }
      await ensureStudentSkillsInitialized(studentId);
      await touchOnline(studentId);

      // 逐条更新，控制在 0- max 之间
      for (const item of updates) {
        const code = String(item.skill_code || "").trim();
        if (!code) continue;
        const delta = Number(item.delta ?? 0);
        const value = item.value != null ? Number(item.value) : null;
        const rows = await query(
          "SELECT id, value, max_value FROM student_skills WHERE student_id = ? AND skill_code = ?",
          [studentId, code]
        );
        if (!rows.length) continue;
        const current = Number(rows[0].value) || 0;
        const max = Number(rows[0].max_value) || 100;
        let next = current;
        if (value != null && !Number.isNaN(value)) {
          next = value;
        } else if (!Number.isNaN(delta)) {
          next = current + delta;
        }
        if (Number.isNaN(next)) continue;
        if (next < 0) next = 0;
        if (next > max) next = max;
        await query(
          "UPDATE student_skills SET value = ?, updated_at = NOW() WHERE id = ?",
          [next, rows[0].id]
        );
      }

      res.json({ code: 0, message: "技能已更新" });
    } catch (e) {
      console.error(e);
      res.status(500).json({ code: 500, message: "更新技能失败" });
    }
  }
);

// 新增一个自定义技能
skillsRouter.post(
  "/student/skills/custom",
  optionalAuth,
  requireStudent,
  async (req, res) => {
    try {
      const studentId = req.auth.userId;
      const { name } = req.body || {};
      const skillName = String(name || "").trim();
      if (!skillName) {
        return res.status(400).json({ code: 400, message: "技能名称不能为空" });
      }
      await touchOnline(studentId);

      // 生成一个简单的自定义 code
      const existing = await query(
        "SELECT COUNT(*) AS cnt FROM student_skills WHERE student_id = ? AND category = 'custom'",
        [studentId]
      );
      const idx = (existing[0]?.cnt || 0) + 1;
      const code = `custom_${idx}`;

      await query(
        `INSERT INTO student_skills (student_id, skill_code, skill_name, category, value, max_value)
         VALUES (?, ?, ?, 'custom', 0, 100)`,
        [studentId, code, skillName]
      );

      const [row] = await query(
        "SELECT skill_code, skill_name, category, value, max_value FROM student_skills WHERE student_id = ? AND skill_code = ?",
        [studentId, code]
      );
      res.json({ code: 0, message: "新增技能成功", data: row });
    } catch (e) {
      console.error(e);
      res.status(500).json({ code: 500, message: "新增自定义技能失败" });
    }
  }
);

// ---------------- 学生组队 / 在线同学 ----------------

// 获取队伍 + 在线同学概览
skillsRouter.get(
  "/student/teams/overview",
  optionalAuth,
  requireStudent,
  async (req, res) => {
    try {
      const studentId = req.auth.userId;
      await touchOnline(studentId);

      const [teamRows, memberRows, onlineRows] = await Promise.all([
        // 当前学生所在队伍
        query(
          `SELECT t.id, t.name, t.description, t.owner_student_id,
                  m.role AS member_role
           FROM student_team_members m
           JOIN student_teams t ON t.id = m.team_id
           WHERE m.student_id = ?`,
          [studentId]
        ),
        // 当前队伍成员及简要战力（攻击/传球/防守三类平均值）
        query(
          `SELECT m.team_id,
                  m.court_position,
                  s.id AS student_id,
                  s.real_name,
                  s.student_number,
                  s.major,
                  AVG(CASE WHEN sk.category = 'attack' THEN sk.value END) AS atk_avg,
                  AVG(CASE WHEN sk.category = 'set' THEN sk.value END) AS set_avg,
                  AVG(CASE WHEN sk.category = 'defense' THEN sk.value END) AS def_avg
           FROM student_team_members m
           JOIN students s ON s.id = m.student_id
           LEFT JOIN student_skills sk ON sk.student_id = s.id
           WHERE m.team_id IN (
             SELECT team_id FROM student_team_members WHERE student_id = ?
           )
           GROUP BY m.team_id, m.court_position, s.id, s.real_name, s.student_number, s.major`,
          [studentId]
        ),
        // 在线同学：最近 5 分钟有访问技能接口的学生
        query(
          `SELECT s.id, s.real_name, s.student_number, s.major, l.last_active_at
           FROM student_online_logs l
           JOIN students s ON s.id = l.student_id
           WHERE l.last_active_at >= DATE_SUB(NOW(), INTERVAL 5 MINUTE)
           ORDER BY l.last_active_at DESC
           LIMIT 50`
        ),
      ]);

      const myTeam = teamRows[0] || null;
      const teamMembers = memberRows;

      // 其他可加入队伍列表（简单展示所有队伍 + 人数）
      const otherTeams = await query(
        `SELECT t.id, t.name, t.description,
                COUNT(m.student_id) AS member_count
         FROM student_teams t
         LEFT JOIN student_team_members m ON m.team_id = t.id
         GROUP BY t.id, t.name, t.description
         ORDER BY t.created_at DESC
         LIMIT 50`
      );

      res.json({
        code: 0,
        data: {
          myTeam,
          teamMembers,
          onlineStudents: onlineRows,
          teams: otherTeams,
        },
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ code: 500, message: "获取组队信息失败" });
    }
  }
);

// ---------------- 老师端：查看 / 调整学生技能与队伍位置 ----------------

// 老师端：获取学生列表（用于技能管理选择学生）
skillsRouter.get(
  "/teacher/students",
  optionalAuth,
  requireTeacher,
  async (_req, res) => {
    try {
      const rows = await query(
        "SELECT id, real_name, student_number, major FROM students ORDER BY id ASC"
      );
      res.json({ code: 0, data: rows || [] });
    } catch (e) {
      console.error(e);
      res.status(500).json({ code: 500, message: "获取学生列表失败" });
    }
  }
);

// 老师端：更新某学生基础档案（摸高、备注）
skillsRouter.post(
  "/teacher/students/:studentId/profile",
  optionalAuth,
  requireTeacher,
  async (req, res) => {
    try {
      const studentId = Number(req.params.studentId);
      if (!studentId) {
        return res.status(400).json({ code: 400, message: "无效的学生ID" });
      }
      const { base_reach_cm, notes } = req.body || {};
      await query(
        `INSERT INTO student_skill_profiles (student_id, base_reach_cm, notes)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE base_reach_cm = VALUES(base_reach_cm), notes = VALUES(notes)`,
        [
          studentId,
          base_reach_cm == null || base_reach_cm === "" ? null : Number(base_reach_cm),
          notes || null,
        ]
      );
      const [row] = await query(
        "SELECT student_id, base_reach_cm, notes FROM student_skill_profiles WHERE student_id = ?",
        [studentId]
      );
      res.json({ code: 0, message: "保存成功", data: row });
    } catch (e) {
      console.error(e);
      res.status(500).json({ code: 500, message: "保存基础档案失败" });
    }
  }
);

// 获取某个学生的技能档案与技能（老师端查看）
skillsRouter.get(
  "/teacher/students/:studentId/skills",
  optionalAuth,
  requireTeacher,
  async (req, res) => {
    try {
      const studentId = Number(req.params.studentId);
      if (!studentId) {
        return res.status(400).json({ code: 400, message: "无效的学生ID" });
      }
      await ensureStudentSkillsInitialized(studentId);

      const [profileRows, skillRows] = await Promise.all([
        query(
          "SELECT student_id, base_reach_cm, notes FROM student_skill_profiles WHERE student_id = ?",
          [studentId]
        ),
        query(
          "SELECT skill_code, skill_name, category, value, max_value FROM student_skills WHERE student_id = ? ORDER BY category, id",
          [studentId]
        ),
      ]);

      const profile =
        profileRows[0] || {
          student_id: studentId,
          base_reach_cm: null,
          notes: null,
        };

      const grouped = {
        attack: [],
        set: [],
        defense: [],
        custom: [],
      };
      for (const row of skillRows) {
        if (!grouped[row.category]) grouped[row.category] = [];
        grouped[row.category].push(row);
      }

      res.json({
        code: 0,
        data: {
          profile,
          skills: grouped,
        },
      });
    } catch (e) {
      console.error(e);
      res
        .status(500)
        .json({ code: 500, message: "获取学生技能数据失败" });
    }
  }
);

// 老师批量调整某学生技能点
skillsRouter.post(
  "/teacher/students/:studentId/skills/batch-update",
  optionalAuth,
  requireTeacher,
  async (req, res) => {
    try {
      const studentId = Number(req.params.studentId);
      if (!studentId) {
        return res.status(400).json({ code: 400, message: "无效的学生ID" });
      }
      const { updates } = req.body || {};
      if (!Array.isArray(updates) || !updates.length) {
        return res
          .status(400)
          .json({ code: 400, message: "缺少技能更新列表" });
      }
      await ensureStudentSkillsInitialized(studentId);

      for (const item of updates) {
        const code = String(item.skill_code || "").trim();
        if (!code) continue;
        const delta = Number(item.delta ?? 0);
        const value = item.value != null ? Number(item.value) : null;
        const rows = await query(
          "SELECT id, value, max_value FROM student_skills WHERE student_id = ? AND skill_code = ?",
          [studentId, code]
        );
        if (!rows.length) continue;
        const current = Number(rows[0].value) || 0;
        const max = Number(rows[0].max_value) || 100;
        let next = current;
        if (value != null && !Number.isNaN(value)) {
          next = value;
        } else if (!Number.isNaN(delta)) {
          next = current + delta;
        }
        if (Number.isNaN(next)) continue;
        if (next < 0) next = 0;
        if (next > max) next = max;
        await query(
          "UPDATE student_skills SET value = ?, updated_at = NOW() WHERE id = ?",
          [next, rows[0].id]
        );
      }

      res.json({ code: 0, message: "技能已更新" });
    } catch (e) {
      console.error(e);
      res.status(500).json({ code: 500, message: "更新学生技能失败" });
    }
  }
);

// 老师端：调整某支队伍的场上位置分配（限定阵容）
skillsRouter.post(
  "/teacher/teams/:teamId/positions",
  optionalAuth,
  requireTeacher,
  async (req, res) => {
    try {
      const teamId = Number(req.params.teamId);
      if (!teamId) {
        return res.status(400).json({ code: 400, message: "无效的队伍ID" });
      }
      const { members } = req.body || {};
      if (!Array.isArray(members) || !members.length) {
        return res
          .status(400)
          .json({ code: 400, message: "缺少队员位置列表" });
      }

      const limit = {
        OH: 2,
        OPP: 1,
        MB: 2,
        S: 1,
        L: 1,
      };
      const count = { OH: 0, OPP: 0, MB: 0, S: 0, L: 0 };

      for (const m of members) {
        const pos = String(m.court_position || "").toUpperCase();
        if (!pos || !limit[pos]) continue;
        count[pos] += 1;
        if (count[pos] > limit[pos]) {
          return res.status(400).json({
            code: 400,
            message: `位置 ${pos} 超出限制：最多 ${limit[pos]} 人`,
          });
        }
      }

      // 只允许更新该队的已有成员
      const existing = await query(
        "SELECT student_id FROM student_team_members WHERE team_id = ?",
        [teamId]
      );
      const existingSet = new Set(existing.map((r) => r.student_id));

      for (const m of members) {
        const sid = Number(m.student_id);
        if (!sid || !existingSet.has(sid)) continue;
        const pos = m.court_position
          ? String(m.court_position).toUpperCase()
          : null;
        await query(
          "UPDATE student_team_members SET court_position = ? WHERE team_id = ? AND student_id = ?",
          [pos, teamId, sid]
        );
      }

      res.json({ code: 0, message: "队伍位置已更新" });
    } catch (e) {
      console.error(e);
      res.status(500).json({ code: 500, message: "更新队伍位置失败" });
    }
  }
);

// 学生端：加入/退出队伍申请（不直接改成员，由老师审批）
skillsRouter.post(
  "/student/teams/:teamId/join-request",
  optionalAuth,
  requireStudent,
  async (req, res) => {
    try {
      const studentId = req.auth.userId;
      const teamId = Number(req.params.teamId);
      if (!teamId) {
        return res.status(400).json({ code: 400, message: "无效的队伍ID" });
      }
      await touchOnline(studentId);

      const existingMember = await query(
        "SELECT team_id FROM student_team_members WHERE student_id = ?",
        [studentId]
      );
      if (existingMember.length) {
        return res
          .status(400)
          .json({ code: 400, message: "您已在队伍中，如需加入其他队伍请先退出当前队伍" });
      }

      const teamRows = await query(
        "SELECT id FROM student_teams WHERE id = ?",
        [teamId]
      );
      if (!teamRows.length) {
        return res.status(404).json({ code: 404, message: "队伍不存在" });
      }

      await query(
        `INSERT INTO student_team_requests (team_id, student_id, type, status)
         VALUES (?, ?, 'join', 'pending')`,
        [teamId, studentId]
      );
      res.json({ code: 0, message: "已提交加入申请，等待教师审核" });
    } catch (e) {
      console.error(e);
      res.status(500).json({ code: 500, message: "提交加入申请失败" });
    }
  }
);

skillsRouter.post(
  "/student/teams/leave-request",
  optionalAuth,
  requireStudent,
  async (req, res) => {
    try {
      const studentId = req.auth.userId;
      await touchOnline(studentId);

      const rows = await query(
        `SELECT m.team_id
         FROM student_team_members m
         WHERE m.student_id = ?`,
        [studentId]
      );
      if (!rows.length) {
        return res
          .status(400)
          .json({ code: 400, message: "当前不在任何队伍中" });
      }
      const teamId = rows[0].team_id;

      await query(
        `INSERT INTO student_team_requests (team_id, student_id, type, status)
         VALUES (?, ?, 'leave', 'pending')`,
        [teamId, studentId]
      );
      res.json({ code: 0, message: "已提交退出申请，等待教师审核" });
    } catch (e) {
      console.error(e);
      res.status(500).json({ code: 500, message: "提交退出申请失败" });
    }
  }
);

// 老师端：查看与审批队伍申请
skillsRouter.get(
  "/teacher/team-requests",
  optionalAuth,
  requireTeacher,
  async (_req, res) => {
    try {
      const rows = await query(
        `SELECT r.id, r.team_id, r.student_id, r.type, r.status, r.comment,
                r.created_at, r.handled_at,
                s.real_name AS student_name, s.student_number,
                t.name AS team_name
         FROM student_team_requests r
         JOIN students s ON s.id = r.student_id
         JOIN student_teams t ON t.id = r.team_id
         ORDER BY r.created_at DESC`
      );
      res.json({ code: 0, data: rows });
    } catch (e) {
      console.error(e);
      res.status(500).json({ code: 500, message: "获取队伍申请失败" });
    }
  }
);

async function handleTeamRequest(id, teacherId, approve, comment) {
  const [reqRow] = await query(
    "SELECT * FROM student_team_requests WHERE id = ?",
    [id]
  );
  if (!reqRow || reqRow.status !== "pending") {
    return { ok: false, message: "申请不存在或已处理" };
  }
  const status = approve ? "approved" : "rejected";

  await query(
    `UPDATE student_team_requests
     SET status = ?, comment = ?, handled_at = NOW(), handled_by_teacher_id = ?
     WHERE id = ?`,
    [status, comment || null, teacherId, id]
  );

  if (!approve) {
    return { ok: true };
  }

  if (reqRow.type === "join") {
    const existing = await query(
      "SELECT team_id FROM student_team_members WHERE student_id = ?",
      [reqRow.student_id]
    );
    if (!existing.length) {
      await query(
        `INSERT INTO student_team_members (team_id, student_id, role)
         VALUES (?, ?, 'member')`,
        [reqRow.team_id, reqRow.student_id]
      );
    }
  } else if (reqRow.type === "leave") {
    await query(
      "DELETE FROM student_team_members WHERE team_id = ? AND student_id = ?",
      [reqRow.team_id, reqRow.student_id]
    );
  }
  return { ok: true };
}

skillsRouter.post(
  "/teacher/team-requests/:id/approve",
  optionalAuth,
  requireTeacher,
  async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!id) {
        return res.status(400).json({ code: 400, message: "无效的申请ID" });
      }
      const { comment } = req.body || {};
      const result = await handleTeamRequest(
        id,
        req.auth.userId,
        true,
        comment
      );
      if (!result.ok) {
        return res.status(400).json({ code: 400, message: result.message });
      }
      res.json({ code: 0, message: "已批准申请" });
    } catch (e) {
      console.error(e);
      res.status(500).json({ code: 500, message: "批准申请失败" });
    }
  }
);

skillsRouter.post(
  "/teacher/team-requests/:id/reject",
  optionalAuth,
  requireTeacher,
  async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!id) {
        return res.status(400).json({ code: 400, message: "无效的申请ID" });
      }
      const { comment } = req.body || {};
      const result = await handleTeamRequest(
        id,
        req.auth.userId,
        false,
        comment
      );
      if (!result.ok) {
        return res.status(400).json({ code: 400, message: result.message });
      }
      res.json({ code: 0, message: "已驳回申请" });
    } catch (e) {
      console.error(e);
      res.status(500).json({ code: 500, message: "驳回申请失败" });
    }
  }
);

// 老师端：查看所有队伍及成员（含位置）
skillsRouter.get(
  "/teacher/teams",
  optionalAuth,
  requireTeacher,
  async (_req, res) => {
    try {
      const teams = await query(
        "SELECT id, name, description, owner_student_id, created_at FROM student_teams ORDER BY id ASC"
      );
      const members = await query(
        `SELECT m.team_id, m.student_id, m.role, m.court_position,
                s.real_name, s.student_number, s.major
         FROM student_team_members m
         JOIN students s ON s.id = m.student_id
         ORDER BY m.team_id, s.id`
      );
      res.json({ code: 0, data: { teams, members } });
    } catch (e) {
      console.error(e);
      res.status(500).json({ code: 500, message: "获取队伍列表失败" });
    }
  }
);

