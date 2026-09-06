# Layout Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Align the Nest-Vue Admin shell with the reference project's stable layout behavior while preserving existing routes, menu APIs, and layout modes.

**Architecture:** Keep `basic.vue` as the layout coordinator. Make `ColumnSidebar` own the primary/secondary column presentation and consume the shared collapse state; keep header controls in `TheHeader`, and standardize shell dimensions and scroll boundaries in layout styles.

**Tech Stack:** Vue 3, TypeScript, Pinia, Element Plus, SCSS, Vitest.

**Spec:** User-approved chat design on 2026-09-05.

## Global Constraints

- Preserve existing menu data, route names, permissions, and layout mode values.
- Use Composition API and `storeToRefs` for Pinia state.
- Keep styles in SCSS classes; do not add inline style for new behavior.
- Verify with Prettier and the narrowest available web tests/type checks.

### Task 1: Stabilize shared shell geometry

**Files:**
- Modify: `apps/web/src/views/layout/basic.vue`
- Modify: `apps/web/src/components/header/TheHeader.vue`

- [x] Make header, tabs, and content use stable flex sizing and prevent nested content overflow.
- [x] Keep the collapse control at a fixed 32px hit area with a 22px icon.
- [x] Add responsive breakpoint rules so narrow screens use vertical layout without horizontal overflow.
- [x] Run Prettier on both files.

### Task 2: Complete double-column sidebar behavior

**Files:**
- Modify: `apps/web/src/components/mixSidebar/index.vue`

- [x] Consume `isCollapse` via `storeToRefs`.
- [x] Keep the primary icon column visible while animating the secondary column between 180px and 0px.
- [x] Preserve active top-menu routing and hide secondary labels without leaving a collapsed overflow region.
- [x] Run the focused component tests or type-check the web package.

### Task 3: Refine navigation controls and validation

**Files:**
- Modify: `apps/web/src/components/breadcrumb/index.vue`
- Modify: `apps/web/src/components/header/TheHeaderActions.vue`
- Modify: `apps/web/src/components/header/LayoutSwitcher.vue`

- [x] Normalize icon button dimensions and tooltip/title coverage.
- [x] Remove new inline layout styling from touched controls.
- [x] Verify mode switching and collapse state retain the active route.
- [x] Run Prettier and the relevant web validation commands; record unrelated baseline failures separately.
