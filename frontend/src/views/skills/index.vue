<template>
  <div class="skills-page">
    <section class="page-hero">
      <div class="hero-bg">
        <div class="hero-gradient" />
        <div class="hero-pattern" />
      </div>
      <div class="hero-content">
        <div class="hero-left">
          <h1>排球技能养成</h1>
          <p>结合课程训练记录自己的技能成长与队伍协作</p>
          <div class="hero-stats">
            <div class="stat-card">
              <span class="stat-label">攻击平均</span>
              <span class="stat-value">{{ avgAttack }}</span>
            </div>
            <div class="stat-card">
              <span class="stat-label">传球平均</span>
              <span class="stat-value">{{ avgSet }}</span>
            </div>
            <div class="stat-card">
              <span class="stat-label">防守平均</span>
              <span class="stat-value">{{ avgDefense }}</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="content-grid">
      <!-- 左侧：个人技能 -->
      <el-card class="block-card">
        <template #header>
          <div class="block-header">
            <span>个人技能面板</span>
            <span class="tips">属性由教师端统一维护，学生仅查看</span>
          </div>
        </template>
        <div v-loading="loadingSkills">
          <div class="base-info">
            <div class="base-item">
              <span class="label">摸高(cm)</span>
              <span class="value">{{ profile.base_reach_cm ?? "未录入" }}</span>
            </div>
            <div class="base-item" v-if="profile.notes">
              <span class="label">备注</span>
              <span class="value">{{ profile.notes }}</span>
            </div>
          </div>

          <div class="skills-groups">
            <div class="skills-group">
              <h3>扣球技能</h3>
              <div v-if="skills.attack?.length" class="skills-list">
                <div
                  v-for="s in skills.attack"
                  :key="s.skill_code"
                  class="skill-row"
                >
                  <div class="skill-header">
                    <span class="skill-name">{{ s.skill_name }}</span>
                    <span class="skill-value">{{ s.value }}/{{ s.max_value }}</span>
                  </div>
                  <el-slider :model-value="s.value" :min="0" :max="s.max_value" disabled />
                </div>
              </div>
              <el-empty
                v-else
                description="暂无数据"
                :image-size="40"
              />
            </div>

            <el-divider />

            <div class="skills-group">
              <h3>传球技能</h3>
              <div v-if="skills.set?.length" class="skills-list">
                <div
                  v-for="s in skills.set"
                  :key="s.skill_code"
                  class="skill-row"
                >
                  <div class="skill-header">
                    <span class="skill-name">{{ s.skill_name }}</span>
                    <span class="skill-value">{{ s.value }}/{{ s.max_value }}</span>
                  </div>
                  <el-slider :model-value="s.value" :min="0" :max="s.max_value" disabled />
                </div>
              </div>
              <el-empty
                v-else
                description="暂无数据"
                :image-size="40"
              />
            </div>

            <el-divider />

            <div class="skills-group">
              <h3>防守技能</h3>
              <div v-if="skills.defense?.length" class="skills-list">
                <div
                  v-for="s in skills.defense"
                  :key="s.skill_code"
                  class="skill-row"
                >
                  <div class="skill-header">
                    <span class="skill-name">{{ s.skill_name }}</span>
                    <span class="skill-value">{{ s.value }}/{{ s.max_value }}</span>
                  </div>
                  <el-slider :model-value="s.value" :min="0" :max="s.max_value" disabled />
                </div>
              </div>
              <el-empty
                v-else
                description="暂无数据"
                :image-size="40"
              />
            </div>

            <el-divider />

              <div class="skills-group">
                <div class="group-header">
                  <h3>自定义技能</h3>
                </div>
              <div v-if="skills.custom?.length" class="skills-list">
                <div
                  v-for="s in skills.custom"
                  :key="s.skill_code"
                  class="skill-row"
                >
                  <div class="skill-header">
                    <span class="skill-name">{{ s.skill_name }}</span>
                    <span class="skill-value">{{ s.value }}/{{ s.max_value }}</span>
                  </div>
                  <el-slider :model-value="s.value" :min="0" :max="s.max_value" disabled />
                </div>
              </div>
              <el-empty
                v-else
                description="可添加自定义训练指标，如“发球稳定性”"
                :image-size="40"
              />
            </div>
          </div>
        </div>
      </el-card>

      <!-- 右侧：组队与在线同学 -->
      <el-card class="block-card team-card" v-loading="loadingTeams">
        <template #header>
          <div class="block-header">
            <span>组队与在线同学</span>
          </div>
        </template>
        <div class="team-section">
          <div class="team-header">
            <h3>我的队伍</h3>
            <div class="team-actions">
              <span class="tips">队伍加入与退出需由教师端审核</span>
              <el-tag
                v-if="hasPending"
                size="small"
                type="warning"
                effect="plain"
                style="margin-left: 8px"
              >
                {{ pendingText() }}
              </el-tag>
              <el-button
                v-if="myTeam"
                size="small"
                type="danger"
                plain
                :disabled="hasPending"
                @click="onLeaveTeam"
                style="margin-left: 8px"
              >
                申请退出
              </el-button>
            </div>
          </div>
          <div v-if="myTeam" class="team-info">
            <p class="team-name">{{ myTeam.name }}</p>
            <p class="team-desc">
              {{ myTeam.description || "一起打好每一球！" }}
            </p>
            <h4 class="sub-title">队员技能概览</h4>
            <el-table
              :data="teamMembers"
              size="small"
              border
              class="team-table"
            >
              <el-table-column label="姓名" width="80">
                <template #default="{ row }">
                  {{ row.real_name || row.student_name || row.student_number }}
                </template>
              </el-table-column>
              <el-table-column prop="student_number" label="学号" width="90" />
              <el-table-column prop="court_position" label="位置" width="90" />
              <el-table-column prop="major" label="专业" min-width="80" />
              <el-table-column label="攻" width="70" align="center">
                <template #default="{ row }">
                  <span>{{ formatScore(row.atk_avg) }}</span>
                </template>
              </el-table-column>
              <el-table-column label="传" width="70" align="center">
                <template #default="{ row }">
                  <span>{{ formatScore(row.set_avg) }}</span>
                </template>
              </el-table-column>
              <el-table-column label="防" width="70" align="center">
                <template #default="{ row }">
                  <span>{{ formatScore(row.def_avg) }}</span>
                </template>
              </el-table-column>
            </el-table>
          </div>
          <el-empty v-else description="暂未加入任何队伍" :image-size="60" />
        </div>

        <el-divider />

        <div class="team-section">
          <div class="team-header">
            <h3>在线同学</h3>
          </div>
          <el-table
            v-if="onlineStudents.length"
            :data="onlineStudents"
            size="small"
            border
            class="team-table"
          >
            <el-table-column prop="student_name" label="姓名" width="80">
              <template #default="{ row }">
                {{ row.real_name || row.student_number }}
              </template>
            </el-table-column>
            <el-table-column prop="student_number" label="学号" width="90" />
            <el-table-column prop="major" label="专业" min-width="90" />
            <el-table-column prop="last_active_at" label="最近活跃" width="130">
              <template #default="{ row }">
                {{ formatRelativeTime(row.last_active_at) }}
              </template>
            </el-table-column>
          </el-table>
          <el-empty
            v-else
            description="暂时没有在线同学，稍后再来看看～"
            :image-size="60"
          />
        </div>

        <el-divider />

        <div class="team-section">
          <div class="team-header">
            <h3>可加入的队伍</h3>
          </div>
          <el-table
            v-if="teams.length"
            :data="teams"
            size="small"
            border
            class="team-table"
          >
            <el-table-column prop="name" label="队伍" min-width="120" />
            <el-table-column
              prop="member_count"
              label="人数"
              width="70"
              align="center"
            />
            <el-table-column label="操作" width="110" align="center">
              <template #default="{ row }">
                <el-button
                  size="small"
                  type="primary"
                  link
                  :disabled="!!myTeam || hasPending || Number(row.member_count) >= 7"
                  @click="onJoinTeam(row)"
                >
                  申请加入
                </el-button>
              </template>
            </el-table-column>
          </el-table>
          <el-empty
            v-else
            description="还没有队伍，快去创建一个吧～"
            :image-size="60"
          />
        </div>
      </el-card>
    </section>

  </div>
