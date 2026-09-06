# Contributing And Templates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为仓库补齐 `CONTRIBUTING.md`、Issue 模板、PR 模板，并同步更新路线图中的开源协作项。

**Architecture:** 采用“文档讲规则 + 模板收信息”的平衡式方案。`CONTRIBUTING.md` 承接当前 `README.md`、`AGENTS.md` 和路线图中的真实开发约束；`.github` 模板在提 issue 和 PR 的入口处收集必要上下文，避免协作信息缺失。

**Tech Stack:** Markdown, GitHub Issue Template frontmatter, GitHub Pull Request Template

---

### Task 1: 落地贡献指南

**Files:**
- Create: `CONTRIBUTING.md`
- Test: `README.md`
- Test: `AGENTS.md`

- [ ] **Step 1: 编写贡献指南内容**

在 `CONTRIBUTING.md` 中落地以下结构和内容：

```md
# 贡献指南

## 开始之前
- 先阅读 `README.md`
- 涉及优化任务时同步更新 `OPTIMIZATION_ROADMAP.md`

## 本地开发
- 安装依赖、复制环境变量、初始化数据库、启动项目
- 修改前先确认影响的模块和目录
- 提交前至少运行对应测试

## 开发约定
- 后端目录、前端目录、接口分层
- RBAC 权限点规范
- 字典表约束
- TDD 顺序
- 前端表单、Pinia、样式、对象操作规范

## 提 Issue
- 区分 bug / feature / question
- 信息尽量完整

## 提 PR
- 写清改动摘要、影响范围、验证方式
- 涉及 schema / 权限 / 字典 / 环境变量 / 文档时明确说明
```

- [ ] **Step 2: 人工校对贡献指南**

Run: `sed -n '1,260p' CONTRIBUTING.md`
Expected: 文档章节完整，内容与仓库现有规范一致，无占位词或空章节

### Task 2: 落地 Issue 和 PR 模板

**Files:**
- Create: `.github/ISSUE_TEMPLATE/bug_report.md`
- Create: `.github/ISSUE_TEMPLATE/feature_request.md`
- Create: `.github/ISSUE_TEMPLATE/question.md`
- Create: `.github/pull_request_template.md`
- Test: `CONTRIBUTING.md`

- [ ] **Step 1: 编写 bug 模板**

在 `.github/ISSUE_TEMPLATE/bug_report.md` 中写入：

```md
---
name: Bug report
about: 提交可复现缺陷
title: "[Bug] "
labels: bug
assignees: ''
---

## 问题描述

## 复现步骤

## 期望结果

## 实际结果

## 影响范围

## 运行环境

## 补充信息
```

- [ ] **Step 2: 编写 feature 模板**

在 `.github/ISSUE_TEMPLATE/feature_request.md` 中写入：

```md
---
name: Feature request
about: 提交功能需求
title: "[Feature] "
labels: enhancement
assignees: ''
---

## 目标与背景

## 当前痛点

## 期望方案

## 影响范围

## 补充说明
```

- [ ] **Step 3: 编写 question 模板**

在 `.github/ISSUE_TEMPLATE/question.md` 中写入：

```md
---
name: Question
about: 提交使用、配置或开发问题
title: "[Question] "
labels: question
assignees: ''
---

## 问题背景

## 已尝试内容

## 当前卡点

## 相关文件或命令

## 补充信息
```

- [ ] **Step 4: 编写 PR 模板**

在 `.github/pull_request_template.md` 中写入：

```md
## 改动摘要

## 影响范围

## 验证方式

## 检查清单
- [ ] 已阅读相关规范
- [ ] 已运行对应测试或已说明未运行原因
- [ ] 如涉及 Prisma schema，已说明迁移和影响
- [ ] 如涉及权限点，已说明前后端权限改动
- [ ] 如涉及字典表，已说明字典数据变更
- [ ] 如涉及环境变量或部署行为，已更新文档
- [ ] 如涉及前端页面，已附截图或说明不适用
```

- [ ] **Step 5: 人工校对模板**

Run: `sed -n '1,220p' .github/ISSUE_TEMPLATE/bug_report.md && sed -n '1,220p' .github/ISSUE_TEMPLATE/feature_request.md && sed -n '1,220p' .github/ISSUE_TEMPLATE/question.md && sed -n '1,220p' .github/pull_request_template.md`
Expected: 模板路径齐全、frontmatter 合法、字段完整、语气与仓库文档一致

### Task 3: 更新路线图与最终验证

**Files:**
- Modify: `OPTIMIZATION_ROADMAP.md`
- Test: `CONTRIBUTING.md`
- Test: `.github/ISSUE_TEMPLATE/bug_report.md`
- Test: `.github/ISSUE_TEMPLATE/feature_request.md`
- Test: `.github/ISSUE_TEMPLATE/question.md`
- Test: `.github/pull_request_template.md`

- [ ] **Step 1: 更新路线图状态和记录**

将 `OPTIMIZATION_ROADMAP.md` 中的 `增加 CONTRIBUTING.md`、`增加 issue 模板`、`增加 PR 模板` 标记为 `已完成`，并在修复记录中追加本轮文档治理记录，说明新增了哪些文件、为何这样设计、如何验证。

- [ ] **Step 2: 运行最终验证**

Run: `test -f CONTRIBUTING.md && test -f .github/ISSUE_TEMPLATE/bug_report.md && test -f .github/ISSUE_TEMPLATE/feature_request.md && test -f .github/ISSUE_TEMPLATE/question.md && test -f .github/pull_request_template.md && rg -n "增加 `CONTRIBUTING.md`|增加 issue 模板|增加 PR 模板|2026-05-17 - 增加 CONTRIBUTING.md、issue 模板与 PR 模板" OPTIMIZATION_ROADMAP.md`
Expected: 所有文件存在，路线图三项状态已更新，且新增历史记录可检索

- [ ] **Step 3: 检查工作区摘要**

Run: `git status --short CONTRIBUTING.md .github OPTIMIZATION_ROADMAP.md docs/superpowers/specs/2026-05-17-contributing-and-templates-design.md docs/superpowers/plans/2026-05-17-contributing-and-templates.md`
Expected: 仅出现本轮新增或修改的协作文档相关变更
