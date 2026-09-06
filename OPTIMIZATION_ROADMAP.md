# nest-vue-admin 优化路线图

本文档用于记录项目优化计划、执行进度与修复结论。

使用方式：
- 每个优化项开始前，将状态改为 `进行中`
- 修复完成后，将状态改为 `已完成`
- 每次完成一个优化项，在文末“修复记录”中追加一条记录
- 如需拆分子任务，可直接在对应优化项下补充说明

## 状态说明

| 状态 | 说明 |
|------|------|
| 待处理 | 尚未开始 |
| 进行中 | 正在修复 |
| 已完成 | 已修复并验证 |
| 暂缓 | 暂不处理，等待进一步决策 |

## 总体目标

1. 先修复会影响实际使用的稳定性问题
2. 再统一配置、文档和工程化体验
3. 最后补齐开源协作与长期维护能力

---

## 第一阶段：稳定性与关键缺陷

目标：优先修复影响登录、鉴权、路由和基础配置的真实问题。

| 优先级 | 状态 | 优化项 | 说明 | 相关位置 |
|------|------|------|------|------|
| P0 | 已完成 | 修复前端 token 刷新队列挂起问题 | `401` 并发刷新失败时，排队请求可能一直 pending | `apps/web/src/utils/request.ts` |
| P0 | 已完成 | 给路由守卫补异常兜底 | 用户信息或路由接口失败时，避免页面卡死或导航中断 | `apps/web/src/router/guard.ts` |
| P0 | 已完成 | 防止动态路由重复注册 | 避免重复登录、刷新后重复 `addRoute` 导致状态异常 | `apps/web/src/stores/modules/user.ts` |
| P0 | 已完成 | 验证码配置改为真实读取环境变量 | 当前已定义 `CAPTCHA_SIZE/WIDTH/HEIGHT`，但生成逻辑仍写死 | `apps/server/src/modules/auth/auth.service.ts` |

### 第一阶段验收标准

- token 过期后，并发请求不会卡住
- 登录、刷新、退出重登流程不会重复注册路由
- 鉴权相关接口失败时，前端能正确回退到登录态
- 修改验证码配置后，实际生成效果能同步变化

---

## 第二阶段：配置统一与接入体验

目标：降低新用户首次启动和理解项目的成本。

| 优先级 | 状态 | 优化项 | 说明 | 相关位置 |
|------|------|------|------|------|
| P1 | 已完成 | 统一 README、默认端口和环境变量说明 | 修正文档与实际配置不一致的问题 | `README.md` `apps/server/.env.example` |
| P1 | 已完成 | 补齐根目录 monorepo 常用脚本 | 增加统一的 `dev/build/lint/test` 入口 | `package.json` |
| P1 | 已完成 | 增加本地开发最短路径文档 | 明确安装、建库、迁移、seed、启动步骤 | `README.md` |
| P1 | 已完成 | 增加生产部署注意事项 | 包括默认密码、JWT、CORS、Redis、上传目录等 | `README.md` 或新增部署文档 |

### 第二阶段验收标准

- 新贡献者能按文档在 10 到 15 分钟内跑起项目
- 根目录提供统一开发命令
- 文档、环境变量示例和实际行为保持一致

---

## 第三阶段：工程化与测试底座

目标：提升可维护性，减少后续改动引入回归问题。

| 优先级 | 状态 | 优化项 | 说明 | 相关位置 |
|------|------|------|------|------|
| P1 | 已完成 | 强化后端全局参数校验策略 | 评估启用更严格的白名单校验策略 | `apps/server/src/common/common.module.ts` |
| P1 | 已完成 | 明确 Redis 连接失败策略 | 决定启动失败还是自动降级到内存缓存 | `apps/server/src/common/common.module.ts` |
| P1 | 已完成 | 为前端请求层补关键测试 | 覆盖 refresh、重定向、锁屏放行等关键路径 | `apps/web/src/utils` |
| P1 | 已完成 | 增加认证主链路 e2e 或集成测试 | 覆盖登录、获取用户、获取路由、退出等流程 | `apps/server/test` `apps/web` |
| P2 | 已完成 | 清理仓库本地产物和忽略策略 | 防止 `dist`、`logs`、`uploads`、IDE 目录误提交 | 根目录与子项目配置 |

