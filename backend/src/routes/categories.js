import { Router } from "express";
import { query } from "../../db/connection.js";

export const categoriesRouter = Router();

// 获取课程分类列表
categoriesRouter.get("/categories", async (_req, res) => {
  try {
    const rows = await query(
      "SELECT id, name, description, created_at, updated_at FROM course_categories ORDER BY id ASC"
    );
    res.json({ code: 0, data: rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ code: 500, message: "获取分类列表失败" });
  }
});

// 新增课程分类
categoriesRouter.post("/categories", async (req, res) => {
  try {
    const { name, description } = req.body || {};
    if (!name || !name.trim()) {
      return res.status(400).json({ code: 400, message: "分类名字不能为空" });
    }
    const result = await query(
      "INSERT INTO course_categories (name, description) VALUES (?, ?)",
      [name.trim(), description ? description.trim() : null]
    );
    const rows = await query("SELECT id, name, description, created_at, updated_at FROM course_categories WHERE id = ?", [
      result.insertId,
    ]);
    const row = rows[0];
    res.status(201).json({ code: 0, data: row });
  } catch (e) {
    console.error(e);
    res.status(500).json({ code: 500, message: "新增分类失败" });
  }
});

// 更新课程分类
categoriesRouter.put("/categories/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { name, description } = req.body || {};
    if (!id || !Number.isInteger(id) || id < 1) {
      return res.status(400).json({ code: 400, message: "无效的分类id" });
    }
    if (!name || !name.trim()) {
      return res.status(400).json({ code: 400, message: "分类名字不能为空" });
    }
    await query("UPDATE course_categories SET name = ?, description = ? WHERE id = ?", [
      name.trim(),
      description ? description.trim() : null,
      id,
    ]);
    const [row] = await query(
      "SELECT id, name, description, created_at, updated_at FROM course_categories WHERE id = ?",
      [id]
    );
    if (!row) {
      return res.status(404).json({ code: 404, message: "分类不存在" });
    }
    res.json({ code: 0, data: row });
  } catch (e) {
    console.error(e);
    res.status(500).json({ code: 500, message: "更新分类失败" });
  }
});

// 删除课程分类
categoriesRouter.delete("/categories/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id || !Number.isInteger(id) || id < 1) {
      return res.status(400).json({ code: 400, message: "无效的分类id" });
    }
    const existing = await query("SELECT id FROM courses WHERE category_id = ? LIMIT 1", [id]);
    if (existing.length > 0) {
      return res.status(400).json({ code: 400, message: "该分类下存在课程，无法删除" });
    }
    const result = await query("DELETE FROM course_categories WHERE id = ?", [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ code: 404, message: "分类不存在" });
    }
    res.json({ code: 0, message: "删除成功" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ code: 500, message: "删除分类失败" });
  }
});
