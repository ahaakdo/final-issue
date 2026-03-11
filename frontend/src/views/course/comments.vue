<template>
  <div class="course-comments-page">
    <div v-if="courseId && !invalid" class="page-inner">
      <div class="page-header">
        <el-button link type="primary" class="back-btn" @click="goBack">
          <el-icon><ArrowLeft /></el-icon>
          返回课程
        </el-button>
        <div class="page-title-wrap">
          <h1 class="page-title">{{ courseName || '课程评论' }}</h1>
          <span class="page-subtitle">课程评论区</span>
        </div>
      </div>
      <CourseCommentSection
        :course-id="courseId"
        :course-name="courseName"
      />
    </div>
    <el-empty v-else-if="invalid" description="课程不存在或参数无效" class="empty-state">
      <el-button type="primary" @click="goBack">返回课程列表</el-button>
    </el-empty>
    <div v-else class="loading-wrap">
      <el-icon class="is-loading" :size="32"><Loading /></el-icon>
    </div>
  </div>
</template>

<script setup>
defineOptions({ name: "CourseComments" });
import { ref, computed, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ArrowLeft, Loading } from "@element-plus/icons-vue";
import CourseCommentSection from "@/components/CourseCommentSection.vue";
import { getCourseList } from "@/api/course";

const route = useRoute();
const router = useRouter();

const courseId = computed(() => {
  const id = route.params.courseId;
  const n = Number(id);
  return id != null && id !== "" && Number.isFinite(n) && n >= 1 ? n : null;
});

const courseName = ref("");
const invalid = ref(false);

function goBack() {
  router.push({ name: "CourseList" });
}

async function fetchCourseName() {
  if (!courseId.value) return;
  try {
    const data = await getCourseList();
    const list = Array.isArray(data) ? data : [];
    const course = list.find((c) => c.id === courseId.value);
    if (course) {
      courseName.value = course.name || "";
      invalid.value = false;
    } else {
      invalid.value = true;
    }
  } catch {
    invalid.value = true;
  }
}

watch(
  courseId,
  (id) => {
    if (id) {
      invalid.value = false;
      fetchCourseName();
    } else {
      invalid.value = true;
    }
  },
  { immediate: true }
);
</script>

<style lang="scss" scoped>
.course-comments-page {
  min-height: calc(100vh - 84px);
  padding: 24px;
  background: var(--app-main-bg);
}

.page-inner {
  max-width: 800px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 28px;
  padding: 20px 24px;
  background: var(--el-bg-color);
  border-radius: 12px;
  border: 1px solid var(--el-border-color-lighter);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
}

.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 14px;
  font-size: 14px;
  font-weight: 500;
}

.page-title-wrap {
  .page-title {
    margin: 0 0 4px;
    font-size: 22px;
    font-weight: 700;
    color: var(--el-text-color-primary);
    letter-spacing: 0.02em;
  }

  .page-subtitle {
    font-size: 13px;
    color: var(--el-text-color-secondary);
  }
}

.empty-state {
  padding: 80px 0;
}

.loading-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  color: var(--el-text-color-secondary);
}
</style>
