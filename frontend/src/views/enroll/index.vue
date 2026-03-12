<template>
  <div class="enroll-page">
    <!-- 顶部横幅 -->
    <section class="page-hero">
      <div class="hero-bg">
        <div class="hero-gradient" />
        <div class="hero-pattern" />
      </div>
      <div class="hero-content">
        <div class="hero-left">
          <h1>我的报名</h1>
          <p>查看你已报名的课程，合理规划训练时间</p>
          <div class="hero-stats">
            <div class="stat-card">
              <span class="stat-value">{{ enrolledCount }}</span>
              <span class="stat-label">当前已报名</span>
            </div>
            <div class="stat-card">
              <span class="stat-value">{{ fullCount }}</span>
              <span class="stat-label">即将满员</span>
            </div>
            <div class="stat-card">
              <span class="stat-value">{{ upcomingCount }}</span>
              <span class="stat-label">本周开课</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 筛选 -->
    <section class="toolbar">
      <div class="toolbar-left">
        <el-select v-model="statusFilter" placeholder="报名状态" clearable class="toolbar-select">
          <el-option label="仅已报名" value="enrolled" />
          <el-option label="仅已取消" value="cancelled" />
        </el-select>
        <el-input
          v-model="keyword"
          placeholder="按课程名 / 教师搜索"
          clearable
          class="toolbar-search"
        />
      </div>
    </section>

    <!-- 报名列表 -->
    <section class="card-list-section">
      <div v-loading="loading" class="card-list">
        <template v-if="filteredList.length">
          <div v-for="item in filteredList" :key="item.id" class="enroll-card">
            <div class="card-header">
              <div class="card-title-row">
                <span class="course-name">{{ item.name }}</span>
                <el-tag v-if="item.category_name" size="small" effect="plain" type="info">
                  {{ item.category_name }}
                </el-tag>
                <el-tag :type="coursePhaseTagType(item)" size="small" effect="plain" round>
                  {{ coursePhaseLabel(item) }}
                </el-tag>
                <el-tag :type="enrollPhaseTagType(item)" size="small" effect="plain" round>
                  {{ enrollPhaseLabel(item) }}
                </el-tag>
                <el-tag
                  :type="item.status === 'pending' ? 'warning' : item.status === 'enrolled' ? 'success' : 'info'"
                  size="small"
                  round
                >
                  {{
                    item.status === 'pending'
                      ? '报名审核中'
                      : item.status === 'enrolled'
                        ? '已报名'
                        : '已取消'
                  }}
                </el-tag>
                <el-tag v-if="item.withdraw_pending" type="warning" effect="plain" size="small" round>
                  审核中
                </el-tag>
              </div>
              <div class="teacher-line" v-if="item.teacher_name">
                <span>授课教师：{{ item.teacher_name }}</span>
              </div>
            </div>
            <div class="card-body">
              <div class="info-row">
                <span>
                  <el-icon><Clock /></el-icon>
                  {{ item.schedule_weekly || '时间待定' }}
                </span>
                <span>
                  <el-icon><Location /></el-icon>
                  {{ item.location || '地点待定' }}
                </span>
                <span>
                  <el-icon><Trophy /></el-icon>
                  {{ item.credits }} 学分
                </span>
              </div>
              <div class="info-row second">
                <span>
                  报名时间：
                  {{ formatDateRange(item.enroll_start_date, item.enroll_end_date) || '未设置' }}
                </span>
                <span>
                  上课时间：
                  {{ formatDateRange(item.start_date, item.end_date) || '未设置' }}
                </span>
              </div>
              <div class="capacity-row">
                <el-progress
                  :percentage="capacityPercent(item)"
                  :stroke-width="8"
                  :color="capacityColor(item)"
                  :show-text="false"
                  class="capacity-progress"
                />
                <span class="capacity-text">
                  {{ item.current_enrollment }} / {{ item.capacity || 0 }} 人
                </span>
              </div>
              <div
                v-if="item.enroll_status === 'reject' && item.enroll_reject_reason"
                class="reject-reason"
              >
                驳回原因：{{ item.enroll_reject_reason }}
              </div>
            </div>
            <div class="card-footer">
              <div class="time-tip">
                报名时间：{{ formatRelativeTime(item.created_at) }}
              </div>
              <div class="card-actions">
                <el-button
                  v-if="item.status === 'enrolled'"
                  type="primary"
                  text
                  @click="openAttendance(item)"
                >
                  考勤结果
                </el-button>
                <el-button
                  v-if="item.status === 'enrolled'"
                  type="primary"
                  text
                  @click="openGrade(item)"
                >
                  成绩结果
                </el-button>
                <el-button
                  v-if="showCancelBtn(item)"
                  type="danger"
                  link
                  :loading="cancelLoadingId === item.course_id"
                  @click="onCancel(item)"
                >
                  取消报名
                </el-button>

                <el-button
                  v-else-if="showWithdrawBtn(item)"
                  type="warning"
                  link
                  :disabled="!!item.withdraw_pending"
                  @click="goWithdraw(item)"
                >
                  申请退课
                </el-button>

                <el-button
                  v-if="item.teacher_id"
                  type="primary"
                  link
                  @click="openChat(item)"
                >
                  联系老师
                </el-button>
              </div>
            </div>
          </div>
        </template>
        <el-empty
          v-else-if="!loading"
          description="暂无报名记录，去课程列表看看吧～"
          :image-size="80"
        />
      </div>
    </section>

    <!-- 考勤结果弹窗 -->
    <el-dialog v-model="attendanceVisible" :title="attendanceTitle" width="560px">
      <div v-loading="attendanceLoading" class="att-dialog-body">
        <template v-if="attendanceSummary">
          <div class="att-summary">
            <div class="att-summary-left">
              <div class="att-kpi">
                <span class="att-kpi-label">出勤率</span>
                <span class="att-kpi-value">{{ attendanceSummary.attendance_rate }}%</span>
              </div>
              <div class="att-kpi secondary">
                <span class="att-kpi-label">出勤得分 (40%)</span>
                <span class="att-kpi-value small">{{ attendanceSummary.attendance_score }}</span>
              </div>
            </div>
            <div class="att-summary-right">
              <div class="att-stat-line">
                <span>总课次</span>
                <span>{{ attendanceSummary.total_sessions }}</span>
              </div>
              <div class="att-stat-line">
                <span>出勤次数</span>
                <span>{{ attendanceSummary.attendance_count }}</span>
              </div>
            </div>
          </div>
          <el-table
            v-if="attendanceRecords.length"
            :data="attendanceRecords"
            size="small"
            border
            class="att-table"
          >
            <el-table-column prop="attend_date" label="日期" width="140" />
            <el-table-column
              prop="status"
              label="出勤状态"
              width="120"
              :formatter="formatAttendStatus"
            />
            <el-table-column prop="note" label="备注" />
          </el-table>
          <el-empty v-else description="暂无单次考勤记录" :image-size="60" />
        </template>
        <el-empty v-else description="暂无考勤记录" :image-size="80" />
      </div>
    </el-dialog>

    <!-- 成绩结果弹窗 -->
    <el-dialog v-model="gradeVisible" :title="gradeTitle" width="520px">
      <div v-loading="gradeLoading" class="grade-dialog-body">
        <template v-if="gradeInfo">
          <div class="grade-summary-block">
            <div class="grade-score-main">
              <div class="grade-total">
                <span class="grade-total-label">总评成绩</span>
                <span class="grade-total-value">{{ gradeInfo.total_score }}</span>
              </div>
              <el-tag v-if="gradeInfo.grade_level" size="small" effect="dark" type="success">
                等级：{{ gradeInfo.grade_level }}
              </el-tag>
            </div>
            <div class="grade-detail-grid">
              <div class="grade-detail-item">
                <span class="label">考试成绩 (60%)</span>
                <span class="value">{{ gradeInfo.score ?? "—" }}</span>
              </div>
              <div class="grade-detail-item">
                <span class="label">出勤得分 (40%)</span>
                <span class="value">{{ gradeInfo.attendance_score }}</span>
              </div>
            </div>
            <p v-if="gradeInfo.comment" class="grade-comment">
              <span class="label">教师评语：</span>
              <span class="text">{{ gradeInfo.comment }}</span>
            </p>
          </div>
        </template>
        <el-empty v-else description="暂无成绩记录" :image-size="80" />
      </div>
    </el-dialog>
    <el-dialog v-model="chatVisible" :title="chatCourseTitle" width="520px">
      <div class="chat-box" v-loading="chatLoading">
        <div v-if="chatMessages.length === 0" class="chat-empty">
          暂无消息，发送第一条给老师吧～
        </div>
        <div v-else class="chat-messages">
          <div
            v-for="m in chatMessages"
            :key="m.id"
            :class="['chat-item', m.sender === 'student' ? 'from-me' : 'from-other']"
          >
            <div class="chat-avatar-wrap" v-if="m.sender === 'student'">
              <div class="chat-avatar me">我</div>
            </div>
            <div class="chat-avatar-wrap" v-else>
              <div class="chat-avatar teacher">{{ teacherInitial }}</div>
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
          placeholder="输入要发送给老师的消息"
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
defineOptions({ name: "Enroll" });
import { ref, computed, onMounted, watch, onBeforeUnmount } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { Clock, Location, Trophy } from "@element-plus/icons-vue";
import {
  getMyEnrollments,
  cancelEnrollment,
  getStudentCourseAttendanceSummary,
  getStudentCourseGrade,
  getCourseMessagesForStudent,
  sendCourseMessageToTeacher,
} from "@/api/enroll";
import { formatDateRange, formatRelativeTime } from "@/utils/format";
import { useRoute, useRouter } from "vue-router";
import { getToken } from "@/utils/auth";

