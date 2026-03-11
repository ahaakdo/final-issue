import http from "@/utils/http";

/** 学生通知列表 */
export function getStudentNotifications(params = {}) {
  return http.get("/student/notifications", { params });
}

/** 标记某条通知为已读 */
export function markNotificationRead(id) {
  return http.post(`/student/notifications/${id}/read`);
}

