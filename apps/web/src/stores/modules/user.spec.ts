import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useUserStore } from './user'

const mockGetRoutesApi = vi.fn()
const mockLogoutApi = vi.fn()
const mockAddRoute = vi.fn()
const mockRemoveRoute = vi.fn()
const mockHasRoute = vi.fn()

vi.mock('@/api/auth.ts', () => ({
  getRoutesApi: (...args: Parameters<typeof mockGetRoutesApi>) => mockGetRoutesApi(...args),
  getUserInfoApi: vi.fn(),
  logoutApi: (...args: Parameters<typeof mockLogoutApi>) => mockLogoutApi(...args),
}))

vi.mock('@/router', () => ({
  default: {
    addRoute: (...args: Parameters<typeof mockAddRoute>) => mockAddRoute(...args),
    removeRoute: (...args: Parameters<typeof mockRemoveRoute>) => mockRemoveRoute(...args),
    hasRoute: (...args: Parameters<typeof mockHasRoute>) => mockHasRoute(...args),
  },
}))

vi.mock('@/stores/modules/lock', () => ({
  useLockStore: () => ({
    unlock: vi.fn(),
  }),
}))

vi.mock('@/stores/modules/tabs', () => ({
  useTabsStore: () => ({
    tabs: [],
    activeTab: '',
  }),
}))

vi.mock('@/stores/modules/searchParams', () => ({
  useSearchParamsStore: () => ({
    clearAllParams: vi.fn(),
  }),
}))

vi.mock('@/utils/auth.ts', () => ({
  clearTokens: vi.fn(),
}))

vi.mock('@/utils/route.ts', () => ({
  transMenuRouter: vi.fn(() => [
    {
      path: '/sys/user',
      name: 'sys-user',
      component: vi.fn(),
      meta: { title: '用户管理' },
    },
  ]),
}))

describe('useUserStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mockHasRoute.mockReturnValue(false)
    mockLogoutApi.mockResolvedValue(undefined)
  })

  it('renderRoutes 重复执行时不应重复注册动态路由', async () => {
    mockGetRoutesApi.mockResolvedValue({
      data: [
        {
          path: '/sys/user',
          name: 'sys-user',
          component: 'views/sys/user/user.vue',
          meta: { title: '用户管理' },
        },
      ],
    })

    const store = useUserStore()

    await store.renderRoutes()
    await store.renderRoutes()

    const routeNames = mockAddRoute.mock.calls.map(([route]) => route.name)

    expect(routeNames.filter((name) => name === 'sys-user')).toHaveLength(1)
    expect(routeNames.filter((name) => name === 'NotFound')).toHaveLength(1)
  })

  it('logout 后再次 renderRoutes 应重新注册动态路由', async () => {
    mockGetRoutesApi.mockResolvedValue({
      data: [
        {
          path: '/sys/user',
          name: 'sys-user',
          component: 'views/sys/user/user.vue',
          meta: { title: '用户管理' },
        },
      ],
    })

    const store = useUserStore()

    await store.renderRoutes()
    await store.logout()
    await store.renderRoutes()

    const routeNames = mockAddRoute.mock.calls.map(([route]) => route.name)

    expect(routeNames.filter((name) => name === 'sys-user')).toHaveLength(2)
    expect(routeNames.filter((name) => name === 'NotFound')).toHaveLength(2)
    expect(mockRemoveRoute).toHaveBeenCalledWith('sys-user')
    expect(mockRemoveRoute).toHaveBeenCalledWith('NotFound')
  })
})
