<template>
  <div class="app-wrapper" :class="{ hideSidebar: !sidebar.opened }">
    <div class="sidebar-container has-logo">
      <Sidebar />
    </div>
    <div class="main-container" :class="{ 'main-hidden': !sidebar.opened }">
      <div class="fixed-header">
        <Navbar />
        <TagsView />
      </div>
      <AppMain />
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { useAppStore } from "@/store/app";
import Sidebar from "./components/Sidebar.vue";
import Navbar from "./components/Navbar.vue";
import TagsView from "./components/TagsView.vue";
import AppMain from "./components/AppMain.vue";

const appStore = useAppStore();
const sidebar = computed(() => appStore.sidebar);
</script>

<style lang="scss" scoped>
.app-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  &::after {
    clear: both;
    display: table;
    content: "";
  }
}

.main-container {
  position: relative;
  min-height: 100vh;
  margin-left: var(--side-bar-width);
  background: var(--app-main-bg);
  transition: margin-left 0.28s;
  .fixed-header {
    position: fixed;
    top: 0;
    right: 0;
    z-index: 998;
    width: calc(100% - var(--side-bar-width));
    transition: width 0.28s;
    display: flex;
    flex-direction: column;
    background: var(--navbar-bg);
  }
  .app-main {
    padding-top: 84px;
  }
}

.main-hidden {
  margin-left: var(--side-bar-width-collapse) !important;
  .fixed-header {
    width: calc(100% - var(--side-bar-width-collapse)) !important;
  }
}

.sidebar-container {
  position: fixed;
  top: 0;
  bottom: 0;
  left: 0;
  z-index: 1001;
  width: var(--side-bar-width);
  height: 100%;
  overflow: visible;
  font-size: 0;
  background: var(--pure-menu-bg);
  border-right: 1px solid var(--pure-border-color);
  transition: width 0.28s;
  display: flex;
  flex-direction: column;
}

.hideSidebar {
  .main-container {
    margin-left: var(--side-bar-width-collapse);
  }
  .fixed-header {
    width: calc(100% - var(--side-bar-width-collapse));
  }
  .sidebar-container {
    width: var(--side-bar-width-collapse) !important;
    :deep(.sidebar-title) {
      display: none;
    }
    :deep(.sidebar-logo-link) {
      padding: 0;
      justify-content: center;
    }
    :deep(.left-collapse) {
      padding: 0;
    }
  }
}
</style>
