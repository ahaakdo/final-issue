<template>
  <div class="tags-view-container">
    <el-scrollbar class="tags-view-scrollbar" wrap-class="tags-view-wrap">
      <div class="tags-list">
        <div
          v-for="tag in visitedViews"
          :key="tag.path"
          class="tags-item"
          :class="{ active: currentPath === tag.path }"
          @click="go(tag.path)"
        >
          <span class="tags-title">{{ tag.meta?.title || tag.name }}</span>
          <span
            v-if="!isAffix(tag.path)"
            class="tags-close"
            @click.stop="close(tag.path)"
          >
            <el-icon><Close /></el-icon>
          </span>
        </div>
      </div>
    </el-scrollbar>
  </div>
</template>

<script setup>
import { computed, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useTagsViewStore } from "@/store/tagsView";
import { Close } from "@element-plus/icons-vue";

const route = useRoute();
const router = useRouter();
const tagsViewStore = useTagsViewStore();

const visitedViews = computed(() => tagsViewStore.visitedViews);
const currentPath = computed(() => route.path);

function isAffix(path) {
  return tagsViewStore.isAffix(path);
}

function go(path) {
  if (route.path === path) return;
  router.push(path);
}

function close(path) {
  tagsViewStore.closeTag(path, route.path, router);
}

// 仅对布局内的子路由记录
function shouldAdd(route) {
  return route.name && route.meta?.title && !route.meta?.public;
}

watch(
  () => route.path,
  (path) => {
    tagsViewStore.initVisited(route);
    if (shouldAdd(route)) tagsViewStore.addView(route);
  },
  { immediate: true }
);
</script>

<style lang="scss" scoped>
.tags-view-container {
  height: 36px;
  background: var(--el-bg-color-page);
  border-bottom: 1px solid var(--el-border-color-lighter);
  flex-shrink: 0;
}

.tags-view-scrollbar {
  height: 100%;
}

:deep(.tags-view-wrap) {
  overflow-x: auto;
  white-space: nowrap;
  display: flex;
  align-items: center;
}

.tags-list {
  display: inline-flex;
  align-items: center;
  height: 100%;
  padding: 0 8px;
  gap: 4px;
}

.tags-item {
  display: inline-flex;
  align-items: center;
  height: 28px;
  padding: 0 12px;
  font-size: 13px;
  color: var(--el-text-color-regular);
  background: var(--el-fill-color-light);
  border-radius: 4px;
  cursor: pointer;
  user-select: none;
  flex-shrink: 0;
  transition: background 0.2s, color 0.2s;

  .tags-title {
    max-width: 120px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .tags-close {
    margin-left: 6px;
    display: inline-flex;
    align-items: center;
    border-radius: 50%;
    padding: 0 2px;

    &:hover {
      background: var(--el-border-color);
      color: var(--el-text-color-primary);
    }
  }

  &:hover {
    color: var(--el-text-color-primary);
    background: var(--el-fill-color);
  }

  &.active {
    color: var(--el-color-primary);
    background: var(--el-color-primary-light-9);
  }

  .el-icon {
    font-size: 12px;
  }
}

html.dark .tags-item.active {
  background: var(--el-color-primary-dark-2);
  color: #fff;
}
</style>
