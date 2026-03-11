<template>
  <div class="profile-page">
    <div class="profile-card">
      <div class="profile-header">
        <h1 class="profile-title">个人信息</h1>
        <p class="profile-desc">查看与编辑您的个人资料</p>
      </div>

      <div v-loading="loading" class="profile-body">
        <el-form
          v-if="!loading && form.role"
          ref="formRef"
          :model="form"
          :rules="rules"
          label-width="100px"
          class="profile-form"
        >
          <el-form-item label="身份">
            <el-tag :type="form.role === 'teacher' ? 'warning' : 'primary'">
              {{ form.role === 'teacher' ? '教师' : '学生' }}
            </el-tag>
          </el-form-item>
          <el-form-item label="用户名">
            <el-input v-model="form.username" disabled />
          </el-form-item>
          <el-form-item v-if="form.role === 'student'" label="学号">
            <el-input v-model="form.student_number" disabled />
          </el-form-item>

          <el-divider content-position="left">基本信息</el-divider>
          <el-form-item label="真实姓名" prop="real_name">
            <el-input v-model="form.real_name" placeholder="请输入真实姓名" />
          </el-form-item>
          <el-form-item label="性别" prop="gender">
            <el-radio-group v-model="form.gender">
              <el-radio :value="null">未设置</el-radio>
              <el-radio :value="0">女</el-radio>
              <el-radio :value="1">男</el-radio>
            </el-radio-group>
          </el-form-item>
          <el-form-item label="邮箱" prop="email">
            <el-input v-model="form.email" placeholder="选填" />
          </el-form-item>
          <el-form-item label="手机" prop="phone">
            <el-input v-model="form.phone" placeholder="选填" />
          </el-form-item>
          <el-form-item label="专业" prop="major">
            <el-input v-model="form.major" placeholder="选填" />
          </el-form-item>
          <el-form-item label="生日" prop="birthday">
            <el-date-picker
              v-model="form.birthday"
              type="date"
              placeholder="选填"
              value-format="YYYY-MM-DD"
              style="width: 100%"
            />
          </el-form-item>

          <template v-if="form.role === 'student'">
            <el-form-item label="宿舍" prop="dormitory">
              <el-input v-model="form.dormitory" placeholder="选填" />
            </el-form-item>
          </template>

          <template v-if="form.role === 'teacher'">
            <el-divider content-position="left">教师信息</el-divider>
            <el-form-item label="专业等级" prop="professional_level">
              <el-input v-model="form.professional_level" placeholder="如：一级运动员" />
            </el-form-item>
            <el-form-item label="部门" prop="department">
              <el-input v-model="form.department" placeholder="如：排球教研组" />
            </el-form-item>
            <el-form-item label="办公室" prop="office">
              <el-input v-model="form.office" placeholder="选填" />
            </el-form-item>
            <el-form-item label="教龄" prop="teaching_years">
              <el-input-number v-model="form.teaching_years" :min="0" :max="50" placeholder="年" style="width: 100%" />
            </el-form-item>
            <el-form-item label="个人介绍" prop="introduction">
              <el-input v-model="form.introduction" type="textarea" :rows="3" placeholder="选填" />
            </el-form-item>
            <el-form-item label="教学经验" prop="teaching_experience">
              <el-input v-model="form.teaching_experience" type="textarea" :rows="3" placeholder="选填" />
            </el-form-item>
          </template>

          <el-divider content-position="left">修改密码</el-divider>
          <el-form-item label="新密码" prop="password">
            <el-input v-model="form.password" type="password" placeholder="不修改请留空，至少6位" show-password />
          </el-form-item>

          <el-form-item class="submit-wrap">
            <el-button type="primary" size="large" :loading="submitting" @click="onSubmit">保存</el-button>
          </el-form-item>
        </el-form>
      </div>
    </div>
  </div>
</template>

<script setup>
defineOptions({ name: "Profile" });
import { ref, reactive, onMounted } from "vue";
import { ElMessage } from "element-plus";
import { getUserInfo, updateProfile, updatePassword } from "@/api/auth";
import { useUserStore } from "@/store/user";

