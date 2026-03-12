# 排球社团选课系统

基于 **Pure-Admin** 风格（Vue 3 + Element Plus）的前端 + **Node.js** 后端，包含登录/注册与首页，支持 CI/CD 与云端部署。

## 技术栈

- **前端**：Vue 3、Vite、Element Plus、Vue Router、Pinia
- **后端**：Node.js、Express、JWT、MySQL（学生/教师双表）、bcrypt 密码加密
- **CI/CD**：GitHub Actions（dev / main 双环境）
- **部署**：Docker / Docker Compose，可部署至任意云（Vercel + Railway、Render、自建等）

## 本地开发

### 环境要求

- Node.js >= 18
- MySQL >= 5.7 或 8.0
- npm 或 pnpm

### 数据库初始化

1. 创建 MySQL 数据库（或使用已有空库），在 `backend/.env` 中配置：

```bash
cd backend
cp .env.example .env
# 编辑 .env：DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME=volleyball_club
```

2. 初始化表结构并写入种子数据（学生/教师示例账号）：

```bash
npm install
npm run db:init    # 执行 schema.sql 建表
npm run db:seed    # 插入 5 名学生、2 名教师（用户名 student1~5 / teacher1~2，密码 123456）
```

## 数据库建表语句（schema.sql）

```sql
-- 排球社团选课系统 - MySQL 表结构
CREATE DATABASE IF NOT EXISTS volleyball_club DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE volleyball_club;

-- 学生表
CREATE TABLE IF NOT EXISTS students (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(64) NOT NULL UNIQUE COMMENT '用户名',
  password VARCHAR(255) NOT NULL COMMENT '密码(加密)',
  student_number VARCHAR(32) NOT NULL UNIQUE COMMENT '学号(年份+2005+001递增)',
  real_name VARCHAR(64) NOT NULL COMMENT '真实姓名',
  email VARCHAR(128) DEFAULT NULL COMMENT '邮箱',
  phone VARCHAR(20) DEFAULT NULL COMMENT '电话号码',
  major VARCHAR(64) DEFAULT NULL COMMENT '专业',
  gender TINYINT DEFAULT NULL COMMENT '性别 0女 1男',
  avatar VARCHAR(512) DEFAULT NULL COMMENT '头像URL',
  birthday DATE DEFAULT NULL COMMENT '生日',
  dormitory VARCHAR(64) DEFAULT NULL COMMENT '宿舍',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '生成日期',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '修改日期',
  INDEX idx_username (username),
  INDEX idx_student_number (student_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='学生表';

-- 教师表
CREATE TABLE IF NOT EXISTS teachers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(64) NOT NULL UNIQUE COMMENT '用户名',
  password VARCHAR(255) NOT NULL COMMENT '密码(加密)',
  real_name VARCHAR(64) NOT NULL COMMENT '真实姓名',
  email VARCHAR(128) DEFAULT NULL COMMENT '邮箱',
  phone VARCHAR(20) DEFAULT NULL COMMENT '电话号码',
  major VARCHAR(64) DEFAULT NULL COMMENT '专业',
  gender TINYINT DEFAULT NULL COMMENT '性别 0女 1男',
  avatar VARCHAR(512) DEFAULT NULL COMMENT '头像URL',
  birthday DATE DEFAULT NULL COMMENT '生日',
  professional_level VARCHAR(32) DEFAULT NULL COMMENT '专业等级(几级运动员)',
  department VARCHAR(128) DEFAULT NULL COMMENT '学校部门(如排球教研组)',
  office VARCHAR(64) DEFAULT NULL COMMENT '办公室',
  introduction TEXT DEFAULT NULL COMMENT '介绍',
  teaching_years INT DEFAULT NULL COMMENT '教龄',
  teaching_experience TEXT DEFAULT NULL COMMENT '教学经验',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '生成日期',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '修改日期',
  INDEX idx_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='教师表';

-- 课程分类表
CREATE TABLE IF NOT EXISTS course_categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(64) NOT NULL COMMENT '分类名字',
  description VARCHAR(512) DEFAULT NULL COMMENT '分类描述',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='课程分类表';

-- 课程表
CREATE TABLE IF NOT EXISTS courses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(128) NOT NULL COMMENT '课程名字',
  credits DECIMAL(3,1) NOT NULL DEFAULT 0 COMMENT '学分',
  capacity INT NOT NULL DEFAULT 0 COMMENT '课程容量',
  current_enrollment INT NOT NULL DEFAULT 0 COMMENT '当前报名学生数',
  location VARCHAR(128) DEFAULT NULL COMMENT '上课地址',
  schedule_weekly VARCHAR(128) DEFAULT NULL COMMENT '计划每周周几几点上课(如: 周一 14:00)',
  enroll_start_date DATE DEFAULT NULL COMMENT '开始报名日期',
  enroll_end_date DATE DEFAULT NULL COMMENT '截至报名日期',
  start_date DATE DEFAULT NULL COMMENT '开始学习时间',
  end_date DATE DEFAULT NULL COMMENT '结束学习时间',
  description TEXT DEFAULT NULL COMMENT '课程描述',
  tags VARCHAR(255) DEFAULT NULL COMMENT '课程标签(如: 高强度,技术流)',
  requirements TEXT DEFAULT NULL COMMENT '课程需求',
  syllabus TEXT DEFAULT NULL COMMENT '教学大纲',
  difficulty TINYINT NOT NULL DEFAULT 1 COMMENT '课程难度 1-3',
  lesson_count INT NOT NULL DEFAULT 0 COMMENT '课时数',
  recommend_index DECIMAL(2,1) DEFAULT NULL COMMENT '推荐指数',
  is_visible TINYINT NOT NULL DEFAULT 1 COMMENT '是否可见 0否 1是',
  teacher_id INT NOT NULL COMMENT '发布者(教师id)',
  category_id INT NOT NULL COMMENT '课程分类id',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX idx_teacher (teacher_id),
  INDEX idx_category (category_id),
  INDEX idx_visible (is_visible),
  FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES course_categories(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='课程表';

-- 课程评论表（学生、教师均可发评论，支持楼中楼回复）
CREATE TABLE IF NOT EXISTS course_comments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  course_id INT NOT NULL COMMENT '课程id',
  author_type ENUM('student','teacher') NOT NULL COMMENT '作者类型',
  author_id INT NOT NULL COMMENT '作者id(学生id或教师id)',
  parent_id INT DEFAULT NULL COMMENT '父评论id，NULL表示一级评论',
  content TEXT NOT NULL COMMENT '评论内容',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_course (course_id),
  INDEX idx_parent (parent_id),


  INDEX idx_created (created_at),
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='课程评论表';

-- 课程评分表（仅学生可打分，每人每课一条，可更新；平均分回写 course.recommend_index）
CREATE TABLE IF NOT EXISTS course_ratings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  course_id INT NOT NULL COMMENT '课程id',
  student_id INT NOT NULL COMMENT '学生id',
  rating TINYINT NOT NULL COMMENT '评分1-5',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_course_student (course_id, student_id),
  INDEX idx_course (course_id),
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='课程评分表';

-- 课程报名表（学生报名/退课记录）
CREATE TABLE IF NOT EXISTS course_enrollments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  course_id INT NOT NULL COMMENT '课程id',
  student_id INT NOT NULL COMMENT '学生id',
  status ENUM('pending','enrolled','cancelled') NOT NULL DEFAULT 'pending' COMMENT '报名状态',
  enroll_pending TINYINT NOT NULL DEFAULT 1 COMMENT '报名是否审核中',
  enroll_status ENUM('approved','reject') DEFAULT NULL COMMENT '报名审核结果',
  enroll_reason VARCHAR(500) DEFAULT NULL COMMENT '报名理由(可选)',
  withdraw_pending TINYINT NOT NULL DEFAULT 0 COMMENT '是否审核中(退课申请)',
  withdraw_status ENUM('approved','reject') DEFAULT NULL COMMENT '退课状态',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '报名时间',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '修改时间',
  UNIQUE KEY uk_course_student_enroll (course_id, student_id),
  INDEX idx_enroll_course (course_id),
  INDEX idx_enroll_student (student_id),
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='课程报名表';

-- 课程退课申请表（学生发起，教师审核可扩展）
CREATE TABLE IF NOT EXISTS course_withdraw_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  course_id INT NOT NULL COMMENT '课程id',
  student_id INT NOT NULL COMMENT '学生id',
  reason VARCHAR(500) NOT NULL COMMENT '退课原因',
  status ENUM('approved','reject') NOT NULL DEFAULT 'reject' COMMENT '退课状态',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '申请时间',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '修改时间',
  INDEX idx_withdraw_course (course_id),
  INDEX idx_withdraw_student (student_id),
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='课程退课申请表';

-- 审核历史表（记录教师对报名/退课的审核结果）
CREATE TABLE IF NOT EXISTS audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  type ENUM('enroll','withdraw') NOT NULL COMMENT '审核类型',
  course_id INT NOT NULL,
  student_id INT NOT NULL,
  teacher_id INT NOT NULL,
  result ENUM('approved','reject') NOT NULL COMMENT '结果',
  reason VARCHAR(500) DEFAULT NULL COMMENT '学生提交的理由',
  reject_reason VARCHAR(500) DEFAULT NULL COMMENT '教师驳回原因',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_type_course (type, course_id),
  INDEX idx_audit_student (student_id),
  INDEX idx_audit_teacher (teacher_id),
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='审核历史表';

-- 学生通知表（记录报名/退课审核结果通知）
CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_type ENUM('student','teacher') NOT NULL COMMENT '用户类型',
  user_id INT NOT NULL COMMENT '用户id',
  title VARCHAR(100) NOT NULL COMMENT '标题',
  content VARCHAR(500) NOT NULL COMMENT '内容',
  is_read TINYINT NOT NULL DEFAULT 0 COMMENT '是否已读',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_notify_user (user_type, user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='通知表';

-- 女排专栏：里约奥运会阵容
CREATE TABLE IF NOT EXISTS rio_women_volleyball_players (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL COMMENT '姓名',
  position VARCHAR(50) NOT NULL COMMENT '位置',
  number TINYINT NOT NULL COMMENT '球衣号码',
  birthday DATE DEFAULT NULL COMMENT '出生日期',
  height_cm INT DEFAULT NULL COMMENT '身高cm',
  club VARCHAR(100) DEFAULT NULL COMMENT '当时俱乐部',
  intro TEXT DEFAULT NULL COMMENT '个人简介',
  avatar_url VARCHAR(255) DEFAULT NULL COMMENT '头像照片URL',
  gallery1_url VARCHAR(255) DEFAULT NULL COMMENT '风采照1',
  gallery2_url VARCHAR(255) DEFAULT NULL COMMENT '风采照2',
  gallery3_url VARCHAR(255) DEFAULT NULL COMMENT '风采照3',
  honors TEXT DEFAULT NULL COMMENT '个人荣誉与代表性成绩',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='女排里约奥运会阵容';

-- 经典女排赛事
CREATE TABLE IF NOT EXISTS classic_volleyball_matches (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(150) NOT NULL COMMENT '比赛标题',
  event_name VARCHAR(100) NOT NULL COMMENT '赛事名称',
  match_date DATE DEFAULT NULL COMMENT '比赛日期',
  opponent VARCHAR(100) DEFAULT NULL COMMENT '对手',
  round VARCHAR(100) DEFAULT NULL COMMENT '阶段',
  video_url VARCHAR(255) DEFAULT NULL COMMENT '视频地址',
  description TEXT DEFAULT NULL COMMENT '比赛简介',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='经典女排赛事';
```

