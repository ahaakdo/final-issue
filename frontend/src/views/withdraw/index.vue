<template>
  <div class="withdraw-page">
    <section class="page-hero">
      <div class="hero-bg">
        <div class="hero-gradient" />
        <div class="hero-pattern" />
      </div>
      <div class="hero-content">
        <div class="hero-left">
          <h1>申请退课</h1>
          <p>开课后可提交退课申请，审核中不会改变原报名状态</p>
          <div class="hero-stats">
            <div class="stat-card">
              <span class="stat-value">{{ eligibleList.length }}</span>
              <span class="stat-label">可申请课程</span>
            </div>
            <div class="stat-card">
              <span class="stat-value">{{ pendingCount }}</span>
              <span class="stat-label">审核中</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="table-section">
      <div class="table-card" v-loading="loading">
        <div class="table-card-header">
          <span class="table-title">已开课报名课程</span>
          <el-input v-model="keyword" placeholder="搜索课程名 / 教师" clearable class="table-search" />
        </div>

        <el-table :data="filteredList" stripe border style="width: 100%" :header-cell-style="{ background: 'var(--el-fill-color-light)' }">
          <el-table-column prop="name" label="课程名称" min-width="160" show-overflow-tooltip />
          <el-table-column prop="teacher_name" label="授课教师" width="120" show-overflow-tooltip />
          <el-table-column prop="category_name" label="分类" width="100" show-overflow-tooltip />
          <el-table-column label="上课时间" width="160" show-overflow-tooltip>
            <template #default="{ row }">{{ row.schedule_weekly || '—' }}</template>
          </el-table-column>
          <el-table-column label="报名审核" width="110" align="center">
            <template #default="{ row }">
              <el-tag v-if="row.status === 'pending'" type="warning" effect="plain" round>报名审核中</el-tag>
              <el-tag v-else type="success" effect="plain" round>已报名</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="110" align="center">
            <template #default="{ row }">
              <el-tag v-if="row.withdraw_pending" type="warning" effect="plain" round>审核中</el-tag>
              <el-tag v-else type="success" effect="plain" round>可申请</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="160" fixed="right" align="center">
            <template #default="{ row }">
              <el-button
                type="warning"
                link
                :disabled="!!row.withdraw_pending"
                @click="openApply(row)"
              >
                申请退课
              </el-button>
            </template>
          </el-table-column>
        </el-table>

        <el-empty v-if="!loading && filteredList.length === 0" description="暂无可申请退课的课程" :image-size="80" class="empty" />
      </div>
    </section>

    <el-dialog v-model="dialogVisible" title="退课申请" width="520px" destroy-on-close>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item label="课程">
          <el-input :model-value="selected?.name || ''" disabled />
        </el-form-item>
        <el-form-item label="原因" prop="reason">
          <el-input v-model="form.reason" type="textarea" :rows="4" maxlength="500" show-word-limit placeholder="请填写退课原因（必填）" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitApply">提交申请</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
defineOptions({ name: "Withdraw" });
import { ref, computed, reactive, onMounted, watch } from "vue";
import { useRoute } from "vue-router";
import { ElMessage } from "element-plus";
import { getMyEnrollments, applyWithdraw } from "@/api/enroll";

const route = useRoute();

const loading = ref(false);
const list = ref([]);
const keyword = ref("");

const dialogVisible = ref(false);
const submitting = ref(false);
const selected = ref(null);
const formRef = ref(null);
const form = reactive({ reason: "" });
const autoOpened = ref(false);

const rules = {
  reason: [{ required: true, message: "请填写退课原因", trigger: "blur" }],
};

const eligibleList = computed(() => {
  const now = new Date();
  return list.value.filter((i) => {
    if (i.status !== "enrolled") return false;
    if (!i.start_date) return false;
    const start = new Date(i.start_date);
    return now >= start;
  });
});

const filteredList = computed(() => {
  const kw = keyword.value.trim().toLowerCase();
  if (!kw) return eligibleList.value;
  return eligibleList.value.filter(
    (i) =>
      (i.name && i.name.toLowerCase().includes(kw)) ||
      (i.teacher_name && i.teacher_name.toLowerCase().includes(kw))
  );
});

const pendingCount = computed(() => eligibleList.value.filter((i) => i.withdraw_pending).length);

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

function openApply(row) {
  selected.value = row;
  form.reason = "";
  dialogVisible.value = true;
}

async function submitApply() {
  await formRef.value?.validate().catch(() => {});
  if (!selected.value?.course_id) return;
  submitting.value = true;
  try {
    await applyWithdraw(selected.value.course_id, form.reason.trim());
    ElMessage.success("已提交退课申请（审核中）");
    dialogVisible.value = false;
    await fetchList();
  } finally {
    submitting.value = false;
  }
}

watch(
  [() => route.query.courseId, () => loading.value, () => eligibleList.value.length],
  () => {
    if (autoOpened.value) return;
    const qCourseId = route.query.courseId ? Number(route.query.courseId) : null;
    if (!qCourseId || Number.isNaN(qCourseId)) return;
    if (loading.value) return;
    const row = eligibleList.value.find((i) => i.course_id === qCourseId);
    if (row && !row.withdraw_pending) {
      autoOpened.value = true;
      openApply(row);
    }
  },
  { immediate: true }
);

onMounted(async () => {
  await fetchList();
});
</script>

<style lang="scss" scoped>
.withdraw-page {
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
  background: linear-gradient(135deg, #141414 0%, #1f2d3d 45%, #0b3d91 100%);
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
  background: rgba(0, 0, 0, 0.22);
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

.table-section {
  padding: 0 24px;
}

.table-card {
  background: var(--el-bg-color);
  border-radius: 14px;
  border: 1px solid var(--el-border-color-lighter);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
  overflow: hidden;
}

.table-card-header {
  padding: 16px 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  background: var(--el-fill-color-light);
}

.table-title {
  font-weight: 700;
  color: var(--el-text-color-primary);
}

.table-search {
  width: 220px;
}

.empty {
  padding: 48px 0;
}
</style>

