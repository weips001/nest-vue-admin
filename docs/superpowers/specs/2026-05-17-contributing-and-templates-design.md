# Contributing And Templates Design

**日期**: 2026-05-17

## 背景

`nest-vue-admin` 已完成前三个阶段的稳定性、配置统一和测试底座优化，但第四阶段“开源协作友好化”尚未落地。当前仓库缺少：

- 根目录 `CONTRIBUTING.md`
- Issue 模板
- PR 模板

这会导致外部贡献者只能从 `README.md`、`OPTIMIZATION_ROADMAP.md` 和本地开发约束中自行拼装流程，容易遗漏目录约定、TDD 要求、RBAC 权限规则、字典表使用规范以及提交前验证要求。

## 目标

本轮交付聚焦一个子项目：补齐贡献协作文档和模板，降低贡献者理解成本，并把当前仓库已存在的真实规则显式写出来。

具体目标：

1. 新增 `CONTRIBUTING.md`，说明如何开始贡献、如何本地验证、如何遵守仓库约定
2. 新增 bug、feature、question 三类 Issue 模板，提升问题描述完整度
3. 新增统一 PR 模板，收集改动摘要、验证证据和影响范围
4. 更新 `OPTIMIZATION_ROADMAP.md`，记录该轮协作文档治理已完成

## 非目标

本轮不处理以下内容：

- 不引入 GitHub issue forms JSON/YAML 方案
- 不新增分支命名强校验或 commit lint
- 不补充 `CONTRIBUTING.md` 之外的额外治理文档，例如 `CHANGELOG.md`
- 不修改现有业务代码或测试代码

## 方案对比

### 方案 A：单文件集中式

将大部分规范全部写入 `CONTRIBUTING.md`，Issue/PR 模板仅保留最少字段。

优点：

- 入口单一
- 维护文件少

缺点：

- 表单侧约束弱
- 贡献者发起 issue 或 PR 时容易跳过关键信息

### 方案 B：模板驱动式

`CONTRIBUTING.md` 只保留概要，更多规则压到 issue/PR 模板中。

优点：

- 填写动作有强引导
- 能快速提升信息收集完整度

缺点：

- 文档背景不足
- 模板会承载过多上下文，阅读体验差

### 方案 C：平衡式（采用）

`CONTRIBUTING.md` 负责讲清规则和背景，Issue/PR 模板负责在提交入口收集关键信息。

优点：

- 规则可读性和执行力平衡
- 能承接现有 `AGENTS.md`、`README.md`、`OPTIMIZATION_ROADMAP.md` 中的真实约束
- 维护成本低于重表单或多层治理方案

缺点：

- 仍需要维护 4 到 5 个协作文档文件

## 信息架构

### 1. `CONTRIBUTING.md`

文档使用中文，延续当前仓库文档风格，控制在可快速扫读的篇幅。建议章节如下：

1. 开始贡献前
2. 本地开发与测试
3. 代码与目录约定
4. 提 Issue 规范
5. 提 PR 规范

章节内容要求：

- 引导贡献者优先阅读 `README.md`
- 指出优化项应同步更新 `OPTIMIZATION_ROADMAP.md`
- 明确后端、前端目录约定
- 明确 RBAC 权限写法和字典表约束
- 明确 TDD 顺序和最少测试要求
- 明确前端表单、Pinia、样式、对象操作等仓库规范
- 明确 PR 需要写改动摘要、影响范围和验证方式

### 2. `.github/ISSUE_TEMPLATE/bug_report.md`

用途：收集可复现缺陷信息。

字段要求：

- 问题描述
- 复现步骤
- 期望结果
- 实际结果
- 影响范围
- 运行环境
- 补充信息

提示要求：

- 引导说明是否与登录、权限、路由、缓存、上传、配置相关
- 提醒尽量提供日志、截图或报错信息

### 3. `.github/ISSUE_TEMPLATE/feature_request.md`

用途：收集需求背景和边界，减少模糊功能请求。

字段要求：

- 目标与背景
- 当前痛点
- 期望方案
- 影响范围
- 补充说明

提示要求：

- 询问是否涉及 RBAC 权限点
- 询问是否涉及字典表、接口、数据库结构或环境变量调整

### 4. `.github/ISSUE_TEMPLATE/question.md`

用途：承接使用、接入、配置、开发规范类问题。

字段要求：

- 问题背景
- 已尝试内容
- 当前卡点
- 相关文件或命令
- 补充信息

### 5. `.github/pull_request_template.md`

用途：统一 PR 提交流程和验证信息。

字段要求：

- 改动摘要
- 影响范围
- 验证方式
- checklist

checklist 需要覆盖：

- 是否已阅读相关规范
- 是否已运行对应测试或说明未运行原因
- 是否涉及 Prisma schema
- 是否涉及权限点
- 是否涉及字典表
- 是否涉及环境变量或部署文档
- 是否已更新文档
- 前端改动是否附截图或说明不适用

## 文案风格

- 全部文档使用中文
- 语气直接、工程化，避免空泛措辞
- 以“告诉贡献者下一步怎么做”为中心，不写成长篇制度说明
- 模板字段尽量简洁，但必须足以支撑问题定位和代码审查

## 实施范围

预计新增或修改文件：

- 新增 `CONTRIBUTING.md`
- 新增 `.github/ISSUE_TEMPLATE/bug_report.md`
- 新增 `.github/ISSUE_TEMPLATE/feature_request.md`
- 新增 `.github/ISSUE_TEMPLATE/question.md`
- 新增 `.github/pull_request_template.md`
- 更新 `OPTIMIZATION_ROADMAP.md`

## 验证策略

本轮属于仓库协作文档治理，不需要执行业务单元测试。验证重点如下：

1. 文件路径存在且命名符合 GitHub 约定
2. Markdown 结构可读，没有占位符或空章节
3. 文档内容与 `README.md`、`AGENTS.md`、`OPTIMIZATION_ROADMAP.md` 中现有规范一致
4. 路线图状态和修复记录同步更新

## 风险与取舍

- 风险：文档如果写得过重，会增加贡献门槛
- 风险：文档如果写得过轻，又无法真正沉淀仓库规则
- 取舍：采用“中文 + 平衡式 + 轻约束模板”，优先让贡献者少猜规则，而不是增加审批感

## 成功标准

- 外部贡献者能从 `CONTRIBUTING.md` 快速理解贡献流程
- 发起 Issue 时能区分 bug、feature、question 并提供必要上下文
- 发起 PR 时能按模板说明验证方式和影响范围
- `OPTIMIZATION_ROADMAP.md` 第四阶段对应项开始进入可执行状态
