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
          <div
            v-for="item in filteredList"
            :key="item.id"
            class="enroll-card"
          >
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
import { ref, computed, onMounted, watch } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { Clock, Location, Trophy } from "@element-plus/icons-vue";
import {
  getMyEnrollments,
  cancelEnrollment,
  getCourseMessagesForStudent,
  sendCourseMessageToTeacher,
} from "@/api/enroll";
import { formatDateRange, formatRelativeTime } from "@/utils/format";
import { useRoute, useRouter } from "vue-router";

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
    chatInput.value = "";
    await loadChat();
  } catch {
    ElMessage.error("发送失败");
  } finally {
    chatSending.value = false;
  }
}

watch(chatVisible, (v) => {
  if (!v) window.dispatchEvent(new CustomEvent("course-messages-read"));
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
</style>

