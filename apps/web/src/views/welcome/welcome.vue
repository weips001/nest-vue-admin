<script setup lang="ts">
import Icon from '@/components/icon/icon.vue'
import { useUserStore } from '@/stores/modules/user'
import { storeToRefs } from 'pinia'

const userStore = useUserStore()
const { currentUser } = storeToRefs(userStore)

const greeting = (() => {
  const h = new Date().getHours()
  if (h < 6) return '夜深了'
  if (h < 12) return '上午好'
  if (h < 14) return '中午好'
  if (h < 18) return '下午好'
  return '晚上好'
})()

const coreFeatures = [
  {
    icon: 'ri:shield-check-line',
    color: '#409eff',
    title: '企业级安全体系',
    desc: '双 Token + Redis 服务端校验，密码过期 / 历史去重 / 强度检测，防爆破锁定，审计日志自动脱敏',
  },
  {
    icon: 'ep:data-analysis',
    color: '#67c23a',
    title: '五级数据权限',
    desc: '全部 / 自定义 / 本部门及下级 / 本部门 / 仅本人，多角色取最大权限，ancestors 路径单次查询',
  },
  {
    icon: 'ep:key',
    color: '#e6a23c',
    title: '三层 RBAC + 按钮级',
    desc: '用户 → 角色 → 菜单 / 按钮，v-auth 指令 + @Permission 装饰器，超管四层越权保护',
  },
  {
    icon: 'ep:office-building',
    color: '#14b8a6',
    title: '部门-岗位-角色联动',
    desc: '部门树负责人标识，岗位绑定默认角色，组织架构聚合人数，用户按部门层级智能排序',
  },
  {
    icon: 'ep:document-checked',
    color: '#f56c6c',
    title: '操作审计 + 登录追踪',
    desc: '双日志体系，操作日志自动脱敏，登录日志含 IP 归属地、浏览器与操作系统识别',
  },
]

const uxHighlights = [
  {
    icon: 'ep:search',
    color: '#3b82f6',
    title: '搜索条件持久化',
    desc: '切换页面再回来，筛选条件和分页位置自动恢复，12 个列表页全部覆盖',
  },
  {
    icon: 'ep:files',
    color: '#8b5cf6',
    title: '多标签页导航',
    desc: '标签页状态持久化，右键菜单支持关闭 / 关闭其他 / 固定，刷新浏览器标签不丢失',
  },
  {
    icon: 'ep:brush',
    color: '#ec4899',
    title: '主题个性化',
    desc: '深色模式 + 6 种主色预设，运行时动态切换，CSS 变量自动生成 9 级色阶',
  },
  {
    icon: 'ep:download',
    color: '#f59e0b',
    title: '导出拖拽排序',
    desc: '导出弹窗支持拖拽排列字段顺序、勾选导出列，所见即所得',
  },
]

const techStack = [
  { name: 'NestJS', color: '#e0234e' },
  { name: 'Prisma', color: '#2d3748' },
  { name: 'MySQL', color: '#00758f' },
  { name: 'Redis', color: '#dc382d' },
  { name: 'Vue 3', color: '#42b883' },
  { name: 'Element Plus', color: '#409eff' },
  { name: 'Pinia', color: '#ffd859' },
  { name: 'TypeScript', color: '#3178c6' },
]
</script>

<template>
  <div class="welcome-page">
    <!-- 问候区 -->
    <div class="greeting-section">
      <h1>{{ greeting }}，{{ currentUser?.nickName || currentUser?.userName }}</h1>
      <p>欢迎回到 Nest-Vue-Admin 管理平台</p>
    </div>

    <!-- 核心能力 -->
    <h2 class="section-title">核心能力</h2>
    <div class="feature-grid cols-3">
      <div v-for="item in coreFeatures" :key="item.title" class="feature-card">
        <div class="feature-icon" :style="{ background: item.color + '15', color: item.color }">
          <Icon :icon="item.icon" :size="20" />
        </div>
        <div class="feature-body">
          <h3>{{ item.title }}</h3>
          <p>{{ item.desc }}</p>
        </div>
      </div>
    </div>

    <!-- 体验细节 -->
    <h2 class="section-title">体验细节</h2>
    <div class="feature-grid cols-4">
      <div v-for="item in uxHighlights" :key="item.title" class="feature-card">
        <div class="feature-icon" :style="{ background: item.color + '15', color: item.color }">
          <Icon :icon="item.icon" :size="20" />
        </div>
        <div class="feature-body">
          <h3>{{ item.title }}</h3>
          <p>{{ item.desc }}</p>
        </div>
      </div>
    </div>

    <!-- 技术栈 -->
    <div class="tech-section">
      <h2 class="section-title">技术栈</h2>
      <div class="tech-tags">
        <el-tag
          v-for="tech in techStack"
          :key="tech.name"
          :color="tech.color"
          effect="dark"
          round
          class="tech-tag"
        >
          {{ tech.name }}
        </el-tag>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.welcome-page {
  padding: 32px;
  background: var(--el-bg-color);
  border-radius: 12px;
}

.greeting-section {
  margin-bottom: 32px;
  padding: 20px 24px;
  background: linear-gradient(135deg, var(--el-color-primary-light-9) 0%, var(--el-color-primary-light-8) 100%);
  border-radius: 12px;
  border-left: 4px solid var(--el-color-primary);

  h1 {
    font-size: 22px;
    font-weight: 700;
    color: var(--el-text-color-primary);
    margin: 0 0 6px;
  }

  p {
    font-size: 14px;
    color: var(--el-text-color-secondary);
    margin: 0;
  }
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin: 0 0 16px;
  padding-left: 10px;
  border-left: 3px solid var(--el-color-primary);
}

.feature-grid {
  display: grid;
  gap: 14px;
  margin-bottom: 28px;

  &.cols-3 {
    grid-template-columns: repeat(3, 1fr);
  }

  &.cols-4 {
    grid-template-columns: repeat(4, 1fr);
  }
}

.feature-card {
  padding: 20px;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 12px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
    border-color: transparent;
  }

  .feature-icon {
    width: 44px;
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 12px;
    margin-bottom: 14px;
    transition: transform 0.3s ease;
  }

  &:hover .feature-icon {
    transform: scale(1.08);
  }

  .feature-body {
    h3 {
      font-size: 14px;
      font-weight: 600;
      margin: 0 0 8px;
      color: var(--el-text-color-primary);
    }

    p {
      font-size: 13px;
      margin: 0;
      color: var(--el-text-color-secondary);
      line-height: 1.6;
    }
  }
}

.tech-section {
  .tech-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }

  .tech-tag {
    border: none;
    font-size: 13px;
    padding: 6px 16px;
    transition: all 0.25s ease;

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }
  }
}

@media (max-width: 1100px) {
  .feature-grid.cols-4 {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 900px) {
  .feature-grid.cols-3 {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 600px) {
  .feature-grid.cols-3,
  .feature-grid.cols-4 {
    grid-template-columns: 1fr;
  }
}
</style>
