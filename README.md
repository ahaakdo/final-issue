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
