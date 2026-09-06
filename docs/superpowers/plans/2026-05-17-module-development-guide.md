# Module Development Guide Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新增模块开发指南文档，说明如何按仓库规范新增或改造一个业务模块，并同步更新路线图记录。

**Architecture:** 采用“实战流程型 + 规范/决策提示型”文档结构。`docs/module-development.md` 负责串联开发前检查、后端模块、前端页面、权限点、字典表、测试与提交流程；`OPTIMIZATION_ROADMAP.md` 负责同步状态和修复记录。

**Tech Stack:** Markdown

---

### Task 1: 落地模块开发指南

**Files:**
- Create: `docs/module-development.md`
- Test: `AGENTS.md`
- Test: `CONTRIBUTING.md`
- Test: `README.md`

- [ ] **Step 1: 编写模块开发指南**

在 `docs/module-development.md` 中写入以下结构和内容：

```md
# 模块开发指南

## 适用范围
- 面向新增或改造业务模块

## 开发前检查
- 是否复用已有模块
- 是否改 schema
- 是否新增权限点
- 是否需要字典表
- 是否需要同步文档

## 后端模块开发
- 模块目录、命名、DTO、Prisma migrate
- Controller / Service 分层
- PaginationDto、Swagger、ApiException、Redis key 规范

## 前端页面开发
- 页面目录、service.ts、api/auth.ts 分工
- 命名规范
- v-auth、表单规范、storeToRefs、样式规范

## 权限点与菜单联动
- 什么时候需要权限点
- 前后端权限点一致性
- 菜单、按钮、接口权限联动

## 字典表使用规则
- 哪些场景必须用字典表
- 什么时候新增字典项或字典类型

## 测试与提交流程
- TDD 顺序
- 后端、前端最低测试要求
- 文档和路线图同步要求

## 最小模块清单
- Schema / DTO / Service / Controller / 页面 / service.ts / 权限 / 字典 / 测试 / 文档
```

- [ ] **Step 2: 人工校对模块开发指南**

Run: `sed -n '1,320p' docs/module-development.md`
Expected: 章节完整、文案简洁、规则与 `AGENTS.md`/`CONTRIBUTING.md` 一致，无占位词

### Task 2: 更新路线图与验证

**Files:**
- Modify: `OPTIMIZATION_ROADMAP.md`
- Test: `docs/module-development.md`

- [ ] **Step 1: 更新路线图状态和记录**

将 `OPTIMIZATION_ROADMAP.md` 中的 `增加模块开发指南` 标记为 `已完成`，并追加修复记录，说明文档目的、影响文件与验证方式。

- [ ] **Step 2: 运行最终验证**

Run: `test -f docs/module-development.md && rg -n '增加模块开发指南|2026-05-17 - 增加模块开发指南' OPTIMIZATION_ROADMAP.md`
Expected: 指南文件存在，路线图条目状态已更新，历史记录可检索

- [ ] **Step 3: 检查工作区摘要**

Run: `git status --short docs/module-development.md OPTIMIZATION_ROADMAP.md docs/superpowers/specs/2026-05-17-module-development-guide-design.md docs/superpowers/plans/2026-05-17-module-development-guide.md`
Expected: 仅出现本轮模块开发指南相关新增或修改