const userStore = useUserStore();
const formRef = ref(null);
const loading = ref(true);
const submitting = ref(false);

const form = reactive({
  role: "",
  username: "",
  student_number: "",
  real_name: "",
  email: "",
  phone: "",
  major: "",
  gender: null,
  birthday: "",
  avatar: "",
  dormitory: "",
  professional_level: "",
  department: "",
  office: "",
  introduction: "",
  teaching_years: null,
  teaching_experience: "",
  password: "",
});

const validatePassword = (_rule, value, callback) => {
  if (value && value.trim().length > 0 && value.trim().length < 6) {
    callback(new Error("密码至少6位"));
  } else {
    callback();
  }
};

const rules = {
  real_name: [{ required: true, message: "请输入真实姓名", trigger: "blur" }],
  password: [{ validator: validatePassword, trigger: "blur" }],
};

function assignForm(data) {
  form.role = data.role || "";
  form.username = data.username || "";
  form.student_number = data.student_number || "";
  form.real_name = data.real_name || "";
  form.email = data.email || "";
  form.phone = data.phone || "";
  form.major = data.major || "";
  form.gender = data.gender ?? null;
  form.birthday = data.birthday || "";
  form.avatar = data.avatar || "";
  form.dormitory = data.dormitory || "";
  form.professional_level = data.professional_level || "";
  form.department = data.department || "";
  form.office = data.office || "";
  form.introduction = data.introduction || "";
  form.teaching_years = data.teaching_years ?? null;
  form.teaching_experience = data.teaching_experience || "";
  form.password = "";
}

async function fetchProfile() {
  loading.value = true;
  try {
    const data = await getUserInfo();
    assignForm(data);
  } catch {
    ElMessage.error("获取个人信息失败");
  } finally {
    loading.value = false;
  }
}

async function onSubmit() {
  await formRef.value?.validate().catch(() => {});
  submitting.value = true;
  try {
    if (form.password && form.password.trim().length >= 6) {
      await updatePassword(form.password.trim());
      form.password = "";
    }
    const payload = {
      real_name: form.real_name,
      email: form.email || null,
      phone: form.phone || null,
      major: form.major || null,
      gender: form.gender,
      birthday: form.birthday || null,
      avatar: form.avatar || null,
    };
    if (form.role === "student") {
      payload.dormitory = form.dormitory || null;
    } else {
      payload.professional_level = form.professional_level || null;
      payload.department = form.department || null;
      payload.office = form.office || null;
      payload.introduction = form.introduction || null;
      payload.teaching_years = form.teaching_years;
      payload.teaching_experience = form.teaching_experience || null;
    }
    const data = await updateProfile(payload);
    userStore.setUser(data);
    assignForm(data);
    ElMessage.success("保存成功");
  } catch (e) {
    if (e?.message) ElMessage.error(e.message);
  } finally {
    submitting.value = false;
  }
}

onMounted(() => {
  fetchProfile();
});
</script>

<style lang="scss" scoped>
.profile-page {
  padding: 24px;
  max-width: 720px;
  margin: 0 auto;
}

.profile-card {
  background: var(--el-bg-color);
  border-radius: 12px;
  border: 1px solid var(--el-border-color-lighter);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
  overflow: hidden;
}

.profile-header {
  padding: 24px 28px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  background: var(--el-fill-color-light);

  .profile-title {
    margin: 0 0 6px;
    font-size: 20px;
    font-weight: 700;
    color: var(--el-text-color-primary);
  }

  .profile-desc {
    margin: 0;
    font-size: 13px;
    color: var(--el-text-color-secondary);
  }
}

.profile-body {
  min-height: 200px;
  padding: 24px 28px 32px;
}

.profile-form {
  :deep(.el-divider__text) {
    font-size: 14px;
    color: var(--el-text-color-regular);
  }
}

.submit-wrap {
  margin-top: 24px;
  margin-bottom: 0;
}
</style>
