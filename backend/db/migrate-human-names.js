import { query } from "./connection.js";

const studentNames = [
  "李明","王磊","张强","刘洋","陈浩","赵俊","黄凯","周航","吴凡","徐晨",
  "孙宇","马超","朱鹏","胡杰","郭亮","何鑫","高阳","林涛","罗毅","郑峰",
  "杨帆","唐伟","宋博","谢飞","韩旭","许睿","邓辉","彭宇","蒋昊","卢森",
  "曹瑞","丁一","邱泽","苏航","叶凯","潘俊","冯杰","董浩","余晨","方磊",
  "金昊","石磊","田宇","段飞","白宇","任航","钟凯","崔俊","邹阳","严浩",
];

// 30 个具体排球课程名（可按分类偏好扩展）
const courseNames = [
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

async function migrate() {
  // 1) 学生姓名：将“学生1..学生50”替换为真实姓名
  const students = await query(
    "SELECT id, real_name FROM students ORDER BY id ASC LIMIT 50"
  );
  for (let i = 0; i < students.length && i < studentNames.length; i++) {
    const s = students[i];
    if (/^学生\d+$/.test(String(s.real_name || ""))) {
      await query("UPDATE students SET real_name = ? WHERE id = ?", [
        studentNames[i],
        s.id,
      ]);
    }
  }

  // 2) 课程名称：将“训练课程xx”替换为具体排球课程名
  const courses = await query("SELECT id, name FROM courses ORDER BY id ASC LIMIT 200");
  let cursor = 0;
  for (const c of courses) {
    if (/^训练课程\d+$/.test(String(c.name || ""))) {
      const next = courseNames[cursor % courseNames.length];
      cursor += 1;
      await query("UPDATE courses SET name = ? WHERE id = ?", [next, c.id]);
    }
  }

  console.log("migrate-human-names done");
}

migrate().catch((e) => {
  console.error(e);
  process.exit(1);
});