const route = useRoute();
const loading = ref(false);
const list = ref([]);
const statusFilter = ref("");
const keyword = ref("");
const cancelLoadingId = ref(null);
const router = useRouter();

/** 从导航栏消息下拉跳转过来时，根据 query.openChat 自动打开对应老师的聊天 */
function tryOpenChatFromQuery() {
  const openChatParam = route.query.openChat;
  if (!openChatParam || typeof openChatParam !== "string") return;
  const parts = openChatParam.split(",").map((s) => parseInt(s, 10));
  const [cId, tId] = parts;
  if (!cId || !tId || !list.value.length) return;
  const row = list.value.find((i) => i.course_id === cId && i.teacher_id === tId);
  if (row) {
    openChat(row);
    const q = { ...route.query };
    delete q.openChat;
    router.replace({ path: "/enroll", query: q });
  }
}

const chatVisible = ref(false);
const chatCourseTitle = ref("与老师沟通");
const chatCourseId = ref(null);
const chatTeacherId = ref(null);
const chatTeacherName = ref("");
const chatMessages = ref([]);
const chatLoading = ref(false);
const chatInput = ref("");
const chatSending = ref(false);
const wsRef = ref(null);

const attendanceVisible = ref(false);
const attendanceLoading = ref(false);
const attendanceTitle = ref("考勤结果");
const attendanceSummary = ref(null);
const attendanceRecords = ref([]);

