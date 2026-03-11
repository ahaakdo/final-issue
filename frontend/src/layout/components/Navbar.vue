<template>
  <div class="navbar">
    <div class="hamburger-container" @click="toggleSideBar">
      <el-icon :size="20"><Fold v-if="!isCollapse" /><Expand v-else /></el-icon>
    </div>
    <el-breadcrumb separator="/" class="breadcrumb-container">
      <el-breadcrumb-item :to="{ path: '/' }">首页</el-breadcrumb-item>
      <el-breadcrumb-item v-if="route.meta?.title && route.path !== '/index'">{{ route.meta.title }}</el-breadcrumb-item>
    </el-breadcrumb>
    <div class="vertical-header-right">
      <!-- 课程消息下拉（学生/老师） -->
      <template v-if="userStore.role === 'student' || userStore.role === 'teacher'">
        <el-dropdown trigger="click" class="msg-dropdown" @visible-change="onMessageDropdownVisibleChange">
          <el-badge v-if="messageUnreadCount > 0" :value="messageUnreadCount" :max="99" class="msg-badge">
            <el-button link type="primary" class="msg-btn">
              <el-icon :size="18"><ChatDotRound /></el-icon>
            </el-button>
          </el-badge>
          <el-button v-else link type="primary" class="msg-btn">
            <el-icon :size="18"><ChatDotRound /></el-icon>
          </el-button>
          <template #dropdown>
            <div class="msg-dropdown-panel">
              <div class="msg-dropdown-title">课程消息</div>
              <div v-if="messageConversations.length === 0" class="msg-dropdown-empty">
                暂无聊天记录
              </div>
              <div
                v-for="item in messageConversations"
                :key="item.course_id + '-' + (item.teacher_id ?? item.student_id)"
                class="msg-dropdown-item"
                @click="goToConversation(item)"
              >
                <span class="msg-dropdown-label">
                  {{ userStore.role === 'student' ? `与 ${item.teacher_name || '老师'} 的聊天` : `与 ${item.student_name || '学生'} 的聊天` }}
                </span>
                <span class="msg-dropdown-meta">{{ item.course_name }}</span>
                <el-badge v-if="item.unread_count > 0" :value="item.unread_count" :max="99" class="msg-item-badge" />
              </div>
            </div>
          </template>
        </el-dropdown>
      </template>
      <el-tooltip :content="appStore.isDark ? '切换为浅色' : '切换为深色'" placement="bottom">
        <el-button
          link
          type="primary"
          class="theme-toggle"
          @click="appStore.toggleDark()"
        >
          <el-icon :size="18"><Sunny v-if="appStore.isDark" /><Moon v-else /></el-icon>
        </el-button>
      </el-tooltip>
      <el-dropdown trigger="click" @command="handleCommand">
        <span class="el-dropdown-link">
          <el-icon><User /></el-icon>
          <span class="user-info">
            <span class="username">{{ userStore.real_name || userStore.username }}</span>
            <el-tag v-if="userStore.role" size="small" type="info" style="margin-left: 6px">{{ userStore.role === 'student' ? '学生' : '教师' }}</el-tag>
          </span>
          <el-icon class="el-icon--right"><ArrowDown /></el-icon>
        </span>
        <template #dropdown>
          <el-dropdown-menu class="logout">
            <el-dropdown-item command="logout">
              <el-icon><SwitchButton /></el-icon>
              退出系统
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAppStore } from "@/store/app";
import { useUserStore } from "@/store/user";
import { Fold, Expand, User, ArrowDown, SwitchButton, Sunny, Moon, ChatDotRound } from "@element-plus/icons-vue";
import {
  getTeacherCourseMessageUnreadCount,
  getStudentCourseMessageUnreadCount,
  getTeacherCourseMessageConversations,
  getStudentCourseMessageConversations,
} from "@/api/enroll";

const route = useRoute();
const router = useRouter();
const appStore = useAppStore();
const userStore = useUserStore();

const isCollapse = computed(() => !appStore.sidebar.opened);
const messageUnreadCount = ref(0);
const messageConversations = ref([]);
let messagePollTimer = null;

async function fetchMessageUnreadCount() {
  if (!userStore.token || !userStore.role) return;
  try {
    if (userStore.role === "teacher") {
      const data = await getTeacherCourseMessageUnreadCount();
      messageUnreadCount.value = data?.count ?? 0;
    } else if (userStore.role === "student") {
      const data = await getStudentCourseMessageUnreadCount();
      messageUnreadCount.value = data?.count ?? 0;
    }
  } catch {
    messageUnreadCount.value = 0;
  }
}

