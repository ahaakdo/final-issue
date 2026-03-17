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

    <!-- 学生技能管理 -->
    <el-card class="block-card skills-block" v-loading="loadingStudents">
      <template #header>
        <div class="block-header">
          <span>学生技能养成管理</span>
          <el-button size="small" type="primary" @click="loadStudentList">
            刷新学生列表
          </el-button>
        </div>
      </template>
      <el-table
        :data="studentList"
        size="small"
        border
        height="320"
        highlight-current-row
        @row-click="onStudentRowClick"
        class="students-table"
      >
        <el-table-column prop="real_name" label="姓名" width="90" />
        <el-table-column prop="student_number" label="学号" width="110" />
        <el-table-column prop="major" label="专业" min-width="120" />
        <el-table-column label="操作" width="100">
          <template #default="{ row }">
            <el-button size="small" type="primary" link @click.stop="openSkillDrawer(row)">
              调整技能点
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 学生技能编辑抽屉 -->
    <el-drawer
      v-model="drawerVisible"
      title="调整学生技能"
      size="420px"
      destroy-on-close
      @close="drawerClosed"
    >
      <div v-if="editingStudent" class="drawer-body">
        <p class="drawer-student-name">{{ editingStudent.real_name }}（{{ editingStudent.student_number }}）</p>
        <el-divider content-position="left">基础档案</el-divider>
        <el-form label-width="90px" size="small">
          <el-form-item label="摸高(cm)">
            <el-input-number v-model="drawerProfile.base_reach_cm" :min="200" :max="350" placeholder="选填" style="width: 100%" />
          </el-form-item>
          <el-form-item label="备注">
            <el-input v-model="drawerProfile.notes" type="textarea" :rows="2" placeholder="选填" />
          </el-form-item>
          <el-button type="primary" size="small" :loading="savingProfile" @click="saveProfile">
            保存基础档案
          </el-button>
        </el-form>
        <el-divider content-position="left">技能点</el-divider>
        <div v-loading="loadingDrawerSkills" class="skills-drawer-list">
          <template v-for="(list, cat) in drawerSkills" :key="cat">
            <div v-if="list && list.length" class="skill-cat-block">
              <div class="skill-cat-title">{{ catLabel(cat) }}</div>
              <div v-for="s in list" :key="s.skill_code" class="skill-row">
                <span class="skill-name">{{ s.skill_name }}</span>
                <el-slider v-model="s.value" :max="s.max_value || 100" :min="0" show-input size="small" />
              </div>
            </div>
          </template>
        </div>
        <el-button type="primary" size="small" :loading="savingSkills" @click="saveSkills" style="margin-top: 12px">
          保存技能点
        </el-button>
      </div>
    </el-drawer>
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
  getStudentListForTeacher,
  getStudentSkillsByTeacher,
  updateStudentProfileByTeacher,
  updateStudentSkillsByTeacher,
} from "@/api/skills";

const loadingTeams = ref(false);
const loadingRequests = ref(false);
const savingPositions = ref(false);
const loadingStudents = ref(false);
const studentList = ref([]);
const drawerVisible = ref(false);
const editingStudent = ref(null);
const drawerProfile = ref({ base_reach_cm: null, notes: "" });
const drawerSkills = ref({ attack: [], set: [], defense: [], custom: [] });
const loadingDrawerSkills = ref(false);
const savingProfile = ref(false);
const savingSkills = ref(false);

const teams = ref([]);
const members = ref([]);
const activeTeamId = ref(null);
const requests = ref([]);

const CAT_LABELS = { attack: "进攻", set: "二传", defense: "防守", custom: "自定义" };
function catLabel(cat) {
  return CAT_LABELS[cat] || cat;
}

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

async function loadStudentList() {
  loadingStudents.value = true;
  try {
    const res = await getStudentListForTeacher();
    const data = res?.data ?? res;
    studentList.value = Array.isArray(data) ? data : [];
  } catch {
    ElMessage.error("加载学生列表失败");
  } finally {
    loadingStudents.value = false;
  }
}

function onStudentRowClick(row) {
  openSkillDrawer(row);
}

async function openSkillDrawer(row) {
  editingStudent.value = row;
  drawerVisible.value = true;
  drawerProfile.value = { base_reach_cm: null, notes: "" };
  drawerSkills.value = { attack: [], set: [], defense: [], custom: [] };
  if (!row?.id) return;
  loadingDrawerSkills.value = true;
  try {
    const res = await getStudentSkillsByTeacher(row.id);
    const data = res?.data ?? res;
    if (data?.profile) {
      drawerProfile.value = {
        base_reach_cm: data.profile.base_reach_cm ?? null,
        notes: data.profile.notes ?? "",
      };
    }
    if (data?.skills) {
      drawerSkills.value = {
        attack: data.skills.attack || [],
        set: data.skills.set || [],
        defense: data.skills.defense || [],
        custom: data.skills.custom || [],
      };
    }
  } catch {
    ElMessage.error("加载该学生技能失败");
  } finally {
    loadingDrawerSkills.value = false;
  }
}

function drawerClosed() {
  editingStudent.value = null;
}

async function saveProfile() {
  if (!editingStudent.value?.id) return;
  savingProfile.value = true;
  try {
    await updateStudentProfileByTeacher(editingStudent.value.id, {
      base_reach_cm: drawerProfile.value.base_reach_cm,
      notes: drawerProfile.value.notes,
    });
    ElMessage.success("基础档案已保存");
  } catch (e) {
    ElMessage.error(e?.message || "保存失败");
  } finally {
    savingProfile.value = false;
  }
}

async function saveSkills() {
  if (!editingStudent.value?.id) return;
  const updates = [];
  for (const cat of ["attack", "set", "defense", "custom"]) {
    const list = drawerSkills.value[cat] || [];
    for (const s of list) {
      if (s.skill_code != null) {
        updates.push({ skill_code: s.skill_code, value: Number(s.value) });
      }
    }
  }
  if (!updates.length) {
    ElMessage.info("没有可保存的技能项");
    return;
  }
  savingSkills.value = true;
  try {
    await updateStudentSkillsByTeacher(editingStudent.value.id, updates);
    ElMessage.success("技能点已保存");
  } catch (e) {
    ElMessage.error(e?.message || "保存失败");
  } finally {
    savingSkills.value = false;
  }
}

onMounted(() => {
  loadAll();
  loadStudentList();
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
.requests-table,
.students-table {
  font-size: 12px;
}

.skills-block {
  margin-top: 16px;
}

.drawer-body {
  padding: 0 8px;
}

.drawer-student-name {
  font-weight: 600;
  margin-bottom: 12px;
}

.skills-drawer-list {
  min-height: 80px;
}

.skill-cat-block {
  margin-bottom: 14px;
}

.skill-cat-title {
  font-size: 13px;
  color: var(--el-text-color-regular);
  margin-bottom: 6px;
}

.skill-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 6px;
}

.skill-row .skill-name {
  min-width: 72px;
  font-size: 12px;
}

.skill-row .el-slider {
  flex: 1;
}
</style>

