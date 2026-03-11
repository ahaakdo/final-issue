import http from "@/utils/http";

/** 登录 role: student | teacher */
export function login(data) {
  return http.post("/login", data);
}

/** 学生注册 */
export function registerStudent(data) {
  return http.post("/register/student", data);
}

/** 教师注册 */
export function registerTeacher(data) {
  return http.post("/register/teacher", data);
}

export function getUserInfo() {
  return http.get("/getUserInfo");
}

/** 更新当前用户个人信息 */
export function updateProfile(data) {
  return http.put("/profile", data);
}

/** 修改当前用户密码 */
export function updatePassword(password) {
  return http.put("/password", { password });
}
