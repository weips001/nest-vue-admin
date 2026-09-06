<script setup lang="ts">
import Icon from '@/components/icon/icon.vue'
import TopMenuItem from '@/components/topMenu/topMenuItem.vue'
import { useThemeStore } from '@/stores/modules/theme'
import { useUserStore } from '@/stores/modules/user'
import type { MenuListType } from '@/views/sys/menu/menu.type'
import { storeToRefs } from 'pinia'
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const props = defineProps<{
  mode: 'horizontal' | 'mix'
}>()

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const themeStore = useThemeStore()
const { activeTopMenuName } = storeToRefs(themeStore)

/** 一级菜单（过滤 hidden） */
const firstLevelMenus = computed(() => {
  return userStore.menus.filter((m) => !m.hidden)
})

/** 当前激活的一级菜单 name */
const activeTopMenu = computed(() => {
  const targetName = (route.meta?.activeName as string) || (route.name as string)
  if (!targetName) return ''
  for (const menu of userStore.menus) {
    if (menu.name === targetName) return menu.name
    if (isRouteInMenu(menu, targetName)) return menu.name
  }
  return ''
})

function isRouteInMenu(menu: MenuListType, routeName: string): boolean {
  if (menu.name === routeName) return true
  if (menu.children?.length) {
    return menu.children.some((child) => isRouteInMenu(child, routeName))
  }
  return false
}

const selectOne = (name: string) => {
  if (name.startsWith('http')) {
    window.open(name)
    return
  }
  router.push({ name })
}

/** 点击一级菜单 */
const handleSelect = (name: string) => {
  if (props.mode === 'mix') {
    themeStore.setActiveTopMenuName(name)
    // 找到该一级菜单的第一个可见子菜单并导航
    const topMenu = userStore.menus.find((m) => m.name === name)
    const firstVisible = topMenu?.children?.find((c) => !c.hidden)
    selectOne(firstVisible?.name ?? name)
  } else {
    selectOne(name)
  }
}
</script>

<template>
  <el-menu
    mode="horizontal"
    :default-active="activeTopMenu"
    class="top-menu"
    @select="handleSelect"
  >
    <template v-for="item in firstLevelMenus" :key="item.id">
      <!-- 横向模式：有子菜单用 sub-menu 递归展开 -->
      <template v-if="mode === 'horizontal' && item.children?.length">
        <el-sub-menu :index="item.name">
          <template #title>
            <Icon :icon="item.meta.icon" :size="16" v-if="item.meta.icon" style="margin-right: 4px" />
            <span>{{ item.meta?.title }}</span>
          </template>
          <top-menu-item v-for="child in item.children" :key="child.id" :menu="child" />
        </el-sub-menu>
      </template>
      <!-- 混合模式 或 横向模式无子菜单：只渲染一级菜单项 -->
      <template v-else>
        <el-menu-item :index="item.name">
          <Icon :icon="item.meta.icon" :size="16" v-if="item.meta.icon" style="margin-right: 4px" />
          <template #title>
            <span>{{ item.meta?.title }}</span>
          </template>
        </el-menu-item>
      </template>
    </template>
  </el-menu>
</template>

<style lang="scss" scoped>
.top-menu {
  border-bottom: none !important;
  background: transparent !important;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;

  --el-menu-bg-color: transparent;
  --el-menu-text-color: rgba(255, 255, 255, 0.75);
  --el-menu-hover-bg-color: rgba(255, 255, 255, 0.08);
  --el-menu-active-color: #ffffff;

  :deep(.el-menu-item),
  :deep(.el-sub-menu__title) {
    height: 56px;
    line-height: 56px;
    color: rgba(255, 255, 255, 0.75);
    border-bottom: 2px solid transparent !important;
    transition: all 0.25s;

    &:hover {
      color: rgba(255, 255, 255, 0.95);
      background-color: rgba(255, 255, 255, 0.06);
    }
  }

  :deep(.el-menu-item.is-active),
  :deep(.el-sub-menu.is-active > .el-sub-menu__title) {
    color: #ffffff !important;
    border-bottom-color: var(--el-color-primary) !important;
  }

  :deep(.el-sub-menu__icon-arrow) {
    color: rgba(255, 255, 255, 0.5);
  }
}

/* 浅色模式 */
html:not(.dark) .top-menu {
  --el-menu-text-color: #606266;
  --el-menu-hover-bg-color: rgba(0, 0, 0, 0.02);
  --el-menu-active-color: var(--el-color-primary);

  :deep(.el-menu-item),
  :deep(.el-sub-menu__title) {
    color: #606266;

    &:hover {
      color: var(--el-color-primary);
      background-color: rgba(0, 0, 0, 0.02);
    }
  }

  :deep(.el-menu-item.is-active),
  :deep(.el-sub-menu.is-active > .el-sub-menu__title) {
    color: var(--el-color-primary) !important;
    border-bottom-color: var(--el-color-primary) !important;
  }

  :deep(.el-sub-menu__icon-arrow) {
    color: #909399;
  }
}
</style>

<style lang="scss">
/* 横向菜单弹出面板样式（teleport 到 body，需要全局样式） */
.top-menu-popover {
  .el-menu--popup {
    min-width: 160px;
    padding: 6px 0;
    border-radius: 8px;
    background: #22252e;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
    border: 1px solid rgba(255, 255, 255, 0.06);

    .el-menu-item {
      height: 38px;
      line-height: 38px;
      color: rgba(255, 255, 255, 0.75);
      padding: 0 16px;

      &:hover {
        background-color: rgba(255, 255, 255, 0.08);
        color: rgba(255, 255, 255, 0.95);
      }

      &.is-active {
        color: #ffffff;
        background: linear-gradient(90deg, rgba(64, 158, 255, 0.25) 0%, rgba(64, 158, 255, 0.08) 100%);
      }
    }

    .el-sub-menu__title {
      height: 38px;
      line-height: 38px;
      color: rgba(255, 255, 255, 0.75);
      padding: 0 16px;

      &:hover {
        background-color: rgba(255, 255, 255, 0.08);
        color: rgba(255, 255, 255, 0.95);
      }
    }
  }
}

/* 浅色模式弹出面板 */
html:not(.dark) .el-menu--horizontal {
  .el-menu--popup {
    background: #ffffff;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
    border-color: #e8e8e8;

    .el-menu-item {
      color: #606266;

      &:hover {
        background-color: rgba(0, 0, 0, 0.04);
        color: var(--el-text-color-primary);
      }

      &.is-active {
        color: var(--el-color-primary);
        background: rgba(64, 158, 255, 0.06);
      }
    }

    .el-sub-menu__title {
      color: #606266;

      &:hover {
        background-color: rgba(0, 0, 0, 0.04);
        color: var(--el-text-color-primary);
      }
    }
  }
}
</style>
