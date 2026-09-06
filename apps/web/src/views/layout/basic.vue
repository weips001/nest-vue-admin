<script setup lang="ts">
import LockScreen from '@/components/LockScreen.vue'
import TheHeader from '@/components/header/TheHeader.vue'
import TheHeaderActions from '@/components/header/TheHeaderActions.vue'
import ColumnSidebar from '@/components/mixSidebar/index.vue'
import SideMenu from '@/components/sideMenu/index.vue'
import TabsView from '@/components/tabs/TabsView.vue'
import TopMenu from '@/components/topMenu/index.vue'
import { useTabsStore } from '@/stores/modules/tabs'
import { useThemeStore } from '@/stores/modules/theme'
import { useUserStore } from '@/stores/modules/user'
import type { MenuListType } from '@/views/sys/menu/menu.type'
import { storeToRefs } from 'pinia'
import { computed, watch } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const tabsStore = useTabsStore()
const themeStore = useThemeStore()
const userStore = useUserStore()
const { isCollapse, layoutMode, activeTopMenuName } = storeToRefs(themeStore)
const { contentFullscreen } = storeToRefs(tabsStore)

// 移动端强制纵向
const effectiveLayout = computed(() => {
  if (typeof window !== 'undefined' && window.innerWidth < 768) return 'vertical'
  return layoutMode.value
})

// Mix 模式：侧边栏只显示当前一级菜单的子菜单
const mixSidebarMenus = computed(() => {
  if (effectiveLayout.value !== 'mix') return []
  const activeTop = userStore.menus.find((m) => m.name === activeTopMenuName.value)
  return activeTop?.children?.filter((m) => !m.hidden) ?? []
})

// 检查路由属于哪个一级菜单
function isRouteInMenu(menu: MenuListType, routeName: string): boolean {
  if (menu.name === routeName) return true
  if (menu.children?.length) {
    return menu.children.some((child) => isRouteInMenu(child, routeName))
  }
  return false
}

// 同步 activeTopMenuName：路由变化 或 切换到 mix/column 模式时
function syncActiveTopMenu() {
  if (effectiveLayout.value !== 'mix' && effectiveLayout.value !== 'column') return
  const targetName = (route.meta?.activeName as string) || (route.name as string)
  if (targetName) {
    const activeFirstLevel = userStore.menus.find((m) => isRouteInMenu(m, targetName))
    if (activeFirstLevel) {
      themeStore.setActiveTopMenuName(activeFirstLevel.name)
    }
  }
}

watch(
  () => route.path,
  () => {
    tabsStore.addTab(route)
    syncActiveTopMenu()
  },
  { immediate: true },
)

watch(layoutMode, () => {
  syncActiveTopMenu()
})
</script>