</template>

<script setup>
defineOptions({ name: "Skills" });
import { ref, reactive, computed, onMounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import {
  getStudentSkills,
  getTeamOverview,
  requestJoinTeam,
  requestLeaveTeam,
} from "@/api/skills";
import { formatRelativeTime } from "@/utils/format";

const loadingSkills = ref(false);
const loadingTeams = ref(false);

const profile = reactive({
  base_reach_cm: null,
  notes: "",
});

const skills = reactive({
  attack: [],
  set: [],
  defense: [],
  custom: [],
});

const localValues = reactive({});

const myTeam = ref(null);
const teamMembers = ref([]);
const onlineStudents = ref([]);
const teams = ref([]);
const pendingRequest = ref(null);

function syncLocalValues() {
  for (const group of ["attack", "set", "defense", "custom"]) {
    for (const s of skills[group] || []) {
      localValues[s.skill_code] = s.value;
    }
  }
}

function formatScore(v) {
  if (v == null || Number.isNaN(Number(v))) return "—";
  return Number(v).toFixed(1);
}

const avgAttack = computed(() => {
  if (!skills.attack?.length) return "--";
  const sum = skills.attack.reduce((acc, s) => acc + (Number(s.value) || 0), 0);
  return formatScore(sum / skills.attack.length);
});

const avgSet = computed(() => {
  if (!skills.set?.length) return "--";
  const sum = skills.set.reduce((acc, s) => acc + (Number(s.value) || 0), 0);
  return formatScore(sum / skills.set.length);
});

const avgDefense = computed(() => {
  if (!skills.defense?.length) return "--";
  const sum = skills.defense.reduce((acc, s) => acc + (Number(s.value) || 0), 0);
  return formatScore(sum / skills.defense.length);
});

async function loadSkills() {
  loadingSkills.value = true;
  try {
    const res = await getStudentSkills();
    const data = res?.data || res;
    if (data?.profile) {
      profile.base_reach_cm = data.profile.base_reach_cm;
      profile.notes = data.profile.notes;
    }
    skills.attack = data.skills?.attack || [];
    skills.set = data.skills?.set || [];
    skills.defense = data.skills?.defense || [];
    skills.custom = data.skills?.custom || [];
    syncLocalValues();
  } catch {
    ElMessage.error("加载技能数据失败");
  } finally {
    loadingSkills.value = false;
  }
}

async function loadTeams() {
  loadingTeams.value = true;
  try {
    const res = await getTeamOverview();
    const data = res?.data || res;
    myTeam.value = data.myTeam || null;
    teamMembers.value = data.teamMembers || [];
    onlineStudents.value = data.onlineStudents || [];
    teams.value = data.teams || [];
    pendingRequest.value = data.pendingRequest || null;
  } catch {
    ElMessage.error("加载组队信息失败");
  } finally {
    loadingTeams.value = false;
  }
}

const hasPending = computed(() => !!pendingRequest.value);

function pendingText() {
  if (!pendingRequest.value) return "";
  return pendingRequest.value.type === "join"
    ? "已有待审核的加入申请"
    : "已有待审核的退出申请";
}

async function onJoinTeam(row) {
  if (!row?.id) return;
  try {
    await ElMessageBox.confirm(
      `确认申请加入「${row.name}」吗？需教师审核。`,
      "申请加入队伍",
      { type: "warning", confirmButtonText: "确定", cancelButtonText: "取消" }
    );
  } catch {
    return;
  }
  try {
    await requestJoinTeam(row.id);
    ElMessage.success("已提交加入申请");
    await loadTeams();
  } catch (e) {
    ElMessage.error(e?.message || "提交失败");
  }
}

async function onLeaveTeam() {
  try {
    await ElMessageBox.confirm("确认申请退出当前队伍吗？需教师审核。", "申请退出队伍", {
      type: "warning",
      confirmButtonText: "确定",
      cancelButtonText: "取消",
    });
  } catch {
    return;
  }
  try {
    await requestLeaveTeam();
    ElMessage.success("已提交退出申请");
    await loadTeams();
  } catch (e) {
    ElMessage.error(e?.message || "提交失败");
  }
}

onMounted(async () => {
  await Promise.all([loadSkills(), loadTeams()]);
});
</script>

<style lang="scss" scoped>
.skills-page {
  padding: 0 0 24px;
}

.page-hero {
  position: relative;
  border-radius: 16px;
  overflow: hidden;
  margin: 0 24px 20px;
  min-height: 130px;
}

.hero-bg {
  position: absolute;
  inset: 0;
}

.hero-gradient {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, #001529 0%, #002140 45%, #007acc 100%);
  opacity: 0.97;
}

.hero-pattern {
  position: absolute;
  inset: 0;
  background-image: radial-gradient(rgba(255, 255, 255, 0.06) 1px, transparent 1px);
  background-size: 20px 20px;
}

.hero-content {
  position: relative;
  z-index: 1;
  padding: 22px 28px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.hero-left h1 {
  margin: 0 0 6px;
  font-size: 22px;
  font-weight: 700;
  color: #fff;
}

.hero-left p {
  margin: 0 0 12px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.8);
}

.hero-stats {
  display: flex;
  gap: 12px;
}

.stat-card {
  min-width: 88px;
  padding: 8px 10px;
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.18);
  color: #fff;
}

