import http from "@/utils/http";

/** 课程列表：学生不传参为可见课程；教师传 my=1 为本人课程 */
export function getCourseList(params = {}) {
  return http.get("/courses", { params });
}

/** 新增课程（教师） */
export function createCourse(data) {
  return http.post("/courses", data);
}

/** 更新课程（教师） */
export function updateCourse(id, data) {
  return http.put(`/courses/${id}`, data);
}

/** 删除课程（教师） */
export function deleteCourse(id) {
  return http.delete(`/courses/${id}`);
}

// ---------- 课程评论与评分 ----------

/** 获取课程评论列表（分页） */
export function getCourseComments(courseId, params = {}) {
  return http.get(`/courses/${courseId}/comments`, { params });
}

/** 发布评论（content, parent_id 可选） */
export function postCourseComment(courseId, data) {
  return http.post(`/courses/${courseId}/comments`, data);
}

/** 获取课程评分汇总与当前用户评分 */
export function getCourseRating(courseId) {
  return http.get(`/courses/${courseId}/rating`);
}

/** 学生提交/更新评分 1-5 */
export function submitCourseRating(courseId, rating) {
  return http.post(`/courses/${courseId}/rating`, { rating });
}
