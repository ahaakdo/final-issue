<template>
  <div class="rio-manage-page">
    <section class="header">
      <h2>女排专栏管理</h2>
      <el-button type="primary" @click="openCreate">新增队员</el-button>
    </section>

    <el-table :data="players" border stripe>
      <el-table-column label="头像" width="90">
        <template #default="scope">
          <div class="table-avatar" v-if="scope.row.avatar_url">
            <img :src="scope.row.avatar_url" :alt="scope.row.name" />
          </div>
        </template>
      </el-table-column>
      <el-table-column prop="number" label="号码" width="80" />
      <el-table-column prop="name" label="姓名" width="140" />
      <el-table-column prop="position" label="位置" width="140" />
      <el-table-column prop="height_cm" label="身高(cm)" width="100" />
      <el-table-column prop="club" label="俱乐部" />
      <el-table-column label="操作" width="120">
        <template #default="scope">
          <el-button type="primary" link @click="openEdit(scope.row)">编辑</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="520px">
      <el-form :model="form" label-width="90px">
        <el-form-item label="姓名" required>
          <el-input v-model="form.name" placeholder="请输入姓名" />
        </el-form-item>
        <el-form-item label="位置" required>
          <el-input v-model="form.position" placeholder="主攻 / 接应 / 二传 ..." />
        </el-form-item>
        <el-form-item label="号码" required>
          <el-input-number v-model="form.number" :min="1" :max="99" />
        </el-form-item>
        <el-form-item label="身高(cm)">
          <el-input-number v-model="form.height_cm" :min="150" :max="220" />
        </el-form-item>
        <el-form-item label="俱乐部">
          <el-input v-model="form.club" />
        </el-form-item>
        <el-form-item label="头像地址">
          <el-input v-model="form.avatar_url" placeholder="/images/rio/xxx-avatar.jpg" />
        </el-form-item>
        <el-form-item label="风采照1">
          <el-input v-model="form.gallery1_url" placeholder="/images/rio/xxx-1.jpg" />
        </el-form-item>
        <el-form-item label="风采照2">
          <el-input v-model="form.gallery2_url" placeholder="/images/rio/xxx-2.jpg" />
        </el-form-item>
        <el-form-item label="风采照3">
          <el-input v-model="form.gallery3_url" placeholder="/images/rio/xxx-3.jpg" />
        </el-form-item>
        <el-form-item label="简介">
          <el-input
            v-model="form.intro"
            type="textarea"
            :rows="4"
            placeholder="简单介绍该队员的特点与荣誉"
          />
        </el-form-item>
        <el-form-item label="个人荣誉">
          <el-input
            v-model="form.honors"
            type="textarea"
            :rows="4"
            placeholder="如：奥运会/世锦赛/联赛中的代表性荣誉与奖项"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="onSubmit">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { ElMessage } from "element-plus";
import { getRioPlayers, createRioPlayer, updateRioPlayer } from "@/api/rio";

defineOptions({ name: "RioManage" });

const players = ref([]);
const dialogVisible = ref(false);
const dialogTitle = ref("新增队员");
const editingId = ref(null);
const form = ref({
  name: "",
  position: "",
  number: null,
  height_cm: null,
  club: "",
  avatar_url: "",
  gallery1_url: "",
  gallery2_url: "",
  gallery3_url: "",
  intro: "",
  honors: "",
});

async function load() {
  try {
    const data = await getRioPlayers();
    players.value = data || [];
  } catch {
    ElMessage.error("加载队员列表失败");
  }
}

function openCreate() {
  dialogTitle.value = "新增队员";
  editingId.value = null;
  form.value = {
    name: "",
    position: "",
    number: null,
    height_cm: null,
    club: "",
    avatar_url: "",
    gallery1_url: "",
    gallery2_url: "",
    gallery3_url: "",
    intro: "",
    honors: "",
  };
  dialogVisible.value = true;
}

function openEdit(row) {
  dialogTitle.value = "编辑队员";
  editingId.value = row.id;
  form.value = {
    name: row.name,
    position: row.position,
    number: row.number,
    height_cm: row.height_cm,
    club: row.club,
    avatar_url: row.avatar_url,
    gallery1_url: row.gallery1_url,
    gallery2_url: row.gallery2_url,
    gallery3_url: row.gallery3_url,
    intro: row.intro,
    honors: row.honors,
  };
  dialogVisible.value = true;
}

async function onSubmit() {
  if (!form.value.name || !form.value.position || !form.value.number) {
    ElMessage.warning("请填写姓名、位置和号码");
    return;
  }
  try {
    if (editingId.value) {
      await updateRioPlayer(editingId.value, form.value);
      ElMessage.success("更新成功");
    } else {
      await createRioPlayer(form.value);
      ElMessage.success("新增成功");
    }
    dialogVisible.value = false;
    await load();
  } catch {
    ElMessage.error("保存失败");
  }
}

onMounted(load);
</script>

<style scoped lang="scss">
.rio-manage-page {
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    h2 {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
    }
  }
}
</style>

