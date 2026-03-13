import http from "@/utils/http";

// 获取当前学生的技能档案 + 技能列表（只读）
export function getStudentSkills() {
  return http.get("/student/skills");
}

// 组队 & 在线同学相关（学生只读查看）
export function getTeamOverview() {
  return http.get("/student/teams/overview");
}

// 老师端：查看 / 修改学生技能
export function getStudentSkillsByTeacher(studentId) {
  return http.get(`/teacher/students/${studentId}/skills`);
}

export function updateStudentSkillsByTeacher(studentId, updates) {
  return http.post(`/teacher/students/${studentId}/skills/batch-update`, {
    updates,
  });
}

// 老师端：查看 / 审批队伍申请与调整位置
export function getTeamRequests() {
  return http.get("/teacher/team-requests");
}

export function approveTeamRequest(id, data) {
  return http.post(`/teacher/team-requests/${id}/approve`, data);
}

export function rejectTeamRequest(id, data) {
  return http.post(`/teacher/team-requests/${id}/reject`, data);
}

export function getTeamsForTeacher() {
  return http.get("/teacher/teams");
}

export function updateTeamPositions(teamId, members) {
  return http.post(`/teacher/teams/${teamId}/positions`, { members });
}
