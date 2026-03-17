<template>
  <div class="course-roster-page">
    <section class="hero">
      <div>
        <h2>{{ course?.name || "课程报名名单" }}</h2>
        <p v-if="course">
          已报名人数：{{ enrolledCount }} / {{ course.capacity }}（含审核中）
        </p>
      </div>
      <div class="hero-actions">
        <el-button size="small" @click="exportRoster">导出名单</el-button>
      </div>
    </section>

    <el-card class="roster-card" v-loading="loading">
      <el-tabs v-model="activeTab">
        <el-tab-pane label="报名名单" name="roster">
          <el-table :data="roster" border stripe>
            <el-table-column type="index" label="#" width="50" />
            <el-table-column prop="student_number" label="学号" width="120" />
            <el-table-column prop="student_name" label="姓名" width="120" />
            <el-table-column prop="major" label="专业" min-width="120" />
            <el-table-column label="技能概览" width="150" align="center">
              <template #default="{ row }">
                <span>攻{{ formatAvg(row.atk_avg) }} 传{{ formatAvg(row.set_avg) }} 防{{ formatAvg(row.def_avg) }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="base_reach_cm" label="摸高" width="90" align="center" />
            <el-table-column prop="phone" label="电话" width="120" />
            <el-table-column label="报名状态" width="140">
              <template #default="{ row }">
                <el-tag
                  v-if="row.status === 'enrolled'"
                  type="success"
                  size="small"
                >
                  已报名
                </el-tag>
                <el-tag
                  v-else-if="row.status === 'pending'"
                  type="warning"
                  size="small"
                >
                  审核中
                </el-tag>
                <el-tag v-else type="info" size="small">已取消</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="120">
              <template #default="{ row }">
                <el-button type="primary" link @click="openChat(row)">
                  私聊
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <el-tab-pane label="考勤管理" name="attendance">
          <div class="tab-toolbar">
            <el-date-picker
              v-model="attendDate"
              type="date"
              value-format="YYYY-MM-DD"
              placeholder="选择考勤日期"
              style="width: 180px"
              @change="loadAttendance"
            />
            <el-button type="primary" size="small" @click="saveAttendance">
              保存考勤
            </el-button>
          </div>
          <el-table :data="attendanceRows" border stripe>
            <el-table-column type="index" label="#" width="50" />
            <el-table-column prop="student_number" label="学号" width="120" />
            <el-table-column prop="student_name" label="姓名" width="120" />
            <el-table-column label="出勤状态" width="160">
              <template #default="{ row }">
                <el-select v-model="row.status" placeholder="请选择" style="width: 120px">
                  <el-option label="出勤" value="present" />
                  <el-option label="缺勤" value="absent" />
                  <el-option label="迟到" value="late" />
                </el-select>
              </template>
            </el-table-column>
            <el-table-column label="备注" min-width="160">
              <template #default="{ row }">
                <el-input v-model="row.note" placeholder="可填写简短备注" />
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <el-tab-pane label="成绩管理" name="grades">
          <div class="tab-toolbar">
            <span v-if="gradeTotalSessions !== null" class="grade-summary">
              课程总考勤次数：{{ gradeTotalSessions }}（总成绩 = 出勤率×40 + 考试成绩×0.6）
            </span>
            <el-button type="primary" size="small" @click="saveGrades">
              保存成绩
            </el-button>
            <el-button type="success" size="small" @click="exportGradesExcel">
              导出Excel
            </el-button>
          </div>
          <el-table :data="gradeRows" border stripe>
            <el-table-column type="index" label="#" width="50" />
            <el-table-column prop="student_number" label="学号" width="100" />
            <el-table-column prop="student_name" label="姓名" width="90" />
            <el-table-column label="出勤次数" width="90" align="center">
              <template #default="{ row }">{{ row.attendance_count ?? 0 }}</template>
            </el-table-column>
            <el-table-column label="课程总次数" width="100" align="center">
              <template #default="{ row }">{{ row.total_sessions ?? 0 }}</template>
            </el-table-column>
            <el-table-column label="出勤得分(40%)" width="120" align="center">
              <template #default="{ row }">{{ formatScore(row.attendance_score) }}</template>
            </el-table-column>
            <el-table-column label="考试成绩(60%)" width="130">
              <template #default="{ row }">
                <el-input-number
                  v-model="row.score"
                  :min="0"
                  :max="100"
                  :precision="1"
                  size="small"
                  style="width: 100px"
                />
              </template>
            </el-table-column>
            <el-table-column label="总成绩" width="90" align="center">
              <template #default="{ row }">
                <span class="total-score">{{ formatScore(computedTotalScore(row)) }}</span>
              </template>
            </el-table-column>
            <el-table-column label="等级" width="100">
              <template #default="{ row }">
                <el-tag
                  size="small"
                  effect="plain"
                  :type="gradeTagType(gradeLevelFromTotalScore(computedTotalScore(row)))"
                >
                  {{ gradeLevelFromTotalScore(computedTotalScore(row)) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="评语" min-width="140">
              <template #default="{ row }">
                <el-input v-model="row.comment" placeholder="可写简短评语" size="small" />
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <el-dialog v-model="chatVisible" :title="chatDialogTitle" width="520px">
      <div class="chat-box" v-loading="chatLoading">
        <div v-if="chatMessages.length === 0" class="chat-empty">
          暂无消息，发送第一条吧～
        </div>
        <div v-else class="chat-messages">
          <div
            v-for="m in chatMessages"
            :key="m.id"
            :class="['chat-item', m.sender === 'teacher' ? 'from-me' : 'from-other']"
          >
            <div class="chat-avatar-wrap" v-if="m.sender === 'teacher'">
              <div class="chat-avatar me">我</div>
            </div>
            <div class="chat-avatar-wrap" v-else>
              <div class="chat-avatar student">{{ studentInitial }}</div>
            </div>
            <div class="chat-bubble">
              <p class="chat-content">{{ m.content }}</p>
              <span class="chat-time">{{ formatRelativeTime(m.created_at) }}</span>
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <el-input
          v-model="chatInput"
          type="textarea"
          :rows="2"
          placeholder="输入要发送的消息"
        />
        <div style="margin-top: 8px; text-align: right;">
          <el-button @click="chatVisible = false">关闭</el-button>
          <el-button type="primary" :loading="chatSending" @click="sendChat">
            发送
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
defineOptions({ name: "CourseRoster" });
import { ref, reactive, computed, onMounted, watch, onBeforeUnmount } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import {
  getCourseRosterForTeacher,
  getCourseAttendance,
  saveCourseAttendance,
  getCourseGrades,
  saveCourseGrades,
  getCourseMessagesForTeacher,
  sendCourseMessageToStudent,
} from "@/api/enroll";
import { formatRelativeTime } from "@/utils/format";
import { getToken } from "@/utils/auth";

const route = useRoute();
const router = useRouter();
const courseId = Number(route.params.courseId);

const loading = ref(false);
const course = ref(null);
const roster = ref([]);
const activeTab = ref("roster");

const attendDate = ref("");
const attendanceRows = ref([]);
const gradeRows = ref([]);
const gradeTotalSessions = ref(null);

const chatVisible = ref(false);
const chatStudent = ref(null);
const chatMessages = ref([]);
const chatLoading = ref(false);
const chatInput = ref("");
const chatSending = ref(false);
const wsRef = ref(null);

const enrolledCount = computed(
  () => roster.value.filter((r) => r.status === "enrolled").length
);

const chatDialogTitle = computed(
  () => (chatStudent.value?.student_name ? `与 ${chatStudent.value.student_name} 学生聊天` : "与学生聊天")
);

const studentInitial = computed(() =>
  chatStudent.value?.student_name ? chatStudent.value.student_name.slice(0, 1) : "生"
);

async function loadRoster() {
  loading.value = true;
  try {
    const data = await getCourseRosterForTeacher(courseId);
    course.value = data.course;
    roster.value = data.enrollments || [];
  } catch {
    ElMessage.error("获取报名名单失败");
  } finally {
    loading.value = false;
  }
}

async function loadAttendance() {
  if (!attendDate.value) return;
  try {
    const rows = await getCourseAttendance(courseId, { date: attendDate.value });
    attendanceRows.value = rows.map((r) =>
      reactive({
        student_id: r.student_id,
        student_name: r.student_name,
        student_number: r.student_number,
        status: r.status || "",
        note: r.note || "",
      })
    );
  } catch {
    ElMessage.error("获取考勤失败");
  }
}

async function saveAttendance() {
  if (!attendDate.value) {
    ElMessage.warning("请先选择考勤日期");
    return;
  }
  try {
    await saveCourseAttendance(courseId, {
      date: attendDate.value,
      records: attendanceRows.value.map((r) => ({
        student_id: r.student_id,
        status: r.status || null,
        note: r.note || null,
      })),
    });
    ElMessage.success("保存考勤成功");
  } catch {
    ElMessage.error("保存考勤失败");
  }
}

function formatScore(v) {
  if (v == null || v === "") return "—";
  const n = Number(v);
  return Number.isNaN(n) ? "—" : n.toFixed(2);
}

function formatAvg(v) {
  if (v == null || v === "") return "—";
  const n = Number(v);
  return Number.isNaN(n) ? "—" : n.toFixed(0);
}

/** 总成绩 = 出勤得分(40%) + 考试成绩×0.6(60%)，编辑成绩时实时更新 */
function computedTotalScore(row) {
  const att = Number(row.attendance_score) || 0;
  const exam = Number(row.score) || 0;
  return att + exam * 0.6;
}

function gradeLevelFromTotalScore(total) {
  const t = Number(total);
  if (Number.isNaN(t)) return "";
  if (t > 90) return "优";
  if (t > 80) return "良";
  if (t > 70) return "中";
  if (t > 60) return "及格";
  return "不及格";
}

function gradeTagType(level) {
  if (level === "优") return "success";
  if (level === "良") return "success";
  if (level === "中") return "warning";
  if (level === "及格") return "info";
  return "danger";
}

async function loadGrades() {
  try {
    const data = await getCourseGrades(courseId);
    const rows = Array.isArray(data?.rows) ? data.rows : [];
    gradeTotalSessions.value = data?.total_sessions ?? null;
    gradeRows.value = rows.map((r) =>
      reactive({
        student_id: r.student_id,
        student_name: r.student_name,
        student_number: r.student_number,
        score: r.score != null ? Number(r.score) : null,
        grade_level: r.grade_level || "",
        comment: r.comment || "",
        total_sessions: r.total_sessions ?? 0,
        attendance_count: r.attendance_count ?? 0,
        attendance_score: r.attendance_score != null ? Number(r.attendance_score) : 0,
        total_score: r.total_score != null ? Number(r.total_score) : null,
      })
    );
  } catch {
    ElMessage.error("获取成绩失败");
  }
}

async function saveGrades() {
  try {
    await saveCourseGrades(courseId, {
      records: gradeRows.value.map((r) => ({
        student_id: r.student_id,
        score: r.score,
        grade_level: gradeLevelFromTotalScore(computedTotalScore(r)) || null,
        comment: r.comment || null,
      })),
    });
    ElMessage.success("保存成绩成功");
    await loadGrades();
  } catch {
    ElMessage.error("保存成绩失败");
  }
}

function exportGradesExcel() {
  if (!gradeRows.value.length) {
    ElMessage.warning("当前没有可导出的成绩数据");
    return;
  }
  const totalSessions = gradeTotalSessions.value ?? 0;
  const header = ["学号", "姓名", "出勤次数", "课程总次数", "出勤率(%)", "出勤得分", "考试成绩", "总成绩", "等级", "评语"];
  const lines = gradeRows.value.map((r) => {
    const rate = totalSessions > 0 ? ((r.attendance_count ?? 0) / totalSessions * 100).toFixed(2) : "0";
    const level = gradeLevelFromTotalScore(computedTotalScore(r));
    return [
      r.student_number ?? "",
      r.student_name ?? "",
      String(r.attendance_count ?? 0),
      String(r.total_sessions ?? 0),
      rate,
      formatScore(r.attendance_score),
      r.score != null ? String(r.score) : "",
      formatScore(computedTotalScore(r)),
      level,
      r.comment ?? "",
    ].join(",");
  });
  const BOM = "\uFEFF";
  const csv = BOM + header.join(",") + "\n" + lines.join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${course.value?.name || "成绩"}-成绩表.csv`;
  a.click();
  URL.revokeObjectURL(url);
  ElMessage.success("导出成功");
}

function exportRoster() {
  if (!roster.value.length) {
    ElMessage.warning("当前没有可导出的报名数据");
    return;
  }
  const header = ["学号", "姓名", "专业", "报名状态"];
  const lines = roster.value.map((r) => {
    let statusText = "已取消";
    if (r.status === "enrolled") statusText = "已报名";
    else if (r.status === "pending") statusText = "审核中";
    return [r.student_number, r.student_name, r.major || "", statusText].join(",");
  });
  const csv = [header.join(","), ...lines].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${course.value?.name || "course"}-roster.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

async function openChat(row) {
  chatStudent.value = row;
  chatVisible.value = true;
  chatInput.value = "";
  await loadChat();
  connectWsIfNeeded();
}

/** 从导航栏消息下拉跳转过来时，根据 query.openChat 自动打开对应学生的聊天 */
function tryOpenChatFromQuery() {
  const openChatStudentId = route.query.openChat;
  if (openChatStudentId == null || !roster.value.length) return;
  const sid = Number(openChatStudentId);
  if (!sid) return;
  const row = roster.value.find((r) => r.student_id === sid);
  if (row) {
    openChat(row);
    const q = { ...route.query };
    delete q.openChat;
    router.replace({ path: route.path, query: q });
  }
}

async function loadChat() {
  if (!chatStudent.value) return;
  chatLoading.value = true;
  try {
    const msgs = await getCourseMessagesForTeacher(courseId, chatStudent.value.student_id);
    chatMessages.value = msgs || [];
  } catch {
    ElMessage.error("获取聊天记录失败");
  } finally {
    chatLoading.value = false;
  }
}

function buildWsUrl() {
  const loc = window.location;
  const protocol = loc.protocol === "https:" ? "wss:" : "ws:";

  if (import.meta.env.VITE_API_BASE) {
    return import.meta.env.VITE_API_BASE.replace(/^http/, "ws") + "/ws/course-chat";
  }

  if (import.meta.env.DEV) {
    return `${protocol}//localhost:3000/ws/course-chat`;
  }

  return `${protocol}//${loc.host}/ws/course-chat`;
}

function connectWsIfNeeded() {
  if (wsRef.value || !chatStudent.value) return;
  const token = getToken();
  if (!token) return;
  const url = buildWsUrl();
  const ws = new WebSocket(url);
  wsRef.value = ws;

  ws.onopen = () => {
    ws.send(JSON.stringify({ type: "auth", token: `Bearer ${token}` }));
  };

  ws.onmessage = (event) => {
    let msg;
    try {
      msg = JSON.parse(event.data);
    } catch {
      return;
    }
    if (msg.type === "auth-ok") {
      ws.send(
        JSON.stringify({
          type: "join",
          courseId,
          // 教师自己的 id 由服务端根据 token 补全
          teacherId: undefined,
          studentId: chatStudent.value?.student_id || null,
        })
      );
      return;
    }
    if (msg.type === "joined") {
      return;
    }
    if (msg.type === "new-message") {
      if (
        msg.courseId === courseId &&
        chatStudent.value &&
        msg.studentId === chatStudent.value.student_id
      ) {
        chatMessages.value.push({
          id: `ws-${Date.now()}`,
          sender: msg.sender === "teacher" ? "teacher" : "student",
          content: msg.content,
          created_at: msg.created_at,
        });
      }
    }
  };

  ws.onclose = () => {
    wsRef.value = null;
  };
}

function closeWs() {
  if (wsRef.value) {
    wsRef.value.close();
    wsRef.value = null;
  }
}

async function sendChat() {
  if (!chatInput.value.trim() || !chatStudent.value) {
    ElMessage.warning("请输入要发送的内容");
    return;
  }
  chatSending.value = true;
  try {
    await sendCourseMessageToStudent(
      courseId,
      chatStudent.value.student_id,
      chatInput.value.trim()
    );
    const content = chatInput.value.trim();
    chatInput.value = "";
    if (wsRef.value && wsRef.value.readyState === WebSocket.OPEN) {
      wsRef.value.send(
        JSON.stringify({
          type: "new-message",
          courseId,
          teacherId: null,
          studentId: chatStudent.value.student_id,
          content,
        })
      );
    } else {
      await loadChat();
    }
  } catch {
    ElMessage.error("发送失败");
  } finally {
    chatSending.value = false;
  }
}

watch(chatVisible, (v) => {
  if (!v) {
    window.dispatchEvent(new CustomEvent("course-messages-read"));
    closeWs();
  }
});

watch(
  () => [route.query.openChat, roster.value],
  () => tryOpenChatFromQuery(),
  { deep: true }
);

onMounted(async () => {
  await loadRoster();
  tryOpenChatFromQuery();
  // 默认将考勤日期设置为今天，便于快速记录
  const today = new Date();
  attendDate.value = today.toISOString().slice(0, 10);
  await loadAttendance();
  await loadGrades();
});

onBeforeUnmount(() => {
  closeWs();
});
</script>

<style scoped lang="scss">
.course-roster-page {
  .hero {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
    h2 {
      margin: 0 0 4px;
      font-size: 20px;
      font-weight: 600;
    }
    p {
      margin: 0;
      font-size: 13px;
      color: var(--el-text-color-secondary);
    }
  }

  .roster-card {
    .tab-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 12px;
      margin-bottom: 12px;
      .grade-summary {
        font-size: 13px;
        color: var(--el-text-color-secondary);
      }
    }
    .total-score {
      font-weight: 600;
      color: var(--el-color-primary);
    }
  }
}

.chat-box {
  min-height: 160px;
  max-height: 320px;
  overflow-y: auto;
}

.chat-empty {
  text-align: center;
  color: var(--el-text-color-secondary);
  padding: 24px 0;
}

.chat-messages {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.chat-item {
  display: flex;
  align-items: flex-end;
  gap: 8px;
}

.chat-item.from-me {
  flex-direction: row-reverse;
}

.chat-avatar-wrap {
  flex-shrink: 0;
}

.chat-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
  color: #fff;
}

.chat-avatar.me {
  background: #409eff;
}

.chat-avatar.student {
  background: #67c23a;
}

.chat-item.from-other {
  justify-content: flex-start;
}

.chat-bubble {
  max-width: 80%;
  padding: 8px 10px;
  border-radius: 10px;
  background: var(--el-fill-color-light);
  font-size: 13px;
  line-height: 1.6;
}

.chat-content {
  margin: 0 0 4px;
}

.chat-item.from-me .chat-bubble {
  background: #409eff;
  color: #fff;
}

.chat-time {
  display: block;
  margin-top: 4px;
  font-size: 11px;
  opacity: 0.75;
}

.table-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  overflow: hidden;
}

.table-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
</style>

