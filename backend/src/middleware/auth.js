import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "volleyball-club-secret-change-in-production";

/** 可选认证：有 token 则解析并设置 req.auth，无 token 则 req.auth 为 null */
export function optionalAuth(req, res, next) {
  const auth = req.headers.authorization;
  const token = auth && auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) {
    req.auth = null;
    return next();
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const { userId, username, role } = decoded;
    if (role && ["student", "teacher"].includes(role)) {
      req.auth = { userId, username, role };
    } else {
      req.auth = null;
    }
  } catch {
    req.auth = null;
  }
  next();
}

/** 必须已登录（学生或教师），否则 401 */
export function requireAuth(req, res, next) {
  if (!req.auth || !["student", "teacher"].includes(req.auth.role)) {
    return res.status(401).json({ code: 401, message: "请先登录" });
  }
  next();
}

/** 必须为教师，否则 403 */
export function requireTeacher(req, res, next) {
  if (!req.auth || req.auth.role !== "teacher") {
    return res.status(403).json({ code: 403, message: "仅教师可操作" });
  }
  next();
}

/** 必须为学生，否则 403 */
export function requireStudent(req, res, next) {
  if (!req.auth || req.auth.role !== "student") {
    return res.status(403).json({ code: 403, message: "仅学生可操作" });
  }
  next();
}
