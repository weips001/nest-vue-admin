# Production Deployment Notes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a production deployment checklist that matches the repository's real configuration and operational defaults.

**Architecture:** Keep runtime code unchanged and document the current production-sensitive settings in one focused markdown file. Link that file from the README so contributors can discover it from the main entrypoint.

**Tech Stack:** Markdown, pnpm workspace, NestJS config

---

### Task 1: Add Deployment Notes Document

**Files:**
- Create: `docs/deployment.md`

- [ ] **Step 1: Write the failing check**

Run a file existence check before creating the document.

- [ ] **Step 2: Run check to verify file is missing**

Run: `test -f docs/deployment.md; echo $?`
Expected: `1`

- [ ] **Step 3: Write minimal implementation**

Create a deployment note that covers:

```md
- changing the default admin password after seed
- replacing JWT_SECRET with a strong production secret
- deciding whether CACHE_MODE uses memory or redis and filling REDIS_* when redis is enabled
- constraining CORS because app.enableCors() is currently open
- setting UPLOAD_MODE, UPLOAD_LOCAL_FOLDER, and UPLOAD_LOCAL_BASE_URL correctly
- ensuring upload directories are writable and persisted
- confirming APP_PORT / reverse proxy / frontend API proxy alignment
- noting Swagger is only enabled in development
```

- [ ] **Step 4: Run check to verify file exists**

Run: `test -f docs/deployment.md; echo $?`
Expected: `0`

### Task 2: Link Deployment Notes From README

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Write the failing check**

Check that the README does not already point to the deployment notes.

- [ ] **Step 2: Run check to verify link is missing**

Run: `rg -n "docs/deployment.md|生产部署" README.md`
Expected: No relevant deployment-doc link

- [ ] **Step 3: Write minimal implementation**

Add a short section in the README that points production readers to `docs/deployment.md`.

- [ ] **Step 4: Run check to verify link exists**

Run: `rg -n "docs/deployment.md|生产部署" README.md`
Expected: A README section references the deployment notes
