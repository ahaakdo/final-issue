<template>
  <div class="course-comment-section">
    <!-- 评分区 -->
    <div class="comment-header">
      <div class="comment-title">
        <span class="title-text">评论区</span>
        <span class="comment-count">{{ commentTotal }} 条评论</span>
      </div>
      <div class="rating-summary">
        <div class="rating-avg">
          <el-rate
            :model-value="avgDisplay"
            :max="5"
            disabled
            allow-half
            show-score
            text-color="#ff9900"
            score-template="{value} 分"
            disabled-void-color="#dcdfe6"
            class="avg-rate"
          />
          <span class="rating-count">（{{ ratingSummary.count }} 人评分）</span>
        </div>
        <div v-if="isStudent && courseId" class="my-rating">
          <span class="my-rating-label">我的评分：</span>
          <el-rate
            :model-value="myRatingDisplay"
            :max="5"
            allow-half
            text-color="#ff9900"
            class="my-rate"
            @change="onMyRatingChange"
          />
          <span class="my-rating-text">{{ myRatingValue != null && myRatingValue > 0 ? myRatingValue + ' 星' : '未评分' }}</span>
        </div>
      </div>
    </div>

    <!-- 发表评论 -->
    <div v-if="isLoggedIn" ref="commentInputAreaRef" class="comment-input-area">
      <div v-if="replyTo" class="reply-mode-bar">
        <span class="reply-mode-text">正在回复 <strong>@{{ replyTo.author_name }}</strong>，回复将显示在 TA 的评论下方</span>
        <el-button link type="primary" size="small" @click="cancelReply">取消回复</el-button>
      </div>
      <el-input
        v-model="commentContent"
        type="textarea"
        :rows="3"
        :placeholder="replyTo ? '写下你对 @' + replyTo.author_name + ' 的回复…' : '发一条友善的评论吧～'"
        maxlength="500"
        show-word-limit
        class="comment-textarea"
      />
      <div class="input-actions">
        <el-button type="primary" :loading="submitting" @click="submitComment">{{ replyTo ? '发送回复' : '发送' }}</el-button>
      </div>
    </div>
    <div v-else class="comment-login-hint">登录后参与评论</div>

    <!-- 评论列表 -->
    <div class="comment-list">
      <div v-loading="loading" class="list-inner">
        <template v-if="comments.length">
          <div
            v-for="item in comments"
            :key="item.id"
            class="comment-item root"
          >
            <div class="comment-avatar">
              <el-icon :size="32"><UserFilled /></el-icon>
            </div>
            <div class="comment-body">
              <div class="comment-meta">
                <span class="author-name">{{ item.author_name }}</span>
                <el-tag
                  :type="item.author_type === 'teacher' ? 'warning' : 'primary'"
                  size="small"
                  effect="plain"
                  round
                  class="author-role"
                >
                  {{ item.author_type === 'teacher' ? '教师' : '学生' }}
                </el-tag>
                <span class="comment-time">{{ formatRelativeTime(item.created_at) }}</span>
              </div>
              <p class="comment-content">{{ item.content }}</p>
              <div class="comment-actions">
                <el-button link type="primary" size="small" @click="setReplyTo(item)">回复</el-button>
              </div>
              <!-- 回复列表：显示在该条评论下面 -->
              <div v-if="item.replies && item.replies.length" class="replies">
                <div
                  v-for="reply in item.replies"
                  :key="reply.id"
                  class="comment-item reply"
                  :data-comment-id="reply.id"
                >
                  <div class="comment-avatar small">
                    <el-icon :size="20"><UserFilled /></el-icon>
                  </div>
                  <div class="comment-body">
                    <div class="comment-meta">
                      <span class="author-name">{{ reply.author_name }}</span>
                      <el-tag
                        :type="reply.author_type === 'teacher' ? 'warning' : 'primary'"
                        size="small"
                        effect="plain"
                        round
                        class="author-role"
                      >
                        {{ reply.author_type === 'teacher' ? '教师' : '学生' }}
                      </el-tag>
                      <span v-if="reply.parent_author_name" class="reply-to-hint">回复 @{{ reply.parent_author_name }}</span>
                      <span class="comment-time">{{ formatRelativeTime(reply.created_at) }}</span>
                    </div>
                    <p class="comment-content">{{ reply.content }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </template>
        <el-empty v-else-if="!loading" description="暂无评论，快来抢沙发～" :image-size="80" />
        <div v-if="hasMore && comments.length" class="load-more">
          <el-button :loading="loadingMore" text @click="loadMore">加载更多</el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineOptions({ name: "CourseCommentSection" });
import { ref, computed, watch, nextTick } from "vue";
import { UserFilled } from "@element-plus/icons-vue";
import { formatRelativeTime } from "@/utils/format";
import { getCourseComments, postCourseComment, getCourseRating, submitCourseRating } from "@/api/course";
import { useUserStore } from "@/store/user";

const props = defineProps({
  courseId: { type: Number, default: null },
  courseName: { type: String, default: "" },
});

const emit = defineEmits(["rating-updated"]);

const userStore = useUserStore();
const isLoggedIn = computed(() => !!userStore.token);
const isStudent = computed(() => userStore.role === "student");

const ratingSummary = ref({ average: 0, count: 0, my_rating: null });
const myRatingValue = ref(null);
const comments = ref([]);

/** 左侧平均分展示用，保证为 0～5 的数字以便星星正常显示 */
const avgDisplay = computed(() => Math.min(5, Math.max(0, Number(ratingSummary.value.average) || 0)));
/** 右侧「我的评分」展示用，未评时为 0 避免出现 null */
const myRatingDisplay = computed(() => (myRatingValue.value != null ? myRatingValue.value : 0));

function onMyRatingChange(val) {
  const v = Number(val);
  myRatingValue.value = v && v > 0 ? v : null;
  if (v && v >= 1 && v <= 5) onSubmitRating(v);
}
const commentTotal = ref(0);
const page = ref(1);
const pageSize = 20;
const loading = ref(false);
const loadingMore = ref(false);
const submitting = ref(false);
const commentContent = ref("");
const replyTo = ref(null);

const hasMore = computed(() => comments.value.length < commentTotal.value);

function fetchRating() {
  if (!props.courseId) return;
  getCourseRating(props.courseId)
    .then((data) => {
      ratingSummary.value = {
        average: Number(data.average) || 0,
        count: Number(data.count) || 0,
        my_rating: data.my_rating != null ? data.my_rating : null,
      };
      myRatingValue.value = ratingSummary.value.my_rating;
    })
    .catch(() => {});
}

function fetchComments(isLoadMore = false) {
  if (!props.courseId) return;
  if (isLoadMore) loadingMore.value = true;
  else loading.value = true;
  const p = isLoadMore ? page.value : 1;
  getCourseComments(props.courseId, { page: p, pageSize })
    .then((data) => {
      const list = data?.list ?? [];
      const total = data?.total ?? 0;
      if (isLoadMore) {
        comments.value = [...comments.value, ...list];
      } else {
        comments.value = list;
        commentTotal.value = total;
      }
      page.value = p;
    })
    .catch(() => {})
    .finally(() => {
      loading.value = false;
      loadingMore.value = false;
    });
}

function loadMore() {
  page.value += 1;
  fetchComments(true);
}

function submitComment() {
  const content = commentContent.value?.trim();
  if (!content) return;
  if (!props.courseId) return;
  submitting.value = true;
  const payload = { content };
  if (replyTo.value) payload.parent_id = replyTo.value.id;
  postCourseComment(props.courseId, payload)
    .then((newComment) => {
      commentContent.value = "";
      if (replyTo.value) {
        const parentRef = replyTo.value;
        cancelReply();
        const parent = comments.value.find((c) => c.id === parentRef.id);
        if (parent) {
          const replyItem = { ...newComment, parent_author_name: parentRef.author_name };
          parent.replies = [...(parent.replies || []), replyItem];
          nextTick(() => {
            const el = document.querySelector(`[data-comment-id="${replyItem.id}"]`);
            el?.scrollIntoView({ behavior: "smooth", block: "center" });
          });
        }
      } else {
        cancelReply();
        comments.value = [{ ...newComment, replies: [] }, ...comments.value];
        commentTotal.value = (commentTotal.value || 0) + 1;
      }
    })
    .finally(() => { submitting.value = false; });
}

const commentInputAreaRef = ref(null);

function setReplyTo(item) {
  replyTo.value = item;
  nextTick(() => {
    commentInputAreaRef.value?.scrollIntoView({ behavior: "smooth", block: "center" });
  });
}

function cancelReply() {
  replyTo.value = null;
}

function onSubmitRating(value) {
  if (!props.courseId || !value) return;
  submitCourseRating(props.courseId, Math.round(value))
    .then((data) => {
      ratingSummary.value.average = data.average ?? ratingSummary.value.average;
      ratingSummary.value.count = (ratingSummary.value.count || 0) + (myRatingValue.value && !ratingSummary.value.my_rating ? 1 : 0);
      ratingSummary.value.my_rating = myRatingValue.value;
      emit("rating-updated", data.average);
    })
    .catch(() => {
      myRatingValue.value = ratingSummary.value.my_rating;
    });
}

watch(
  () => props.courseId,
  (id) => {
    if (id) {
      page.value = 1;
      fetchRating();
      fetchComments();
    } else {
      comments.value = [];
      commentTotal.value = 0;
      ratingSummary.value = { average: 0, count: 0, my_rating: null };
    }
  },
  { immediate: true }
);
</script>

<style lang="scss" scoped>
.course-comment-section {
  padding: 0;
  background: var(--app-main-bg);
}

.comment-header {
  margin-bottom: 24px;
  padding: 20px 24px;
  background: var(--el-bg-color);
  border-radius: 12px;
  border: 1px solid var(--el-border-color-lighter);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
}

.comment-title {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;

  .title-text {
    font-size: 17px;
    font-weight: 700;
    color: var(--el-text-color-primary);
    letter-spacing: 0.02em;
  }

  .comment-count {
    font-size: 13px;
    color: var(--el-text-color-secondary);
    font-weight: 500;
  }
}

.rating-summary {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 20px;
}

.rating-avg {
  display: flex;
  align-items: center;
  gap: 8px;

  .avg-rate {
    height: 24px;
  }

  .avg-num {
    font-size: 18px;
    font-weight: 700;
    color: var(--el-text-color-primary);
  }

  .rating-count {
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }
}

.my-rating {
  display: flex;
  align-items: center;
  gap: 8px;

  .my-rating-label {
    font-size: 13px;
    color: var(--el-text-color-regular);
  }

  .my-rating-text {
    font-size: 14px;
    color: #ff9900;
    margin-left: 4px;
  }
}

.comment-input-area {
  margin-bottom: 24px;
  padding: 20px;
  background: var(--el-bg-color);
  border-radius: 12px;
  border: 1px solid var(--el-border-color-lighter);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);

  .reply-mode-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 14px;
    margin-bottom: 12px;
    background: var(--el-color-primary-light-9);
    border-radius: 8px;
    border: 1px solid var(--el-color-primary-light-7);

    .reply-mode-text {
      font-size: 13px;
      color: var(--el-text-color-regular);

      strong {
        color: var(--el-color-primary);
      }
    }
  }

  .comment-textarea {
    margin-bottom: 10px;

    :deep(.el-textarea__inner) {
      border-radius: 10px;
      background: var(--el-fill-color-blank);
      border-color: var(--el-border-color-lighter);
      transition: border-color 0.2s, box-shadow 0.2s;

      &:focus {
        border-color: var(--el-color-primary-light-5);
        box-shadow: 0 0 0 2px var(--el-color-primary-light-9);
      }
    }
  }

  .input-actions {
    display: flex;
    align-items: center;
    gap: 12px;

    .reply-hint {
      font-size: 12px;
      color: var(--el-color-primary);
    }
  }
}