### 第三阶段验收标准

- 核心登录鉴权链路具备自动化测试
- 配置错误时系统反馈明确、行为可预期
- 仓库工作区更干净，贡献者体验更稳定

---

## 第四阶段：开源协作友好化

目标：让外部贡献者更容易理解规则并参与维护。

| 优先级 | 状态 | 优化项 | 说明 | 相关位置 |
|------|------|------|------|------|
| P2 | 已完成 | 增加 `CONTRIBUTING.md` | 说明开发流程、提交规范、目录约定 | 根目录 |
| P2 | 已完成 | 增加 issue 模板 | 区分 bug、feature、question | `.github/` |
| P2 | 已完成 | 增加 PR 模板 | 统一改动说明、测试说明、影响范围 | `.github/` |
| P2 | 已完成 | 增加模块开发指南 | 说明后端模块、前端页面、权限点、字典表规范 | 新增文档 |
| P2 | 待处理 | 补充版本记录策略 | 可选 `CHANGELOG.md` 或 release 约定 | 根目录 |

### 第四阶段验收标准

- 新贡献者知道如何提 issue、提 PR、补测试和加模块
- 项目规范不只体现在代码里，也体现在仓库文档里

---

## 建议执行顺序

1. 先完成第一阶段全部项目
2. 再处理第二阶段中的文档与脚本统一
3. 然后补第三阶段中的测试和配置治理
4. 最后再推进第四阶段的开源协作能力

---

## 首批建议 Issue

1. `fix(web): 修复 token 刷新失败时请求队列挂起`
2. `fix(web): 路由守卫增加异常兜底与登录态回退`
3. `fix(web): 防止动态路由重复注册`
4. `fix(server): 验证码配置改为读取环境变量`
5. `docs: 统一 README 与 .env.example 的端口和启动说明`
6. `chore(repo): 补齐 monorepo 根脚本 dev/build/lint/test`
7. `test: 为认证与路由初始化补关键测试`

---

## 修复记录

### 记录模板

```md
#### YYYY-MM-DD - 优化项名称
- 状态：已完成
- 改动概要：
- 影响文件：
- 验证方式：
- 备注：
```

### 历史记录

#### 2026-05-17 - 增加模块开发指南
- 状态：已完成
- 改动概要：新增 `docs/module-development.md`，按“开发前检查 -> 后端模块 -> 前端页面 -> 权限点与菜单联动 -> 字典表 -> 测试与提交”的顺序，补齐新增业务模块时的落地指南；内容覆盖目录与命名、Prisma schema、Controller/Service 分层、`service.ts` 分工、`v-auth` / `@RequirePermissions(...)`、字典表判断标准和最小交付清单。
- 影响文件：
  - `docs/module-development.md`
- 验证方式：执行 `sed -n '1,320p' docs/module-development.md`，确认章节完整且与 `AGENTS.md`、`CONTRIBUTING.md` 规范一致；执行 `test -f docs/module-development.md && rg -n '增加模块开发指南|2026-05-17 - 增加模块开发指南' OPTIMIZATION_ROADMAP.md`，确认文档存在且路线图状态与记录已同步。
- 备注：这份指南采用“规则 + 判断提示”的写法，不扩展成完整教程，优先解决新贡献者“不知道该改哪些位置、何时需要权限点和字典表”的问题。

#### 2026-05-17 - 增加 CONTRIBUTING.md、issue 模板与 PR 模板
- 状态：已完成
- 改动概要：新增根目录 `CONTRIBUTING.md`，将本地启动、目录约定、TDD 顺序、RBAC 权限、字典表和 PR 要求显式文档化；同时新增 `bug report`、`feature request`、`question` 三类 Issue 模板和统一 PR 模板，在提交入口收集复现信息、影响范围、验证方式以及 schema / 权限 / 字典 / 配置变更说明。
- 影响文件：
  - `CONTRIBUTING.md`
  - `.github/ISSUE_TEMPLATE/bug_report.md`
  - `.github/ISSUE_TEMPLATE/feature_request.md`
  - `.github/ISSUE_TEMPLATE/question.md`
  - `.github/pull_request_template.md`