const gradeVisible = ref(false);
const gradeLoading = ref(false);
const gradeTitle = ref("成绩结果");
const gradeInfo = ref(null);

const teacherInitial = computed(() =>
  chatTeacherName.value ? chatTeacherName.value.slice(0, 1) : "师"
);

function toDateOnly(input) {
  if (!input) return null;
  const d = new Date(input);
  return Number.isNaN(d.getTime()) ? null : d;
}

function enrollPhaseLabel(row) {
  const now = new Date();
  const s = toDateOnly(row.enroll_start_date);
  const e = toDateOnly(row.enroll_end_date);
  if (s && now < s) return "等待报名";
  if (e && now > e) return "结束报名";
  return "报名进行中";
}

function enrollPhaseTagType(row) {
  const label = enrollPhaseLabel(row);
  if (label === "等待报名") return "info";
  if (label === "结束报名") return "danger";
  return "success";
}

function coursePhaseLabel(row) {
  const now = new Date();
  const s = toDateOnly(row.start_date);
  const e = toDateOnly(row.end_date);
  if (e && now > e) return "已结课";
  if (s && now >= s) return "已开课";
  return "未开课";
}

function coursePhaseTagType(row) {
  const label = coursePhaseLabel(row);
  if (label === "已结课") return "info";
  if (label === "已开课") return "warning";
  return "primary";
}