async function fetchMessageConversations() {
  if (!userStore.token || !userStore.role) return;
  try {
    if (userStore.role === "teacher") {
      const data = await getTeacherCourseMessageConversations();
      messageConversations.value = Array.isArray(data) ? data : [];
    } else if (userStore.role === "student") {
      const data = await getStudentCourseMessageConversations();
      messageConversations.value = Array.isArray(data) ? data : [];
    }
  } catch {
    messageConversations.value = [];
  }
}

function onMessageDropdownVisibleChange(visible) {
  if (visible) fetchMessageConversations();
}

function goToConversation(item) {
  if (userStore.role === "student") {
    router.push({ path: "/enroll", query: { openChat: `${item.course_id},${item.teacher_id}` } });
  } else {
    router.push({ name: "CourseRoster", params: { courseId: item.course_id }, query: { openChat: String(item.student_id) } });
  }
}

function toggleSideBar() {
  appStore.toggleSideBar(false);
}

function handleCommand(cmd) {
  if (cmd === "logout") {
    userStore.logout();
    router.replace("/login");
  }
}

onMounted(() => {
  fetchMessageUnreadCount();
  messagePollTimer = setInterval(fetchMessageUnreadCount, 30000);
  window.addEventListener("course-messages-read", fetchMessageUnreadCount);
});

onUnmounted(() => {
  if (messagePollTimer) clearInterval(messagePollTimer);
  window.removeEventListener("course-messages-read", fetchMessageUnreadCount);
});
</script>

<style lang="scss" scoped>
.navbar {
  width: 100%;
  height: 48px;
  overflow: hidden;
  display: flex;
  align-items: center;
  background: var(--navbar-bg);
  box-shadow: 0 1px 4px rgba(0, 21, 41, 0.08);
  transition: background var(--pure-transition-duration);
  .hamburger-container {
    padding: 0 16px;
    height: 100%;
    display: flex;
    align-items: center;
    cursor: pointer;
    color: var(--navbar-text);
  }
  .msg-btn {
    margin-right: 2px;
  }
  .msg-badge {
    margin-right: 4px;
  }
  .msg-dropdown {
    margin-right: 4px;
  }
  .theme-toggle {
    margin-right: 4px;
  }
  .breadcrumb-container {
    margin-left: 0;
    font-size: 14px;
    color: var(--navbar-text);
  }
  .breadcrumb-container :deep(.el-breadcrumb__inner) {
    color: var(--navbar-link);
  }
  .breadcrumb-container :deep(.el-breadcrumb__separator) {
    color: var(--navbar-text);
  }
  .vertical-header-right {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    flex: 1;
    min-width: 120px;
    height: 48px;
    padding-right: 16px;
    .el-dropdown-link {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 0 10px;
      color: var(--navbar-link);
      cursor: pointer;
      font-size: 14px;
    }
  }
}
.logout :deep(.el-dropdown-menu__item) {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
</style>

<style lang="scss">
/* 课程消息下拉面板（内容在 teleport 中，需全局） */
.msg-dropdown-panel {
  min-width: 260px;
  max-width: 320px;
  max-height: 360px;
  overflow-y: auto;
  padding: 8px 0;
  .msg-dropdown-title {
    padding: 6px 12px 8px;
    font-size: 13px;
    color: var(--el-text-color-secondary);
    border-bottom: 1px solid var(--el-border-color-lighter);
    margin-bottom: 4px;
  }
  .msg-dropdown-empty {
    padding: 24px 12px;
    text-align: center;
    font-size: 13px;
    color: var(--el-text-color-secondary);
  }
  .msg-dropdown-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 12px;
    cursor: pointer;
    font-size: 13px;
    transition: background 0.15s;
    &:hover {
      background: var(--el-fill-color-light);
    }
    .msg-dropdown-label {
      flex: 1;
      min-width: 0;
      font-weight: 500;
    }
    .msg-dropdown-meta {
      flex-shrink: 0;
      font-size: 12px;
      color: var(--el-text-color-secondary);
      max-width: 100px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .msg-item-badge {
      flex-shrink: 0;
    }
  }
}
</style>