- 验证方式：执行 `test -f CONTRIBUTING.md && test -f .github/ISSUE_TEMPLATE/bug_report.md && test -f .github/ISSUE_TEMPLATE/feature_request.md && test -f .github/ISSUE_TEMPLATE/question.md && test -f .github/pull_request_template.md`，确认文件已创建；执行 `sed -n '1,260p' CONTRIBUTING.md` 与 `sed -n '1,220p' .github/ISSUE_TEMPLATE/bug_report.md .github/ISSUE_TEMPLATE/feature_request.md .github/ISSUE_TEMPLATE/question.md .github/pull_request_template.md`，确认模板字段和仓库规范一致。
- 备注：这次采用“文档讲规则 + 模板收信息”的轻约束方案，优先降低贡献者理解成本，不引入更重的表单或提交校验机制。

#### 2026-05-17 - 清理仓库本地产物和忽略策略
- 状态：已完成
- 改动概要：补齐根目录 `.gitignore` 的递归忽略规则，让子项目里的 `.idea`、`.vscode`、`dist`、`logs`、`uploads`、`coverage`、`.DS_Store` 等本地产物也能统一被忽略；同时将已误跟踪的 `apps/web/.vscode/settings.json` 和 `apps/web/.vscode/extensions.json` 从 Git 索引移除，避免继续出现在提交中。
- 影响文件：
  - `.gitignore`
  - `apps/web/.vscode/settings.json`
  - `apps/web/.vscode/extensions.json`
- 验证方式：执行 `git check-ignore -v apps/server/.idea/workspace.xml apps/web/.idea/workspace.xml apps/server/logs/error apps/server/uploads/2026 apps/server/dist/main.js apps/web/dist apps/web/.vscode/settings.json apps/.DS_Store`，确认上述路径均命中新规则；执行 `git ls-files apps/web/.vscode/settings.json apps/web/.vscode/extensions.json` 无输出，确认 VS Code 本地配置已不再被跟踪。
- 备注：这次只移除了 Git 索引记录，没有删除本地 `.vscode` 文件，开发者个人编辑器配置仍保留在工作区。

#### 2026-05-17 - 强化后端全局参数校验策略
- 状态：已完成
- 改动概要：全局 `ValidationPipe` 在原有 `whitelist: true`、`transform: true` 基础上增加 `forbidNonWhitelisted: true`，请求体里出现 DTO 未声明字段时不再静默剥离，而是直接返回 `400`，让接口契约错误更早暴露。
- 影响文件：
  - `apps/server/src/common/common.module.ts`
  - `apps/server/src/common/common.module.spec.ts`
- 验证方式：执行 `pnpm --dir apps/server test -- common.module.spec.ts cache-options.factory.spec.ts auth.controller.spec.ts auth.service.spec.ts`，`4` 个测试套件、`23` 个用例通过。
- 备注：这是一次更严格的入参契约收口，若已有客户端额外透传字段，会从“被忽略”变为“明确返回 400”。

#### 2026-05-17 - 统一 README、默认端口和环境变量说明
- 状态：已完成
- 改动概要：将 `README.md` 中的后端默认端口改为 `3333`，将数据库示例改为与 `.env.example` 一致的 `nva`，并统一根目录启动说明与前端代理描述，消除文档和实际配置不一致的问题。
- 影响文件：
  - `README.md`
  - `apps/server/.env.example`
- 验证方式：执行 `rg -n "localhost:3000|nest-vue-admin|pnpm run dev|pnpm run build|pnpm run lint|pnpm run test|127.0.0.1:3333|localhost:5173" README.md`，确认旧端口和旧数据库示例已移除，新命令和当前端口已写入。
- 备注：本次对齐保持运行时配置不变，以文档对齐当前真实行为为主。