function isEnrollNotEnded(row) {
  const now = new Date();
  const e = toDateOnly(row.enroll_end_date);
  if (!e) return true;
  return now <= e;
}

function isStarted(row) {
  const now = new Date();
  const s = toDateOnly(row.start_date);
  if (!s) return false;
  return now >= s;
}

function showCancelBtn(row) {
  // 未结束报名才允许取消（包括 pending 申请与已报名）
  return (row.status === "enrolled" || row.status === "pending") && isEnrollNotEnded(row) && !isStarted(row);
}

function showWithdrawBtn(row) {
  return row.status === "enrolled" && isStarted(row);
}

function goWithdraw(row) {
  router.push({ name: "Withdraw", query: { courseId: row.course_id } });
}

async function openAttendance(row) {
  attendanceTitle.value = `「${row.name}」考勤结果`;
  attendanceVisible.value = true;
  attendanceLoading.value = true;
  attendanceSummary.value = null;
  attendanceRecords.value = [];
  try {
    const data = await getStudentCourseAttendanceSummary(row.course_id);
    attendanceSummary.value = {
      total_sessions: data.total_sessions,
      attendance_count: data.attendance_count,
      attendance_rate: data.attendance_rate,
      attendance_score: data.attendance_score,
    };
    attendanceRecords.value = data.records || [];
  } catch {
    ElMessage.error("获取考勤结果失败");
  } finally {
    attendanceLoading.value = false;
  }
}

async function openGrade(row) {
  gradeTitle.value = `「${row.name}」成绩结果`;
  gradeVisible.value = true;
  gradeLoading.value = true;
  gradeInfo.value = null;
  try {
    const data = await getStudentCourseGrade(row.course_id);
    gradeInfo.value = data;
  } catch {
    ElMessage.error("获取成绩结果失败");
  } finally {
    gradeLoading.value = false;
  }
}

function openChat(row) {
  if (!row.teacher_id) {
    ElMessage.warning("该课程暂未绑定教师，无法聊天");
    return;
  }
  chatCourseId.value = row.course_id;
  chatTeacherId.value = row.teacher_id;
  chatTeacherName.value = row.teacher_name || "老师";
  chatCourseTitle.value = `与 ${chatTeacherName.value} 老师聊天`;
  chatVisible.value = true;
  chatInput.value = "";
  loadChat();
  connectWsIfNeeded();
}

