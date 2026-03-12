<template>
  <div class="rio-page">
    <section class="hero">
      <div class="hero-left">
        <h2 class="hero-title">女排专栏 · 里约奥运会阵容</h2>
        <p class="hero-desc">
          回顾 2016 里约奥运会中国女排的冠军阵容，了解每一位队员背后的故事。
        </p>
        <el-tag type="success" effect="dark">国家队 · 冠军之路</el-tag>
      </div>
      <div class="hero-right">
        <div class="ball"></div>
        <div class="net"></div>
      </div>
    </section>

    <section class="cards">
      <el-row :gutter="20">
        <el-col v-for="player in players" :key="player.id" :xs="24" :sm="12" :md="8">
          <div class="player-card" @click="openDetail(player)">
            <div class="player-top">
              <div class="player-avatar" v-if="player.avatar_url">
                <img :src="player.avatar_url" :alt="player.name" />
              </div>
              <div class="player-header">
                <span class="player-number">#{{ player.number }}</span>
                <h3 class="player-name">{{ player.name }}</h3>
              </div>
            </div>
            <div class="player-meta">
              <el-tag size="small" type="warning" round>{{ player.position }}</el-tag>
              <span v-if="player.height_cm" class="player-height">
                {{ player.height_cm }} cm
              </span>
            </div>
            <p class="player-club" v-if="player.club">{{ player.club }}</p>
            <p class="player-intro">{{ player.intro }}</p>
          </div>
        </el-col>
      </el-row>
    </section>

    <el-drawer
      v-model="drawerVisible"
      :title="currentPlayer?.name || '队员详情'"
      size="50%"
    >
      <div v-if="currentPlayer" class="drawer-content">
        <div class="drawer-top">
          <div class="drawer-avatar">
            <img
              v-if="currentPlayer.avatar_url"
              :src="currentPlayer.avatar_url"
              :alt="currentPlayer.name"
            />
            <div v-else class="drawer-avatar-placeholder">
              {{ currentPlayer.name?.slice(0, 1) || "队" }}
            </div>
          </div>
          <div class="drawer-basic">
            <h3>{{ currentPlayer.name }}</h3>
            <p class="drawer-line">
              位置：{{ currentPlayer.position }} · 号码：#{{ currentPlayer.number }}
            </p>
            <p class="drawer-line" v-if="currentPlayer.height_cm">
              身高：{{ currentPlayer.height_cm }} cm
            </p>
            <p class="drawer-line" v-if="currentPlayer.club">
              俱乐部：{{ currentPlayer.club }}
            </p>
            <p class="drawer-line" v-if="currentPlayer.birthday">
              出生日期：{{ currentPlayer.birthday }}
            </p>
          </div>
        </div>

        <el-divider />

        <div class="drawer-section">
          <h4>个人简介</h4>
          <p class="drawer-text">
            {{ currentPlayer.intro || "暂无简介" }}
          </p>
        </div>

        <div class="drawer-section">
          <h4>个人荣誉</h4>
          <p class="drawer-text">
            {{ currentPlayer.honors || "暂无荣誉信息，敬请期待。" }}
          </p>
        </div>

        <div
          v-if="
            currentPlayer.gallery1_url ||
            currentPlayer.gallery2_url ||
            currentPlayer.gallery3_url
          "
          class="drawer-section"
        >
          <h4>风采照片</h4>
          <div class="gallery">
            <el-image
              v-if="currentPlayer.gallery1_url"
              :src="currentPlayer.gallery1_url"
              :preview-src-list="galleryList"
              fit="cover"
            />
            <el-image
              v-if="currentPlayer.gallery2_url"
              :src="currentPlayer.gallery2_url"
              :preview-src-list="galleryList"
              fit="cover"
            />
            <el-image
              v-if="currentPlayer.gallery3_url"
              :src="currentPlayer.gallery3_url"
              :preview-src-list="galleryList"
              fit="cover"
            />
          </div>
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { ElMessage } from "element-plus";
import { getRioPlayers } from "@/api/rio";

defineOptions({ name: "RioPlayers" });

const players = ref([]);
const drawerVisible = ref(false);
const currentPlayer = ref(null);

const galleryList = computed(() => {
  if (!currentPlayer.value) return [];
  return [
    currentPlayer.value.gallery1_url,
    currentPlayer.value.gallery2_url,
    currentPlayer.value.gallery3_url,
  ].filter(Boolean);
});

onMounted(async () => {
  try {
    const data = await getRioPlayers();
    players.value = data || [];
  } catch (e) {
    ElMessage.error("获取女排阵容失败");
  }
});

function openDetail(player) {
  currentPlayer.value = player;
  drawerVisible.value = true;
}
</script>

<style scoped lang="scss">
.rio-page {
  min-height: calc(100vh - 56px);
}

.hero {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 20px;
  margin-bottom: 24px;
  border-radius: 16px;
  background: linear-gradient(135deg, #001529, #003366);
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

.hero-right {
  position: relative;
  width: 160px;
  height: 100px;
}

.ball {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: radial-gradient(circle at 30% 30%, #ffd04b, #e6a23c);
  position: absolute;
  right: 10px;
  top: 10px;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
}

.net {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 40px;
  border-top: 2px solid rgba(255, 255, 255, 0.4);
  background-image: linear-gradient(
      rgba(255, 255, 255, 0.3) 1px,
      transparent 1px
    );
  background-size: 20px 8px;
  opacity: 0.8;
}

.cards {
  padding: 0 4px;
}

.player-card {
  margin-bottom: 20px;
  padding: 18px 16px;
  border-radius: 14px;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  box-shadow: 0 4px 18px rgba(0, 0, 0, 0.04);
  transition: transform 0.2s ease, box-shadow 0.2s ease,
    border-color 0.2s ease;
  cursor: pointer;
}

.player-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.12);
  border-color: rgba(64, 158, 255, 0.4);
}

.player-top {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.player-header {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 6px;
}

.player-avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  overflow: hidden;
  border: 2px solid rgba(255, 255, 255, 0.6);
}

.player-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.player-number {
  font-weight: 700;
  color: #409eff;
}

.player-name {
  font-size: 16px;
  font-weight: 600;
  margin: 0;
}

.player-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.player-height {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.player-club {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-bottom: 8px;
}

.player-intro {
  font-size: 13px;
  color: var(--el-text-color-regular);
  line-height: 1.6;
}

.drawer-content {
  padding-right: 8px;
}

.drawer-top {
  display: flex;
  gap: 16px;
  margin-bottom: 12px;
}

.drawer-avatar {
  width: 100px;
  height: 100px;
  border-radius: 16px;
  overflow: hidden;
  background: #001529;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 32px;
  font-weight: 700;
}

.drawer-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.drawer-avatar-placeholder {
  padding: 8px 12px;
}

.drawer-basic h3 {
  margin: 0 0 6px;
}

.drawer-line {
  margin: 2px 0;
  font-size: 13px;
  color: var(--el-text-color-regular);
}

.drawer-section {
  margin-top: 10px;
}

.drawer-section h4 {
  margin: 0 0 6px;
  font-size: 14px;
  font-weight: 600;
}

.drawer-text {
  margin: 0;
  font-size: 13px;
  color: var(--el-text-color-regular);
  line-height: 1.7;
}

.gallery {
  display: flex;
  gap: 12px;
}

.gallery :deep(.el-image) {
  width: 140px;
  height: 90px;
  border-radius: 10px;
  overflow: hidden;
}
</style>

