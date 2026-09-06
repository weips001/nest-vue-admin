# nest-vue-admin 开发规范

## 技术栈
- 后端: NestJS + Prisma + MySQL + Redis (TS 严格模式)
- 前端: Vue3 + Element Plus + Pinia (Composition API + `<script setup>`)

## RBAC 权限
- 用户-角色-菜单三层模型
- 前端: `v-auth="'sys:user:add'"` 指令控制按钮
- 后端: JWT Guard + `@RequirePermissions('sys:user:add')` 装饰器

## 目录约定
```
apps/server/src/modules/{module}/     # 后端业务模块
apps/web/src/views/{module}/          # 前端页面 + service.ts
apps/web/src/api/auth.ts              # 全局接口（登录、路由、权限）
```

**接口分层：**
- `api/auth.ts`: 全局基础接口（登录、用户信息、路由、权限）
- `views/{module}/service.ts`: 业务模块接口（CRUD）

## 命名约定
| 类型 | 格式 | 示例 |
|------|------|------|
| 后端模块目录 | kebab-case | sys-user/ |
| 后端模块文件 | {目录名}.module/controller/service.ts | sys-user.service.ts |
| DTO 文件 | req-{目录名}.dto.ts | req-sys-user.dto.ts |
| 前端页面 | camelCase.vue | user.vue |
| 前端组件 | PascalCase.vue | UserDialog.vue |

## 编码规范

### 分层
- Controller: 仅路由分发，直接 return 数据（全局 Interceptor 统一包裹响应）
- Service: 所有业务逻辑

### 分页
- 入参 DTO 继承 `PaginationDto`（已含 current/pageSize/skip/take）
- 响应格式: `{ list: T[], total: number }`

### Swagger
- Controller: 只用 `@ApiTags` + `@ApiOperation`
- DTO: 用 `@ApiProperty`/`@ApiPropertyOptional` 定义字段

### 错误处理
```typescript
throw new ApiException('错误信息');  // 业务错误
```

### 缓存
- Redis key 在 `common/constants/redisKey.constant.ts` 的 `REDIS_KEYS` 中定义
- 使用 `generateRedisKey(REDIS_KEYS.XXX, id)` 生成带参数的 key

### 数据库
- Schema 变更通过 Prisma migrate
- 字段 camelCase，必须写 `/// 注释`

## 开发流程 (TDD)

严格按顺序执行，**每阶段需确认后再进入下一阶段**：

1. **Schema 定义** → Prisma Schema + 测试用例大纲
2. **Red** → 编写失败测试（Mock Prisma/Redis）
3. **Green** → 最小实现代码通过测试
4. **Refactor** → 优化结构 + 关键注释

## 字典表使用

当需要状态、类型等枚举数据时，**必须使用字典表**，不要在代码中硬编码。

## 前端
1. 表单元素增加clearable属性，下拉框数据增加filterable，textarea的时候增加字数显示，
2. 当类型为字符串的时候，应该增加长度的限制，长度为prisma Model中的长度定义
3. 使用 `storeToRefs` 解构 Pinia store 的状态，避免在模板中多层嵌套访问（如 `userStore.currentUser` → `currentUser`）
4. 样式统一使用 CSS/SCSS 类控制，避免内联 style，便于维护
5. 对象操作优先使用扩展运算符 `...obj` 或 `Object.assign`，避免逐字段赋值