async function loadChat() {
  if (!chatCourseId.value || !chatTeacherId.value) return;
  chatLoading.value = true;
  try {
    const msgs = await getCourseMessagesForStudent(
      chatCourseId.value,
      chatTeacherId.value
    );
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

  // 优先使用显式配置的后端地址
  if (import.meta.env.VITE_API_BASE) {
    return import.meta.env.VITE_API_BASE.replace(/^http/, "ws") + "/ws/course-chat";
  }

  // 本地开发：前端 5173，后端 3000（见 README），WebSocket 直接连后端端口
  if (import.meta.env.DEV) {
    return `${protocol}//localhost:3000/ws/course-chat`;
  }

  // 生产环境：前后端同域部署，直接复用当前 host
  return `${protocol}//${loc.host}/ws/course-chat`;
}

function connectWsIfNeeded() {
  if (wsRef.value || !chatCourseId.value || !chatTeacherId.value) return;
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
          courseId: chatCourseId.value,
          teacherId: chatTeacherId.value,
          // 学生自己的 id 由服务端根据 token 补全
          studentId: undefined,
        })
      );
      return;
    }
    if (msg.type === "joined") {
      return;
    }
    if (msg.type === "new-message") {
      // 只处理当前课程和老师的消息
      if (
        msg.courseId === chatCourseId.value &&
        msg.teacherId === chatTeacherId.value
      ) {
        chatMessages.value.push({
          id: `ws-${Date.now()}`,
          sender: msg.sender === "student" ? "student" : "teacher",
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
  if (!chatInput.value.trim() || !chatCourseId.value || !chatTeacherId.value) {
    ElMessage.warning("请输入要发送的内容");
    return;
  }
  chatSending.value = true;
  try {
    await sendCourseMessageToTeacher(
      chatCourseId.value,
      chatTeacherId.value,
      chatInput.value.trim()
    );
    const content = chatInput.value.trim();
    chatInput.value = "";
    // 通过 WebSocket 通知对方（本地列表已由 REST 返回或对方推送）
    if (wsRef.value && wsRef.value.readyState === WebSocket.OPEN) {
      wsRef.value.send(
        JSON.stringify({
          type: "new-message",
          courseId: chatCourseId.value,
          teacherId: chatTeacherId.value,
          studentId: undefined,
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

const filteredList = computed(() => {
  let arr = list.value.slice();
  if (statusFilter.value) {
    arr = arr.filter((i) => i.status === statusFilter.value);
  }
  const kw = keyword.value.trim().toLowerCase();
  if (kw) {
    arr = arr.filter(
      (i) =>
        (i.name && i.name.toLowerCase().includes(kw)) ||
        (i.teacher_name && i.teacher_name.toLowerCase().includes(kw)) ||
        (i.category_name && i.category_name.toLowerCase().includes(kw))
    );
  }
  return arr;
});

const enrolledCount = computed(
  () => list.value.filter((i) => i.status === "enrolled").length
);
const fullCount = computed(
  () =>
    list.value.filter(
      (i) =>
        i.status === "enrolled" &&
        i.capacity &&
        Number(i.current_enrollment) >= Number(i.capacity)
    ).length
);
const upcomingCount = computed(() => {
  const now = new Date();
  const sevenDays = 7 * 24 * 3600 * 1000;
  return list.value.filter((i) => {
    if (!i.start_date) return false;
    const d = new Date(i.start_date);
    return d.getTime() >= now.getTime() && d.getTime() - now.getTime() <= sevenDays;
  }).length;
});

function capacityPercent(row) {
  if (!row.capacity || row.capacity <= 0) return 0;
  return Math.min(100, Math.round((Number(row.current_enrollment) / Number(row.capacity)) * 100));
}

function capacityColor(row) {
  const p = capacityPercent(row);
  if (p >= 100) return "#f56c6c";
  if (p >= 80) return "#e6a23c";
  return "#67c23a";
}

function formatAttendStatus(row, _col, value) {
  const v = value || row.status;
  if (v === "present") return "出勤";
  if (v === "late") return "迟到";
  if (v === "absent") return "缺勤";
  return v || "—";
}

async function fetchList() {
  loading.value = true;
  try {
    const data = await getMyEnrollments();
    list.value = Array.isArray(data) ? data : [];
  } catch {
    list.value = [];
  } finally {
    loading.value = false;
  }
}

async function onCancel(item) {
  await ElMessageBox.confirm(
    `确定取消报名「${item.name}」吗？`,
    "提示",
    { type: "warning" }
  ).catch(() => {
    throw new Error("cancel");
  });
  cancelLoadingId.value = item.course_id;
  try {
    await cancelEnrollment(item.course_id);
    ElMessage.success("已取消报名");
    await fetchList();
  } catch (e) {
    if (e.message !== "cancel") {
      ElMessage.error("取消失败");
    }
  } finally {
    cancelLoadingId.value = null;
  }
}

onMounted(() => {
  fetchList();
});

onBeforeUnmount(() => {
  closeWs();
});

watch(
  () => [route.query.openChat, list.value],
  () => tryOpenChatFromQuery(),
  { deep: true }
);
</script>

<style lang="scss" scoped>
.enroll-page {
  padding: 0 0 32px;
}

.page-hero {
  position: relative;
  border-radius: 16px;
  overflow: hidden;
  margin: 0 24px 24px;
  min-height: 140px;
}

.hero-bg {
  position: absolute;
  inset: 0;
}

.hero-gradient {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, #001529 0%, #002140 45%, #003366 100%);
  opacity: 0.97;
}

.hero-pattern {
  position: absolute;
  inset: 0;
  background-image: radial-gradient(rgba(255, 255, 255, 0.06) 1px, transparent 1px);
  background-size: 20px 20px;
}

.hero-content {
  position: relative;
  z-index: 1;
  padding: 22px 28px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.hero-left h1 {
  margin: 0 0 6px;
  font-size: 22px;
  font-weight: 700;
  color: #fff;
}

.hero-left p {
  margin: 0 0 14px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.78);
}

.hero-stats {
  display: flex;
  gap: 16px;
}

.stat-card {
  min-width: 80px;
  padding: 8px 10px;
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.18);
  color: #fff;
}

.stat-value {
  display: block;
  font-size: 18px;
  font-weight: 700;
}

.stat-label {
  font-size: 12px;
  opacity: 0.85;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  margin-bottom: 16px;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.toolbar-select {
  width: 140px;
}

.toolbar-search {
  width: 220px;
}

.card-list-section {
  padding: 0 24px;
}

.card-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.enroll-card {
  background: var(--el-bg-color);
  border-radius: 14px;
  border: 1px solid var(--el-border-color-lighter);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
  padding: 14px 18px 12px;
  transition: box-shadow 0.2s, border-color 0.2s, transform 0.2s;
}

.enroll-card:hover {
  border-color: var(--el-border-color);
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.06);
  transform: translateY(-1px);
}

.card-header {
  margin-bottom: 8px;
}

.card-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.course-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.teacher-line {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.card-body {
  margin-top: 4px;
}

.info-row {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  font-size: 13px;
  color: var(--el-text-color-regular);

  .el-icon {
    margin-right: 4px;
  }
}

.info-row.second {
  margin-top: 4px;
}

.capacity-row {
  margin-top: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.capacity-progress {
  flex: 1;
}

.capacity-text {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.reject-reason {
  margin-top: 6px;
  font-size: 12px;
  color: var(--el-color-danger);
}

.card-footer {
  margin-top: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.time-tip {
  opacity: 0.9;
}

.card-actions {
  text-align: right;
}

/* 聊天样式 */
.chat-box {
  min-height: 180px;
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
  gap: 10px;
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

.chat-avatar.teacher {
  background: #67c23a;
}

.chat-bubble {
  max-width: 80%;
  padding: 8px 10px;
  border-radius: 10px;
  background: var(--el-fill-color-light);
  font-size: 13px;
  line-height: 1.6;
}

.chat-item.from-me .chat-bubble {
  background: #409eff;
  color: #fff;
}

.chat-content {
  margin: 0 0 4px;
}

.chat-time {
  display: block;
  font-size: 11px;
  opacity: 0.8;
}

/* 考勤 / 成绩弹窗样式 */
.att-dialog-body,
.grade-dialog-body {
  padding-top: 8px;
}

.att-summary {
  display: flex;
  justify-content: space-between;
  align-items: stretch;
  gap: 16px;
  padding: 12px 14px;
  border-radius: 10px;
  background: var(--el-fill-color-lighter);
  margin-bottom: 12px;
}

.att-summary-left {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.att-kpi {
  display: flex;
  flex-direction: column;
}

.att-kpi.secondary .att-kpi-value {
  font-size: 18px;
}

.att-kpi-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.att-kpi-value {
  font-size: 22px;
  font-weight: 700;
  color: #409eff;
}

.att-kpi-value.small {
  font-size: 16px;
}

.att-summary-right {
  min-width: 150px;
  border-left: 1px solid var(--el-border-color-lighter);
  padding-left: 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
}

.att-stat-line {
  display: flex;
  justify-content: space-between;
  color: var(--el-text-color-regular);
}

.att-table {
  margin-top: 8px;
}

.grade-summary-block {
  padding: 12px 14px;
  border-radius: 10px;
  background: var(--el-fill-color-lighter);
}

.grade-score-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.grade-total {
  display: flex;
  flex-direction: column;
}

.grade-total-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.grade-total-value {
  font-size: 24px;
  font-weight: 700;
  color: #e6a23c;
}

.grade-detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px 16px;
  margin-bottom: 8px;
}

.grade-detail-item .label {
  display: block;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.grade-detail-item .value {
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.grade-comment {
  margin: 0;
  margin-top: 4px;
  font-size: 13px;
  color: var(--el-text-color-regular);
}

.grade-comment .label {
  font-weight: 500;
}
</style>

