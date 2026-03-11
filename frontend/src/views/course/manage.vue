<template>
  <div class="course-manage-page">
    <!-- 顶部横幅 -->
    <section class="page-hero">
      <div class="hero-bg">
        <div class="hero-gradient" />
        <div class="hero-pattern" />
      </div>
      <div class="hero-content">
        <div class="hero-left">
          <h1>课程管理</h1>
          <p>发布与管理您的排球社团课程</p>
          <div class="hero-stats">
            <div class="stat-card">
              <span class="stat-value">{{ list.length }}</span>
              <span class="stat-label">总课程</span>
            </div>
            <div class="stat-card">
              <span class="stat-value">{{ fullCount }}</span>
              <span class="stat-label">已满员</span>
            </div>
            <div class="stat-card">
              <span class="stat-value">{{ visibleCount }}</span>
              <span class="stat-label">已上架</span>
            </div>
          </div>
        </div>
        <div class="hero-right">
          <el-button type="primary" size="large" class="hero-btn" @click="openDialog()">
            <el-icon :size="20"><Plus /></el-icon>
            新增课程
          </el-button>
        </div>
      </div>
    </section>

    <!-- 课程列表卡片 -->
    <section v-if="list.length > 0" class="table-section">
      <div class="table-card">
        <div class="table-card-header">
          <span class="table-title">我的课程列表</span>
          <el-button type="primary" link @click="openDialog()">
            <el-icon><Plus /></el-icon>
            新增
          </el-button>
        </div>
    <el-table
      v-loading="loading"
      :data="list"
      stripe
      border
      style="width: 100%"
      :header-cell-style="{ background: 'var(--el-fill-color-light)' }"
    >
      <el-table-column type="index" label="序号" width="56" align="center" />
      <el-table-column prop="name" label="课程名称" min-width="140" show-overflow-tooltip />
      <el-table-column prop="category_name" label="分类" width="88" show-overflow-tooltip />
      <el-table-column prop="credits" label="学分" width="64" align="center" />
      <el-table-column label="报名" width="80" align="center">
        <template #default="{ row }">{{ row.current_enrollment }}/{{ row.capacity }}</template>
      </el-table-column>
      <el-table-column prop="location" label="上课地址" min-width="100" show-overflow-tooltip />
      <el-table-column prop="schedule_weekly" label="上课时间" width="110" show-overflow-tooltip />
      <el-table-column label="报名时间" width="180" show-overflow-tooltip>
        <template #default="{ row }">{{ formatDateRange(row.enroll_start_date, row.enroll_end_date) || "—" }}</template>
      </el-table-column>
      <el-table-column label="开课时间" width="180" show-overflow-tooltip>
        <template #default="{ row }">{{ formatDateRange(row.start_date, row.end_date) || "—" }}</template>
      </el-table-column>
      <el-table-column label="难度" width="72" align="center">
        <template #default="{ row }">{{ difficultyLabels[row.difficulty] ?? "—" }}</template>
      </el-table-column>
      <el-table-column prop="lesson_count" label="课时" width="64" align="center" />
      <el-table-column prop="recommend_index" label="推荐指数" width="88" align="center">
        <template #default="{ row }">{{ row.recommend_index ?? 0 }}</template>
      </el-table-column>
      <el-table-column prop="tags" label="标签" min-width="100" show-overflow-tooltip />
      <el-table-column prop="is_visible" label="可见" width="68" align="center">
        <template #default="{ row }">
          <el-tag :type="row.is_visible ? 'success' : 'info'" size="small">
            {{ row.is_visible ? "是" : "否" }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="260" align="center" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openDialog(row)">编辑</el-button>
          <el-button link type="primary" @click="goComments(row)">评论区</el-button>
          <el-button link type="primary" @click="goRoster(row)">报名名单</el-button>
          <el-button link type="danger" @click="onDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
      </div>
    </section>

    <el-empty v-if="!loading && list.length === 0" description="暂无课程，点击上方按钮发布" class="empty-block">
      <template #image>
        <el-icon :size="64" color="var(--el-text-color-placeholder)"><Document /></el-icon>
      </template>
      <el-button type="primary" @click="openDialog()">发布第一门课程</el-button>
    </el-empty>

    <el-dialog
      v-model="dialogVisible"
      width="720px"
      destroy-on-close
      class="course-dialog"
      @close="resetForm"
    >
      <template #header>
        <div class="dialog-header-inner">
          <div class="dialog-header-accent" />
          <h2 class="dialog-title">{{ editId ? '编辑课程' : '新增课程' }}</h2>
          <p class="dialog-desc">{{ editId ? '修改课程信息并保存' : '填写课程信息并发布' }}</p>
        </div>
      </template>
      <div class="dialog-body-wrap">
        <el-form ref="formRef" :model="form" :rules="rules" label-width="96px" class="course-form">
          <div class="form-section">
            <div class="form-section-title">基础信息</div>
            <el-row :gutter="16">
              <el-col :span="12">
                <el-form-item label="课程名称" prop="name">
                  <el-input v-model="form.name" placeholder="请输入" maxlength="128" show-word-limit />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="课程分类" prop="category_id">
                  <el-select v-model="form.category_id" placeholder="请选择" style="width: 100%">
                    <el-option
                      v-for="c in categories"
                      :key="c.id"
                      :label="c.name"
                      :value="c.id"
                    />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>
            <el-row :gutter="16">
              <el-col :span="8">
                <el-form-item label="学分" prop="credits">
                  <el-input-number v-model="form.credits" :min="0" :max="10" :precision="1" style="width: 100%" />
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="容量" prop="capacity">
                  <el-input-number v-model="form.capacity" :min="0" style="width: 100%" />
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="难度" prop="difficulty">
                  <el-select v-model="form.difficulty" placeholder="1-3" style="width: 100%">
                    <el-option label="初级" :value="1" />
                    <el-option label="中级" :value="2" />
                    <el-option label="高级" :value="3" />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>
            <el-row :gutter="16">
              <el-col :span="12">
                <el-form-item label="上课地址" prop="location">
                  <el-input v-model="form.location" placeholder="如：体育馆A馆" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="上课时间" prop="schedule_weekly">
                  <el-input v-model="form.schedule_weekly" placeholder="如：周一 14:00" />
                </el-form-item>
              </el-col>
            </el-row>
            <el-row :gutter="16">
              <el-col :span="12">
                <el-form-item label="课时数" prop="lesson_count">
                  <el-input-number v-model="form.lesson_count" :min="0" style="width: 100%" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="是否可见" prop="is_visible">
                  <el-radio-group v-model="form.is_visible">
                    <el-radio :value="1">是</el-radio>
                    <el-radio :value="0">否</el-radio>
                  </el-radio-group>
                </el-form-item>
              </el-col>
            </el-row>
          </div>
          <div class="form-section">
            <div class="form-section-title">时间安排</div>
            <el-row :gutter="16">
              <el-col :span="12">
                <el-form-item label="报名开始" prop="enroll_start_date">
                  <el-date-picker
                    v-model="form.enroll_start_date"
                    type="date"
                    placeholder="选择日期"
                    value-format="YYYY-MM-DD"
                    style="width: 100%"
                  />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="报名截止" prop="enroll_end_date">
                  <el-date-picker
                    v-model="form.enroll_end_date"
                    type="date"
                    placeholder="选择日期"
                    value-format="YYYY-MM-DD"
                    style="width: 100%"
                  />
                </el-form-item>
              </el-col>
            </el-row>
            <el-row :gutter="16">
              <el-col :span="12">
                <el-form-item label="开课日期" prop="start_date">
                  <el-date-picker
                    v-model="form.start_date"
                    type="date"
                    placeholder="选择日期"
                    value-format="YYYY-MM-DD"
                    style="width: 100%"
                  />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="结课日期" prop="end_date">
                  <el-date-picker
                    v-model="form.end_date"
                    type="date"
                    placeholder="选择日期"
                    value-format="YYYY-MM-DD"
                    style="width: 100%"
                  />
                </el-form-item>
              </el-col>
            </el-row>
          </div>
          <div class="form-section">
            <div class="form-section-title">扩展信息</div>
            <el-row :gutter="16">
              <el-col :span="12">
                <el-form-item label="课程标签" prop="tags">
                  <el-input v-model="form.tags" placeholder="如：高强度,技术流" maxlength="255" show-word-limit />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="课程描述" prop="description">
                  <el-input v-model="form.description" type="textarea" :rows="2" placeholder="课程简介" />
                </el-form-item>
              </el-col>
            </el-row>
            <el-row :gutter="16">
              <el-col :span="12">
                <el-form-item label="课程需求" prop="requirements">
                  <el-input v-model="form.requirements" type="textarea" :rows="2" placeholder="选课要求" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="教学大纲" prop="syllabus">
                  <el-input v-model="form.syllabus" type="textarea" :rows="2" placeholder="大纲内容" />
                </el-form-item>
              </el-col>
            </el-row>
          </div>
        </el-form>
      </div>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitLoading" @click="onSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
defineOptions({ name: "CourseManage" });
import { ref, reactive, computed, onMounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { Plus, Document } from "@element-plus/icons-vue";
import { getCourseList, createCourse, updateCourse, deleteCourse } from "@/api/course";
import { getCategoryList } from "@/api/category";
import { formatDateRange } from "@/utils/format";
import { useUserStore } from "@/store/user";
import { useRouter } from "vue-router";

const difficultyLabels = { 1: "初级", 2: "中级", 3: "高级" };

const router = useRouter();
const userStore = useUserStore();

const loading = ref(false);
const list = ref([]);
const categories = ref([]);
const dialogVisible = ref(false);
const editId = ref(null);
const submitLoading = ref(false);
const formRef = ref(null);

const form = reactive({
  name: "",
  category_id: null,
  credits: 0,
  capacity: 0,
  location: "",
  schedule_weekly: "",
  enroll_start_date: null,
  enroll_end_date: null,
  start_date: null,
  end_date: null,
  description: "",
  tags: "",
  requirements: "",
  syllabus: "",
  difficulty: 1,
  lesson_count: 0,
  recommend_index: null,
  is_visible: 1,
});

const rules = {
  name: [{ required: true, message: "请输入课程名称", trigger: "blur" }],
  category_id: [{ required: true, message: "请选择课程分类", trigger: "change" }],
};

const fullCount = computed(() => list.value.filter((r) => r.capacity > 0 && r.current_enrollment >= r.capacity).length);
const visibleCount = computed(() => list.value.filter((r) => r.is_visible).length);

async function fetchList() {
  loading.value = true;
  try {
    const data = await getCourseList({ my: 1 });
    list.value = Array.isArray(data) ? data : [];
  } catch (_) {
    list.value = [];
  } finally {
    loading.value = false;
  }
}

async function fetchCategories() {
  try {
    const data = await getCategoryList();
    categories.value = Array.isArray(data) ? data : [];
  } catch (_) {
    categories.value = [];
  }
}

function openDialog(row) {
  editId.value = row ? row.id : null;
  if (row) {
    form.name = row.name;
    form.category_id = row.category_id;
    form.credits = Number(row.credits) || 0;
    form.capacity = Number(row.capacity) || 0;
    form.location = row.location || "";
    form.schedule_weekly = row.schedule_weekly || "";
    form.enroll_start_date = row.enroll_start_date || null;
    form.enroll_end_date = row.enroll_end_date || null;
    form.start_date = row.start_date || null;
    form.end_date = row.end_date || null;
    form.description = row.description || "";
    form.tags = row.tags || "";
    form.requirements = row.requirements || "";
    form.syllabus = row.syllabus || "";
    form.difficulty = Number(row.difficulty) || 1;
    form.lesson_count = Number(row.lesson_count) || 0;
    form.recommend_index = row.recommend_index != null ? Number(row.recommend_index) : null;
    form.is_visible = row.is_visible !== undefined ? Number(row.is_visible) : 1;
  } else {
    Object.assign(form, {
      name: "",
      category_id: null,
      credits: 0,
      capacity: 0,
      location: "",
      schedule_weekly: "",
      enroll_start_date: null,
      enroll_end_date: null,
      start_date: null,
      end_date: null,
      description: "",
      tags: "",
      requirements: "",
      syllabus: "",
      difficulty: 1,
      lesson_count: 0,
      recommend_index: null,
      is_visible: 1,
    });
  }
  dialogVisible.value = true;
}

function goRoster(row) {
  router.push({ name: "CourseRoster", params: { courseId: row.id } });
}

function resetForm() {
  editId.value = null;
  formRef.value?.resetFields();
}

async function onSubmit() {
  await formRef.value?.validate().catch(() => {});
  submitLoading.value = true;
  try {
    const payload = {
      name: form.name,
      category_id: form.category_id,
      credits: form.credits,
      capacity: form.capacity,
      location: form.location || null,
      schedule_weekly: form.schedule_weekly || null,
      enroll_start_date: form.enroll_start_date || null,
      enroll_end_date: form.enroll_end_date || null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      description: form.description || null,
      tags: form.tags || null,
      requirements: form.requirements || null,
      syllabus: form.syllabus || null,
      difficulty: form.difficulty,
      lesson_count: form.lesson_count,
      recommend_index: form.recommend_index,
      is_visible: form.is_visible,
    };
    if (editId.value) {
      await updateCourse(editId.value, payload);
      ElMessage.success("更新成功");
    } else {
      await createCourse(payload);
      ElMessage.success("新增成功");
    }
    dialogVisible.value = false;
    fetchList();
  } finally {
    submitLoading.value = false;
  }
}

async function onDelete(row) {
  await ElMessageBox.confirm(`确定删除课程「${row.name}」吗？`, "提示", {
    type: "warning",
  }).catch(() => {
    throw new Error("cancel");
  });
  try {
    await deleteCourse(row.id);
    ElMessage.success("删除成功");
    fetchList();
  } catch (e) {
    if (e.message === "cancel") return;
  }
}

function goComments(row) {
  router.push({ name: "CourseComments", params: { courseId: row.id } });
}

onMounted(() => {
  if (userStore.role !== "teacher") {
    router.replace("/course");
    return;
  }
  fetchCategories();
  fetchList();
});
</script>

<style lang="scss" scoped>
.course-manage-page {
  padding: 0;
  padding-bottom: 32px;
}

.page-hero {
  position: relative;
  border-radius: 16px;
  overflow: hidden;
  margin-bottom: 24px;
  min-height: 160px;
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
  background-size: 24px 24px;
}

.hero-content {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28px 32px;
  flex-wrap: wrap;
  gap: 20px;
}

.hero-left h1 {
  margin: 0 0 6px;
  font-size: 24px;
  font-weight: 700;
  color: #fff;
}

.hero-left p {
  margin: 0 0 16px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.78);
}

.hero-stats {
  display: flex;
  gap: 20px;
}

.stat-card {
  background: rgba(255, 255, 255, 0.12);
  border-radius: 10px;
  padding: 10px 18px;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 72px;
}

.stat-value {
  font-size: 22px;
  font-weight: 700;
  color: #fff;
  line-height: 1.2;
}

.stat-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.8);
  margin-top: 2px;
}

