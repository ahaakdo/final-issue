import http from "@/utils/http";

// 报名审核
export function getTeacherEnrollRequests(params = {}) {
  return http.get("/teacher/enroll-requests", { params });
}

export function getTeacherEnrollRequestDetail(id) {
  return http.get(`/teacher/enroll-requests/${id}`);
}

export function approveEnrollRequest(id) {
  return http.post(`/teacher/enroll-requests/${id}/approve`);
}

export function rejectEnrollRequest(id, reject_reason) {
  return http.post(`/teacher/enroll-requests/${id}/reject`, { reject_reason });
}

// 退课审核
export function getTeacherWithdrawRequests() {
  return http.get("/teacher/withdraw-requests");
}

export function approveWithdrawRequest(enrollmentId) {
  return http.post(`/teacher/withdraw-requests/${enrollmentId}/approve`);
}

export function rejectWithdrawRequest(enrollmentId, reject_reason) {
  return http.post(`/teacher/withdraw-requests/${enrollmentId}/reject`, { reject_reason });
}

// 审核历史
export function getTeacherAuditHistory(params = {}) {
  return http.get("/teacher/audit-history", { params });
}

