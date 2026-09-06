<script setup lang="ts">
import Icon from '@/components/icon/icon.vue'
import { Document, Folder } from '@element-plus/icons-vue'
const props = defineProps({
  menu: {
    type: Object,
    default: () => ({}),
  },
})
</script>

<template>
  <template v-if="menu.children?.length">
    <el-sub-menu :index="menu.name" v-if="!menu.hidden">
      <template #title>
        <el-icon :size="22">
          <Icon :icon="menu.meta.icon" :size="22" v-if="menu.meta?.icon" class="menu-icon" />
          <Folder v-else class="menu-icon" />
        </el-icon>
        <span>{{ menu.meta?.title }}</span>
      </template>
      <side-menu-item v-for="item in menu.children" :key="item.id" :menu="item" />
    </el-sub-menu>
  </template>
  <template v-else>
    <el-menu-item :index="menu.name" v-if="!menu.hidden">
      <el-icon :size="22">
        <Icon :icon="menu.meta.icon" :size="22" v-if="menu.meta?.icon" class="menu-icon" />
        <Document v-else class="menu-icon" />
      </el-icon>
      <template #title>
        <span>{{ menu.meta?.title }}</span>
      </template>
    </el-menu-item>
  </template>
</template>

<style scoped>
.menu-icon {
  transition: color 0.25s ease;
}
</style>
