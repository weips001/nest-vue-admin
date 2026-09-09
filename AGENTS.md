# nest-vue-admin Agent 开发规范

本文件是本仓库面向 Agent 的唯一规范来源。`CLAUDE.md` 仅作为 Claude Code 的兼容入口，不要在其中复制或维护规则。

## 1. 执行原则

- 用户当前请求优先于本文件；本文件优先于个人习惯或通用模板。
- 先读后改：开始前检查 `git status`，阅读相关源码、测试和文档，确认现有实现与调用关系。
- 遵循现有模式，优先做最小必要改动，不顺手重构无关代码。
- 保留用户已有改动，不使用 `git reset --hard`、`git checkout --` 等命令覆盖工作区内容。
- 所有文本文件使用 UTF-8 编码并保留项目既有换行风格；不要把密钥、令牌或完整环境变量内容写入代码、日志或文档。
- 规则与现状冲突时，先以源码和测试为依据定位差异，再向用户说明，不要静默扩大改动范围。

## 2. 标准工作流

根据任务规模选择流程，不要为纯文档或机械性小改动虚构业务设计：

1. **理解**：确认改动范围（后端、前端、数据库、权限、缓存或工程配置），查找相近实现和现有测试。
2. **方案**：涉及数据库结构、公开接口、权限模型或跨模块行为时，先说明方案、影响和风险；存在会改变实现方向的歧义时再向用户确认。
3. **实现**：按现有目录和命名约定完成最小改动；新增行为同步补测试和必要文档。
4. **验证**：先运行与改动最相关的测试，再根据影响范围运行类型检查、Lint、构建或完整测试。
5. **交付**：说明改了什么、验证了什么、未能验证什么，以及需要用户关注的迁移或配置步骤。

涉及数据库或完整业务模块时，按以下 TDD 顺序推进，并在每阶段完成后汇报结果；仅在用户要求逐阶段确认时暂停等待：

1. **Schema**：修改 Prisma Schema，并列出测试用例大纲。
2. **Red**：先编写能描述新行为的失败测试（必要时 Mock Prisma/Redis）。
3. **Green**：实现满足测试的最小代码。
4. **Refactor**：整理结构、消除重复，并补充确有必要的注释。

## 3. 项目结构与接口分层

```text
apps/server/src/modules/{module}/       # 后端业务模块
apps/server/prisma/schema.prisma         # Prisma Schema
apps/web/src/views/{module}/             # 前端页面及模块 service.ts
apps/web/src/api/auth.ts                 # 登录、用户信息、路由、权限等全局接口
```

- 后端模块目录使用 `kebab-case`，核心文件通常为 `{module}.module.ts`、`{module}.controller.ts`、`{module}.service.ts`。
- 后端 DTO 放在模块的 `dto/` 目录，通常命名为 `req-{module}.dto.ts`。
- 前端页面文件使用 `camelCase.vue`，组件文件使用 `PascalCase.vue`。
- `apps/web/src/api/auth.ts` 只放全局基础接口；业务 CRUD 放在对应页面目录的 `service.ts`。
- 新增文件前先查找相近模块，保持导入、响应、错误处理和组件组织方式一致。

## 4. 后端约定

### 分层与接口

- Controller 负责路由、参数接收、Swagger 元数据和调用 Service，直接返回 Service 结果；业务判断、事务、缓存和数据拼装放在 Service。
- 业务错误统一抛出 `ApiException`，不要在 Controller 中重复包装全局响应。
- 分页请求 DTO 继承 `PaginationDto`，使用已有的 `current`、`pageSize`、`skip`、`take` 字段。
- 分页响应统一为 `{ list: T[], total: number }`。
- Controller 按项目现有方式使用 `@ApiTags`、`@ApiOperation` 等装饰器；DTO 字段补充 `@ApiProperty` 或 `@ApiPropertyOptional`，并保留必要的校验装饰器。

### 数据库、缓存与错误

- 数据库结构变更只通过 Prisma Schema 和 Prisma migration 管理，不手工修改数据库或已提交的迁移文件。
- Prisma 字段使用 `camelCase`，新增或修改模型字段时补充 `///` 注释；迁移前确认是否需要数据回填、索引和回滚说明。
- Redis key 统一定义在 `apps/server/src/common/constants/redisKey.constant.ts` 的 `REDIS_KEYS` 中，并使用 `generateRedisKey(...)` 生成带参数的 key。
- 只有确有复用和性能需求时才引入缓存；修改写操作时同步评估缓存失效，避免脏数据。
- 不吞掉异常，不用宽泛的 `catch` 隐藏失败原因；错误信息应能帮助调用方定位问题，但不能泄露敏感信息。

## 5. 权限与字典

- RBAC 关系为用户、角色、菜单三层。
- 前端受控操作使用 `v-auth="'sys:user:add'"`；后端受保护接口使用 `@RequirePermissions('sys:user:add')`。
- 前后端权限标识必须一致。仅隐藏前端按钮而不保护后端接口不算完成权限控制。
- 新增、编辑、删除、导入、导出、审核、启停等操作都要评估菜单、按钮和接口权限是否成套更新。

### 数据权限

