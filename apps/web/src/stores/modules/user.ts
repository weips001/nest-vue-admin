import { getRoutesApi, getUserInfoApi, logoutApi } from '@/api/auth.ts'
import { clearTokens } from '@/utils/auth.ts'
import router from '@/router'
import { useLockStore } from '@/stores/modules/lock'
import { useSearchParamsStore } from '@/stores/modules/searchParams'
import { useTabsStore } from '@/stores/modules/tabs'
import type { CurrentUserType } from '@/types/user.ts'
import { transMenuRouter } from '@/utils/route.ts'
import type { MenuListType } from '@/views/sys/menu/menu.type'
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUserStore = defineStore('user', () => {
  const currentUser = ref<CurrentUserType | undefined>(undefined)

  const getCurrentUser = async () => {
    const res = await getUserInfoApi()
    currentUser.value = res.data
  }
  const menus = ref<MenuListType[]>([])
  const routesInitialized = ref(false)

  const renderRoutes = async () => {
    if (routesInitialized.value) {
      return menus.value.length > 0
    }

    const res = await getRoutesApi()
    menus.value = res.data

    // 没有菜单权限返回 false
    if (!menus.value || menus.value.length === 0) {
      routesInitialized.value = true
      return false
    }

    addRouter()
    routesInitialized.value = true
    return true
  }

  // 保存动态添加的路由名称，用于退出时删除
  const addedRouteNames = ref<string[]>([])

  const addRouter = () => {
    // 我需要递归去处理菜单信息
    const routes = transMenuRouter(menus.value)
    routes.forEach((item) => {
      if (!item.path.startsWith('http')) {
        router.addRoute(item)
        if (item.name) {
          addedRouteNames.value.push(item.name as string)
        }
      }
    })

    // 兜底 404 路由，必须在所有动态路由之后注册
    router.addRoute({
      path: '/:pathMatch(.*)*',
      name: 'NotFound',
      component: () => import('@/views/error/NotFound.vue'),
      meta: { title: '页面不存在' },
    })
    addedRouteNames.value.push('NotFound')

    return true
  }

  // 退出登录时清除状态
  const logout = async () => {
    try {
      // 调用服务端退出接口
      await logoutApi()
    } catch {
      // API 调用失败也继续清理本地状态
    }
    // 清除动态添加的路由
    addedRouteNames.value.forEach((name) => {
      router.removeRoute(name)
    })
    addedRouteNames.value = []
    routesInitialized.value = false
    // 清除状态
    currentUser.value = undefined
    menus.value = []
    // 清除锁屏状态
    const lockStore = useLockStore()
    lockStore.unlock()
    // 清除 tabs
    const tabsStore = useTabsStore()
    tabsStore.tabs = []
    tabsStore.activeTab = ''
    // 清除搜索条件
    const searchParamsStore = useSearchParamsStore()
    searchParamsStore.clearAllParams()
    // 清除 token
    clearTokens()
  }

  return { currentUser, getCurrentUser, menus, renderRoutes, logout }
})
