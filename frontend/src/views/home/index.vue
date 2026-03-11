<template>
  <div class="home-page">
    <!-- 顶部欢迎区 -->
    <section class="hero">
      <div class="hero-bg">
        <div class="hero-gradient" />
        <div class="hero-grid" />
        <div class="hero-glow hero-glow-1" />
        <div class="hero-glow hero-glow-2" />
      </div>
      <div class="hero-content">
        <div class="hero-icon-wrap">
          <img src="/volleyball-svgrepo-com.svg" alt="" class="hero-icon" />
        </div>
        <h1 class="hero-title">欢迎回来，{{ displayName }}</h1>
        <p class="hero-desc">排球社团选课系统 · 选课功能即将开放，敬请期待</p>
        <div class="hero-badge">
          <el-tag type="info" effect="dark" size="large">{{ roleLabel }}</el-tag>
        </div>
      </div>
    </section>

    <!-- 快捷入口卡片 -->
    <section class="section-cards">
      <h2 class="section-title">快捷入口</h2>
      <el-row :gutter="24" class="cards-row">
        <template v-if="userStore.role === 'student'">
          <el-col :xs="24" :sm="12" :md="8">
            <div class="feature-card" @click="onCardClick('course')">
              <div class="feature-card-inner">
                <div class="feature-icon-wrap feature-icon-1">
                  <el-icon :size="28"><Calendar /></el-icon>
                </div>
                <h3>课程报名</h3>
                <p>浏览全部课程，选择心仪的训练班</p>
                <span class="feature-arrow">→</span>
              </div>
            </div>
          </el-col>
          <el-col :xs="24" :sm="12" :md="8">
            <div class="feature-card" @click="onCardClick('enroll')">
              <div class="feature-card-inner">
                <div class="feature-icon-wrap feature-icon-2">
                  <el-icon :size="28"><User /></el-icon>
                </div>
                <h3>我的报名</h3>
                <p>查看报名进度与课程状态</p>
                <span class="feature-arrow">→</span>
              </div>
            </div>
          </el-col>
          <el-col :xs="24" :sm="12" :md="8">
            <div class="feature-card" @click="onCardClick('withdraw')">
              <div class="feature-card-inner">
                <div class="feature-icon-wrap feature-icon-3">
                  <el-icon :size="28"><InfoFilled /></el-icon>
                </div>
                <h3>申请退课</h3>
                <p>管理退课申请与审核进度</p>
                <span class="feature-arrow">→</span>
              </div>
            </div>
          </el-col>
        </template>
        <template v-else-if="userStore.role === 'teacher'">
          <el-col :xs="24" :sm="12" :md="8">
            <div class="feature-card" @click="onCardClick('category')">
              <div class="feature-card-inner">
                <div class="feature-icon-wrap feature-icon-1">
                  <el-icon :size="28"><Calendar /></el-icon>
                </div>
                <h3>课程分类</h3>
                <p>管理课程方向与训练模块</p>
                <span class="feature-arrow">→</span>
              </div>
            </div>
          </el-col>
          <el-col :xs="24" :sm="12" :md="8">
            <div class="feature-card" @click="onCardClick('manage')">
              <div class="feature-card-inner">
                <div class="feature-icon-wrap feature-icon-2">
                  <el-icon :size="28"><User /></el-icon>
                </div>
                <h3>课程管理</h3>
                <p>发布与维护自己的课程</p>
                <span class="feature-arrow">→</span>
              </div>
            </div>
          </el-col>
          <el-col :xs="24" :sm="12" :md="8">
            <div class="feature-card" @click="onCardClick('audit')">
              <div class="feature-card-inner">
                <div class="feature-icon-wrap feature-icon-3">
                  <el-icon :size="28"><InfoFilled /></el-icon>
                </div>
                <h3>审核中心</h3>
                <p>集中处理学生报名与退课申请</p>
                <span class="feature-arrow">→</span>
              </div>
            </div>
          </el-col>
        </template>
      </el-row>
    </section>

    <!-- 底部提示 -->
    <section class="section-footer">
      <p>更多功能开发中，感谢使用排球社团选课系统</p>
    </section>
  </div>
</template>

