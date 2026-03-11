<template>
  <div class="course-list-page">
    <!-- 顶部横幅 -->
    <section class="page-hero">
      <div class="hero-bg">
        <div class="hero-gradient" />
        <div class="hero-pattern" />
      </div>
      <div class="hero-content">
        <h1>课程列表</h1>
        <p>浏览社团课程，选择适合你的训练方向</p>
        <div class="hero-stats">
          <span class="stat-item">
            <em>{{ filteredList.length }}</em> 门课程
          </span>
          <span class="stat-item" v-if="filterCategoryId">
            当前分类筛选
          </span>
        </div>
      </div>
    </section>

    <!-- 筛选与视图切换 -->
    <section class="toolbar">
      <div class="toolbar-left">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索课程名称、教师..."
          clearable
          class="search-input"
          :prefix-icon="Search"
          @input="onSearchInput"
        />
        <el-select
          v-model="filterCategoryId"
          placeholder="全部分类"
          clearable
          class="filter-select"
          @change="applyFilters"
        >
          <el-option
            v-for="cat in categories"
            :key="cat.id"
            :label="cat.name"
            :value="cat.id"
          />
        </el-select>
        <el-select
          v-model="filterDifficulty"
          placeholder="难度"
          clearable
          class="filter-select difficulty-select"
          @change="applyFilters"
        >
          <el-option label="初级" :value="1" />
          <el-option label="中级" :value="2" />
          <el-option label="高级" :value="3" />
        </el-select>
      </div>
      <div class="toolbar-right">
        <el-radio-group v-model="viewMode" size="default">
          <el-radio-button value="cards">
            <el-icon><Grid /></el-icon>
            卡片
          </el-radio-button>
          <el-radio-button value="table">
            <el-icon><List /></el-icon>
            列表
          </el-radio-button>
        </el-radio-group>
      </div>
    </section>

    <!-- 卡片视图 -->
    <section v-show="viewMode === 'cards'" class="cards-section">
      <div v-loading="loading" class="cards-grid">
        <div
          v-for="item in filteredList"
          :key="item.id"
          class="course-card"
          @click="openDetail(item)"
        >
          <div class="course-card-accent" :class="'accent-' + (item.category_id % 4)" />
          <div class="course-card-body">
            <div class="card-header">
              <span class="category-tag">{{ item.category_name }}</span>
              <el-tag
                :type="['', 'success', 'warning', 'danger'][item.difficulty] || 'info'"
                size="small"
                effect="plain"
                class="difficulty-tag"
              >
                {{ ['', '初级', '中级', '高级'][item.difficulty] || '—' }}
              </el-tag>
              <el-tag size="small" effect="plain" round :type="coursePhaseTagType(item)" class="phase-tag">
                {{ coursePhaseLabel(item) }}
              </el-tag>
              <el-tag size="small" effect="plain" round :type="enrollPhaseTagType(item)" class="phase-tag">
                {{ enrollPhaseLabel(item) }}
              </el-tag>
            </div>
            <h3 class="course-name">{{ item.name }}</h3>
            <div class="card-meta">
              <span class="meta-item">
                <el-icon><User /></el-icon>
                {{ item.teacher_name || '—' }}
              </span>
              <span class="meta-item" v-if="item.schedule_weekly">
                <el-icon><Clock /></el-icon>
                {{ item.schedule_weekly }}
              </span>
              <span class="meta-item" v-if="item.location">
                <el-icon><Location /></el-icon>
                {{ item.location }}
              </span>
            </div>
            <div class="card-capacity">
              <el-progress
                :percentage="capacityPercent(item)"
                :stroke-width="6"
                :show-text="false"
                :color="capacityColor(item)"
              />
              <span class="capacity-text">{{ item.current_enrollment }} / {{ item.capacity }} 人</span>
            </div>
            <div class="card-footer">
              <span class="credits">{{ item.credits }} 学分</span>
              <span class="recommend">
                <el-icon><Star /></el-icon>
                {{ item.recommend_index ?? 0 }}
              </span>
              <template v-if="parseTags(item.tags).length">
                <el-tag
                  v-for="(tag, idx) in parseTags(item.tags)"
                  :key="idx"
                  size="small"
                  effect="plain"
                  class="card-tag"
                >
                  {{ tag }}
                </el-tag>
              </template>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 表格视图 -->
    <section v-show="viewMode === 'table'" class="table-section">
      <el-table
        v-loading="loading"
        :data="filteredList"
        stripe
        border
        style="width: 100%"
        :header-cell-style="{ background: 'var(--el-fill-color-light)' }"
        @row-click="(row) => openDetail(row)"
      >
        <el-table-column prop="name" label="课程名称" width="120" show-overflow-tooltip />
        <el-table-column prop="category_name" label="分类" width="100" />
        <el-table-column prop="teacher_name" label="授课教师" width="100" />
        <el-table-column prop="credits" label="学分" width="70" align="center" />
        <el-table-column label="课程状态" width="96" align="center">
          <template #default="{ row }">
            <el-tag size="small" effect="plain" round :type="coursePhaseTagType(row)">
              {{ coursePhaseLabel(row) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="报名状态" width="96" align="center">
          <template #default="{ row }">
            <el-tag size="small" effect="plain" round :type="enrollPhaseTagType(row)">
              {{ enrollPhaseLabel(row) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="容量" width="140" align="center">
          <template #default="{ row }">
            <el-progress
              :percentage="capacityPercent(row)"
              :stroke-width="14"
              style="width: 60px; display: inline-block; margin-right: 6px; vertical-align: middle"
            />
            {{ row.current_enrollment }}/{{ row.capacity }}
          </template>
        </el-table-column>
        <el-table-column prop="location" label="上课地址" width="120" show-overflow-tooltip />
        <el-table-column prop="schedule_weekly" label="上课时间" width="120" show-overflow-tooltip />
        <el-table-column label="报名开始" width="130" align="center">
          <template #default="{ row }">{{ formatDate(row.enroll_start_date) || '—' }}</template>
        </el-table-column>
        <el-table-column label="报名截止" width="130" align="center">
          <template #default="{ row }">{{ formatDate(row.enroll_end_date) || '—' }}</template>
        </el-table-column>
        <el-table-column prop="difficulty" label="难度" width="80" align="center">
          <template #default="{ row }">
            <el-tag size="small" :type="['', 'success', 'warning', 'danger'][row.difficulty]">
              {{ ['', '初', '中', '高'][row.difficulty] || '—' }}
            </el-tag>
          </template>
        </el-table-column>
      </el-table>
    </section>

    <!-- 空状态 -->
    <el-empty
      v-if="!loading && filteredList.length === 0"
      description="暂无课程或没有符合条件的课程"
      class="empty-block"
    >
      <template #image>
        <el-icon :size="80" color="var(--el-text-color-placeholder)"><Collection /></el-icon>
      </template>
    </el-empty>

    <!-- 课程详情抽屉 -->
    <el-drawer
      v-model="drawerVisible"
      size="500px"
      direction="rtl"
      destroy-on-close
      class="course-drawer"
    >
      <template #header>
        <div class="drawer-header-inner">
          <div class="drawer-header-accent" />
          <h2 class="drawer-title">{{ currentCourse?.name }}</h2>
          <div class="drawer-tags">
            <el-tag type="primary" effect="plain" size="small" round>{{ currentCourse?.category_name }}</el-tag>
            <el-tag
              :type="['', 'success', 'warning', 'danger'][currentCourse?.difficulty]"
              size="small"
              effect="plain"
              round
            >
              {{ ['', '初级', '中级', '高级'][currentCourse?.difficulty] || '—' }}
            </el-tag>
            <el-tag
              v-for="(tag, idx) in parseTags(currentCourse?.tags)"
              :key="'tag-' + idx"
              size="small"
              effect="plain"
            >
              {{ tag }}
            </el-tag>
          </div>
        </div>
      </template>
      <div v-if="currentCourse" class="drawer-content">
        <div class="drawer-block info-block">
          <h4 class="block-title"><el-icon><InfoFilled /></el-icon> 基本信息</h4>
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label"><el-icon><User /></el-icon> 授课教师</span>
              <span class="info-value">{{ currentCourse.teacher_name || '—' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label"><el-icon><Document /></el-icon> 学分</span>
              <span class="info-value">{{ currentCourse.credits }}</span>
            </div>
            <div class="info-item">
              <span class="info-label"><el-icon><UserFilled /></el-icon> 容量</span>
              <span class="info-value">{{ currentCourse.current_enrollment }} / {{ currentCourse.capacity }} 人</span>
            </div>
            <div class="info-item">
              <span class="info-label"><el-icon><Location /></el-icon> 上课地址</span>
              <span class="info-value">{{ currentCourse.location || '—' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label"><el-icon><Clock /></el-icon> 上课时间</span>
              <span class="info-value">{{ currentCourse.schedule_weekly || '—' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label"><el-icon><Calendar /></el-icon> 报名时间</span>
              <span class="info-value">{{ formatDateRange(currentCourse.enroll_start_date, currentCourse.enroll_end_date) }}</span>
            </div>
            <div class="info-item">
              <span class="info-label"><el-icon><Calendar /></el-icon> 开课时间</span>
              <span class="info-value">{{ formatDateRange(currentCourse.start_date, currentCourse.end_date) }}</span>
            </div>
            <div v-if="parseTags(currentCourse.tags).length" class="info-item info-item-tags">
              <span class="info-label"><el-icon><Collection /></el-icon> 标签</span>
              <span class="info-value info-value-tags">
                <el-tag
                  v-for="(tag, idx) in parseTags(currentCourse.tags)"
                  :key="idx"
                  size="small"
                  effect="plain"
                  class="detail-tag"
                >
                  {{ tag }}
                </el-tag>
              </span>
            </div>
            <div class="info-item info-item-full">
              <span class="info-label"><el-icon><Star /></el-icon> 推荐指数</span>
              <span class="info-value">
                <el-rate
                  :model-value="Number(currentCourse.recommend_index ?? 0)"
                  disabled
                  allow-half
                  show-score
                  text-color="#ff9900"
                  score-template="{value} 分"
                />
              </span>
            </div>
          </div>
        </div>
        <div v-if="currentCourse.description" class="drawer-block">
          <h4 class="block-title"><el-icon><Document /></el-icon> 课程描述</h4>
          <p class="block-text">{{ currentCourse.description }}</p>
        </div>
        <div v-if="currentCourse.requirements" class="drawer-block">
          <h4 class="block-title"><el-icon><List /></el-icon> 课程需求</h4>
          <p class="block-text">{{ currentCourse.requirements }}</p>
        </div>
        <div v-if="currentCourse.syllabus" class="drawer-block">
          <h4 class="block-title"><el-icon><Reading /></el-icon> 教学大纲</h4>
          <p class="block-text white-space-pre">{{ currentCourse.syllabus }}</p>
        </div>
        <div v-if="userStore.role === 'student'" class="drawer-block">
          <h4 class="block-title"><el-icon><Collection /></el-icon> 报名操作</h4>
          <div class="enroll-actions">
            <el-tag v-if="enrollment?.enroll_pending" type="warning" effect="plain" round>
              报名审核中
            </el-tag>
            <el-tag v-if="enrollment?.withdraw_pending" type="warning" effect="plain" round>
              审核中
            </el-tag>

            <!-- 报名未提交且不在审核中：可以提交报名申请 -->
            <el-button
              v-if="!isEnrolled && !enrollment?.enroll_pending"
              type="primary"
              :loading="enrollLoading"
              @click="onEnrollCourse"
            >
              提交报名申请
            </el-button>

            <!-- 报名审核中或已报名但未开课：都允许取消报名/申请 -->
            <el-button
              v-else-if="(!isEnrolled && enrollment?.enroll_pending) || (isEnrolled && !hasStarted)"
              type="danger"
              text
              :loading="cancelEnrollLoading"
              @click="onCancelEnroll"
            >
              取消报名
            </el-button>

            <!-- 已报名且已开课：可以申请退课 -->
            <el-button
              v-else
              type="warning"
              plain
              :disabled="!!enrollment?.withdraw_pending"
              @click="goWithdrawApply"
            >
              申请退课
            </el-button>
          </div>
        </div>
        <div class="drawer-block drawer-comment-entry">
          <el-button type="primary" plain class="comment-entry-btn" @click="goToComments">
            <el-icon><ChatDotRound /></el-icon>
            查看全部评论
          </el-button>
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<script setup>
defineOptions({ name: "CourseList" });
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import { Search, Grid, List, User, Clock, Location, Star, Collection, InfoFilled, Document, UserFilled, Calendar, Reading, ChatDotRound } from "@element-plus/icons-vue";
import { formatDate, formatDateRange } from "@/utils/format";
import { getCourseList } from "@/api/course";
import { getCategoryList } from "@/api/category";
import { enrollCourse, cancelEnrollment, getEnrollmentStatus } from "@/api/enroll";
import { useUserStore } from "@/store/user";

/** 按逗号分割标签字符串，去空后返回数组 */
function parseTags(tagsStr) {
  if (!tagsStr || typeof tagsStr !== "string") return [];
  return tagsStr
    .split(/[,，]/)
    .map((t) => t.trim())
    .filter(Boolean);
}

const router = useRouter();
const userStore = useUserStore();

const loading = ref(false);
const list = ref([]);
const categories = ref([]);
const filterCategoryId = ref(null);
const filterDifficulty = ref(null);
const searchKeyword = ref("");
const viewMode = ref("cards");
const drawerVisible = ref(false);
const currentCourse = ref(null);
const enrollLoading = ref(false);
const cancelEnrollLoading = ref(false);
const enrollment = ref(null);
const hasStarted = ref(false);
const isEnrolled = computed(() => enrollment.value?.status === "enrolled");

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

function goToComments() {
  if (!currentCourse.value?.id) return;
  router.push({ name: "CourseComments", params: { courseId: currentCourse.value.id } });
}

function goWithdrawApply() {
  if (!currentCourse.value?.id) return;
  router.push({ name: "Withdraw", query: { courseId: currentCourse.value.id } });
}

async function onEnrollCourse() {
  if (!currentCourse.value?.id) return;
  enrollLoading.value = true;
  try {
    await enrollCourse(currentCourse.value.id);
    ElMessage.success("报名成功");
    fetchList();
    await refreshEnrollmentStatus();
  } catch (e) {
    // 错误信息由 http 拦截器弹出
  } finally {
    enrollLoading.value = false;
  }
}

async function onCancelEnroll() {
  if (!currentCourse.value?.id) return;
  cancelEnrollLoading.value = true;
  try {
    await cancelEnrollment(currentCourse.value.id);
    ElMessage.success("已取消报名");
    fetchList();
    await refreshEnrollmentStatus();
  } catch (e) {
    // 错误信息由 http 拦截器弹出
  } finally {
    cancelEnrollLoading.value = false;
  }
}

async function refreshEnrollmentStatus() {
  if (userStore.role !== "student") return;
  if (!currentCourse.value?.id) return;
  try {
    const data = await getEnrollmentStatus(currentCourse.value.id);
    enrollment.value = data.enrollment;
    if (data.start_date) {
      const start = new Date(data.start_date);
      hasStarted.value = new Date() >= start;
    } else {
      hasStarted.value = false;
    }
  } catch {
    enrollment.value = null;
    hasStarted.value = false;
  }
}

const filteredList = computed(() => {
  let arr = list.value;
  if (filterCategoryId.value != null && filterCategoryId.value !== "") {
    arr = arr.filter((c) => c.category_id === filterCategoryId.value);
  }
  if (searchKeyword.value.trim()) {
    const kw = searchKeyword.value.trim().toLowerCase();
    arr = arr.filter(
      (c) =>
        (c.name && c.name.toLowerCase().includes(kw)) ||
        (c.teacher_name && c.teacher_name.toLowerCase().includes(kw)) ||
        (c.category_name && c.category_name.toLowerCase().includes(kw))
    );
  }
  if (filterDifficulty.value != null && filterDifficulty.value !== "") {
    arr = arr.filter((c) => c.difficulty === filterDifficulty.value);
  }
  return arr;
});

function capacityPercent(row) {
  if (!row.capacity || row.capacity === 0) return 0;
  return Math.min(100, Math.round((row.current_enrollment / row.capacity) * 100));
}

function capacityColor(row) {
  const p = capacityPercent(row);
  if (p >= 100) return "#f56c6c";
  if (p >= 80) return "#e6a23c";
  return "#67c23a";
}

function openDetail(row) {
  currentCourse.value = row;
  drawerVisible.value = true;
  refreshEnrollmentStatus();
}

function onSearchInput() {
  // 仅前端筛选，computed 会更新
}

function applyFilters() {
  fetchList();
}

async function fetchList() {
  loading.value = true;
  try {
    const params = {};
    if (filterCategoryId.value) params.category_id = filterCategoryId.value;
    const data = await getCourseList(params);
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

onMounted(() => {
  if (userStore.role === "teacher") {
    router.replace("/course/manage");
    return;
  }
  fetchCategories();
  fetchList();
});
</script>

<style lang="scss" scoped>
.course-list-page {
  padding: 0;
  padding-bottom: 32px;
  background: #fff;
}

.page-hero {
  position: relative;
  border-radius: 16px;
  overflow: hidden;
  margin-bottom: 24px;
  min-height: 140px;
  display: flex;
  align-items: center;
}

.hero-bg {
  position: absolute;
  inset: 0;
}

.hero-gradient {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, #001529 0%, #002140 50%, #003366 100%);
  opacity: 0.96;
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
  padding: 28px 32px;

  h1 {
    margin: 0 0 6px;
    font-size: 22px;
    font-weight: 700;
    color: #fff;
  }

  p {
    margin: 0 0 12px;
    font-size: 13px;
    color: rgba(255, 255, 255, 0.78);
  }

  .hero-stats {
    display: flex;
    gap: 16px;
    font-size: 13px;
    color: rgba(255, 255, 255, 0.85);

    .stat-item em {
      font-style: normal;
      font-weight: 700;
      margin-right: 4px;
    }
  }
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
}

.toolbar-left {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}

.search-input {
  width: 240px;
}

.filter-select {
  width: 130px;
}

.difficulty-select {
  width: 100px;
}

.cards-section {
  margin-bottom: 24px;
}

.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
}

.course-card {
  position: relative;
  border-radius: 16px;
  overflow: hidden;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color);
  box-shadow: 0 4px 20px rgba(0, 21, 41, 0.06);
  cursor: pointer;
  transition: transform 0.25s ease, box-shadow 0.25s ease;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 32px rgba(0, 21, 41, 0.12);
  }
}

.course-card-accent {
  height: 4px;
  width: 100%;

  &.accent-0 {
    background: linear-gradient(90deg, #409eff, #66b1ff);
  }
  &.accent-1 {
    background: linear-gradient(90deg, #67c23a, #85ce61);
  }
  &.accent-2 {
    background: linear-gradient(90deg, #e6a23c, #ebb563);
  }
  &.accent-3 {
    background: linear-gradient(90deg, #f56c6c, #f89898);
  }
}

.course-card-body {
  padding: 20px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 10px;
}

.category-tag {
  font-size: 12px;
  color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
  padding: 2px 8px;
  border-radius: 4px;
}

.difficulty-tag {
  font-size: 12px;
}

.phase-tag {
  font-size: 12px;
}

.course-name {
  margin: 0 0 12px;
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-meta {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 12px;
}

.meta-item {
  font-size: 12px;
  color: var(--el-text-color-regular);
  display: inline-flex;
  align-items: center;
  gap: 6px;

  .el-icon {
    font-size: 14px;
    color: var(--el-text-color-secondary);
  }
}

.card-capacity {
  margin-bottom: 12px;

  .capacity-text {
    font-size: 12px;
    color: var(--el-text-color-secondary);
    margin-top: 4px;
    display: block;
  }
}

.card-footer {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  font-size: 12px;
  color: var(--el-text-color-secondary);

  .credits {
    color: var(--el-color-primary);
    font-weight: 500;
  }

  .recommend {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    color: #e6a23c;
  }

  .card-tag {
    margin-right: 4px;
    margin-bottom: 2px;
  }
}

.info-value-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.detail-tag {
  margin-right: 0;
}

.table-section {
  :deep(.el-table-row) {
    cursor: pointer;
  }
}

.empty-block {
  padding: 48px 0;
}

/* 抽屉高级样式 */
:deep(.course-drawer .el-drawer__header) {
  margin-bottom: 0;
  padding-bottom: 0;
}

:deep(.course-drawer .el-drawer__body) {
  padding: 0 20px 24px;
  overflow-y: auto;
}

.drawer-header-inner {
  position: relative;
  padding-bottom: 16px;
}

.drawer-header-accent {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  border-radius: 2px;
  background: linear-gradient(90deg, #409eff, #67c23a);
}

.drawer-title {
  margin: 12px 0 10px;
  font-size: 20px;
  font-weight: 700;
  color: var(--el-text-color-primary);
  line-height: 1.35;
  padding-right: 32px;
}

.drawer-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.drawer-content {
  padding-top: 8px;
}

.drawer-block {
  background: var(--el-fill-color-light);
  border-radius: 12px;
  padding: 16px 18px;
  margin-bottom: 16px;
}

.drawer-block.info-block {
  padding: 18px;
}

.block-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 14px;
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.block-title .el-icon {
  font-size: 16px;
  color: var(--el-color-primary);
}

.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px 20px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-item-full {
  grid-column: 1 / -1;
}

.info-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  display: flex;
  align-items: center;
  gap: 6px;
}

.info-label .el-icon {
  font-size: 14px;
  color: var(--el-text-color-placeholder);
}

.info-value {
  font-size: 14px;
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.info-value .el-rate {
  display: inline-flex;
}

.block-text {
  margin: 0;
  font-size: 13px;
  line-height: 1.7;
  color: var(--el-text-color-regular);
}

.white-space-pre {
  white-space: pre-wrap;
}

.drawer-comment-entry {
  padding: 16px 18px;
}

.comment-entry-btn {
  width: 100%;
}

html.dark .course-list-page {
  background: var(--el-bg-color);
}

html.dark .course-card {
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
}

html.dark .course-card:hover {
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.35);
}
</style>
