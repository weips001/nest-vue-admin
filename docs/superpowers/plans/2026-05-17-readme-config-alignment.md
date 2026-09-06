# README And Config Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align repository docs, root scripts, and default local development ports so the README matches how the monorepo actually runs.

**Architecture:** Keep the runtime behavior unchanged where possible, and instead align the top-level developer entrypoints and documentation to the existing backend port `3333`, frontend port `5173`, and server proxy target. Add root-level monorepo scripts that delegate into `apps/server` and `apps/web`, then rewrite the README to describe those entrypoints and the real environment variable defaults.

**Tech Stack:** pnpm workspace, NestJS, Vue 3, Vite, Markdown

---

### Task 1: Add Root Monorepo Scripts

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Write the failing test**

There is no automated package-json test here. Use a command-level check instead: verify that root-level `dev`, `build`, `lint`, and `test` scripts do not exist before editing.

- [ ] **Step 2: Run check to verify current gap**

Run: `node -e "const s=require('./package.json').scripts; for (const k of ['dev','build','lint','test']) console.log(k, Boolean(s[k]))"`
Expected: `dev false`, `build false`, `lint false`, `test false`

- [ ] **Step 3: Write minimal implementation**

Add root scripts that fan out to the two workspace apps:

```json
{
  "scripts": {
    "dev": "pnpm --parallel --filter ./apps/server --filter ./apps/web run dev",
    "start": "pnpm --parallel --filter ./apps/server --filter ./apps/web run start",
    "build": "pnpm --filter ./apps/server run build && pnpm --filter ./apps/web run build",
    "lint": "pnpm --filter ./apps/server run lint && pnpm --filter ./apps/web run lint",
    "test": "pnpm --filter ./apps/server run test && pnpm --filter ./apps/web run test:run"
  }
}
```

- [ ] **Step 4: Run check to verify scripts exist**

Run: `node -e "const s=require('./package.json').scripts; for (const k of ['dev','build','lint','test']) console.log(k, Boolean(s[k]))"`
Expected: `dev true`, `build true`, `lint true`, `test true`

### Task 2: Align README With Real Defaults

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Write the failing check**

Use a grep check that highlights the current mismatches: backend port `3000`, database name `nest-vue-admin`, and split startup instructions that ignore the new root scripts.

- [ ] **Step 2: Run check to verify current mismatch**

Run: `rg -n "localhost:3000|nest-vue-admin|cd apps/server|cd apps/web" README.md`
Expected: Matches are found

- [ ] **Step 3: Write minimal implementation**

Update the README so it:

```md
- uses `APP_PORT=3333` as the backend default
- uses `http://localhost:5173` for the frontend
- uses `nva` as the example database name to match `apps/server/.env.example`
- documents root-level `pnpm run dev`, `pnpm run build`, `pnpm run lint`, and `pnpm run test`
- keeps the environment setup and seed flow concise
```

- [ ] **Step 4: Run check to verify mismatch is gone**

Run: `rg -n "localhost:3000|nest-vue-admin|cd apps/server|cd apps/web" README.md`
Expected: No matches for outdated backend port or old database name; any remaining `cd apps/server` only appears where entering the server directory is actually required for database operations

### Task 3: Verify The New Entry Points

**Files:**
- Verify only: `package.json`, `README.md`

- [ ] **Step 1: Run root script presence check**

Run: `node -e "const s=require('./package.json').scripts; console.log(Object.keys(s).sort().join(','))"`
Expected: Includes `build`, `dev`, `lint`, `start`, `test`

- [ ] **Step 2: Run README alignment checks**

Run: `rg -n "3333|5173|DATABASE_URL|pnpm run dev|pnpm run build|pnpm run lint|pnpm run test" README.md`
Expected: Matches confirm the README references the actual backend port, frontend port, and root-level commands

- [ ] **Step 3: Commit**

```bash
git add package.json README.md docs/superpowers/plans/2026-05-17-readme-config-alignment.md
git commit -m "docs: align readme and root scripts"
```
