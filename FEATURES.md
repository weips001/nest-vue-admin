# 企业级应用底座 - Features 规划

## 现状

nest-vue-admin 已具备：
- 完整 RBAC 权限体系（用户-角色-菜单，按钮级权限）
- 用户/角色/菜单/部门/岗位/字典管理
- JWT 认证 + 验证码
- 操作日志 & 登录日志
- 通知公告（含已读追踪）
- 文件上传（本地 + 阿里云 OSS）
- Redis 缓存（内存回退）
- Todo 任务管理
- 消息中心
- 主题切换（亮/暗）
- Tab 标签页管理

---

## Phase 1：基础能力补全

> 所有后续阶段的前置依赖，独立性强可并行开发。

### 1.1 接口限流
- 安装 `@nestjs/throttler`，创建自定义 ThrottlerGuard（按用户ID限流）
- 登录/验证码等公开接口使用 `@SkipThrottle()` 跳过
- 前端 `request.ts` 处理 429 状态码
- **文件**: `common/common.module.ts`, `config/config.ts`, `config/config.validation.ts`

### 1.2 健康检查
- 安装 `@nestjs/terminus`，创建 `modules/monitor/health/` 模块
- 实现 Database / Redis / Disk / Memory 四个健康指标
- `@Public()` 装饰器开放，供负载均衡器调用
- **文件**: `modules/modules.module.ts`, `main.ts`

### 1.3 通用 Excel 导入导出
- 项目已有 `xlsx` 依赖，创建 `common/class/export.class.ts` 和 `import.class.ts`
- ExportService：通用 `exportToExcel(columns, data)` 返回 StreamableFile
- ImportService：`importFromExcel(file, mappings, rules)` 返回成功/失败统计
- 列表接口增加 `format=xlsx` 参数支持导出
- 前端创建 `ExportButton` 和 `ImportDialog` 通用组件
- 首批支持：用户列表、操作日志、登录日志的导出

### 1.4 增强审计日志（数据变更追踪）
- `SysActionLog` 增加 `beforeData`、`afterData`、`module` 字段
- 增强 `ActionInterceptor`：PATCH/PUT/DELETE 前后快照
- 创建 `@AuditTrack(entity)` 装饰器标注需要追踪的接口
- 前端操作日志增加"详情"弹窗，展示字段级 diff

---

## Phase 2：实时通信与通知

### 2.1 WebSocket 基础设施
- 安装 `@nestjs/websockets` + `@nestjs/platform-socket.io`
- 创建 `modules/ws/` 模块：JWT 认证的 Socket.IO Gateway
- 支持用户/角色/部门维度的 Room 加入
- 前端创建 `composables/useWebSocket.ts`，管理连接生命周期

### 2.2 在线用户管理
- Redis 存储在线用户集合 + Socket 映射
- 后端提供在线用户列表、在线人数接口
- 前端增加"在线用户"页面，支持强制下线
- Header 显示实时在线人数

### 2.3 系统广播与实时通知
- 公告模块增加广播接口，通过 WebSocket 实时推送
- Todo 创建时实时通知目标用户
- 定义事件枚举：NOTICE_NEW / TODO_NEW / FORCE_LOGOUT / BROADCAST
- Header 通知铃铛实时更新未读计数

---

## Phase 3：开发体验与代码质量

### 3.1 代码规范
- 根目录添加 husky + lint-staged，pre-commit 自动格式化
- 后端 ESLint：强制 `import type`、禁止 `console`、捕获未处理 Promise
- 前端 ESLint：组件 PascalCase、表单 clearable/filterable 规则
- TypeScript 严格模式：`noUncheckedIndexedAccess`

### 3.2 测试基础设施
- 后端：创建 Prisma/Redis mock 工厂 + `app-tester.ts` 测试工具类
- 编写参考测试：sys-user.service.spec.ts、auth.service.spec.ts
- 前端：创建 `test-utils/render.ts` + mock-server 工具
- 编写参考组件测试和 composables 测试
- 目标覆盖率 80%+

