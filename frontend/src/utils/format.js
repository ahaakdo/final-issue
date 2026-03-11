/**
 * 全局日期/时间格式化
 * 支持 ISO 字符串、Date 实例、时间戳
 */

/**
 * 将各种日期输入转为 Date 对象
 * @param {string|Date|number} input - ISO 字符串、Date 或时间戳
 * @returns {Date|null}
 */
function toDate(input) {
  if (input == null || input === "") return null;
  if (input instanceof Date) return input;
  if (typeof input === "number") return new Date(input);
  if (typeof input === "string") {
    const d = new Date(input);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

/**
 * 格式：日期（如 2026-03-07 或 2026年3月7日）
 * @param {string|Date|number} input
 * @param {object} opts - { locale: 'zh' | 'iso' }
 */
export function formatDate(input, opts = {}) {
  const d = toDate(input);
  if (!d) return "";
  const { locale = "zh" } = opts;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  if (locale === "zh") {
    return `${y}年${m}月${day}日`;
  }
  return `${y}-${m}-${day}`;
}

/**
 * 格式：日期时间（如 2026年3月7日 00:00）
 */
export function formatDateTime(input, opts = {}) {
  const d = toDate(input);
  if (!d) return "";
  const dateStr = formatDate(d, opts);
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${dateStr} ${h}:${min}`;
}

/**
 * 格式：日期范围（如 2026年3月6日 至 2026年3月25日）
 * @param {string|Date} start
 * @param {string|Date} end
 */
export function formatDateRange(start, end, opts = {}) {
  const s = formatDate(start, opts);
  const e = formatDate(end, opts);
  if (!s && !e) return "—";
  if (!s) return `至 ${e}`;
  if (!e) return `${s} 起`;
  return `${s} 至 ${e}`;
}

/** 相对时间（评论用）：刚刚 / 3分钟前 / 昨天 12:00 / 日期 */
export function formatRelativeTime(input) {
  const d = toDate(input);
  if (!d) return "";
  const now = new Date();
  const diffMs = now - d;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  if (diffSec < 60) return "刚刚";
  if (diffMin < 60) return `${diffMin}分钟前`;
  if (diffHour < 24) return `${diffHour}小时前`;
  if (diffDay === 1) return `昨天 ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  if (diffDay < 7) return `${diffDay}天前`;
  return formatDateTime(d);
}
