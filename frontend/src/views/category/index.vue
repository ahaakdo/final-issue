<template>
  <div class="category-page">
    <div class="page-header">
      <h2>课程分类</h2>
      <el-button type="primary" @click="openDialog()">
        <el-icon><Plus /></el-icon>
        新增分类
      </el-button>
    </div>

    <el-table
      v-loading="loading"
      :data="list"
      stripe
      border
      style="width: 100%"
      :header-cell-style="{ background: 'var(--el-fill-color-light)' }"
    >
      <el-table-column type="index" label="序号" width="60" align="center" />
      <el-table-column prop="id" label="ID" width="80" align="center" />
      <el-table-column prop="name" label="分类名字" min-width="120" />
      <el-table-column prop="description" label="分类描述" min-width="240" show-overflow-tooltip />
      <el-table-column prop="created_at" label="创建时间" width="170" align="center" />
      <el-table-column prop="updated_at" label="更新时间" width="170" align="center" />
      <el-table-column label="操作" width="140" align="center" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openDialog(row)">编辑</el-button>
          <el-button link type="danger" @click="onDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog
      v-model="dialogVisible"
      :title="editId ? '编辑分类' : '新增分类'"
      width="480px"
      destroy-on-close
      @close="resetForm"
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item label="分类名字" prop="name">
          <el-input v-model="form.name" placeholder="请输入分类名字" maxlength="64" show-word-limit />
        </el-form-item>
        <el-form-item label="分类描述" prop="description">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="3"
            placeholder="请输入分类描述"
            maxlength="512"
            show-word-limit
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitLoading" @click="onSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
defineOptions({ name: "Category" });
import { ref, reactive, onMounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { Plus } from "@element-plus/icons-vue";
import { getCategoryList, createCategory, updateCategory, deleteCategory } from "@/api/category";

const loading = ref(false);
const list = ref([]);
const dialogVisible = ref(false);
const editId = ref(null);
const submitLoading = ref(false);
const formRef = ref(null);

const form = reactive({
  name: "",
  description: "",
});

const rules = {
  name: [{ required: true, message: "请输入分类名字", trigger: "blur" }],
};

async function fetchList() {
  loading.value = true;
  try {
    const data = await getCategoryList();
    list.value = Array.isArray(data) ? data : [];
  } catch (_) {
    list.value = [];
  } finally {
    loading.value = false;
  }
}

function openDialog(row) {
  editId.value = row ? row.id : null;
  form.name = row ? row.name : "";
  form.description = row ? row.description || "" : "";
  dialogVisible.value = true;
}

function resetForm() {
  editId.value = null;
  form.name = "";
  form.description = "";
  formRef.value?.resetFields();
}

async function onSubmit() {
  await formRef.value?.validate().catch(() => {});
  submitLoading.value = true;
  try {
    if (editId.value) {
      await updateCategory(editId.value, { name: form.name, description: form.description });
      ElMessage.success("更新成功");
    } else {
      await createCategory({ name: form.name, description: form.description });
      ElMessage.success("新增成功");
    }
    dialogVisible.value = false;
    fetchList();
  } finally {
    submitLoading.value = false;
  }
}

async function onDelete(row) {
  await ElMessageBox.confirm(`确定删除分类「${row.name}」吗？`, "提示", {
    type: "warning",
  }).catch(() => {
    throw new Error("cancel");
  });
  try {
    await deleteCategory(row.id);
    ElMessage.success("删除成功");
    fetchList();
  } catch (e) {
    if (e.message === "cancel") return;
  }
}

onMounted(() => {
  fetchList();
});
</script>

<style lang="scss" scoped>
.category-page {
  padding: 0;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;

  h2 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: var(--el-text-color-primary);
  }
}
</style>