## Phase 4：运维与监控

> 依赖 Phase 1 的限流和审计基础。

### 4.1 API 性能统计
- 新增 `ApiPerformance` 模型，记录 method/path/statusCode/duration
- 批量写入（缓冲 50 条或 1 秒刷新），避免性能开销
- 提供 P50/P95/P99 统计、慢接口排行、错误率分析接口
- 前端性能监控仪表板：总请求数、平均响应时间、P95 延迟、慢接口列表

### 4.2 慢 SQL 日志
- 增强 `PrismaConfigService`：订阅 Prisma query 事件
- 超过阈值（默认 500ms）的查询记录到 `SlowQueryLog` 表
- 前端展示：SQL 文本、耗时（颜色编码）、模型名、时间轴过滤

### 4.3 服务器监控
- 创建 `modules/monitor/server/` 模块
- 提供 CPU / 内存 / 磁盘 / 运行时信息接口
- 前端仪表板：仪表图展示 CPU/内存使用率，支持自动刷新

### 4.4 定时任务管理
- 安装 `@nestjs/schedule`，创建 `modules/task/` 模块
- 内置任务：清理过期缓存、清理旧日志、清理临时文件
- `SysScheduledTask` 模型存储任务配置和执行状态
- 前端任务管理页面：手动触发、启用/禁用、执行日志

---

## Phase 5：高级数据权限与安全

> 依赖 Phase 1 的 Guard 模式。

### 5.1 数据权限（数据范围）
- `SysRole` 增加 `dataScope` 字段：all / dept / dept_and_children / self / custom
- 创建 `SysRoleDept` 联结表支持 custom 模式
- 创建 `DataScopeGuard`：根据角色 dataScope 自动注入 Prisma where 条件
- 前端角色编辑增加数据范围选择器和部门树勾选

### 5.2 安全加固
- 账户锁定：连续登录失败 5 次锁定 30 分钟
- 密码策略：密码过期天数、最小长度配置
- 并发会话控制：限制每用户最大会话数，超出自动踢出最旧会话
- 前端：锁定提示、强制改密弹窗、会话管理页

---

## 依赖关系

```
Phase 1 (基础)  ←→  Phase 2 (实时)     Phase 3 (开发体验)
     ↓                   ↓
Phase 4 (监控)                     Phase 5 (安全)
```

Phase 1/2/3 相互独立可并行，Phase 4 依赖 1+2，Phase 5 依赖 1。

## 实施约定

- 每个功能严格遵循 CLAUDE.md 中的 TDD 流程：Schema → Red → Green → Refactor
- 后端模块路径：`apps/server/src/modules/{module}/`
- 前端页面路径：`apps/web/src/views/{module}/`
- 新增 Redis key 统一在 `redisKey.constant.ts` 定义
- 分页继承 `PaginationDto`，响应格式 `{ list, total }`
- 字典表替代硬编码枚举

## 进度跟踪

| Feature | 状态 |
|---------|------|
| 1.1 接口限流 | ✅ 已完成 |
| 1.2 健康检查 | ✅ 已完成 |
| 1.3 Excel 导出 | ✅ 已完成（导入不做） |
| 1.4 增强审计日志 | ⏸ 暂缓 |
| 2.1 WebSocket 基础 | ⬜ 待开始 |
| 2.2 在线用户管理 | ⬜ 待开始 |
| 2.3 系统广播通知 | ⬜ 待开始 |
| 3.1 代码规范 | ⬜ 待开始 |
| 3.2 测试基础设施 | ⬜ 待开始 |
| 4.1 API 性能统计 | ⬜ 待开始 |
| 4.2 慢 SQL 日志 | ⬜ 待开始 |
| 4.3 服务器监控 | ⬜ 待开始 |
| 4.4 定时任务管理 | ⬜ 待开始 |
| 5.1 数据权限 | ⬜ 待开始 |
| 5.2 安全加固 | ⬜ 待开始 |