.hero-btn {
  font-weight: 600;
  padding: 12px 24px;
}

.table-section {
  margin-bottom: 24px;
}

.table-card {
  background: var(--el-bg-color);
  border-radius: 16px;
  border: 1px solid var(--el-border-color);
  box-shadow: 0 4px 20px rgba(0, 21, 41, 0.06);
  overflow: hidden;
}

.table-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  background: var(--el-fill-color-lighter);
}

.table-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.table-card :deep(.el-table) {
  --el-table-border-color: var(--el-border-color-lighter);
}

.table-card :deep(.el-table th.el-table__cell) {
  background: var(--el-fill-color-light) !important;
  font-weight: 600;
}

.empty-block {
  padding: 48px 0;
}

.dialog-body-wrap {
  overflow: visible;
  margin: 0 -20px;
  padding: 0 20px;
}

.course-form {
  min-width: 0;
}

.course-form .el-form-item {
  margin-bottom: 12px;
}

.form-section {
  margin-bottom: 14px;
}

.form-section:last-child {
  margin-bottom: 0;
}

.form-section-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-secondary);
  margin-bottom: 8px;
  padding-bottom: 4px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

:deep(.course-dialog .el-dialog) {
  margin: 0 !important;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  max-height: 90vh;
}

:deep(.course-dialog .el-overlay-dialog) {
  display: flex;
  align-items: center;
  justify-content: center;
}

:deep(.course-dialog .el-dialog__header) {
  margin-bottom: 0;
  padding-bottom: 0;
}

:deep(.course-dialog .el-dialog__body) {
  padding-top: 12px;
  padding-bottom: 14px;
  overflow: visible;
}

:deep(.course-dialog .el-dialog__body .el-input),
:deep(.course-dialog .el-dialog__body .el-date-editor) {
  width: 100%;
}

.dialog-header-inner {
  position: relative;
  padding-bottom: 12px;
}

.dialog-header-accent {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  border-radius: 2px;
  background: linear-gradient(90deg, #409eff, #67c23a);
}

.dialog-title {
  margin: 12px 0 4px;
  font-size: 18px;
  font-weight: 700;
  color: var(--el-text-color-primary);
}

.dialog-desc {
  margin: 0;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

html.dark .table-card {
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
}
</style>
