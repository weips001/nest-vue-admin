# 快速开始

只需三步，即可在本地启动 `Nest Vue Admin`。

## 🚀 本地开发最短路径

如果你只想尽快把项目跑起来，按下面顺序执行即可：

```bash
# 1. 安装依赖
pnpm i

# 2. 复制服务端环境变量
cp apps/server/.env.example apps/server/.env

# 3. 创建 MySQL 数据库（名称需与 DATABASE_URL 一致）
# 例如：nva

# 4. 初始化数据库结构和种子数据
cd apps/server
pnpm run db:m
pnpm run seed
cd ../..

# 5. 回到根目录启动前后端
pnpm run dev
```

启动后访问 `http://localhost:5173`，默认账号 `admin / 123456`。

最小依赖说明：
- 默认 `CACHE_MODE=memory`，本地首次启动不依赖 Redis
- 后端默认端口 `3333`
- 前端默认端口 `5173`

## 📦 开发环境配置

### 环境要求
- **Node.js**: >= 20.x
- **pnpm**: 推荐使用最新版本
- **数据库**: MySQL >= 5.7.44

## 1. 克隆项目

```bash
git clone https://github.com/weips001/nest-vue-admin.git
cd nest-vue-admin
pnpm i
```

### 2.1 配置数据库连接
首先，你需要让服务端程序能够访问到你的 MySQL 数据库。

**操作步骤：**
1. 找到 `apps/server/.env` 文件
2. 复制 `.env.example` 文件并更改名称保存为 `.env` 文件
3. 将 `DATABASE_URL` 修改为你的实际连接信息：

```bash
DATABASE_URL="mysql://root:password@127.0.0.1:3306/nva?connection_limit=20&pool_timeout=0"
```
**参数解析：**

- **用户名**: `root`
- **密码**: `password`
- **地址/端口**: `127.0.0.1:3306`
- **数据库名**: `nva`

> **✅ 如何验证：**
> 使用 Navicat、TablePlus 或 DBeaver 尝试连接该配置。如果能成功连接到 MySQL 并看到对应的空库（即使没有表），说明连接链条已通。

### 2.2 同步数据库表结构并初始化数据

本项目使用 **Prisma ORM**。我们将通过代码中定义的 Schema 自动生成数据库表，无需手动执行建表语句。

**操作步骤：**

```bash
# 1. 进入服务端目录
cd apps/server

# 2. 执行模型同步（生成物理表）
pnpm run db:m

# 3. 初始化数据
pnpm run seed
```
> **✅ 如何验证：**
> - 数据库查验：刷新你的数据库工具，确认库中已自动生成 SysUser、SysRole、Temp 等数十张业务表。
> - sys_user、temp、sys_dict、sys_dict_detail、sys_menu 等表中均有数据

## 3. 项目启动

### 3.1 使用根目录统一命令启动
```bash
pnpm run dev
```

- 前端服务默认运行在 `http://localhost:5173`
- 后端服务默认运行在 `http://127.0.0.1:3333`

> 前端开发代理默认转发到 `http://127.0.0.1:3333`，请确保 `apps/server/.env` 中的 `APP_PORT` 与此保持一致。

### 3.2 常用根目录命令
```bash
pnpm run start   # 并行启动前后端
pnpm run build   # 构建 server 和 web
pnpm run lint    # 执行 server 和 web 的 lint
pnpm run test    # 执行 server 和 web 的测试
```

## 🚧 生产部署

生产部署前请先阅读 [docs/deployment.md](docs/deployment.md)，其中包含默认密码、`JWT_SECRET`、CORS、Redis、上传目录和反向代理等生产环境注意事项。

## 👤 登录系统

打开浏览器访问 `http://localhost:5173`，使用以下默认账号登录：

- **用户名**: admin
- **密码**: 123456

成功登录后，你将看到系统的主界面。