<template>
  <div class="nva-container" :class="[`layout-${effectiveLayout}`]">
    <LockScreen />

    <!-- ===== 顶部导航栏 (横向模式) ===== -->
    <div v-if="effectiveLayout === 'horizontal'" v-show="!contentFullscreen" class="top-header">
      <div class="top-header-inner">
        <router-link to="/" class="top-logo">
          <img src="@/assets/logo.svg" alt="logo" class="logo-img" />
          <span class="logo-text">Nest-Vue-Admin</span>
        </router-link>
        <TopMenu mode="horizontal" />
        <TheHeaderActions dark />
      </div>
    </div>

    <!-- ===== 顶部导航栏 (混合模式: 一级菜单横向 + 侧边栏子菜单) ===== -->
    <div v-if="effectiveLayout === 'mix'" v-show="!contentFullscreen" class="top-header">
      <div class="top-header-inner">
        <router-link to="/" class="top-logo">
          <img src="@/assets/logo.svg" alt="logo" class="logo-img" />
          <span class="logo-text">Nest-Vue-Admin</span>
        </router-link>
        <TopMenu mode="mix" />
        <TheHeaderActions dark />
      </div>
    </div>

    <!-- ===== 纵向模式: 侧边栏 + 主内容 ===== -->
    <template v-if="effectiveLayout === 'vertical'">
      <div v-show="!contentFullscreen" class="aside" :class="{ 'is-collapse': isCollapse }">
        <router-link to="/" class="logo">
          <img src="@/assets/logo.svg" alt="logo" class="logo-img" />
          <span class="logo-text" v-show="!isCollapse">Nest-Vue-Admin</span>
        </router-link>
        <SideMenu />
      </div>
      <div class="main">
        <TheHeader v-show="!contentFullscreen" />
        <TabsView />
        <div class="content">
          <div class="router-view">
            <router-view v-if="tabsStore.isRouterAlive" />
          </div>
        </div>
      </div>
    </template>

    <!-- ===== 横向模式: 无侧边栏 ===== -->
    <template v-if="effectiveLayout === 'horizontal'">
      <div class="main">
        <TabsView />
        <div class="content">
          <div class="router-view">
            <router-view v-if="tabsStore.isRouterAlive" />
          </div>
        </div>
      </div>
    </template>

    <!-- ===== 混合模式: 顶部一级菜单 + 侧边栏子菜单 ===== -->
    <template v-if="effectiveLayout === 'mix'">
      <div class="mix-body">
        <div
          v-show="!contentFullscreen && mixSidebarMenus.length > 0"
          class="aside"
          :class="{ 'is-collapse': isCollapse }"
        >
          <SideMenu :menus="mixSidebarMenus" />
        </div>
        <div class="main">
          <TabsView />
          <div class="content">
            <div class="router-view">
              <router-view v-if="tabsStore.isRouterAlive" />
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- ===== 双列模式: 顶部导航 + 双列侧边栏 + 主内容 ===== -->
    <template v-if="effectiveLayout === 'column'">
      <div class="column-body">
        <div v-show="!contentFullscreen" class="column-aside">
          <ColumnSidebar />
        </div>
        <div class="main">
          <TheHeader v-show="!contentFullscreen" />
          <TabsView />
          <div class="content">
            <div class="router-view">
              <router-view v-if="tabsStore.isRouterAlive" />
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style lang="scss" scoped>
.nva-container {
  height: 100%;
  display: flex;
  flex-direction: column;

  // ===== 纵向模式 =====
  &.layout-vertical {
    flex-direction: row;
  }

  // ===== 侧边栏 (纵向/混合共用) =====
  .aside {
    width: 220px;
    height: 100%;
    flex: 0 0 220px;
    background: linear-gradient(180deg, #22252e 0%, #1c1f28 100%);
    display: flex;
    flex-direction: column;
    box-shadow: 2px 0 8px rgba(0, 0, 0, 0.15);
    transition:
      width 0.3s cubic-bezier(0.4, 0, 0.2, 1),
      flex 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    z-index: 10;

    &.is-collapse {
      width: 64px;
      flex: 0 0 64px;

      .logo {
        justify-content: center;
        padding: 0;
      }
    }

    .logo {
      height: 56px;
      display: flex;
      align-items: center;
      justify-content: flex-start;
      gap: 10px;
      flex-shrink: 0;
      padding: 0 16px;
      transition: all 0.3s ease;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);

      .logo-img {
        width: 30px;
        height: 30px;
        flex-shrink: 0;
        filter: brightness(1.1);
      }

      .logo-text {
        font-size: 16px;
        font-weight: 700;
        color: rgba(255, 255, 255, 0.92);
        white-space: nowrap;
        overflow: hidden;
        letter-spacing: 0.5px;
      }
    }
  }

  // ===== 主内容区 =====
  .main {
    flex: 1;
    min-width: 0;
    height: 100%;
    display: flex;
    flex-direction: column;
    background: var(--el-bg-color-page);
    overflow: hidden;

    .content {
      flex: 1;
      min-height: 0;
      min-width: 0;
      overflow: auto;

      .router-view {
        padding: 20px;
        height: 100%;
      }
    }
  }

  // ===== 顶部导航栏 (横向/混合) =====
  .top-header {
    flex-shrink: 0;
    background: linear-gradient(180deg, #22252e 0%, #1c1f28 100%);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    position: relative;
    z-index: 10;

    .top-header-inner {
      display: flex;
      align-items: center;
      height: 56px;
      padding: 0 16px;
    }

    .top-logo {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-shrink: 0;
      margin-right: 24px;

      .logo-img {
        width: 30px;
        height: 30px;
        filter: brightness(1.1);
      }

      .logo-text {
        font-size: 16px;
        font-weight: 700;
        color: rgba(255, 255, 255, 0.92);
        white-space: nowrap;
        letter-spacing: 0.5px;
      }
    }
  }

  // ===== 混合模式 body =====
  .mix-body {
    flex: 1;
    min-height: 0;
    display: flex;
  }

  // ===== 双列模式 body =====
  .column-body {
    flex: 1;
    min-height: 0;
    min-width: 0;
    display: flex;

    .column-aside {
      height: 100%;
      flex-shrink: 0;
      box-shadow: 2px 0 8px rgba(0, 0, 0, 0.15);
      position: relative;
      z-index: 10;
    }
  }
}

/* 浅色模式 */
html:not(.dark) .nva-container {
  .aside {
    background: #ffffff;
    box-shadow: 2px 0 8px rgba(0, 0, 0, 0.06);

    .logo {
      border-bottom-color: #f0f0f0;

      .logo-img {
        filter: none;
      }

      .logo-text {
        color: var(--el-text-color-primary);
      }
    }
  }

  .top-header {
    background: #ffffff;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);

    .top-logo {
      .logo-img {
        filter: none;
      }

      .logo-text {
        color: var(--el-text-color-primary);
      }
    }
  }

  .column-body .column-aside {
    box-shadow: 2px 0 8px rgba(0, 0, 0, 0.06);
  }
}
</style>
