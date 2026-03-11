import http from "@/utils/http";

/** 课程分类列表 */
export function getCategoryList() {
  return http.get("/categories");
}

/** 新增课程分类 */
export function createCategory(data) {
  return http.post("/categories", data);
}

/** 更新课程分类 */
export function updateCategory(id, data) {
  return http.put(`/categories/${id}`, data);
}

/** 删除课程分类 */
export function deleteCategory(id) {
  return http.delete(`/categories/${id}`);
}
