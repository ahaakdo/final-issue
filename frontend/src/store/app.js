import { defineStore } from "pinia";

const THEME_KEY = "theme";

export const useAppStore = defineStore("app", {
  state: () => ({
    sidebar: {
      opened: true,
      withoutAnimation: false,
      isClickCollapse: false,
    },
    device: "desktop",
    isDark: (() => {
      try {
        return localStorage.getItem(THEME_KEY) === "dark";
      } catch {
        return false;
      }
    })(),
  }),
  actions: {
    toggleSideBar(withoutAnimation) {
      this.sidebar.withoutAnimation = withoutAnimation;
      this.sidebar.opened = !this.sidebar.opened;
      this.sidebar.isClickCollapse = !this.sidebar.opened;
    },
    setDevice(device) {
      this.device = device;
    },
    applyTheme() {
      document.documentElement.classList.toggle("dark", this.isDark);
    },
    toggleDark() {
      this.isDark = !this.isDark;
      try {
        localStorage.setItem(THEME_KEY, this.isDark ? "dark" : "light");
      } catch (_) {}
      this.applyTheme();
    },
  },
});
