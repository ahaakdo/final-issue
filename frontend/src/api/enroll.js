import http from "@/utils/http";

/** 学生自身的报名列表 */
export function getMyEnrollments() {
  return http.get("/student/enrollments");
}

/** 学生端：查看某课程的考勤汇总与明细 */
export function getStudentCourseAttendanceSummary(courseId) {
  return http.get(`/student/courses/${courseId}/attendance-summary`);
}

/** 学生端：查看某课程的成绩情况 */
export function getStudentCourseGrade(courseId) {
  return http.get(`/student/courses/${courseId}/grade`);
}

/** 报名课程 */
export function enrollCourse(courseId) {
  return http.post(`/courses/${courseId}/enroll`);
}

/** 取消报名 */
export function cancelEnrollment(courseId) {
  return http.post(`/courses/${courseId}/cancel-enroll`);
}

/** 获取当前课程的报名状态（学生） */
export function getEnrollmentStatus(courseId) {
  return http.get(`/courses/${courseId}/enrollment-status`);
}

/** 申请退课（学生，开课后） */
export function applyWithdraw(courseId, reason) {
  return http.post(`/courses/${courseId}/withdraw-apply`, { reason });
}

// -------- 老师端：课程报名名单 / 考勤 / 成绩 / 私聊 --------

export function getCourseRosterForTeacher(courseId) {
  return http.get(`/teacher/courses/${courseId}/enrollments`);
}

export function getCourseAttendance(courseId, params) {
  return http.get(`/teacher/courses/${courseId}/attendance`, { params });
}

export function saveCourseAttendance(courseId, data) {
  return http.post(`/teacher/courses/${courseId}/attendance`, data);
}

export function getCourseGrades(courseId) {
  return http.get(`/teacher/courses/${courseId}/grades`);
}

export function saveCourseGrades(courseId, data) {
  return http.post(`/teacher/courses/${courseId}/grades`, data);
}

export function getCourseMessagesForTeacher(courseId, studentId) {
  return http.get(`/teacher/courses/${courseId}/messages/${studentId}`);
}

export function sendCourseMessageToStudent(courseId, studentId, content) {
  return http.post(`/teacher/courses/${courseId}/messages/${studentId}`, { content });
}

// 学生端：与老师的课程消息
export function getCourseMessagesForStudent(courseId, teacherId) {
  return http.get(`/student/courses/${courseId}/messages/${teacherId}`);
}

export function sendCourseMessageToTeacher(courseId, teacherId, content) {
  return http.post(`/student/courses/${courseId}/messages/${teacherId}`, { content });
}

/** 老师端：课程消息未读数 */
export function getTeacherCourseMessageUnreadCount() {
  return http.get("/teacher/course-messages/unread-count");
}

/** 学生端：课程消息未读数 */
export function getStudentCourseMessageUnreadCount() {
  return http.get("/student/course-messages/unread-count");
}

/** 老师端：课程消息会话列表 */
export function getTeacherCourseMessageConversations() {
  return http.get("/teacher/course-messages/conversations");
}

/** 学生端：课程消息会话列表 */
export function getStudentCourseMessageConversations() {
  return http.get("/student/course-messages/conversations");
}


