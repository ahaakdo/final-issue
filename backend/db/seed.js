import "dotenv/config";
import { query } from "./connection.js";
import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

async function hash(pwd) {
  return bcrypt.hash(pwd, SALT_ROUNDS);
}

async function seed() {
  const studentPassword = await hash("123456");
  const teacherPassword = await hash("123456");

  // 学生示例：确保至少有 50 个学生，不足则补充
  const [studentCountRow] = await query("SELECT COUNT(*) AS cnt FROM students");
  let studentCount = studentCountRow?.cnt ?? 0;
  if (studentCount === 0) {
    const majors = ["体育教育", "运动训练", "社会体育", "排球专项"];
    const genders = [0, 1];
    const values = [];
    const rows = [];
    for (let i = 1; i <= 50; i++) {
      const username = `stu${i}`;
      const studentNo = `2026${String(100 + i).slice(1)}`;
      const realName = `学生${i}`;
      const email = `stu${i}@edu.cn`;
      const phone = `1380000${String(100 + i).slice(1)}`;
      const major = majors[i % majors.length];
      const gender = genders[i % genders.length];
      const dorm = `${1 + (i % 4)}号楼${200 + i}室`;
      rows.push(
        "(?, ?, ?, ?, ?, ?, ?, ?, '2005-01-01', ?)"
      );
      values.push(
        username,
        studentPassword,
        studentNo,
        realName,
        email,
        phone,
        major,
        gender,
        dorm
      );
    }
    const sql = `
      INSERT INTO students
        (username, password, student_number, real_name, email, phone, major, gender, birthday, dormitory)
      VALUES
        ${rows.join(",")}`;
    await query(sql, values);
    console.log("Inserted 50 students (stu1~stu50 / 123456).");
    studentCount = 50;
  } else if (studentCount < 50) {
    const [maxIdRow] = await query("SELECT COALESCE(MAX(id), 0) AS mx FROM students");
    const startId = maxIdRow?.mx ?? 0;
    const existingUsernames = await query("SELECT username FROM students");
    const nameSet = new Set(existingUsernames.map((r) => r.username));
    const majors = ["体育教育", "运动训练", "社会体育", "排球专项"];
    const genders = [0, 1];
    const toAdd = 50 - studentCount;
    const rows = [];
    const values = [];
    for (let i = 1; i <= toAdd; i++) {
      const n = studentCount + i;
      const username = `stu${n}`;
      if (nameSet.has(username)) continue;
      nameSet.add(username);
      const studentNo = `2026${String(100 + n).slice(1)}`;
      const realName = `学生${n}`;
      const email = `stu${n}@edu.cn`;
      const phone = `1380000${String(100 + n).slice(1)}`;
      const major = majors[n % majors.length];
      const gender = genders[n % 2];
      const dorm = `${1 + (n % 4)}号楼${200 + n}室`;
      rows.push("(?, ?, ?, ?, ?, ?, ?, ?, '2005-01-01', ?)");
      values.push(
        username,
        studentPassword,
        studentNo,
        realName,
        email,
        phone,
        major,
        gender,
        dorm
      );
    }
    if (rows.length) {
      await query(
        `INSERT INTO students (username, password, student_number, real_name, email, phone, major, gender, birthday, dormitory) VALUES ${rows.join(",")}`,
        values
      );
      console.log(`Inserted ${rows.length} more students to reach 50.`);
    }
    studentCount = 50;
  } else {
    console.log("Students already exist (>=50), skip student insert.");
  }

  // 教师示例
  const existingTeachers = await query("SELECT id FROM teachers LIMIT 1");
  if (existingTeachers.length === 0) {
    await query(
      `INSERT INTO teachers (username, password, real_name, email, phone, major, gender, birthday, professional_level, department, office, introduction, teaching_years, teaching_experience) VALUES
       (?, ?, '刘教练', 'liujiaolian@edu.cn', '13900139001', '排球', 1, '1980-06-10', '国家一级运动员', '排球教研组', '体育馆A301', '多年带队经验，曾获省赛冠军。', 15, '曾任省青年队教练，擅长发球与拦网教学。'),
       (?, ?, '陈老师', 'chenteacher@edu.cn', '13900139002', '排球', 0, '1985-09-05', '国家二级运动员', '排球教研组', '体育馆A302', '专注基础与战术训练。', 10, '带队参加市赛多次获奖。')`,
      [
        "teacher1", teacherPassword,
        "teacher2", teacherPassword,
      ]
    );
    console.log("Inserted 2 teachers (teacher1, teacher2 / 123456).");
  } else {
    console.log("Teachers already exist, skip base teacher seed.");
    // 额外确保 teacher3/teacher4/teacher5 存在
    const extraTeachers = [
      { username: "teacher3", real_name: "王老师" },
      { username: "teacher4", real_name: "张老师" },
      { username: "teacher5", real_name: "李老师" },
    ];
    for (const t of extraTeachers) {
      const rows = await query(
        "SELECT id FROM teachers WHERE username = ?",
        [t.username]
      );
      if (!rows.length) {
        await query(
          `INSERT INTO teachers (username, password, real_name, major, gender)
           VALUES (?, ?, ?, '排球', 1)`,
          [t.username, teacherPassword, t.real_name]
        );
        console.log(`Inserted extra teacher ${t.username} / 123456.`);
      }
    }
  }

  // 课程分类默认数据（与图示一致）
  const existingCategories = await query("SELECT id FROM course_categories LIMIT 1");
  if (existingCategories.length === 0) {
    await query(
      `INSERT INTO course_categories (name, description) VALUES
       ('扣球训练', '专注扣球发力、起跳时机与击球点控'),
       ('接球训练', '包含垫球姿势、一传稳定性训练'),
       ('发球训练', '涵盖上手发球、跳发球及发球落点控'),
       ('传球训练', '专注二传手手指力量及精准度训练')`
    );
    console.log("Inserted 4 course categories.");
  } else {
    console.log("Course categories already exist, skip seed.");
  }

  // 课程示例（需先有教师和分类）
  const existingCourses = await query("SELECT id FROM courses LIMIT 1");
  if (existingCourses.length === 0) {
    const teachers = await query("SELECT id FROM teachers ORDER BY id LIMIT 2");
    if (teachers.length >= 2) {
      const t1 = teachers[0].id;
      const t2 = teachers[1].id;
      await query(
        `INSERT INTO courses (name, credits, capacity, current_enrollment, location, schedule_weekly, enroll_start_date, enroll_end_date, start_date, end_date, description, tags, requirements, syllabus, difficulty, lesson_count, recommend_index, is_visible, teacher_id, category_id) VALUES
         ('扣球基础入门', 1.5, 15, 3, '体育馆A馆', '周二 14:00', '2026-03-01', '2026-03-20', '2026-03-25', '2026-06-20', '零基础扣球动作与起跳节奏', '基础,入门', '无', '1.挥臂 2.起跳 3.击球点', 1, 12, 4.5, 1, ?, 1),
         ('强力扣球进阶', 2, 12, 5, '体育馆A馆', '周四 15:30', '2026-03-01', '2026-03-25', '2026-04-01', '2026-06-30', '提升扣球力量与线路变化', '高强度,技术流', '需完成扣球基础', '1.力量 2.线路 3.战术', 2, 16, 4.8, 1, ?, 1),
         ('一传稳定性训练', 1.5, 18, 8, '体育馆B馆', '周一 10:00', '2026-03-05', '2026-03-28', '2026-04-05', '2026-06-15', '垫球与一传到位率训练', '基础', '无', '1.垫球 2.一传 3.配合', 1, 14, 4.2, 1, ?, 2),
         ('接发球战术', 2, 10, 2, '体育馆B馆', '周三 16:00', '2026-03-01', '2026-03-30', '2026-04-06', '2026-07-01', '接发球站位与战术应用', '技术流', '有一传基础', '1.站位 2.判断 3.战术', 2, 18, 4.6, 1, ?, 2),
         ('上手发球精修', 1, 20, 12, '体育馆A馆', '周五 09:00', '2026-03-01', '2026-03-15', '2026-03-20', '2026-05-31', '上手发球动作与稳定性', '入门', '无', '1.抛球 2.挥臂 3.落点', 1, 10, 4.0, 1, ?, 3),
         ('大力跳发训练', 2, 8, 0, '体育馆A馆', '周一 14:00', '2026-03-06', '2026-03-25', '2026-03-30', '2026-06-30', '跳发球技术与力量训练', '高强度', '有上手发球基础', '1.助跑 2.起跳 3.击球', 3, 16, 4.9, 1, ?, 3),
         ('二传手基础', 1.5, 12, 4, '体育馆A馆', '周二 16:00', '2026-03-01', '2026-03-22', '2026-03-28', '2026-06-25', '二传手指法与分配球', '基础,技术流', '无', '1.手型 2.分配 3.节奏', 1, 14, 4.3, 1, ?, 4),
         ('传球与战术组织', 2, 10, 6, '体育馆A馆', '周四 14:00', '2026-03-05', '2026-03-28', '2026-04-02', '2026-06-28', '组织进攻与快攻配合', '技术流', '有二传基础', '1.快攻 2.平拉开 3.战术', 2, 16, 4.7, 1, ?, 4),
         ('发球与接发综合', 2, 15, 7, '体育馆B馆', '周六 10:00', '2026-03-01', '2026-03-25', '2026-04-01', '2026-06-30', '发接发对抗与实战', '高强度', '有发球和接球基础', '综合对抗', 2, 12, 4.5, 1, ?, 3),
         ('拦网入门', 1, 16, 5, '体育馆B馆', '周三 10:00', '2026-03-01', '2026-03-20', '2026-03-25', '2026-05-20', '拦网起跳与手型', '入门', '无', '1.起跳 2.手型 3.时机', 1, 8, 4.1, 1, ?, 1)`,
        [t1, t1, t1, t1, t2, t2, t2, t2, t2, t1]
      );
      console.log("Inserted 10 sample courses.");
    }
  } else {
    console.log("Courses already exist, skip seed.");
  }

  // 女排专栏示例数据
  const [rioCount] = await query(
    "SELECT COUNT(*) AS cnt FROM rio_women_volleyball_players"
  );
  if (rioCount.cnt === 0) {
    await query(`
      INSERT INTO rio_women_volleyball_players
        (name, position, number, birthday, height_cm, club, intro)
      VALUES
        ('朱婷', '主攻', 2, '1994-11-29', 198, '瓦基弗银行俱乐部', '中国女排核心主攻，里约奥运会MVP，以强劲的进攻火力和全面能力著称。'),
        ('张常宁', '主攻/接应', 9, '1995-11-06', 195, '江苏中天钢铁女排', '攻防兼备的主攻手，在里约奥运会中承担重要的一传与进攻任务。'),
        ('惠若琪', '主攻', 12, '1991-03-04', 192, '江苏中天钢铁女排', '队长之一，以稳定的一传、防守和串联能力闻名，是球队的“定海神针”。'),
        ('袁心玥', '副攻', 1, '1996-12-21', 201, '八一深圳女排', '身高出众的副攻，拦网和快攻能力突出，是中国女排网口高度的重要保障。'),
        ('徐云丽', '副攻', 8, '1987-08-02', 196, '福建阳光城女排', '经验丰富的副攻，以出色的拦网判断和比赛阅读能力见长。'),
        ('颜妮', '副攻', 17, '1987-03-01', 192, '辽宁女排', '以“北长城”著称的拦网高手，多次在关键比赛中凭借拦网改变走势。'),
        ('魏秋月', '二传', 3, '1988-09-26', 182, '天津渤海银行女排', '中国女排二传核心之一，传球节奏感极佳，是球队战术组织的关键。'),
        ('丁霞', '二传', 6, '1990-01-13', 180, '辽宁女排', '作风顽强的二传，以灵动多变的传球和防守覆盖见长。'),
        ('林莉', '自由人', 15, '1992-07-15', 171, '福建阳光城女排', '世界级自由人，防守范围大，一传稳定，是后排防守的核心。'),
        ('龚翔宇', '接应', 7, '1997-04-21', 186, '江苏中天钢铁女排', '里约周期崭露头角的年轻接应，以稳定发挥赢得“关键先生”称号。'),
        ('刘晓彤', '主攻', 10, '1990-02-16', 188, '北京汽车女排', '替补奇兵型主攻，多次在关键时刻顶住压力，贡献发球和进攻。'),
        ('杨方旭', '接应', 16, '1994-10-06', 190, '山东体彩女排', '力量型接应，发球和强攻能力突出，为球队提供火力支持。')
    `);
    console.log("Inserted sample rio_women_volleyball_players.");
  } else {
    console.log("rio_women_volleyball_players already exist, skip seed.");
  }

  // 经典赛事示例数据
  const [matchCount] = await query(
    "SELECT COUNT(*) AS cnt FROM classic_volleyball_matches"
  );
  if (matchCount.cnt === 0) {
    await query(`
      INSERT INTO classic_volleyball_matches
        (title, event_name, match_date, opponent, round, video_url, description)
      VALUES
        ('中国女排 vs 塞尔维亚 · 里约奥运会决赛', '2016 里约奥运会', '2016-08-20', '塞尔维亚女排', '决赛', 'https://www.bilibili.com/video/BV1xxxxxxx1', '中国女排在先失一局的不利局面下连扳三局，逆转战胜塞尔维亚，时隔12年再夺奥运金牌。'),
        ('中国女排 vs 荷兰 · 里约奥运会半决赛', '2016 里约奥运会', '2016-08-18', '荷兰女排', '半决赛', 'https://www.bilibili.com/video/BV1xxxxxxx2', '面对此前小组赛曾输给的对手荷兰队，中国女排顶住压力，3:1赢下关键之战，挺进决赛。'),
        ('中国女排 vs 巴西 · 里约奥运会四分之一决赛', '2016 里约奥运会', '2016-08-16', '巴西女排', '1/4决赛', 'https://www.bilibili.com/video/BV1xxxxxxx3', '在马拉卡纳吉诺体育馆，上演“生死战”，中国女排3:2淘汰东道主巴西，堪称经典之战。'),
        ('中国女排 vs 美国 · 世界女排大奖赛总决赛', '2015 世界女排大奖赛', '2015-07-25', '美国女排', '总决赛', 'https://www.bilibili.com/video/BV1xxxxxxx4', '与美国队的较量展现了双方高水平的对抗，中国女排在落后的情况下不断追分，打出世界级回合。'),
        ('中国女排 vs 俄罗斯 · 世锦赛经典大战', '2014 女排世锦赛', '2014-10-08', '俄罗斯女排', '小组赛', 'https://www.bilibili.com/video/BV1xxxxxxx5', '面对老牌劲旅俄罗斯队，中国女排展现年轻活力，通过快速多变的战术取得比赛胜利。')
    `);
    console.log("Inserted sample classic_volleyball_matches.");
  } else {
    console.log("classic_volleyball_matches already exist, skip seed.");
  }

  // 确保恰好 7 个训练小队，前 49 名学生入队（每队 7 人），第 50 名未入队可随时申请加入
  const students = await query(
    "SELECT id, real_name FROM students ORDER BY id ASC LIMIT 50"
  );
  const teamRows = await query("SELECT id FROM student_teams ORDER BY id ASC");
  const needReseed = teamRows.length !== 7;
  if (needReseed && students.length >= 49) {
    await query("DELETE FROM student_team_members");
    await query("DELETE FROM student_team_requests");
    await query("DELETE FROM student_teams");
    const pattern = ["OH", "OH", "OPP", "MB", "MB", "S", "L"];
    for (let t = 0; t < 7; t++) {
      const teamName = `训练小队${t + 1}`;
      const ownerId = students[t * 7].id;
      const result = await query(
        "INSERT INTO student_teams (name, description, owner_student_id) VALUES (?, ?, ?)",
        [teamName, "排球训练小队", ownerId]
      );
      const teamId = result.insertId;
      const valuePlaceholders = [];
      const memberValues = [];
      for (let i = 0; i < 7; i++) {
        const stu = students[t * 7 + i];
        if (!stu) break;
        valuePlaceholders.push("(?, ?, ?, ?, NOW())");
        memberValues.push(
          teamId,
          stu.id,
          i === 0 ? "captain" : "member",
          pattern[i]
        );
      }
      if (valuePlaceholders.length) {
        await query(
          `INSERT INTO student_team_members (team_id, student_id, role, court_position, joined_at) VALUES ${valuePlaceholders.join(",")}`,
          memberValues
        );
      }
    }
    console.log("Ensured exactly 7 squads; 49 students in squads, 1 free to join.");
  } else if (!needReseed) {
    console.log("Student teams already 7, skip team seed.");
  }

  // 为前 50 名学生初始化技能并随机分配技能点，保证随时可加入小队（已有 7 队且多数已在队内）
  const ALL_FIXED_SKILLS = [
    { code: "atk_line", name: "直线扣球", category: "attack" },
    { code: "atk_small_diagonal", name: "小斜线扣球", category: "attack" },
    { code: "atk_waist_line", name: "腰线扣球", category: "attack" },
    { code: "atk_big_diagonal", name: "大斜线扣球", category: "attack" },
    { code: "set_flat", name: "平拉开", category: "set" },
    { code: "set_quick", name: "快攻", category: "set" },
    { code: "set_back_quick", name: "背快", category: "set" },
    { code: "set_chase_in", name: "冲进", category: "set" },
    { code: "set_short", name: "短球", category: "set" },
    { code: "set_gap", name: "加塞", category: "set" },
    { code: "set_back_fly", name: "背飞", category: "set" },
    { code: "set_two_back", name: "后二", category: "set" },
    { code: "def_pass_accuracy", name: "一传到位率", category: "defense" },
    { code: "def_ball_quality", name: "起球质量", category: "defense" },
    { code: "def_positioning", name: "卡位意识", category: "defense" },
    { code: "def_heavy_spike", name: "防重扣", category: "defense" },
    { code: "def_tipping", name: "防吊球", category: "defense" },
    { code: "def_tip_over", name: "防探头", category: "defense" },
    { code: "def_dig", name: "救球能力", category: "defense" },
    { code: "def_coverage", name: "防守覆盖范围", category: "defense" },
  ];
  const studentIds = students.map((s) => s.id);
  for (const sid of studentIds) {
    const [cnt] = await query(
      "SELECT COUNT(*) AS cnt FROM student_skills WHERE student_id = ?",
      [sid]
    );
    if (cnt.cnt === 0) {
      const values = [];
      const placeholders = ALL_FIXED_SKILLS.map(() => "(?, ?, ?, ?, ?, ?)").join(", ");
      for (const s of ALL_FIXED_SKILLS) {
        values.push(sid, s.code, s.name, s.category, 0, 100);
      }
      await query(
        `INSERT INTO student_skills (student_id, skill_code, skill_name, category, value, max_value) VALUES ${placeholders}`,
        values
      );
    }
    const ids = await query(
      "SELECT id FROM student_skills WHERE student_id = ?",
      [sid]
    );
    for (const row of ids) {
      const val = Math.floor(Math.random() * 101);
      await query("UPDATE student_skills SET value = ? WHERE id = ?", [val, row.id]);
    }
    const reach = 240 + Math.floor(Math.random() * 41);
    await query(
      `INSERT INTO student_skill_profiles (student_id, base_reach_cm, notes)
       VALUES (?, ?, NULL)
       ON DUPLICATE KEY UPDATE base_reach_cm = VALUES(base_reach_cm)`,
      [sid, reach]
    );
  }
  console.log(
    "Ensured 50 students have skill profiles and random skill values (0-100)."
  );

  // 确保前 50 个学生至少参与一门课程（复用上面的 students 列表）
  const courses = await query(
    "SELECT id FROM courses ORDER BY id ASC"
  );
  if (students.length && courses.length) {
    for (let i = 0; i < students.length; i++) {
      const stuId = students[i].id;
      const [cntRow] = await query(
        "SELECT COUNT(*) AS cnt FROM course_enrollments WHERE student_id = ?",
        [stuId]
      );
      if (cntRow.cnt > 0) continue;
      const course = courses[i % courses.length];
      await query(
        `INSERT INTO course_enrollments
           (course_id, student_id, status, enroll_pending, enroll_status, created_at, updated_at)
         VALUES (?, ?, 'enrolled', 0, 'approved', NOW(), NOW())
         ON DUPLICATE KEY UPDATE status = VALUES(status)`,
        [course.id, stuId]
      );
      await query(
        "UPDATE courses SET current_enrollment = current_enrollment + 1 WHERE id = ?",
        [course.id]
      );
    }
    console.log(
      "Ensured first 50 students each have at least one course enrollment."
    );
  }
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
