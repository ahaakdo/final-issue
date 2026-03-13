import { createRouter, createWebHistory } from "vue-router";
import { getToken } from "@/utils/auth";
import layout from "@/layout/index.vue";

const routes = [
  {
    path: "/login",
    name: "Login",
    component: () => import("@/views/login/index.vue"),
    meta: { title: "登录", public: true },
  },
  {
    path: "/register",
    name: "Register",
    component: () => import("@/views/register/index.vue"),
    meta: { title: "注册", public: true },
  },
  {
    path: "/",
    component: layout,
    redirect: "/index",
    meta: { requiresAuth: true },
    children: [
      {
        path: "index",
        name: "Home",
        component: () => import("@/views/home/index.vue"),
        meta: { title: "首页" },
      },
      {
        path: "category",
        name: "Category",
        component: () => import("@/views/category/index.vue"),
        meta: { title: "课程分类", role: "teacher" },
      },
      {
        path: "course",
        name: "CourseList",
        component: () => import("@/views/course/list.vue"),
        meta: { title: "课程列表", role: "student" },
      },
      {
        path: "enroll",
        name: "Enroll",
        component: () => import("@/views/enroll/index.vue"),
        meta: { title: "我的报名", role: "student" },
      },
      {
        path: "withdraw",
        name: "Withdraw",
        component: () => import("@/views/withdraw/index.vue"),
        meta: { title: "申请退课", role: "student" },
      },
      {
        path: "notice",
        name: "Notice",
        component: () => import("@/views/notice/index.vue"),
        meta: { title: "通知中心", role: "student" },
      },
      {
        path: "rio",
        name: "RioPlayers",
        component: () => import("@/views/rio/index.vue"),
        meta: { title: "女排专栏", role: "student" },
      },
      {
        path: "classic",
        name: "ClassicMatches",
        component: () => import("@/views/classic/index.vue"),
        meta: { title: "经典赛事", role: "student" },
      },
      {
        path: "skills",
        name: "Skills",
        component: () => import("@/views/skills/index.vue"),
        meta: { title: "技能养成", role: "student" },
      },
      {
        path: "skills/manage",
        name: "SkillsManage",
        component: () => import("@/views/skills/manage.vue"),
        meta: { title: "技能与队伍管理", role: "teacher" },
      },
      {
        path: "course/manage",
        name: "CourseManage",
        component: () => import("@/views/course/manage.vue"),
        meta: { title: "课程管理", role: "teacher" },
      },
      {
        path: "course/:courseId/roster",
        name: "CourseRoster",
        component: () => import("@/views/course/roster.vue"),
        meta: { title: "课程报名名单", role: "teacher", hidden: true },
      },
      {
        path: "audit",
        name: "Audit",
        component: () => import("@/views/audit/index.vue"),
        meta: { title: "审核中心", role: "teacher" },
      },
      {
        path: "rio/manage",
        name: "RioManage",
        component: () => import("@/views/rio/manage.vue"),
        meta: { title: "女排专栏管理", role: "teacher" },
      },
      {
        path: "classic/manage",
        name: "ClassicManage",
        component: () => import("@/views/classic/manage.vue"),
        meta: { title: "经典赛事管理", role: "teacher" },
      },
      {
        path: "course/:courseId/comments",
        name: "CourseComments",
        component: () => import("@/views/course/comments.vue"),
        meta: { title: "课程评论", hidden: true },
      },
      {
        path: "profile",
        name: "Profile",
        component: () => import("@/views/profile/index.vue"),
        meta: { title: "个人信息" },
      },
    ],
  },
  { path: "/:pathMatch(.*)*", redirect: "/" },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

router.beforeEach((to, _from, next) => {
  document.title = to.meta.title ? `${to.meta.title} - 排球社团选课系统` : "排球社团选课系统";
  if (to.meta.public) {
    next();
    return;
  }
  const token = getToken();
  if (to.meta.requiresAuth && !token) {
    next({ name: "Login", query: { redirect: to.fullPath } });
    return;
  }
  next();
});

export default router;