#### 2026-05-17 - 明确 Redis 连接失败策略
- 状态：已完成
- 改动概要：将缓存初始化逻辑抽到独立工厂，明确 `CACHE_MODE=redis` 时采用 fail-fast 策略；Redis 连接失败将直接抛错并阻止启动，`memory` 模式继续作为单机开发兜底。
- 影响文件：
  - `apps/server/src/common/cache/cache-options.factory.ts`
  - `apps/server/src/common/cache/cache-options.factory.spec.ts`
  - `apps/server/src/common/common.module.ts`
- 验证方式：执行 `pnpm --dir apps/server test -- cache-options.factory.spec.ts auth.controller.spec.ts auth.service.spec.ts`，`3` 个测试套件、`22` 个用例通过。
- 备注：这次策略选择的是“显式启用 Redis 就必须连通”，不做自动回落到内存缓存，避免生产环境静默降级。

#### 2026-05-17 - 增加认证主链路 e2e 或集成测试
- 状态：已完成
- 改动概要：新增 `AuthController` 集成测试，覆盖 `login -> userInfo -> routes -> logout` 主链路，并通过 `ResponseInterceptor` 验证统一响应包装；同时为 e2e 配置补充了 `@/` 路径别名映射，便于后续扩展服务端测试。
- 影响文件：
  - `apps/server/src/modules/auth/auth.controller.spec.ts`
  - `apps/server/test/jest-e2e.json`
- 验证方式：执行 `pnpm --dir apps/server test -- auth.controller.spec.ts auth.service.spec.ts`，`2` 个测试套件、`20` 个用例通过。
- 备注：当前执行环境下 socket 型 `supertest` e2e 不稳定，因此本次采用不依赖网络监听的控制器集成测试来覆盖认证主链路。

#### 2026-05-17 - 为前端请求层补关键测试
- 状态：已完成
- 改动概要：在 `request.spec.ts` 现有 `401 refresh` 队列回归用例基础上，新增“锁屏状态下业务请求拦截但 auth 请求放行”与“401 且没有 refreshToken 时直接清理登录态并跳转登录页”两条关键路径测试，补齐请求层回退行为覆盖。
- 影响文件：
  - `apps/web/src/utils/request.spec.ts`
- 验证方式：执行 `pnpm --dir apps/web test:run -- src/utils/request.spec.ts`，`6` 个测试文件、`33` 个用例通过。
- 备注：这次任务未修改 `request.ts` 生产逻辑，现有实现已满足行为，主要补的是回归测试覆盖面。

#### 2026-05-17 - 补齐根目录 monorepo 常用脚本
- 状态：已完成
- 改动概要：在根目录 `package.json` 增加统一的 `dev`、`start`、`build`、`lint`、`test` 脚本，分别透传到 `apps/server` 和 `apps/web`，降低新贡献者进入子目录分别执行命令的成本。
- 影响文件：
  - `package.json`
- 验证方式：执行 `node -e "const s=require('./package.json').scripts; for (const k of ['dev','start','build','lint','test']) console.log(k, s[k])"`，确认根脚本均存在且映射到前后端子应用。
- 备注：`dev` 使用 `apps/server` 的 `start:dev` 和 `apps/web` 的 `dev`，`test` 统一调用 server Jest 与 web Vitest 运行命令。

#### 2026-05-17 - 验证码配置改为真实读取环境变量
- 状态：已完成
- 改动概要：按 Superpowers 的调试与 TDD 流程将验证码生成逻辑改为读取 `captcha.size`、`captcha.width`、`captcha.height` 配置，不再硬编码 `4/200/40`。
- 影响文件：
  - `apps/server/src/modules/auth/auth.service.ts`
  - `apps/server/src/modules/auth/auth.service.spec.ts`
- 验证方式：执行 `pnpm --dir apps/server test -- auth.service.spec.ts`，`1` 个测试套件、`19` 个用例通过。
- 备注：新增回归测试覆盖“generateCaptcha 透传 captcha 配置”场景。

#### 2026-05-17 - 增加本地开发最短路径文档
- 状态：已完成
- 改动概要：在 `README.md` 增加从安装依赖、复制环境变量、创建数据库、迁移、seed 到根目录启动和登录验证的一条最短本地启动路径，并明确默认端口与本地缓存模式。
- 影响文件：
  - `README.md`
