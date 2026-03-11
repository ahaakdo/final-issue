<template>
  <div class="register-container">
    <div class="register-left">
      <div class="left-icon">
        <el-icon :size="56"><TrophyBase /></el-icon>
      </div>
      <div class="title">排球社团选课系统</div>
      <div class="subtitle">创建新账号</div>
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
    <div class="register-right">
      <el-tooltip :content="appStore.isDark ? '切换为浅色' : '切换为深色'" placement="left">
        <el-button link class="theme-toggle-auth" @click="appStore.toggleDark()">
          <el-icon :size="20"><Sunny v-if="appStore.isDark" /><Moon v-else /></el-icon>
        </el-button>
      </el-tooltip>
      <div class="register-form-card">
        <div class="form-header">
          <img src="/volleyball-svgrepo-com.svg" alt="" class="form-header-icon" />
          <div class="form-header-text">
            <h2 class="form-title">注册</h2>
            <p class="form-desc">选择身份并填写以下信息</p>
          </div>
        </div>
        <el-form ref="formRef" :model="form" :rules="rules" label-width="100px" label-position="top">
          <el-form-item label="身份" prop="role">
            <el-radio-group v-model="form.role" size="large" @change="onRoleChange">
              <el-radio-button value="student">学生</el-radio-button>
              <el-radio-button value="teacher">教师</el-radio-button>
            </el-radio-group>
          </el-form-item>
          <el-form-item label="用户名" prop="username">
            <el-input v-model="form.username" placeholder="至少2位" :prefix-icon="User" />
          </el-form-item>
          <el-form-item label="密码" prop="password">
            <el-input v-model="form.password" type="password" placeholder="至少6位" show-password :prefix-icon="Lock" />
          </el-form-item>
          <el-form-item label="确认密码" prop="confirmPassword">
            <el-input v-model="form.confirmPassword" type="password" placeholder="再次输入密码" show-password :prefix-icon="Lock" />
          </el-form-item>
          <el-form-item label="真实姓名" prop="real_name">
            <el-input v-model="form.real_name" placeholder="必填" />
          </el-form-item>
          <el-form-item class="submit-btn-wrap">
            <el-button type="primary" size="large" :loading="loading" @click="onSubmit">
              注 册
            </el-button>
          </el-form-item>
        </el-form>
        <router-link to="/login" class="form-footer-link">已有账号？去登录</router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from "vue";
import { useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import { User, Lock, TrophyBase, Sunny, Moon } from "@element-plus/icons-vue";
import { useAppStore } from "@/store/app";
import { registerStudent, registerTeacher } from "@/api/auth";

const router = useRouter();
const appStore = useAppStore();

const formRef = ref(null);
const loading = ref(false);
const form = reactive({
  role: "student",
  username: "",
  password: "",
  confirmPassword: "",
  real_name: "",
});

const validateConfirm = (_rule, value, callback) => {
  if (value !== form.password) callback(new Error("两次输入的密码不一致"));
  else callback();
};

const rules = {
  role: [{ required: true, message: "请选择身份", trigger: "change" }],
  username: [
    { required: true, message: "请输入用户名", trigger: "blur" },
    { min: 2, message: "用户名至少2位", trigger: "blur" },
  ],
  password: [
    { required: true, message: "请输入密码", trigger: "blur" },
    { min: 6, message: "密码至少6位", trigger: "blur" },
  ],
  confirmPassword: [
    { required: true, message: "请再次输入密码", trigger: "blur" },
    { validator: validateConfirm, trigger: "blur" },
  ],
  real_name: [{ required: true, message: "请输入真实姓名", trigger: "blur" }],
};

function onRoleChange() {
  formRef.value?.clearValidate();
}

async function onSubmit() {
  await formRef.value?.validate().catch(() => {});
  loading.value = true;
  try {
    const api = form.role === "student" ? registerStudent : registerTeacher;
    const payload = {
      username: form.username,
      password: form.password,
      real_name: form.real_name,
    };
    await api(payload);
    ElMessage.success("注册成功，请登录");
    router.replace("/login");
  } finally {
    loading.value = false;
  }
}
</script>

<style lang="scss" scoped>
@import url("@/style/login.css");
.register-right {
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
.register-form-card {
  max-width: 480px;
  max-height: calc(100vh - 48px);
  overflow-y: auto;
}
:deep(.el-input-group__append, .el-input-group__prepend) {
  padding: 0;
}
</style>
