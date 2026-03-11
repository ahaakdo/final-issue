import axios from "axios";
import { ElMessage } from "element-plus";
import { getToken, removeToken } from "./auth";

const baseURL =
  import.meta.env.VITE_API_BASE ||
  (import.meta.env.DEV ? "" : window.location.origin);

const http = axios.create({
  baseURL: baseURL ? baseURL + "/api" : "/api",
  timeout: 15000,
  withCredentials: true,
});

http.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

http.interceptors.response.use(
  (res) => {
    const { code, message, data } = res.data ?? {};
    if (code === 0) return data;
    ElMessage.error(message || "请求失败");
    return Promise.reject(new Error(message || "请求失败"));
  },
  (err) => {
    if (err.response?.status === 401) {
      removeToken();
      window.location.href = "/login";
    } else {
      ElMessage.error(err.response?.data?.message || err.message || "网络错误");
    }
    return Promise.reject(err);
  }
);

export default http;
