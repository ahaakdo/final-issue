<template>
  <div class="notice-page">
    <section class="page-hero">
      <div class="hero-bg">
        <div class="hero-gradient" />
        <div class="hero-pattern" />
      </div>
      <div class="hero-content">
        <div class="hero-left">
          <h1>通知中心</h1>
          <p>查看报名与退课审核结果，以及其他系统通知</p>
          <div class="hero-stats">
            <div class="stat-card">
              <span class="stat-value">{{ unreadCount }}</span>
              <span class="stat-label">未读通知</span>
            </div>
            <div class="stat-card">
              <span class="stat-value">{{ list.length }}</span>
              <span class="stat-label">全部通知</span>
            </div>
          </div>
        </div>
        <div class="hero-right">
          <el-button type="primary" plain :loading="loading" @click="fetchList">刷新</el-button>
        </div>
      </div>
    </section>

    <section class="content-card" v-loading="loading">
      <div v-if="list.length" class="notice-list">
        <div
          v-for="item in list"
          :key="item.id"
          class="notice-item"
          :class="{ unread: !item.is_read }"
          @click="onClick(item)"
        >
          <div class="notice-main">
            <div class="notice-title-row">
              <span class="notice-title">{{ item.title }}</span>
              <el-tag v-if="!item.is_read" type="danger" size="small" round>未读</el-tag>
            </div>
            <p class="notice-content">{{ item.content }}</p>
          </div>
          <div class="notice-meta">
            <span class="notice-time">{{ formatRelativeTime(item.created_at) }}</span>
            <el-button
              v-if="!item.is_read"
              type="primary"
              link
              :loading="markingId === item.id"
              @click.stop="markRead(item)"
            >
              标记已读
            </el-button>
          </div>
        </div>
      </div>
      <el-empty v-else description="暂无通知" :image-size="80" class="empty" />
    </section>
  </div>
</template>

<script setup>
defineOptions({ name: "Notice" });
import { ref, computed, onMounted } from "vue";
import { ElMessage } from "element-plus";
import { formatRelativeTime } from "@/utils/format";
import { getStudentNotifications, markNotificationRead } from "@/api/notice";

const loading = ref(false);
const list = ref([]);
const markingId = ref(null);

const unreadCount = computed(() => list.value.filter((n) => !n.is_read).length);

async function fetchList() {
  loading.value = true;
  try {
    const data = await getStudentNotifications();
    list.value = Array.isArray(data) ? data : [];
  } catch {
    ElMessage.error("获取通知失败");
  } finally {
    loading.value = false;
  }
}

async function markRead(item) {
  if (item.is_read) return;
  markingId.value = item.id;
  try {
    await markNotificationRead(item.id);
    item.is_read = 1;
  } finally {
    markingId.value = null;
  }
}

function onClick(item) {
  // 现在只标记已读；后续可根据内容跳转到详情
  if (!item.is_read) {
    markRead(item);
  }
}

onMounted(() => {
  fetchList();
});
</script>

<style lang="scss" scoped>
.notice-page {
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
  background: linear-gradient(135deg, #001529 0%, #004085 45%, #409eff 100%);
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

.notice-list {
  padding: 12px 18px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.notice-item {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--el-border-color-lighter);
  transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
  cursor: pointer;
}

.notice-item.unread {
  background: var(--el-color-primary-light-9);
  border-color: var(--el-color-primary-light-5);
}

.notice-item:hover {
  box-shadow: 0 4px 18px rgba(0, 0, 0, 0.06);
}

.notice-main {
  flex: 1;
  min-width: 0;
}

.notice-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.notice-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.notice-content {
  margin: 0;
  font-size: 13px;
  color: var(--el-text-color-regular);
}

.notice-meta {
  text-align: right;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.notice-time {
  display: block;
  margin-bottom: 4px;
}

.empty {
  padding: 48px 0;
}
</style>

