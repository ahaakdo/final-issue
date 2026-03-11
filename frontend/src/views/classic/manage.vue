<template>
  <div class="classic-manage-page">
    <section class="header">
      <h2>经典赛事管理</h2>
      <el-button type="primary" @click="openCreate">新增赛事</el-button>
    </section>

    <el-table :data="matches" border stripe>
      <el-table-column prop="match_date" label="日期" width="140">
        <template #default="scope">
          {{ formatDate(scope.row.match_date) }}
        </template>
      </el-table-column>
      <el-table-column prop="title" label="比赛标题" />
      <el-table-column prop="event_name" label="赛事名称" width="180" />
      <el-table-column prop="opponent" label="对手" width="160" />
    </el-table>

    <el-dialog v-model="dialogVisible" title="新增经典赛事" width="560px">
      <el-form :model="form" label-width="90px">
        <el-form-item label="比赛标题" required>
          <el-input v-model="form.title" placeholder="例如：中国 vs 塞尔维亚 · 里约决赛" />
        </el-form-item>
        <el-form-item label="赛事名称" required>
          <el-input v-model="form.event_name" placeholder="例如：2016 里约奥运会" />
        </el-form-item>
        <el-form-item label="比赛日期">
          <el-date-picker
            v-model="form.match_date"
            type="date"
            value-format="YYYY-MM-DD"
            placeholder="选择日期"
          />
        </el-form-item>
        <el-form-item label="对手">
          <el-input v-model="form.opponent" />
        </el-form-item>
        <el-form-item label="阶段">
          <el-input v-model="form.round" placeholder="小组赛 / 半决赛 / 决赛 ..." />
        </el-form-item>
        <el-form-item label="视频地址">
          <el-input v-model="form.video_url" placeholder="B站或其他视频链接" />
        </el-form-item>
        <el-form-item label="简介">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="4"
            placeholder="简单介绍本场比赛的关键情节与看点"
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
import { getClassicMatches, createClassicMatch } from "@/api/matches";

defineOptions({ name: "ClassicManage" });

const matches = ref([]);
const dialogVisible = ref(false);
const form = ref({
  title: "",
  event_name: "",
  match_date: "",
  opponent: "",
  round: "",
  video_url: "",
  description: "",
});

async function load() {
  try {
    const data = await getClassicMatches();
    matches.value = data || [];
  } catch {
    ElMessage.error("加载赛事列表失败");
  }
}

function openCreate() {
  form.value = {
    title: "",
    event_name: "",
    match_date: "",
    opponent: "",
    round: "",
    video_url: "",
    description: "",
  };
  dialogVisible.value = true;
}

async function onSubmit() {
  if (!form.value.title || !form.value.event_name) {
    ElMessage.warning("请填写比赛标题和赛事名称");
    return;
  }
  try {
    await createClassicMatch(form.value);
    ElMessage.success("新增成功");
    dialogVisible.value = false;
    await load();
  } catch {
    ElMessage.error("保存失败");
  }
}

function formatDate(d) {
  if (!d) return "";
  try {
    return new Date(d).toLocaleDateString("zh-CN");
  } catch {
    return d;
  }
}

onMounted(load);
</script>

<style scoped lang="scss">
.classic-manage-page {
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