.comment-login-hint {
  padding: 12px 0;
  font-size: 13px;
  color: var(--el-text-color-secondary);
  margin-bottom: 16px;
}

.comment-list {
  .list-inner {
    min-height: 120px;
  }
}

.comment-item {
  display: flex;
  gap: 14px;
  padding: 16px 18px;
  background: var(--el-bg-color);
  border-radius: 12px;
  border: 1px solid var(--el-border-color-lighter);
  transition: box-shadow 0.2s, border-color 0.2s;

  &.root {
    margin-bottom: 12px;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);

    &:hover {
      border-color: var(--el-border-color);
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
    }
  }

  &.reply {
    padding: 12px 14px;
    margin-bottom: 8px;
    background: var(--el-fill-color-blank);
    border-radius: 10px;
    border-left: 3px solid var(--el-color-primary-light-5);
  }
}

.comment-avatar {
  flex-shrink: 0;
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--el-fill-color-light) 0%, var(--el-fill-color) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--el-text-color-secondary);
  border: 1px solid var(--el-border-color-lighter);

  &.small {
    width: 30px;
    height: 30px;

    .el-icon {
      font-size: 16px;
    }
  }
}

.comment-body {
  flex: 1;
  min-width: 0;
}

.comment-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;
}

.author-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  letter-spacing: 0.01em;
}

.author-role {
  font-size: 11px;
  padding: 0 8px;
  height: 20px;
  line-height: 20px;
  font-weight: 500;
}

.reply-to-hint {
  font-size: 12px;
  color: var(--el-color-primary);
  margin-left: 2px;
}

.comment-time {
  font-size: 12px;
  color: var(--el-text-color-placeholder);
  margin-left: 2px;
}

.comment-content {
  margin: 0 0 10px;
  font-size: 14px;
  line-height: 1.7;
  color: var(--el-text-color-regular);
  white-space: pre-wrap;
  word-break: break-word;
}

.comment-actions {
  margin-top: 6px;
}

.replies {
  margin-top: 14px;
  padding-left: 0;
}

.load-more {
  padding: 16px 0;
  text-align: center;
}
</style>
