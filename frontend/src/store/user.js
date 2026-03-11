import { defineStore } from "pinia";
import { getToken, setToken, removeToken, getRole, setRole } from "@/utils/auth";
import { getUserInfo } from "@/api/auth";
import { useTagsViewStore } from "@/store/tagsView";

export const useUserStore = defineStore("user", {
  state: () => ({
    token: getToken(),
    role: getRole(), // student | teacher，持久化以便刷新后侧栏正确显示
    username: "",
    real_name: "",
    student_number: "",
  }),
  actions: {
    setToken(token) {
      this.token = token;
      setToken(token);
    },
    setUser(info) {
      this.role = info?.role ?? "";
      this.username = info?.username ?? "";
      this.real_name = info?.real_name ?? info?.nickname ?? info?.username ?? "";
      this.student_number = info?.student_number ?? "";
      setRole(this.role);
    },
    async fetchUserInfo() {
      const data = await getUserInfo();
      this.setUser(data);
      return data;
    },
    logout() {
      this.token = "";
      this.role = "";
      this.username = "";
      this.real_name = "";
      this.student_number = "";
      removeToken();
      setRole("");
      useTagsViewStore().clear();
    },
  },
});
