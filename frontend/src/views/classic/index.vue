<template>
  <div class="classic-page">
    <section class="hero">
      <div class="hero-left">
        <h2 class="hero-title">经典赛事 · 高光时刻</h2>
        <p class="hero-desc">
          精选中国女排的经典比赛，一起重温每一次扣杀、每一次逆转和每一次拥抱。
        </p>
        <el-tag type="info" effect="dark">视频回放 · 热门战役</el-tag>
      </div>
    </section>

    <section class="list">
      <el-timeline>
        <el-timeline-item
          v-for="match in matches"
          :key="match.id"
          :timestamp="formatDate(match.match_date)"
          placement="top"
        >
          <div class="match-card">
            <div class="match-header">
              <h3 class="match-title">{{ match.title }}</h3>
              <span class="match-round">{{ match.round }}</span>
            </div>
            <p class="match-event">
              {{ match.event_name }} · 对手：{{ match.opponent || "待定" }}
            </p>
            <p class="match-desc">{{ match.description }}</p>
            <div class="match-actions" v-if="match.video_url">
              <el-button
                type="primary"
                size="small"
                plain
                @click="openVideo(match.video_url)"
              >
                观看比赛视频
              </el-button>
            </div>
          </div>
        </el-timeline-item>
      </el-timeline>
    </section>
  </div>
</template>

<script setup>
import { onMounted, ref } from "vue";
import { ElMessage } from "element-plus";
import { getClassicMatches } from "@/api/matches";

defineOptions({ name: "ClassicMatches" });

const matches = ref([]);

onMounted(async () => {
  try {
    const data = await getClassicMatches();
    matches.value = data || [];
  } catch (e) {
    ElMessage.error("获取经典赛事失败");
  }
});

function openVideo(url) {
  window.open(url, "_blank");
}

function formatDate(d) {
  if (!d) return "";
  try {
    return new Date(d).toLocaleDateString("zh-CN");
  } catch {
    return d;
  }
}
</script>

<style scoped lang="scss">
.classic-page {
  min-height: calc(100vh - 56px);
}

.hero {
  padding: 24px 20px;
  margin-bottom: 24px;
  border-radius: 16px;
  background: linear-gradient(120deg, #003366, #0052a3);
  color: #fff;
}

.hero-title {
  font-size: 22px;
  font-weight: 700;
  margin-bottom: 8px;
}

.hero-desc {
  margin-bottom: 12px;
  opacity: 0.85;
}

.list {
  padding: 0 4px;
}

.match-card {
  margin-bottom: 8px;
  padding: 16px 18px;
  border-radius: 12px;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  box-shadow: 0 4px 18px rgba(0, 0, 0, 0.04);
}

.match-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.match-title {
  font-size: 16px;
  font-weight: 600;
  margin: 0;
}

.match-round {
  font-size: 12px;
  color: #409eff;
}

.match-event {
  font-size: 13px;
  color: var(--el-text-color-secondary);
  margin-bottom: 4px;
}

.match-desc {
  font-size: 13px;
  color: var(--el-text-color-regular);
  margin-bottom: 10px;
}

.match-actions {
  text-align: right;
}
</style>

