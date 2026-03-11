<template>
  <section class="app-main">
    <router-view v-slot="{ Component, route: r }">
      <transition name="fade-transform" mode="out-in">
        <keep-alive :include="cachedViewNames">
          <component :is="Component" :key="r.path" />
        </keep-alive>
      </transition>
    </router-view>
  </section>
</template>

<script setup>
import { computed } from "vue";
import { useTagsViewStore } from "@/store/tagsView";

const tagsViewStore = useTagsViewStore();
const cachedViewNames = computed(() => tagsViewStore.cachedViews);
</script>

<style lang="scss" scoped>
.app-main {
  position: relative;
  width: 100%;
  min-height: calc(100vh - 84px);
  overflow-x: hidden;
  padding: 24px 24px 24px 24px;
  background: var(--app-main-bg);
}
.fade-transform-enter-active,
.fade-transform-leave-active {
  transition: all 0.2s;
}
.fade-transform-enter-from {
  opacity: 0;
  transform: translateX(-10px);
}
.fade-transform-leave-to {
  opacity: 0;
  transform: translateX(10px);
}
</style>