- 数据权限通过 Controller 的 `@User()` 获取当前用户，不使用 `AsyncLocalStorage` 或隐式全局用户上下文。涉及数据权限的接口必须把完整的 `CurrentUserType` 传给 Service。
- `CurrentUserType.dataScope` 只保存权限语义上下文，不直接保存 Prisma `where`：

  ```ts
  type DataScopeContext = {
    scope: DataScopeEnum;
    deptIds: string[];
  };
  ```

- 数据权限范围由 `DataScopeService.buildWhere(currentUser)` 统一解析，业务模块不要重复实现 `ALL`、`SELF`、`DEPT`、`DEPT_AND_CHILD`、`CUSTOM` 的判断：
  - `ALL`：返回 `{}`。
  - `SELF`：按 `createById = currentUser.id` 过滤。
  - `DEPT`、`DEPT_AND_CHILD`、`CUSTOM`：按 `deptId in currentUser.dataScope.deptIds` 过滤。
  - 未知范围默认按 `SELF` 处理；没有可用部门 ID 时必须拒绝访问，不得放宽为全量数据。
- 业务查询条件和数据权限条件必须使用 `AND` 取交集，并在业务 Service 中显式组合：

  ```ts
  const where = {
    AND: [queryWhere, this.dataScopeService.buildWhere(currentUser)],
  };
  ```

  不要使用 `Object.assign` 把权限条件直接写入业务查询，也不要让权限条件覆盖用户传入的筛选条件。
- 详情、更新、删除和选项查询同样必须应用数据权限。更新或删除前先用带数据权限的条件查询目标记录；查不到时按资源不存在处理，不能直接按客户端传入的 ID 写入或删除。
- 资源的归属字段按模型实际语义选择：有部门归属的资源使用 `deptId`，有创建人归属的资源使用 `createById`。`SysTodo.userId` 表示待办目标用户，不等同于创建人，不能用它替代 `createById`。
- `createBy` 仅作为历史审计或展示字段保留，`createById` 才是数据权限过滤字段。`createById` 必须由服务端根据当前用户写入，不能信任 DTO 或客户端传值。
- 当前已具备创建人 ID 的资源包括 `SysUser`、`SysPost`、`FileUpload`、`SysNotice`、`SysTodo` 和 `SysJob`。只有真正支持对应归属字段的资源才接入数据权限，不要为了统一而给菜单、字典、权限等系统资源强行套用。
- 数据库新增数据权限字段时使用可空字段兼容历史数据，并通过 Prisma migration 回填。历史 `createBy` 回填优先匹配用户 ID、再匹配 `userName`，最后只匹配唯一的 `nickName`；重复昵称不得自动归属到任意用户。
- 数据权限改动必须覆盖列表、详情、选项、更新、删除等越权路径，并补充 `ALL`、`SELF`、部门范围、空部门范围和越权目标的 Service 测试。

- 状态、类型、分类、来源、等级、启用禁用等可配置业务枚举必须优先使用字典表；只有一次性且纯技术性的本地常量才保留在代码中。
- 不要让前后端分别维护两套相同的业务枚举；新增字典项前先检查已有字典类型。

## 6. 前端约定

- 使用 Vue 3 Composition API 和 `<script setup>`，遵循现有组件和组合式函数模式。
- 从 Pinia store 解构状态时使用 `storeToRefs`，避免模板中出现多层 store 访问。
- 适用的表单控件增加 `clearable`；有选项筛选需求的下拉框增加 `filterable`。
- `textarea` 使用字数统计；字符串输入设置与 Prisma Model 或 DTO 约束一致的最大长度，必要时显示 `show-word-limit`。
- 样式统一使用 CSS/SCSS 类控制，避免内联 `style`；优先复用现有变量、组件和布局类。
- 对象更新优先使用扩展运算符或 `Object.assign`，避免无必要的逐字段赋值。
- 请求失败、加载中、空数据、无权限和重复提交等状态要与现有页面保持一致；不要只实现成功路径。

## 7. 测试与验证

按改动范围选择最低必要验证，不要声称未运行的命令已通过：

```bash
pnpm --filter server run test
pnpm --filter web run test:run
pnpm --filter web run type-check
pnpm run lint
pnpm run build
pnpm run test
```

- 后端业务逻辑优先补 Service 单测；涉及 Controller、权限、认证、缓存或配置链路时补对应回归测试。
- 前端请求层、路由守卫、Pinia 状态和关键交互发生变化时补 Vitest 测试。
- 数据库、权限、缓存、文件上传和请求链路改动必须特别检查异常路径和边界条件。
- `lint` 脚本可能带有自动修复行为；执行前确认工作区状态，验证后检查 diff，避免把无关格式化混入提交。

## 8. 文档与交付

- 环境准备和常用命令见 [README.md](README.md) 和 [CONTRIBUTING.md](CONTRIBUTING.md)。
- 新增或改造完整业务模块时，参考 [docs/module-development.md](docs/module-development.md)。
- 影响部署、环境变量、上传或缓存行为时，检查并更新 [docs/deployment.md](docs/deployment.md)。
- 如果改动对应 [OPTIMIZATION_ROADMAP.md](OPTIMIZATION_ROADMAP.md) 的条目，同步更新状态和记录。
- 最终说明应包含：改动摘要、关键文件、验证命令及结果、未解决问题和必要的后续操作。