<script setup>
defineOptions({ name: "Home" });
import { computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { Calendar, User, InfoFilled } from "@element-plus/icons-vue";
import { useUserStore } from "@/store/user";

const router = useRouter();
const userStore = useUserStore();

const displayName = computed(() => userStore.real_name || userStore.username || "用户");
const roleLabel = computed(() =>
  userStore.role === "student" ? "学生" : userStore.role === "teacher" ? "教师" : "访客"
);

onMounted(async () => {
  if (!userStore.real_name && userStore.token) {
    try {
      await userStore.fetchUserInfo();
    } catch {
      router.replace("/login");
    }
  }
});

function onCardClick(type) {
  if (type === "course") {
    router.push("/course");
  } else if (type === "enroll") {
    router.push("/enroll");
  } else if (type === "withdraw") {
    router.push("/withdraw");
  } else if (type === "category") {
    router.push("/category");
  } else if (type === "manage") {
    router.push("/course/manage");
  } else if (type === "audit") {
    router.push("/audit");
  }
}
</script>

<style lang="scss" scoped>
.home-page {
  min-height: calc(100vh - 48px);
  padding-bottom: 48px;
}

.hero {
  position: relative;
  border-radius: 16px;
  overflow: hidden;
  margin-bottom: 32px;
  min-height: 220px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.hero-bg {
  position: absolute;
  inset: 0;
}

.hero-gradient {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, #001529 0%, #002140 35%, #003366 70%, #004080 100%);
  opacity: 0.95;
}

.hero-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
  background-size: 32px 32px;
}

.hero-glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.35;
  pointer-events: none;
}

.hero-glow-1 {
  width: 280px;
  height: 280px;
  background: #409eff;
  top: -80px;
  right: -60px;
  animation: glow-float 8s ease-in-out infinite;
}

.hero-glow-2 {
  width: 200px;
  height: 200px;
  background: #67c23a;
  bottom: -50px;
  left: -40px;
  animation: glow-float 10s ease-in-out infinite reverse;
}

@keyframes glow-float {
  0%, 100% { transform: translate(0, 0) scale(1); }
  50% { transform: translate(15px, -15px) scale(1.05); }
}

.hero-content {
  position: relative;
  z-index: 1;
  text-align: center;
  padding: 40px 24px;
}

.hero-icon-wrap {
  margin-bottom: 16px;
}

.hero-icon {
  width: 56px;
  height: 56px;
  filter: brightness(0) invert(1);
  opacity: 0.95;
}

.hero-title {
  font-size: 26px;
  font-weight: 700;
  color: #fff;
  margin: 0 0 8px;
  letter-spacing: 0.5px;
}

.hero-desc {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.78);
  margin: 0 0 16px;
}

.hero-badge {
  display: inline-flex;
}

.section-cards {
  margin-bottom: 32px;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin: 0 0 20px;
  padding-left: 4px;
}

.cards-row {
  display: flex;
  flex-wrap: wrap;
}

.feature-card {
  margin-bottom: 24px;
  cursor: pointer;
}

.feature-card-inner {
  position: relative;
  padding: 28px 24px;
  border-radius: 16px;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color);
  box-shadow: 0 4px 24px rgba(0, 21, 41, 0.06);
  transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
  overflow: hidden;
}

.feature-card-inner::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, #409eff, #67c23a);
  opacity: 0;
  transition: opacity 0.25s ease;
}

.feature-card:hover .feature-card-inner {
  transform: translateY(-4px);
  box-shadow: 0 12px 40px rgba(0, 21, 41, 0.12);
  border-color: rgba(64, 158, 255, 0.25);
}

.feature-card:hover .feature-card-inner::before {
  opacity: 1;
}

.feature-icon-wrap {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
  color: #fff;
}

.feature-icon-1 {
  background: linear-gradient(135deg, #409eff, #66b1ff);
  box-shadow: 0 4px 14px rgba(64, 158, 255, 0.4);
}

.feature-icon-2 {
  background: linear-gradient(135deg, #67c23a, #85ce61);
  box-shadow: 0 4px 14px rgba(103, 194, 58, 0.4);
}

.feature-icon-3 {
  background: linear-gradient(135deg, #e6a23c, #ebb563);
  box-shadow: 0 4px 14px rgba(230, 162, 60, 0.4);
}

.feature-card h3 {
  font-size: 17px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin: 0 0 8px;
}

.feature-card p {
  font-size: 13px;
  color: var(--el-text-color-regular);
  margin: 0 0 12px;
  line-height: 1.5;
}

.feature-arrow {
  font-size: 18px;
  color: var(--el-color-primary);
  opacity: 0;
  transform: translateX(-8px);
  transition: opacity 0.25s ease, transform 0.25s ease;
  display: inline-block;
}

.feature-card:hover .feature-arrow {
  opacity: 1;
  transform: translateX(0);
}

.section-footer {
  text-align: center;
  padding: 24px 16px;
}

.section-footer p {
  font-size: 13px;
  color: var(--el-text-color-secondary);
  margin: 0;
}

/* 暗色模式微调 */
html.dark .hero-gradient {
  opacity: 1;
}

html.dark .feature-card-inner {
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.3);
}

html.dark .feature-card:hover .feature-card-inner {
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);
}
</style>