### 启动后端

```bash
npm run dev
```

后端默认：<http://localhost:3000>，接口前缀 `/api`。

### 启动前端

```bash
cd frontend
npm install
npm run dev
```

前端默认：<http://localhost:5173>，开发时通过 Vite 代理将 `/api` 转发到后端。

### 功能说明

- **登录**：`/login`，选择身份（学生/教师）+ 用户名 + 密码（种子账号：student1~5、teacher1~2，密码 123456）
- **注册**：`/register`，选择身份后填写对应表单（学生：学号自动生成；教师：部门、教龄等）
- **首页**：`/`，需登录，顶栏显示姓名与身份标签，内容区为欢迎与占位入口

## CI/CD

- **分支**：
  - `dev`：开发环境（推送到 dev 触发 `Deploy Dev`）
  - `main`：生产环境（推送到 main 触发 `Deploy Production`）
- **CI**：推送到 `dev` / `main` 或对应 PR 会跑 `CI`（后端健康检查 + 前端构建）。

### 配置 API 地址

在 GitHub 仓库 **Settings → Secrets and variables → Actions** 中：

- **生产**：添加变量 `VITE_API_BASE` = 生产环境后端地址（如 `https://api.xxx.com`）
- **开发**（可选）：添加变量 `VITE_API_BASE_DEV` = 开发环境后端地址

