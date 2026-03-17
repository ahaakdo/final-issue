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
  enroll_form TEXT DEFAULT NULL COMMENT '报名申请表(JSON字符串)',
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

-- 审核与通知相关表

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

-- 学生排球技能档案（基础信息，如摸高等）
CREATE TABLE IF NOT EXISTS student_skill_profiles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL COMMENT '学生id',
  base_reach_cm INT DEFAULT NULL COMMENT '摸高(cm)，首堂课录入',
  notes VARCHAR(255) DEFAULT NULL COMMENT '其他备注',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_student_profile (student_id),
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='学生排球技能基础档案';

-- 学生排球技能点（固定技能 + 自定义技能）
CREATE TABLE IF NOT EXISTS student_skills (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL COMMENT '学生id',
  skill_code VARCHAR(64) NOT NULL COMMENT '技能编码，如 atk_line、def_pass_accuracy',
  skill_name VARCHAR(64) NOT NULL COMMENT '技能名称，便于前端展示',
  category ENUM('attack','set','defense','custom') NOT NULL COMMENT '技能类别：扣球/传球/防守/自定义',
  value INT NOT NULL DEFAULT 0 COMMENT '当前技能点(0-100)',
  max_value INT NOT NULL DEFAULT 100 COMMENT '最大技能点(用于前端进度条)',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_student_skill (student_id, skill_code),
  INDEX idx_student_category (student_id, category),
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='学生排球技能点';

-- 学生技能养成-队伍
CREATE TABLE IF NOT EXISTS student_teams (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(64) NOT NULL COMMENT '队伍名称',
  description VARCHAR(255) DEFAULT NULL COMMENT '队伍简介',
  owner_student_id INT NOT NULL COMMENT '队长(创建者)学生id',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_student_id) REFERENCES students(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='学生技能养成队伍';

-- 学生技能养成-队伍成员
CREATE TABLE IF NOT EXISTS student_team_members (
  id INT AUTO_INCREMENT PRIMARY KEY,
  team_id INT NOT NULL COMMENT '队伍id',
  student_id INT NOT NULL COMMENT '学生id',
  role ENUM('captain','member') NOT NULL DEFAULT 'member' COMMENT '在队伍中的角色',
  court_position ENUM('OH','OPP','MB','S','L') DEFAULT NULL COMMENT '场上位置：主攻OH/接应OPP/副攻MB/二传S/自由人L',
  joined_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '加入时间',
  UNIQUE KEY uk_team_student (team_id, student_id),
  UNIQUE KEY uk_student_single_team (student_id),
  INDEX idx_team (team_id),
  FOREIGN KEY (team_id) REFERENCES student_teams(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='学生技能养成队伍成员';

-- 学生在线状态（最近活跃时间，用于“在线同学”展示）
CREATE TABLE IF NOT EXISTS student_online_logs (
  student_id INT PRIMARY KEY COMMENT '学生id',
  last_active_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '最近一次活跃时间',
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='学生技能小游戏在线状态';

-- 学生队伍加入/退出申请（需老师端审核）
CREATE TABLE IF NOT EXISTS student_team_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  team_id INT NOT NULL COMMENT '队伍id',
  student_id INT NOT NULL COMMENT '学生id',
  type ENUM('join','leave') NOT NULL COMMENT '申请类型：加入/退出',
  status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending' COMMENT '审核状态',
  comment VARCHAR(255) DEFAULT NULL COMMENT '教师审核备注',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '申请时间',
  handled_at DATETIME DEFAULT NULL COMMENT '处理时间',
  handled_by_teacher_id INT DEFAULT NULL COMMENT '处理人(教师id)',
  INDEX idx_team (team_id),
  INDEX idx_student (student_id),
  INDEX idx_status (status),
  FOREIGN KEY (team_id) REFERENCES student_teams(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (handled_by_teacher_id) REFERENCES teachers(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='学生队伍加入/退出申请';

