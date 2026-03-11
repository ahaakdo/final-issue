<template>
  <div class="login-container">
    <div class="login-left">
      <div class="left-icon">
        <el-icon :size="56"><TrophyBase /></el-icon>
      </div>
      <div class="title">排球社团选课系统</div>
      <div class="subtitle">Volleyball Club Course Selection</div>
      <svg class="wave" viewBox="0 0 1440 320" preserveAspectRatio="none">
        <path
          fill="rgba(255,255,255,0.1)"
          d="M0,160L48,176C96,192,192,224,288,213.3C384,203,480,149,576,138.7C672,128,768,160,864,165.3C960,171,1056,149,1152,138.7C1248,128,1344,128,1392,128L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
        />
        <path
          fill="rgba(255,255,255,0.05)"
          d="M0,96L48,112C96,128,192,160,288,165.3C384,171,480,149,576,154.7C672,160,768,192,864,181.3C960,171,1056,117,1152,96C1248,75,1344,85,1392,90.7L1440,96L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
        />
      </svg>
    </div>
    <div class="login-right">
      <el-tooltip :content="appStore.isDark ? '切换为浅色' : '切换为深色'" placement="left">
        <el-button link class="theme-toggle-auth" @click="appStore.toggleDark()">
          <el-icon :size="20"><Sunny v-if="appStore.isDark" /><Moon v-else /></el-icon>
        </el-button>
      </el-tooltip>
      <div class="login-form-card">
        <div class="form-header">
          <img src="/volleyball-svgrepo-com.svg" alt="" class="form-header-icon" />
          <div class="form-header-text">
            <h2 class="form-title">登录</h2>
            <p class="form-desc">选择身份后使用用户名与密码登录</p>
          </div>
        </div>
        <el-form
          ref="formRef"
          :model="form"
          :rules="rules"
          @keyup.enter="onSubmit"
        >
          <el-form-item label="身份" prop="role">
            <el-radio-group v-model="form.role" size="large">
              <el-radio-button value="student">学生</el-radio-button>
              <el-radio-button value="teacher">教师</el-radio-button>
            </el-radio-group>
          </el-form-item>
          <el-form-item prop="username">
            <el-input
              v-model="form.username"
              placeholder="请输入用户名"
              size="large"
              :prefix-icon="User"
            />
          </el-form-item>
          <el-form-item prop="password">
            <el-input
              v-model="form.password"
              type="password"
              placeholder="请输入密码"
              size="large"
              show-password
              :prefix-icon="Lock"
              @keyup.enter="onSubmit"
            />
          </el-form-item>
          <el-form-item class="submit-btn-wrap">
            <el-button
              type="primary"
              size="large"
              :loading="loading"
              @click="onSubmit"
            >
              登 录
            </el-button>
          </el-form-item>
        </el-form>
        <router-link to="/register" class="form-footer-link">还没有账号？立即注册</router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from "vue";
import { useRouter, useRoute } from "vue-router";
import { ElMessage } from "element-plus";
import { User, Lock, TrophyBase, Sunny, Moon } from "@element-plus/icons-vue";
import { useUserStore } from "@/store/user";
import { useAppStore } from "@/store/app";
import { login } from "@/api/auth";

const router = useRouter();
const route = useRoute();
const userStore = useUserStore();
const appStore = useAppStore();

const formRef = ref(null);
const loading = ref(false);
const form = reactive({ username: "", password: "", role: "student" });
const rules = {
  role: [{ required: true, message: "请选择身份", trigger: "change" }],
  username: [{ required: true, message: "请输入用户名", trigger: "blur" }],
  password: [{ required: true, message: "请输入密码", trigger: "blur" }],
};

async function onSubmit() {
  await formRef.value?.validate().catch(() => {});
  loading.value = true;
  try {
    const data = await login({
      username: form.username,
      password: form.password,
      role: form.role,
    });
    userStore.setToken(data.token);
    userStore.setUser({
      role: data.role,
      username: data.username,
      real_name: data.real_name,
      student_number: data.student_number,
    });
    ElMessage.success("登录成功");
    const redirect = route.query.redirect || "/";
    router.replace(redirect);
  } finally {
    loading.value = false;
  }
}
</script>

<style lang="scss" scoped>
@import url("@/style/login.css");
.login-right {
  position: relative;
}
.theme-toggle-auth {
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 10;
  color: #5a5e66;
}
html.dark .theme-toggle-auth {
  color: rgba(255, 255, 255, 0.85);
}
:deep(.el-input-group__append, .el-input-group__prepend) {
  padding: 0;
}
</style>