- 验证方式：执行 `rg -n "本地开发最短路径|pnpm i|cp apps/server/.env.example apps/server/.env|pnpm run db:m|pnpm run seed|pnpm run dev|admin / 123456|3333|5173|CACHE_MODE=memory" README.md`，关键步骤与默认端口均存在。
- 备注：文档默认按 `CACHE_MODE=memory` 描述首次本地启动，避免新贡献者在不需要 Redis 的场景下被额外依赖阻塞。

#### 2026-05-17 - 增加生产部署注意事项
- 状态：已完成
- 改动概要：新增独立部署文档，明确默认管理员密码、`JWT_SECRET`、CORS 当前全开放、Redis 模式、上传目录持久化、`UPLOAD_LOCAL_BASE_URL`、反向代理端口对齐、Swagger 开发态可见和 `IS_DEMO` 等生产风险点，并在 `README.md` 增加入口。
- 影响文件：
  - `README.md`
  - `docs/deployment.md`
- 验证方式：执行 `test -f docs/deployment.md; echo $? && rg -n "默认管理员密码|JWT_SECRET|CACHE_MODE|REDIS_HOST|app.enableCors|UPLOAD_LOCAL_BASE_URL|APP_PORT|Swagger|IS_DEMO" docs/deployment.md && rg -n "生产部署|docs/deployment.md" README.md`，部署文档和 README 入口均存在。
- 备注：文档内容基于当前仓库真实实现，不额外假设尚未落地的部署开关。

#### 2026-05-17 - 防止动态路由重复注册
- 状态：已完成
- 改动概要：按 Superpowers 的调试与 TDD 流程为用户 store 增加动态路由初始化状态；`renderRoutes()` 首次成功拉取菜单后才注册动态路由，后续重复执行直接复用现有状态；`logout()` 时重置初始化标记，确保重新登录后仍可重新注册路由。
- 影响文件：
  - `apps/web/src/stores/modules/user.ts`
  - `apps/web/src/stores/modules/user.spec.ts`
- 验证方式：执行 `pnpm --dir apps/web test:run -- src/utils/request.spec.ts src/router/guard.spec.ts src/stores/modules/user.spec.ts`，`6` 个测试文件、`31` 个用例通过。
- 备注：新增回归测试覆盖“重复调用 renderRoutes 不重复注册”与“logout 后再次登录可重新注册”两个场景。

#### 2026-05-17 - 给路由守卫补异常兜底
- 状态：已完成
- 改动概要：按 Superpowers 的调试与 TDD 流程为路由守卫补充异常兜底；当 `getCurrentUser()` 或 `renderRoutes()` 失败时，统一清理本地登录态并回退到登录页，避免导航 Promise 直接 reject 导致页面卡死。
- 影响文件：
  - `apps/web/src/router/guard.ts`
  - `apps/web/src/router/guard.spec.ts`
- 验证方式：执行 `pnpm --dir apps/web test:run -- src/router/guard.spec.ts src/utils/request.spec.ts`，`5` 个测试文件、`29` 个用例通过。
- 备注：新增回归测试覆盖“获取用户信息失败”和“渲染动态路由失败”两个守卫异常分支。

#### 2026-05-17 - 修复前端 token 刷新队列挂起问题
- 状态：已完成
- 改动概要：按 Superpowers 的调试与 TDD 流程重做 `401` 刷新逻辑；将等待队列从单纯成功回调改为带 `resolve/reject` 的请求队列；为首个失败请求和排队重试请求都补充 `_retry` 防重试标记；刷新失败时统一 reject 所有排队请求并清理登录态。
- 影响文件：
  - `apps/web/src/utils/request.ts`
  - `apps/web/src/utils/request.spec.ts`
- 验证方式：执行 `pnpm --dir apps/web test:run -- src/utils/request.spec.ts`，`4` 个测试文件、`27` 个用例通过。
- 备注：新增回归测试覆盖“refresh 失败时排队请求全部 reject”与“排队请求重试后再次 401 不触发二次 refresh”两个挂起边界。
