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

  const studentNames = [
    "李明","王磊","张强","刘洋","陈浩","赵俊","黄凯","周航","吴凡","徐晨",
    "孙宇","马超","朱鹏","胡杰","郭亮","何鑫","高阳","林涛","罗毅","郑峰",
    "杨帆","唐伟","宋博","谢飞","韩旭","许睿","邓辉","彭宇","蒋昊","卢森",
    "曹瑞","丁一","邱泽","苏航","叶凯","潘俊","冯杰","董浩","余晨","方磊",
    "金昊","石磊","田宇","段飞","白宇","任航","钟凯","崔俊","邹阳","严浩",
  ];

  const courseNamePool = [
    "扣球动作入门与节奏训练",
    "直线扣球专项提高",
    "斜线扣球与线路变化",
    "腰线扣球与落点控制",
    "快攻扣球与起跳时机",
    "二传手型与指力训练",
    "平拉开传球与配合",
    "背快与战术分配训练",
    "冲进与短球配合训练",
    "后二与背飞进阶",
    "一传基础与站位训练",
    "一传到位率强化训练",
    "防守移动与卡位意识",
    "防重扣与起球质量训练",
    "防吊球与探头球处理",
    "后排防守覆盖范围训练",
    "自由人一传防守专项",
    "拦网手型与起跳训练",
    "双人拦网配合训练",
    "拦防体系与转换训练",
    "上手发球动作精修",
    "跳发球力量与稳定性",
    "发球落点与战术发球",
    "接发球站位与应对",
    "发接发对抗与实战",
    "攻防转换与快速反击",
    "小球处理与串联训练",
    "团队配合与战术演练",
    "分组对抗与轮转训练",
    "赛前热身与运动防护",
  ];

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
      const realName = studentNames[i - 1] || `学生${i}`;
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
      const realName = studentNames[n - 1] || `学生${n}`;
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
  }

  // 额外确保 teacher3/teacher4 存在（按需求）
  const extraTeachers = [
    { username: "teacher3", real_name: "teacher3" },
    { username: "teacher4", real_name: "teacher4" },
  ];
  for (const t of extraTeachers) {
    const rows = await query("SELECT id FROM teachers WHERE username = ?", [
      t.username,
    ]);
    if (!rows.length) {
      await query(
        `INSERT INTO teachers (username, password, real_name, major, gender)
         VALUES (?, ?, ?, '排球', 1)`,
        [t.username, teacherPassword, t.real_name]
      );
      console.log(`Inserted extra teacher ${t.username} / 123456.`);
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
       ('传球训练', '专注二传手手指力量及精准度训练'),
       ('防守训练', '防守移动、卡位意识与后排起球训练')`
    );
    console.log("Inserted 4 course categories.");
  } else {
    console.log("Course categories already exist, skip seed.");
  }

  // 课程示例（需先有教师和分类）
  const [courseCntRow] = await query("SELECT COUNT(*) AS cnt FROM courses");
  const courseCount = Number(courseCntRow?.cnt ?? 0) || 0;
  if (courseCount < 30) {
    const teachers = await query("SELECT id FROM teachers ORDER BY id ASC");
    const categories = await query("SELECT id, name FROM course_categories ORDER BY id ASC");
    if (teachers.length && categories.length) {
      const schedules = [
        "周一 10:00",
        "周一 14:00",
        "周二 14:00",
        "周二 16:00",
        "周三 10:00",
        "周三 16:00",
        "周四 14:00",
        "周四 15:30",
        "周五 09:00",
        "周六 10:00",
      ];
      const locations = ["体育馆A馆", "体育馆B馆", "体育馆训练场"];
      const need = 30 - courseCount;
      const rows = [];
      const values = [];
      for (let i = 0; i < need; i++) {
        const idx = courseCount + i + 1;
        const t = teachers[idx % teachers.length].id;
        const cat = categories[idx % categories.length].id;
        const schedule = schedules[idx % schedules.length];
        const name = courseNamePool[(idx - 1) % courseNamePool.length] + `（${idx}）`;
        const credits = 1.5;
        const capacity = 15;
        const current = 0;
        const location = locations[idx % locations.length];
        const enrollStart = "2026-03-01";
        const enrollEnd = "2026-03-30";
        const start = "2026-04-01";
        const end = "2026-06-30";
        const description = "系统自动补充的训练课程";
        const tags = "训练,排球";
        const requirements = "无";
        const syllabus = "基础训练与实战配合";
        const difficulty = (idx % 3) + 1;
        const lessonCount = 12 + (idx % 6);
        const recommend = 4.2;
        const visible = 1;
        rows.push("(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        values.push(
          name,
          credits,
          capacity,
          current,
          location,
          schedule,
          enrollStart,
          enrollEnd,
          start,
          end,
          description,
          tags,
          requirements,
          syllabus,
          difficulty,
          lessonCount,
          recommend,
          visible,
          t,
          cat
        );
      }
      await query(
        `INSERT INTO courses (name, credits, capacity, current_enrollment, location, schedule_weekly, enroll_start_date, enroll_end_date, start_date, end_date, description, tags, requirements, syllabus, difficulty, lesson_count, recommend_index, is_visible, teacher_id, category_id)
         VALUES ${rows.join(",")}`,
        values
      );
      console.log(`Inserted ${need} courses to reach 30.`);
    }
  } else {
    console.log("Courses already >= 30, skip top-up.");
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
