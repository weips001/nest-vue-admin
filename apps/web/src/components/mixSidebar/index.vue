<script setup lang="ts">
import Icon from '@/components/icon/icon.vue'
import SideMenu from '@/components/sideMenu/index.vue'
import router from '@/router'
import { useThemeStore } from '@/stores/modules/theme'
import { useUserStore } from '@/stores/modules/user'
import { storeToRefs } from 'pinia'
import { computed } from 'vue'

const themeStore = useThemeStore()
const userStore = useUserStore()
const { activeTopMenuName, isCollapse } = storeToRefs(themeStore)

/** 一级菜单（过滤 hidden） */
const firstLevelMenus = computed(() => {
  return userStore.menus.filter((m) => !m.hidden)
})

/** 当前激活的一级菜单 */
const activeTopMenu = computed(() => {
  return userStore.menus.find((m) => m.name === activeTopMenuName.value)
})

/** 当前激活的一级菜单的子菜单 */
const activeChildren = computed(() => {
  return activeTopMenu.value?.children?.filter((m) => !m.hidden) ?? []
})

const handleClick = (name: string) => {
  const topMenu = userStore.menus.find((m) => m.name === name)
  if (topMenu?.children?.length) {
    const firstVisible = topMenu.children.find((c) => !c.hidden)
    if (firstVisible) {
      if (firstVisible.path.startsWith('http')) {
        window.open(firstVisible.path)
        return
      }
      router.push({ name: firstVisible.name })
    }
  } else {
    if (topMenu?.path?.startsWith('http')) {
      window.open(topMenu.path)
      return
    }
    router.push({ name })
  }
}
</script>

<template>
  <div class="column-sidebar" :class="{ 'is-collapse': isCollapse }">
    <!-- 左列：一级菜单图标 -->
    <div class="column-sidebar__primary">
      <div class="column-sidebar__logo">
        <img src="@/assets/logo.svg" alt="logo" class="logo-img" />
      </div>
      <el-scrollbar class="column-sidebar__list">
        <div
          v-for="item in firstLevelMenus"
          :key="item.name"
          class="primary-item"
          :class="{ 'is-active': activeTopMenuName === item.name }"
          @click="handleClick(item.name)"
        >
          <Icon :icon="item.meta.icon" :size="20" v-if="item.meta.icon" />
          <span class="primary-label">{{ item.meta?.title }}</span>
        </div>
      </el-scrollbar>
    </div>

    <!-- 右列：子菜单 -->
    <div
      class="column-sidebar__sub"
      :class="{ 'is-empty': !activeChildren.length }"
      :aria-hidden="!activeChildren.length"
    >
      <div class="sub-header">
        <span class="sub-title">Nest-Vue-Admin</span>
      </div>
      <SideMenu :menus="activeChildren" />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.column-sidebar {
  display: flex;
  height: 100%;

  // 左列：一级菜单
  &__primary {
    width: 70px;
    flex: 0 0 70px;
    display: flex;
    flex-direction: column;
    background: #191a20;
    border-right: 1px solid rgba(255, 255, 255, 0.05);
  }

  &__logo {
    height: 56px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;

    .logo-img {
      width: 28px;
      height: 28px;
    }
  }

  &__list {
    flex: 1;
    padding: 8px 0;
  }

  .primary-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 10px 0;
    margin: 4px 8px;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.645, 0.045, 0.355, 1);
    position: relative;
    color: rgba(255, 255, 255, 0.55);

    .primary-label {
      font-size: 10px;
      line-height: 1.2;
      text-align: center;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 54px;
    }

    :deep(svg),
    :deep(.iconify) {
      transition: transform 0.2s ease;
    }

    &:hover {
      color: rgba(255, 255, 255, 0.85);
      background: rgba(255, 255, 255, 0.04);

      :deep(svg),
      :deep(.iconify) {
        transform: scale(1.15);
      }
    }

    &.is-active {
      color: var(--el-color-primary);
      background: rgba(64, 158, 255, 0.15);
      box-shadow: none;
    }
  }

  // 右列：子菜单
  &__sub {
    width: 180px;
    flex: 0 0 180px;
    display: flex;
    flex-direction: column;
    background: #21252b;
    overflow: hidden;
    transition:
      width 0.3s ease,
      flex 0.3s ease;

    &.is-empty {
      width: 0;
      flex-basis: 0;
    }

    .sub-header {
      height: 56px;
      min-width: 0;
      display: flex;
      align-items: center;
      padding: 0 16px;
      flex-shrink: 0;
      transition:
        opacity 0.15s ease,
        transform 0.3s ease;

      .sub-title {
        font-size: 14px;
        font-weight: 600;
        color: hsla(0, 0%, 100%, 0.95);
        letter-spacing: 0.5px;
        white-space: nowrap;
      }
    }

    :deep(.el-scrollbar) {
      min-width: 0;
      flex: 1;
      height: 0;
    }
  }

  &.is-collapse {
    .column-sidebar__sub:not(.is-empty) {
      width: 64px;
      flex-basis: 64px;

      .sub-header {
        opacity: 0;
        pointer-events: none;
      }
    }
  }
}

/* 浅色模式 */
html:not(.dark) .column-sidebar {
  &__primary {
    background: #f5f7fa;
    border-right-color: #e8e8e8;
  }

  .primary-item {
    color: #909399;

    &:hover {
      color: #606266;
      background: rgba(0, 0, 0, 0.04);
    }

    &.is-active {
      color: var(--el-color-primary);
      background: rgba(64, 158, 255, 0.1);
      box-shadow: none;
    }
  }

  &__sub {
    background: #ffffff;

    .sub-header {
      .sub-title {
        color: var(--el-text-color-primary);
      }
    }
  }
}
</style>
