import { query } from "../../db/connection.js";
import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

export const teacherStore = {
  async findByUsername(username) {
    const rows = await query("SELECT * FROM teachers WHERE username = ?", [username]);
    return rows[0] || null;
  },

  async getPasswordHashById(id) {
    const rows = await query("SELECT password FROM teachers WHERE id = ?", [id]);
    return rows[0]?.password || null;
  },

  async findById(id) {
    const rows = await query(
      `SELECT id, username, real_name, email, phone, major, gender, avatar, birthday,
              professional_level, department, office, introduction, teaching_years, teaching_experience,
              created_at, updated_at FROM teachers WHERE id = ?`,
      [id]
    );
    return rows[0] || null;
  },

  async create(data) {
    const existing = await this.findByUsername(data.username);
    if (existing) return null;
    const hash = await bcrypt.hash(data.password, SALT_ROUNDS);
    const result = await query(
      `INSERT INTO teachers (username, password, real_name, email, phone, major, gender, avatar, birthday,
        professional_level, department, office, introduction, teaching_years, teaching_experience)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.username,
        hash,
        data.real_name || "",
        data.email || null,
        data.phone || null,
        data.major || null,
        data.gender ?? null,
        data.avatar || null,
        data.birthday || null,
        data.professional_level || null,
        data.department || null,
        data.office || null,
        data.introduction || null,
        data.teaching_years ?? null,
        data.teaching_experience || null,
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
    await query("UPDATE teachers SET password = ? WHERE id = ?", [hash, id]);
    return true;
  },

  async update(id, data) {
    const allowed = [
      "real_name", "email", "phone", "major", "gender", "avatar", "birthday",
      "professional_level", "department", "office", "introduction", "teaching_years", "teaching_experience",
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
        } else if (key === "teaching_years") {
          updates.push("teaching_years = ?");
          values.push(data[key] === "" || data[key] === null ? null : Number(data[key]));
        } else {
          updates.push(`${key} = ?`);
          values.push(data[key] === "" ? null : data[key]);
        }
      }
    }
    if (updates.length === 0) return this.findById(id);
    values.push(id);
    await query(
      `UPDATE teachers SET ${updates.join(", ")} WHERE id = ?`,
      values
    );
    return this.findById(id);
  },
};
