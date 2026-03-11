import { Router } from "express";
import jwt from "jsonwebtoken";
import { studentStore } from "../store/students.js";
import { teacherStore } from "../store/teachers.js";

const JWT_SECRET = process.env.JWT_SECRET || "volleyball-club-secret-change-in-production";
const TOKEN_EXPIRES = "7d";

export const authRouter = Router();

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRES });
}

// 学生注册
authRouter.post("/register/student", async (req, res) => {
  try {
    const body = req.body || {};
    const { username, password, real_name, email, phone, major, gender, birthday, dormitory } = body;
    if (!username || !password || !real_name) {
      return res.status(400).json({ code: 400, message: "用户名、密码、真实姓名为必填" });
    }
    if (username.length < 2 || password.length < 6) {
      return res.status(400).json({ code: 400, message: "用户名至少2位，密码至少6位" });
    }
    const created = await studentStore.create({
      username,
      password,
      real_name,
      email,
      phone,
      major,
      gender: gender === "" || gender === undefined ? null : Number(gender),
      birthday: birthday || null,
      dormitory,
    });
    if (!created) {
      return res.status(409).json({ code: 409, message: "用户名已存在" });
    }
    const token = signToken({
      userId: created.id,
      username: created.username,
      role: "student",
    });
    res.json({
      code: 0,
      message: "注册成功",
      data: {
        token,
        role: "student",
        username: created.username,
        real_name: created.real_name,
        student_number: created.student_number,
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ code: 500, message: "服务器错误" });
  }
});

// 教师注册
authRouter.post("/register/teacher", async (req, res) => {
  try {
    const body = req.body || {};
    const {
      username,
      password,
      real_name,
      email,
      phone,
      major,
      gender,
      birthday,
      professional_level,
      department,
      office,
      introduction,
      teaching_years,
      teaching_experience,
    } = body;
    if (!username || !password || !real_name) {
      return res.status(400).json({ code: 400, message: "用户名、密码、真实姓名为必填" });
    }
    if (username.length < 2 || password.length < 6) {
      return res.status(400).json({ code: 400, message: "用户名至少2位，密码至少6位" });
    }
    const created = await teacherStore.create({
      username,
      password,
      real_name,
      email,
      phone,
      major,
      gender: gender === "" || gender === undefined ? null : Number(gender),
      birthday: birthday || null,
      professional_level,
      department,
      office,
      introduction,
      teaching_years: teaching_years === "" || teaching_years === undefined ? null : Number(teaching_years),
      teaching_experience,
    });
    if (!created) {
      return res.status(409).json({ code: 409, message: "用户名已存在" });
    }
    const token = signToken({
      userId: created.id,
      username: created.username,
      role: "teacher",
    });
    res.json({
      code: 0,
      message: "注册成功",
      data: {
        token,
        role: "teacher",
        username: created.username,
        real_name: created.real_name,
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ code: 500, message: "服务器错误" });
  }
});

// 登录（需传 role: student | teacher）
authRouter.post("/login", async (req, res) => {
  try {
    const { username, password, role } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ code: 400, message: "用户名和密码不能为空" });
    }
    if (!role || !["student", "teacher"].includes(role)) {
      return res.status(400).json({ code: 400, message: "请选择身份：学生或教师" });
    }
    const store = role === "student" ? studentStore : teacherStore;
    const user = await store.findByUsername(username);
    if (!user) {
      return res.status(401).json({ code: 401, message: "用户名或密码错误" });
    }
    const ok = await store.verifyPassword(password, user.password);
    if (!ok) {
      return res.status(401).json({ code: 401, message: "用户名或密码错误" });
    }
    const token = signToken({
      userId: user.id,
      username: user.username,
      role,
    });
    const info = role === "student"
      ? { real_name: user.real_name, student_number: user.student_number }
      : { real_name: user.real_name };
    res.json({
      code: 0,
      message: "登录成功",
      data: {
        token,
        role,
        username: user.username,
        ...info,
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ code: 500, message: "服务器错误" });
  }
});

