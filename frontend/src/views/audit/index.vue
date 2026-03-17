<template>
  <div class="audit-page">
    <section class="page-hero">
      <div class="hero-bg">
        <div class="hero-gradient" />
        <div class="hero-pattern" />
      </div>
      <div class="hero-content">
        <div class="hero-left">
          <h1>审核中心</h1>
          <p>管理学生报名申请与退课申请</p>
          <div class="hero-stats">
            <div class="stat-card">
              <span class="stat-value">{{ enrollPendingCount }}</span>
              <span class="stat-label">待审核报名</span>
            </div>
            <div class="stat-card">
              <span class="stat-value">{{ withdrawPendingCount }}</span>
              <span class="stat-label">待审核退课</span>
            </div>
          </div>
        </div>
        <div class="hero-right">
          <el-button type="primary" plain :loading="loading" @click="refresh">刷新</el-button>
        </div>
      </div>
    </section>

    <section class="content-card" v-loading="loading">
      <el-tabs v-model="activeTab" class="audit-tabs">
        <el-tab-pane label="报名审核" name="enroll">
          <el-table :data="enrollRequests" stripe border style="width: 100%" :header-cell-style="{ background: 'var(--el-fill-color-light)' }">
            <el-table-column prop="course_name" label="课程" min-width="160" show-overflow-tooltip />
            <el-table-column prop="student_name" label="学生" width="110" show-overflow-tooltip />
            <el-table-column prop="student_number" label="学号" width="120" show-overflow-tooltip />
            <el-table-column label="技能概览" width="140" align="center">
              <template #default="{ row }">
                <span>攻{{ formatAvg(row.atk_avg) }} 传{{ formatAvg(row.set_avg) }} 防{{ formatAvg(row.def_avg) }}</span>
              </template>
            </el-table-column>
            <el-table-column label="申请时间" width="160">
              <template #default="{ row }">{{ formatRelativeTime(row.created_at) }}</template>
            </el-table-column>
            <el-table-column label="操作" width="160" fixed="right" align="center">
              <template #default="{ row }">
                <el-button type="primary" link @click="openEnrollDetail(row)">详情</el-button>
                <el-button type="success" link :loading="actionLoadingId === 'enroll:' + row.id" @click="onApproveEnroll(row)">通过</el-button>
                <el-button type="danger" link :loading="actionLoadingId === 'enroll:' + row.id" @click="onRejectEnroll(row)">驳回</el-button>
              </template>
            </el-table-column>
          </el-table>
          <el-empty v-if="!loading && enrollRequests.length === 0" description="暂无待审核的报名申请" :image-size="80" class="empty" />
        </el-tab-pane>

        <el-tab-pane label="退课审核" name="withdraw">
          <el-table :data="withdrawRequests" stripe border style="width: 100%" :header-cell-style="{ background: 'var(--el-fill-color-light)' }">
            <el-table-column prop="course_name" label="课程" min-width="160" show-overflow-tooltip />
            <el-table-column prop="student_name" label="学生" width="110" show-overflow-tooltip />
            <el-table-column prop="student_number" label="学号" width="120" show-overflow-tooltip />
            <el-table-column label="退课原因" min-width="180" show-overflow-tooltip>
              <template #default="{ row }">{{ row.reason || "—" }}</template>
            </el-table-column>
            <el-table-column label="申请时间" width="160">
              <template #default="{ row }">{{ formatRelativeTime(row.request_time) }}</template>
            </el-table-column>
            <el-table-column label="操作" width="160" fixed="right" align="center">
              <template #default="{ row }">
                <el-button type="success" link :loading="actionLoadingId === 'withdraw:' + row.enrollment_id" @click="onApproveWithdraw(row)">通过</el-button>
                <el-button type="danger" link :loading="actionLoadingId === 'withdraw:' + row.enrollment_id" @click="onRejectWithdraw(row)">驳回</el-button>
              </template>
            </el-table-column>
          </el-table>
          <el-empty v-if="!loading && withdrawRequests.length === 0" description="暂无待审核的退课申请" :image-size="80" class="empty" />
        </el-tab-pane>

        <el-tab-pane label="历史记录" name="history">
          <div class="history-toolbar">
            <el-select v-model="historyType" class="history-select" clearable placeholder="类型">
              <el-option label="报名" value="enroll" />
              <el-option label="退课" value="withdraw" />
            </el-select>
            <el-select v-model="historyResult" class="history-select" clearable placeholder="结果">
              <el-option label="通过" value="approved" />
              <el-option label="驳回" value="reject" />
            </el-select>
            <el-button type="primary" plain :loading="historyLoading" @click="fetchHistory">刷新历史</el-button>
          </div>

          <el-table :data="historyList" stripe border style="width: 100%" :header-cell-style="{ background: 'var(--el-fill-color-light)' }">
            <el-table-column label="类型" width="90" align="center">
              <template #default="{ row }">
                <el-tag size="small" effect="plain" :type="row.type === 'withdraw' ? 'warning' : 'primary'">
                  {{ row.type === 'withdraw' ? '退课' : '报名' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="course_name" label="课程" min-width="160" show-overflow-tooltip />
            <el-table-column prop="student_name" label="学生" width="110" show-overflow-tooltip />
            <el-table-column prop="student_number" label="学号" width="120" show-overflow-tooltip />
            <el-table-column label="结果" width="90" align="center">
              <template #default="{ row }">
                <el-tag size="small" effect="plain" :type="row.result === 'approved' ? 'success' : 'danger'">
                  {{ row.result === 'approved' ? '通过' : '驳回' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="学生理由" min-width="140" show-overflow-tooltip>
              <template #default="{ row }">{{ row.reason || '—' }}</template>
            </el-table-column>
            <el-table-column label="驳回原因" min-width="140" show-overflow-tooltip>
              <template #default="{ row }">{{ row.reject_reason || '—' }}</template>
            </el-table-column>
            <el-table-column label="时间" width="140">
              <template #default="{ row }">{{ formatRelativeTime(row.created_at) }}</template>
            </el-table-column>
          </el-table>
          <el-empty v-if="!historyLoading && historyList.length === 0" description="暂无历史审核记录" :image-size="80" class="empty" />
        </el-tab-pane>
      </el-tabs>
    </section>

    <el-drawer v-model="detailVisible" title="报名申请详情" size="520px" destroy-on-close>
      <div v-loading="detailLoading">
        <el-descriptions v-if="detailData" :column="1" border size="small">
          <el-descriptions-item label="课程">{{ detailData.enrollment.course_name }}</el-descriptions-item>
          <el-descriptions-item label="时间">{{ detailData.enrollment.schedule_weekly || "—" }}</el-descriptions-item>
          <el-descriptions-item label="学生">{{ detailData.enrollment.student_name }} {{ detailData.enrollment.student_number }}</el-descriptions-item>
          <el-descriptions-item label="专业">{{ detailData.enrollment.major || "—" }}</el-descriptions-item>
          <el-descriptions-item label="联系方式">{{ detailData.enrollment.phone || detailData.enrollment.email || "—" }}</el-descriptions-item>
          <el-descriptions-item label="摸高">{{ detailData.profile?.base_reach_cm ?? "—" }}</el-descriptions-item>
          <el-descriptions-item label="报名理由">{{ detailData.enrollment.enroll_reason || "—" }}</el-descriptions-item>
        </el-descriptions>

        <div v-if="detailSkills.length" style="margin-top: 12px;">
          <el-divider content-position="left">技能点</el-divider>
          <el-table :data="detailSkills" border size="small" height="320">
            <el-table-column prop="category" label="分类" width="90" />
            <el-table-column prop="skill_name" label="技能" min-width="160" show-overflow-tooltip />
            <el-table-column prop="value" label="点数" width="80" align="center" />
          </el-table>
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<script setup>
defineOptions({ name: "Audit" });
import { ref, computed, onMounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { formatRelativeTime } from "@/utils/format";
import {
  getTeacherEnrollRequests,
  getTeacherEnrollRequestDetail,
  approveEnrollRequest,
  rejectEnrollRequest,
  getTeacherWithdrawRequests,
  approveWithdrawRequest,
  rejectWithdrawRequest,
  getTeacherAuditHistory,
} from "@/api/audit";

const activeTab = ref("enroll");
const loading = ref(false);
const actionLoadingId = ref("");
const enrollRequests = ref([]);
const withdrawRequests = ref([]);
const historyLoading = ref(false);
const historyList = ref([]);
const historyType = ref("");
const historyResult = ref("");
const detailVisible = ref(false);
const detailLoading = ref(false);
const detailData = ref(null);
const detailSkills = ref([]);

const enrollPendingCount = computed(() => enrollRequests.value.length);
const withdrawPendingCount = computed(() => withdrawRequests.value.length);

function formatAvg(v) {
  if (v == null || Number.isNaN(Number(v))) return "—";
  return Number(v).toFixed(0);
}

async function refresh() {
  loading.value = true;
  try {
    const [enroll, withdraw] = await Promise.all([
      getTeacherEnrollRequests({ pending: 1 }),
      getTeacherWithdrawRequests(),
    ]);
    enrollRequests.value = Array.isArray(enroll) ? enroll : [];
    withdrawRequests.value = Array.isArray(withdraw) ? withdraw : [];
  } finally {
    loading.value = false;
  }
}

async function openEnrollDetail(row) {
  detailVisible.value = true;
  detailLoading.value = true;
  detailData.value = null;
  detailSkills.value = [];
  try {
    const res = await getTeacherEnrollRequestDetail(row.id);
    const data = res?.data ?? res;
    detailData.value = data;
    detailSkills.value = Array.isArray(data.skills) ? data.skills : [];
  } finally {
    detailLoading.value = false;
  }
}

async function fetchHistory() {
  historyLoading.value = true;
  try {
    const params = {};
    if (historyType.value) params.type = historyType.value;
    if (historyResult.value) params.result = historyResult.value;
    const data = await getTeacherAuditHistory(params);
    historyList.value = Array.isArray(data) ? data : [];
  } finally {
    historyLoading.value = false;
  }
}

async function onApproveEnroll(row) {
  await ElMessageBox.confirm(`确定通过「${row.student_name}」对课程「${row.course_name}」的报名申请吗？`, "提示", { type: "success" })
    .catch(() => { throw new Error("cancel"); });
  actionLoadingId.value = "enroll:" + row.id;
  try {
    await approveEnrollRequest(row.id);
    ElMessage.success("已通过");
    refresh();
  } catch (e) {
    if (e.message !== "cancel") {}
  } finally {
    actionLoadingId.value = "";
  }
}

async function onRejectEnroll(row) {
  const { value, action } = await ElMessageBox.prompt(
    `填写驳回「${row.student_name}」对课程「${row.course_name}」的原因：`,
    "驳回原因",
    {
      inputType: "textarea",
      inputPlaceholder: "请输入驳回原因（必填，最多500字）",
      inputValidator: (val) => {
        if (!val || !val.trim()) return "请填写驳回原因";
        if (val.trim().length > 500) return "驳回原因最多500字";
        return true;
      },
      inputErrorMessage: "请填写驳回原因",
      type: "warning",
    }
  ).catch(() => ({ action: "cancel", value: "" }));
  if (action !== "confirm") throw new Error("cancel");

  actionLoadingId.value = "enroll:" + row.id;
  try {
    await rejectEnrollRequest(row.id, value.trim());
    ElMessage.success("已驳回");
    refresh();
  } catch (e) {
    if (e.message !== "cancel") {}
  } finally {
    actionLoadingId.value = "";
  }
}

async function onApproveWithdraw(row) {
  await ElMessageBox.confirm(`确定通过「${row.student_name}」对课程「${row.course_name}」的退课申请吗？`, "提示", { type: "success" })
    .catch(() => { throw new Error("cancel"); });
  actionLoadingId.value = "withdraw:" + row.enrollment_id;
  try {
    await approveWithdrawRequest(row.enrollment_id);
    ElMessage.success("已通过退课");
    refresh();
  } catch (e) {
    if (e.message !== "cancel") {}
  } finally {
    actionLoadingId.value = "";
  }
}

async function onRejectWithdraw(row) {
  const { value, action } = await ElMessageBox.prompt(
    `填写驳回「${row.student_name}」对课程「${row.course_name}」的退课原因：`,
    "驳回退课原因",
    {
      inputType: "textarea",
      inputPlaceholder: "请输入驳回原因（必填，最多500字）",
      inputValidator: (val) => {
        if (!val || !val.trim()) return "请填写驳回原因";
        if (val.trim().length > 500) return "驳回原因最多500字";
        return true;
      },
      inputErrorMessage: "请填写驳回原因",
      type: "warning",
    }
  ).catch(() => ({ action: "cancel", value: "" }));
  if (action !== "confirm") throw new Error("cancel");

  actionLoadingId.value = "withdraw:" + row.enrollment_id;
  try {
    await rejectWithdrawRequest(row.enrollment_id, value.trim());
    ElMessage.success("已驳回退课");
    refresh();
  } catch (e) {
    if (e.message !== "cancel") {}
  } finally {
    actionLoadingId.value = "";
  }
}

onMounted(() => {
  refresh();
  fetchHistory();
});
</script>

<style lang="scss" scoped>
.audit-page {
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
  background: linear-gradient(135deg, #001529 0%, #2c3e50 45%, #409eff 100%);
  opacity: 0.96;
}

.hero-pattern {
  position: absolute;
  inset: 0;
  background-image: radial-gradient(rgba(255, 255, 255, 0.06) 1px, transparent 1px);
  background-size: 22px 22px;
}

.hero-content {
  position: relative;
  z-index: 1;
  padding: 22px 28px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
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
  min-width: 90px;
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

.content-card {
  margin: 0 24px;
  background: var(--el-bg-color);
  border-radius: 14px;
  border: 1px solid var(--el-border-color-lighter);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
  overflow: hidden;
}

.audit-tabs {
  padding: 8px 12px 16px;
}

.history-toolbar {
  padding: 8px 4px 14px;
  display: flex;
  gap: 10px;
  align-items: center;
}

.history-select {
  width: 140px;
}

.empty {
  padding: 48px 0;
}
</style>