.stat-label {
  display: block;
  font-size: 12px;
  opacity: 0.85;
}

.stat-value {
  display: block;
  margin-top: 2px;
  font-size: 18px;
  font-weight: 700;
}

.content-grid {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(0, 1.4fr);
  gap: 16px;
  padding: 0 24px;
}

.block-card {
  border-radius: 14px;
}

.block-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 14px;
}

.base-info {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 12px;
}

.base-item {
  min-width: 120px;
  .label {
    display: block;
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }
  .value {
    font-size: 16px;
    font-weight: 600;
    color: var(--el-text-color-primary);
  }
}

.skills-groups {
  margin-top: 4px;
}

.skills-group h3 {
  margin: 0 0 8px;
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.skills-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.skill-row {
  padding: 6px 0;
}

.skill-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
  .skill-name {
    font-size: 13px;
    color: var(--el-text-color-primary);
  }
  .skill-value {
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }
}

.group-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.team-card {
  align-self: flex-start;
}

.team-section + .team-section {
  margin-top: 12px;
}

.team-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.team-name {
  margin: 0 0 4px;
  font-size: 15px;
  font-weight: 600;
}

.team-desc {
  margin: 0 0 8px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.sub-title {
  margin: 8px 0 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-regular);
}

.team-table {
  font-size: 12px;
}

@media (max-width: 1024px) {
  .content-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>

