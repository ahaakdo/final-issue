<template>
  <div class="sidebar-inner">
    <div class="sidebar-logo-container">
      <router-link to="/index" class="sidebar-logo-link">
        <el-icon :size="28" class="sidebar-logo"><TrophyBase /></el-icon>
        <span class="sidebar-title">排球社团选课</span>
      </router-link>
    </div>
    <el-scrollbar wrap-class="scrollbar-wrapper" class="pc" style="flex: 1; overflow: hidden;">
      <el-menu
        :default-active="activeMenu"
        :collapse="isCollapse"
        :collapse-transition="false"
        background-color="transparent"
        text-color="#bfcbd9"
        active-text-color="#409eff"
        mode="vertical"
        router
      >
        <el-menu-item index="/index">
          <el-icon><HomeFilled /></el-icon>
          <template #title>首页</template>
        </el-menu-item>
        <template v-if="userStore.role === 'student'">
          <el-menu-item index="/course">
            <el-icon><List /></el-icon>
            <template #title>课程列表</template>
          </el-menu-item>
          <el-menu-item index="/enroll">
            <el-icon><Tickets /></el-icon>
            <template #title>我的报名</template>
          </el-menu-item>
          <el-menu-item index="/withdraw">
            <el-icon><CircleClose /></el-icon>
            <template #title>申请退课</template>
          </el-menu-item>
          <el-menu-item index="/notice">
            <el-icon><Bell /></el-icon>
            <template #title>通知中心</template>
          </el-menu-item>
          <el-menu-item index="/skills">
            <el-icon><TrophyBase /></el-icon>
            <template #title>技能养成</template>
          </el-menu-item>
          <el-menu-item index="/rio">
            <el-icon><TrophyBase /></el-icon>
            <template #title>女排专栏</template>
          </el-menu-item>
          <el-menu-item index="/classic">
            <el-icon><List /></el-icon>
            <template #title>经典赛事</template>
          </el-menu-item>
        </template>
        <el-menu-item index="/profile">
          <el-icon><User /></el-icon>
          <template #title>个人信息</template>
        </el-menu-item>
        <template v-if="userStore.role === 'teacher'">
          <el-menu-item index="/skills/manage">
            <el-icon><TrophyBase /></el-icon>
            <template #title>技能与队伍管理</template>
          </el-menu-item>
          <el-menu-item index="/category">
            <el-icon><Collection /></el-icon>
            <template #title>课程分类</template>
          </el-menu-item>
          <el-menu-item index="/course/manage">
            <el-icon><EditPen /></el-icon>
            <template #title>课程管理</template>
          </el-menu-item>
          <el-menu-item index="/audit">
            <el-icon><Stamp /></el-icon>
            <template #title>审核中心</template>
          </el-menu-item>
          <el-menu-item index="/rio/manage">
            <el-icon><TrophyBase /></el-icon>
            <template #title>女排专栏管理</template>
          </el-menu-item>
          <el-menu-item index="/classic/manage">
            <el-icon><List /></el-icon>
            <template #title>经典赛事管理</template>
          </el-menu-item>
        </template>
      </el-menu>
    </el-scrollbar>
    <div class="left-collapse" @click="toggleSideBar">
      <el-icon><Fold v-if="!isCollapse" /><Expand v-else /></el-icon>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { useRoute } from "vue-router";
import { useAppStore } from "@/store/app";
import { useUserStore } from "@/store/user";
import { HomeFilled, Fold, Expand, TrophyBase, Collection, List, EditPen, User, Tickets, CircleClose, Stamp, Bell } from "@element-plus/icons-vue";

const route = useRoute();
const appStore = useAppStore();
const userStore = useUserStore();

const activeMenu = computed(() => route.path || "/");
const isCollapse = computed(() => !appStore.sidebar.opened);

function toggleSideBar() {
  appStore.toggleSideBar(false);
}
</script>

<style lang="scss" scoped>
.sidebar-inner {
  display: flex;
  flex-direction: column;
  height: 100%;
}
.sidebar-logo-container {
  height: 48px;
  line-height: 48px;
  background: var(--pure-sidebar-logo-bg);
  text-align: center;
  overflow: hidden;
  .sidebar-logo-link {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    padding: 0 12px;
    .sidebar-logo {
      width: 28px;
      height: 28px;
      color: rgba(255, 255, 255, 0.95);
      flex-shrink: 0;
    }
    .sidebar-title {
      margin-left: 8px;
      font-size: 16px;
      font-weight: 600;
      color: #fff;
      white-space: nowrap;
    }
  }
}
.left-collapse {
  height: 40px;
  line-height: 40px;
  text-align: center;
  cursor: pointer;
  color: #bfcbd9;
  font-size: 18px;
  &:hover {
    color: #fff;
  }
}
:deep(.el-menu) {
  border: none;
}
:deep(.el-menu-item) {
  height: 50px;
  line-height: 50px;
}
</style>
