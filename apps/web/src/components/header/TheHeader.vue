<script setup lang="ts">
import Breadcrumb from '@/components/breadcrumb/index.vue'
import TheHeaderActions from '@/components/header/TheHeaderActions.vue'
import { useThemeStore } from '@/stores/modules/theme'
import { Expand, Fold } from '@element-plus/icons-vue'
import { storeToRefs } from 'pinia'

const themeStore = useThemeStore()
const { isCollapse } = storeToRefs(themeStore)
</script>

<template>
  <header class="header">
    <div class="header-left">
      <el-icon :size="22" class="collapse-icon" @click="themeStore.toggleCollapse">
        <Fold v-if="!isCollapse" />
        <Expand v-else />
      </el-icon>
      <Breadcrumb class="header-breadcrumb" />
    </div>

    <TheHeaderActions />
  </header>
</template>

<style lang="scss" scoped>
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  height: 56px;
  box-sizing: border-box;
  flex-shrink: 0;
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);

  .header-left {
    display: flex;
    align-items: center;

    .collapse-icon {
      width: 32px;
      height: 32px;
      flex: 0 0 32px;
      cursor: pointer;
      color: var(--el-text-color-regular);
      transition: all 0.3s;
      padding: 6px;
      border-radius: 6px;

      &:hover {
        color: var(--el-color-primary);
        background: rgba(0, 0, 0, 0.04);
      }
    }

    .header-breadcrumb {
      margin-left: 12px;
      min-width: 0;
    }
  }
}
</style>
