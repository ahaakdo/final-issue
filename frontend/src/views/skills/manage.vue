<template>
  <div class="skills-manage-page">
    <el-row :gutter="16">
      <el-col :span="14">
        <el-card class="block-card" v-loading="loadingTeams">
          <template #header>
            <div class="block-header">
              <span>训练小队与成员</span>
              <el-button size="small" type="primary" @click="loadAll">
                刷新
              </el-button>
            </div>
          </template>
          <el-row :gutter="12">
            <el-col :span="10">
              <el-table
                :data="teams"
                size="small"
                border
                height="360"
                @row-click="onTeamRowClick"
                class="teams-table"
              >
                <el-table-column prop="name" label="队伍" min-width="120" />
                <el-table-column
                  label="人数"
                  width="80"
                  align="center"
                >
                  <template #default="{ row }">
                    {{ memberCount(row.id) }}
                  </template>
                </el-table-column>
              </el-table>
            </el-col>
            <el-col :span="14">
              <div class="team-members-header">
                <span v-if="activeTeam">队伍：{{ activeTeam.name }}</span>
                <span v-else>请选择左侧队伍</span>
                <el-button
                  size="small"
                  type="primary"
                  :disabled="!activeTeam"
                  :loading="savingPositions"
                  @click="savePositions"
                >
                  保存位置分配
                </el-button>
              </div>
              <el-table
                :data="activeTeamMembers"
                size="small"
                border
                height="360"
                class="members-table"
              >
                <el-table-column prop="real_name" label="姓名" width="80" />
                <el-table-column
                  prop="student_number"
                  label="学号"
                  width="90"
                />
                <el-table-column prop="major" label="专业" min-width="90" />
                <el-table-column prop="role" label="身份" width="70">
                  <template #default="{ row }">
                    {{ row.role === "captain" ? "队长" : "队员" }}
                  </template>
                </el-table-column>
                <el-table-column label="位置" width="110">
                  <template #default="{ row }">
                    <el-select
                      v-model="row.court_position"
                      size="small"
                      placeholder="未设"
                      style="width: 100px"
                    >
                      <el-option label="主攻(OH)" value="OH" />
                      <el-option label="接应(OPP)" value="OPP" />
                      <el-option label="副攻(MB)" value="MB" />
                      <el-option label="二传(S)" value="S" />
                      <el-option label="自由人(L)" value="L" />
                    </el-select>
                  </template>
                </el-table-column>
              </el-table>
            </el-col>
          </el-row>
        </el-card>
      </el-col>
      <el-col :span="10">
        <el-card class="block-card" v-loading="loadingRequests">
          <template #header>
            <div class="block-header">
              <span>队伍加入/退出申请</span>
            </div>
          </template>
          <el-table
            :data="requests"
            size="small"
            border
            height="420"
            class="requests-table"
          >
            <el-table-column prop="student_name" label="学生" width="90" />
            <el-table-column
              prop="student_number"
              label="学号"
              width="90"
            />
            <el-table-column prop="team_name" label="队伍" min-width="100" />
            <el-table-column prop="type" label="类型" width="70">
              <template #default="{ row }">
                <el-tag
                  size="small"
                  :type="row.type === 'join' ? 'success' : 'warning'"
                  effect="plain"
                >
                  {{ row.type === "join" ? "加入" : "退出" }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="status" label="状态" width="80">
              <template #default="{ row }">
                <el-tag
                  size="small"
                  :type="
                    row.status === 'pending'
                      ? 'warning'
                      : row.status === 'approved'
                      ? 'success'
                      : 'info'
                  "
                  effect="plain"
                >
                  {{
                    row.status === "pending"
                      ? "待处理"
                      : row.status === "approved"
                      ? "已通过"
                      : "已驳回"
                  }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="created_at" label="申请时间" width="150" />
            <el-table-column label="操作" width="150">
              <template #default="{ row }">
                <el-button
                  size="small"
                  type="primary"
                  text
                  :disabled="row.status !== 'pending'"
                  @click="() => onApprove(row)"
                >
                  通过
                </el-button>
                <el-button
                  size="small"
                  type="danger"
                  text
                  :disabled="row.status !== 'pending'"
                  @click="() => onReject(row)"
                >
                  驳回
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
defineOptions({ name: "SkillsManage" });
import { ref, computed, onMounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import {
  getTeamsForTeacher,
  updateTeamPositions,
  getTeamRequests,
  approveTeamRequest,
  rejectTeamRequest,
} from "@/api/skills";

const loadingTeams = ref(false);
const loadingRequests = ref(false);
const savingPositions = ref(false);

const teams = ref([]);
const members = ref([]);
const activeTeamId = ref(null);
const requests = ref([]);

const activeTeam = computed(() =>
  teams.value.find((t) => t.id === activeTeamId.value) || null
);

const activeTeamMembers = computed(() =>
  members.value.filter((m) => m.team_id === activeTeamId.value)
);

function memberCount(teamId) {
  return members.value.filter((m) => m.team_id === teamId).length;
}

async function loadTeamsData() {
  loadingTeams.value = true;
  try {
    const res = await getTeamsForTeacher();
    const data = res?.data || res;
    teams.value = data.teams || [];
    members.value = (data.members || []).map((m) => ({
      ...m,
      court_position: m.court_position || "",
    }));
    if (!activeTeamId.value && teams.value.length) {
      activeTeamId.value = teams.value[0].id;
    }
  } catch {
    ElMessage.error("加载队伍数据失败");
  } finally {
    loadingTeams.value = false;
  }
}

async function loadRequests() {
  loadingRequests.value = true;
  try {
    const res = await getTeamRequests();
    const data = res?.data || res;
    requests.value = data || [];
  } catch {
    ElMessage.error("加载申请数据失败");
  } finally {
    loadingRequests.value = false;
  }
}

function onTeamRowClick(row) {
  activeTeamId.value = row.id;
}

async function savePositions() {
  if (!activeTeamId.value) return;
  savingPositions.value = true;
  try {
    const payload = activeTeamMembers.value.map((m) => ({
      student_id: m.student_id,
      court_position: m.court_position || null,
    }));
    await updateTeamPositions(activeTeamId.value, payload);
    ElMessage.success("已保存位置分配");
  } catch (e) {
    ElMessage.error(e?.message || "保存失败");
  } finally {
    savingPositions.value = false;
  }
}

async function onApprove(row) {
  const { value } = await ElMessageBox.prompt(
    "可选填审核备注（可留空）",
    "通过申请",
    {
      confirmButtonText: "确定",
      cancelButtonText: "取消",
      inputPlaceholder: "例如：通过加入申请",
    }
  ).catch(() => ({ value: null, canceled: true }));
  if (value === undefined && !row) return;
  try {
    await approveTeamRequest(row.id, { comment: value || null });
    ElMessage.success("已通过申请");
    await Promise.all([loadTeamsData(), loadRequests()]);
  } catch {
    ElMessage.error("操作失败");
  }
}

async function onReject(row) {
  const { value } = await ElMessageBox.prompt(
    "请输入驳回原因（可留空）",
    "驳回申请",
    {
      confirmButtonText: "确定",
      cancelButtonText: "取消",
      inputPlaceholder: "例如：队伍人数已满",
    }
  ).catch(() => ({ value: null, canceled: true }));
  if (value === undefined && !row) return;
  try {
    await rejectTeamRequest(row.id, { comment: value || null });
    ElMessage.success("已驳回申请");
    await loadRequests();
  } catch {
    ElMessage.error("操作失败");
  }
}

async function loadAll() {
  await Promise.all([loadTeamsData(), loadRequests()]);
}

onMounted(() => {
  loadAll();
});
</script>

<style scoped lang="scss">
.skills-manage-page {
  padding: 0 0 24px;
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

.team-members-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
  font-size: 13px;
}

.teams-table,
.members-table,
.requests-table {
  font-size: 12px;
}
</style>