// 获取当前用户信息（需 Token，根据 role 查学生或教师表）
authRouter.get("/getUserInfo", async (req, res) => {
  try {
    const auth = req.headers.authorization;
    const token = auth && auth.startsWith("Bearer ") ? auth.slice(7) : null;
    if (!token) {
      return res.status(401).json({ code: 401, message: "未登录" });
    }
    const decoded = jwt.verify(token, JWT_SECRET);
    const { userId, username, role } = decoded;
    if (!role || !["student", "teacher"].includes(role)) {
      return res.status(401).json({ code: 401, message: "无效身份" });
    }
    const store = role === "student" ? studentStore : teacherStore;
    const user = await store.findById(userId);
    if (!user) {
      return res.status(401).json({ code: 401, message: "用户不存在" });
    }
    res.json({
      code: 0,
      data: {
        role,
        username: user.username,
        real_name: user.real_name,
        email: user.email,
        phone: user.phone,
        major: user.major,
        gender: user.gender,
        avatar: user.avatar,
        birthday: user.birthday,
        ...(role === "student"
          ? { student_number: user.student_number, dormitory: user.dormitory }
          : {
              professional_level: user.professional_level,
              department: user.department,
              office: user.office,
              introduction: user.introduction,
              teaching_years: user.teaching_years,
              teaching_experience: user.teaching_experience,
            }),
      },
    });
  } catch (e) {
    if (e.name === "JsonWebTokenError" || e.name === "TokenExpiredError") {
      return res.status(401).json({ code: 401, message: "登录已过期，请重新登录" });
    }
    console.error(e);
    res.status(500).json({ code: 500, message: "服务器错误" });
  }
});

// 更新当前用户个人信息（需 Token）
authRouter.put("/profile", async (req, res) => {
  try {
    const auth = req.headers.authorization;
    const token = auth && auth.startsWith("Bearer ") ? auth.slice(7) : null;
    if (!token) {
      return res.status(401).json({ code: 401, message: "未登录" });
    }
    const decoded = jwt.verify(token, JWT_SECRET);
    const { userId, role } = decoded;
    if (!role || !["student", "teacher"].includes(role)) {
      return res.status(401).json({ code: 401, message: "无效身份" });
    }
    const store = role === "student" ? studentStore : teacherStore;
    const body = req.body || {};
    if (body.username !== undefined) delete body.username;
    if (body.student_number !== undefined) delete body.student_number;
    // profile 接口只更新个人信息，不在这里改密码
    if (body.password !== undefined) delete body.password;
    // MySQL DATE 字段不接受 ISO 时间串，统一转成 YYYY-MM-DD
    if (body.birthday !== undefined) {
      if (body.birthday === "" || body.birthday === null) {
        body.birthday = null;
      } else if (typeof body.birthday === "string") {
        const s = body.birthday.trim();
        // 兼容 '2003-07-17T16:00:00.000Z' / '2003-07-17 00:00:00' 等，取日期部分
        const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
        body.birthday = m ? m[1] : s;
      }
    }
    const updated = await store.update(userId, body);
    if (!updated) {
      return res.status(404).json({ code: 404, message: "用户不存在" });
    }
    res.json({
      code: 0,
      data: {
        role,
        username: updated.username,
        real_name: updated.real_name,
        email: updated.email,
        phone: updated.phone,
        major: updated.major,
        gender: updated.gender,
        avatar: updated.avatar,
        birthday: updated.birthday,
        ...(role === "student"
          ? { student_number: updated.student_number, dormitory: updated.dormitory }
          : {
              professional_level: updated.professional_level,
              department: updated.department,
              office: updated.office,
              introduction: updated.introduction,
              teaching_years: updated.teaching_years,
              teaching_experience: updated.teaching_experience,
            }),
      },
      message: "保存成功",
    });
  } catch (e) {
    if (e.name === "JsonWebTokenError" || e.name === "TokenExpiredError") {
      return res.status(401).json({ code: 401, message: "登录已过期，请重新登录" });
    }
    console.error(e);
    res.status(500).json({ code: 500, message: "服务器错误" });
  }
});

// 修改当前用户密码（需 Token）
authRouter.put("/password", async (req, res) => {
  try {
    const auth = req.headers.authorization;
    const token = auth && auth.startsWith("Bearer ") ? auth.slice(7) : null;
    if (!token) {
      return res.status(401).json({ code: 401, message: "未登录" });
    }
    const decoded = jwt.verify(token, JWT_SECRET);
    const { userId, role } = decoded;
    if (!role || !["student", "teacher"].includes(role)) {
      return res.status(401).json({ code: 401, message: "无效身份" });
    }
    const { password } = req.body || {};
    const pwd = String(password || "").trim();
    if (pwd.length < 6) {
      return res.status(400).json({ code: 400, message: "密码至少6位" });
    }
    const store = role === "student" ? studentStore : teacherStore;
    const ok = await store.setPassword(userId, pwd);
    if (!ok) {
      return res.status(400).json({ code: 400, message: "密码至少6位" });
    }
    res.json({ code: 0, message: "密码修改成功" });
  } catch (e) {
    if (e.name === "JsonWebTokenError" || e.name === "TokenExpiredError") {
      return res.status(401).json({ code: 401, message: "登录已过期，请重新登录" });
    }
    console.error(e);
    res.status(500).json({ code: 500, message: "服务器错误" });
  }
});
