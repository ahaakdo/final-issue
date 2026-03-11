import { defineStore } from "pinia";

const HOME_PATH = "/index";
const HOME_NAME = "Home";

export const useTagsViewStore = defineStore("tagsView", {
  state: () => ({
    visitedViews: [],
  }),
  getters: {
    cachedViews: (state) => state.visitedViews.map((v) => v.name).filter(Boolean),
  },
  actions: {
    addView(route) {
      if (!route.name || !route.meta?.title) return;
      this.ensureHome();
      const path = route.path || route.fullPath;
      const existing = this.visitedViews.find((v) => v.path === path);
      if (existing) return;
      this.visitedViews.push({
        name: route.name,
        path,
        meta: { ...route.meta },
      });
    },
    ensureHome() {
      const has = this.visitedViews.some((v) => v.path === HOME_PATH);
      if (!has) {
        this.visitedViews.unshift({
          name: HOME_NAME,
          path: HOME_PATH,
          meta: { title: "首页" },
        });
      }
    },
    removeView(path) {
      const idx = this.visitedViews.findIndex((v) => v.path === path);
      if (idx === -1) return;
      this.visitedViews.splice(idx, 1);
    },
    closeTag(path, currentPath, router) {
      this.removeView(path);
      if (currentPath === path) {
        const last = this.visitedViews[this.visitedViews.length - 1];
        const to = last ? last.path : HOME_PATH;
        router.push(to);
      }
    },
    isAffix(path) {
      return path === HOME_PATH;
    },
    initVisited() {
      this.ensureHome();
    },
    clear() {
      this.visitedViews = [];
    },
  },
});
