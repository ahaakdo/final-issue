import { query } from "../../db/connection.js";
import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

/** 生成学号：当前年份 + 2005 + 001 递增，如 2025001, 2025002 */
async function nextStudentNumber() {
  const year = new Date().getFullYear();
  const prefix = String(year); // 年份 + 后三位递增，如 2025001
  const rows = await query(
    "SELECT student_number FROM students WHERE student_number LIKE ? ORDER BY id DESC LIMIT 1",
    [prefix + "%"]
  );
  let next = 1;
  if (rows.length > 0) {
    const last = rows[0].student_number;
    const num = parseInt(last.slice(-3), 10);
    next = (num || 0) + 1;
  }
  const suffix = String(next).padStart(3, "0");
  return prefix + suffix;
}

export const studentStore = {
  async findByUsername(username) {
    const rows = await query("SELECT * FROM students WHERE username = ?", [username]);
    return rows[0] || null;
  },

  async getPasswordHashById(id) {
    const rows = await query("SELECT password FROM students WHERE id = ?", [id]);
    return rows[0]?.password || null;
  },

  async findById(id) {
    const rows = await query(
      "SELECT id, username, student_number, real_name, email, phone, major, gender, avatar, birthday, dormitory, created_at, updated_at FROM students WHERE id = ?",
      [id]
    );
    return rows[0] || null;
  },

  async create(data) {
    const existing = await this.findByUsername(data.username);
    if (existing) return null;
    const studentNumber = await nextStudentNumber();
    const hash = await bcrypt.hash(data.password, SALT_ROUNDS);
    const result = await query(
      `INSERT INTO students (username, password, student_number, real_name, email, phone, major, gender, avatar, birthday, dormitory)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.username,
        hash,
        studentNumber,
        data.real_name || "",
        data.email || null,
        data.phone || null,
        data.major || null,
        data.gender ?? null,
        data.avatar || null,
        data.birthday || null,
        data.dormitory || null,
      ]
    );
    return this.findById(result.insertId);
  },

  async verifyPassword(plain, hash) {
    return bcrypt.compare(plain, hash);
  },

  async setPassword(id, newPassword) {
    const pwd = String(newPassword || "").trim();
    if (pwd.length < 6) return false;
    const hash = await bcrypt.hash(pwd, SALT_ROUNDS);
    await query("UPDATE students SET password = ? WHERE id = ?", [hash, id]);
    return true;
  },

  async update(id, data) {
    const allowed = [
      "real_name", "email", "phone", "major", "gender", "avatar", "birthday", "dormitory",
    ];
    const updates = [];
    const values = [];
    for (const key of allowed) {
      if (data[key] !== undefined) {
        if (key === "gender") {
          updates.push("gender = ?");
          values.push(data[key] === "" || data[key] === null ? null : Number(data[key]));
        } else if (key === "birthday") {
          updates.push("birthday = ?");
          values.push(data[key] || null);
        } else {
          updates.push(`${key} = ?`);
          values.push(data[key] === "" ? null : data[key]);
        }
      }
    }
    if (updates.length === 0) return this.findById(id);
    values.push(id);
    await query(
      `UPDATE students SET ${updates.join(", ")} WHERE id = ?`,
      values
    );
    return this.findById(id);
  },
};
