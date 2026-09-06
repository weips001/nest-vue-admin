# 贡献指南

感谢你为 `nest-vue-admin` 做贡献。本文档用于说明本仓库的基础贡献流程、开发约定和提交流程。

## 开始之前

- 开始开发前先阅读 [README.md](README.md)，按其中的“本地开发最短路径”完成环境准备
- 如果本次改动对应 [OPTIMIZATION_ROADMAP.md](OPTIMIZATION_ROADMAP.md) 中的优化项，请同步更新状态和修复记录
- 如果改动涉及生产配置、默认账号、上传、缓存或部署行为，请同时检查 [docs/deployment.md](docs/deployment.md)

## 本地开发与测试

推荐最短启动方式：

```bash
pnpm i
cp apps/server/.env.example apps/server/.env
cd apps/server
pnpm run db:m
pnpm run seed
cd ../..
pnpm run dev
```

提交前请至少完成以下检查：

- 明确本次改动影响的是 `apps/server`、`apps/web` 还是根目录工程配置
- 运行与改动范围对应的测试或校验命令
- 如果没有运行测试，在 PR 中明确说明原因

常用根目录命令：

```bash
pnpm run dev
pnpm run build
pnpm run lint
pnpm run test
```

## 代码与目录约定

### 后端

- 技术栈：NestJS + Prisma + MySQL + Redis，使用 TypeScript 严格模式
- 业务模块目录：`apps/server/src/modules/{module}/`
- Controller 只负责路由分发，业务逻辑放在 Service
- 分页入参应继承 `PaginationDto`
- 业务异常统一使用 `ApiException`
- Redis key 需在 `common/constants/redisKey.constant.ts` 中定义
- Schema 变更通过 Prisma migrate 管理

### 前端

- 技术栈：Vue3 + Element Plus + Pinia，使用 Composition API 和 `<script setup>`
- 页面目录：`apps/web/src/views/{module}/`
- 全局基础接口放在 `apps/web/src/api/auth.ts`
- 业务模块接口放在 `apps/web/src/views/{module}/service.ts`
- 使用 `storeToRefs` 解构 Pinia 状态，避免模板中多层嵌套访问
- 样式优先使用 CSS/SCSS 类控制，避免内联 style
- 对象操作优先使用扩展运算符或 `Object.assign`

### RBAC 与字典表

- 前端按钮权限使用 `v-auth="'sys:user:add'"` 这类指令控制
- 后端接口权限使用 `@RequirePermissions('sys:user:add')`
- 状态、类型等枚举数据必须优先使用字典表，不要在代码中硬编码

### TDD 与质量要求

请遵循当前仓库约定的开发顺序：

1. Schema 定义
2. Red：先写失败测试
3. Green：最小实现通过测试
4. Refactor：整理结构并补充必要注释

如果本次改动包含 bugfix、鉴权、路由、缓存、配置或请求链路调整，请优先补充回归测试。

### 前端表单规范

- 表单输入项优先增加 `clearable`
- 下拉框优先增加 `filterable`
- `textarea` 优先显示字数统计
- 字符串类型表单项应遵循 Prisma Model 中的长度定义

## 提 Issue

本仓库提供三类 Issue 模板：

- `Bug report`：提交可复现缺陷
- `Feature request`：提交功能建议
- `Question`：提交使用、配置或开发问题

提 Issue 时请尽量提供完整上下文，尤其是以下信息：

- 复现步骤或使用场景
- 实际结果和期望结果
- 相关模块、页面、接口或命令
- 报错日志、截图或录屏（如适用）

## 提 PR

PR 请聚焦单一主题，避免把无关改动混在一起。

提交 PR 时请至少写清：

- 改动摘要
- 影响范围
- 验证方式

如果改动涉及以下内容，也请在 PR 中明确说明：

- Prisma schema 或数据库结构
- 新增或修改权限点
- 新增或修改字典表数据
- 新增环境变量或部署行为变化
- 文档同步更新情况

如果是前端界面改动，请附截图或说明不适用；如果是后端改动，请补充接口或测试说明。
