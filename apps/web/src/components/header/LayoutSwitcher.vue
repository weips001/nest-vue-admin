<script setup lang="ts">
import Icon from '@/components/icon/icon.vue'
import { type LayoutMode, useThemeStore } from '@/stores/modules/theme'
import { Check } from '@element-plus/icons-vue'
import { storeToRefs } from 'pinia'

const themeStore = useThemeStore()
const { layoutMode } = storeToRefs(themeStore)

const layoutOptions: { mode: LayoutMode; label: string; icon: string }[] = [
  { mode: 'vertical', label: '侧边栏布局', icon: 'ep:menu' },
  { mode: 'horizontal', label: '顶部菜单布局', icon: 'ep:more-filled' },
  { mode: 'mix', label: '混合布局', icon: 'ep:grid' },
  { mode: 'column', label: '双列布局', icon: 'ep:data-line' },
]

const handleSwitch = (mode: string) => {
  themeStore.setLayoutMode(mode as LayoutMode)
}
</script>

<template>
  <el-dropdown trigger="click" @command="handleSwitch">
    <el-button circle title="布局模式">
      <el-icon :size="16"><Icon icon="ep:setting" /></el-icon>
    </el-button>
    <template #dropdown>
      <el-dropdown-menu class="layout-switcher-menu">
        <el-dropdown-item
          v-for="item in layoutOptions"
          :key="item.mode"
          :command="item.mode"
          :class="{ 'is-active': layoutMode === item.mode }"
        >
          <Icon :icon="item.icon" :size="14" class="layout-option-icon" />
          {{ item.label }}
          <el-icon v-if="layoutMode === item.mode" class="check-icon"><Check /></el-icon>
        </el-dropdown-item>
      </el-dropdown-menu>
    </template>
  </el-dropdown>
</template>

<style lang="scss">
.layout-switcher-menu {
  .el-dropdown-menu__item {
    display: flex;
    align-items: center;

    &.is-active {
      color: var(--el-color-primary);
      font-weight: 500;
    }

    .check-icon {
      margin-left: auto;
      color: var(--el-color-primary);
    }

    .layout-option-icon {
      margin-right: 6px;
      flex-shrink: 0;
    }
  }
}
</style>