前端构建时会注入对应 `VITE_API_BASE`，请求会发到该后端。

## 云端部署

### 方式一：Docker Compose（单机/自建）

```bash
# 根目录
export JWT_SECRET=你的生产密钥
docker compose up -d
```

- 前端：<http://localhost>
- 后端：<http://localhost:3000>
- 数据：`backend-data` 卷持久化

### 方式二：前后端分离部署

1. **后端**（任选其一）  
   - **Railway / Render / Fly.io**：将 `backend` 目录部署为 Node 服务，设置环境变量 `PORT`、`JWT_SECRET`。  
   - 或使用 `backend/Dockerfile` 构建镜像后部署。

2. **前端**  
   - 构建时传入后端地址，例如：  
     `VITE_API_BASE=https://你的后端域名`  
   - 将 `frontend/dist` 部署到 **Vercel / Netlify / 对象存储 + CDN**。  
   - 或使用 `frontend/Dockerfile` 构建镜像（构建参数 `VITE_API_BASE`）后部署到任意支持 Docker 的平台。

### 方式三：Vercel（前端）+ Railway（后端）

- **Vercel**：连接仓库，根目录选 `frontend`，Build Command: `npm run build`，Output: `dist`，在 Environment 中设置 `VITE_API_BASE` 为 Railway 后端 URL。
- **Railway**：连接仓库，根目录选 `backend`，或使用 `backend/Dockerfile`，设置 `JWT_SECRET` 和 `PORT`。

## 目录结构

```
pure-final/
├── backend/                 # Node 后端
│   ├── src/
│   │   ├── server.js
│   │   ├── routes/auth.js
│   │   └── store/users.js
│   ├── Dockerfile
│   └── package.json
├── frontend/               # Vue 前端（Pure-Admin 风格）
│   ├── src/
│   │   ├── api/
│   │   ├── views/           # 登录、注册、首页
│   │   ├── router/
│   │   ├── store/
│   │   └── utils/
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
├── .github/workflows/       # CI / 部署
│   ├── ci.yml
│   ├── deploy-dev.yml
│   └── deploy-prod.yml
├── docker-compose.yml
└── README.md
```

## 后续扩展

- 选课、课程表、社团公告等接口与页面可在当前路由与 API 基础上继续增加。
- 生产环境建议将后端用户存储改为数据库（如 MySQL/PostgreSQL），并配置 HTTPS 与域名。
