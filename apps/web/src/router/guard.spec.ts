import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockBeforeEach = vi.fn()
const mockGetToken = vi.fn()
const mockUseUserStore = vi.fn()

vi.mock('@/router/index.ts', () => ({
  default: {
    beforeEach: (...args: Parameters<typeof mockBeforeEach>) => mockBeforeEach(...args),
  },
}))

vi.mock('@/utils/auth.ts', () => ({
  getToken: (...args: Parameters<typeof mockGetToken>) => mockGetToken(...args),
}))

vi.mock('@/stores/modules/user', () => ({
  useUserStore: (...args: Parameters<typeof mockUseUserStore>) => mockUseUserStore(...args),
}))

describe('router guard', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('获取用户信息失败时应回退到登录页而不是中断导航', async () => {
    mockGetToken.mockReturnValue('access-token')
    mockUseUserStore.mockReturnValue({
      currentUser: undefined,
      getCurrentUser: vi.fn().mockRejectedValue(new Error('get user failed')),
      renderRoutes: vi.fn(),
    })

    await import('./guard.ts')

    const guard = mockBeforeEach.mock.calls[0][0]
    const next = vi.fn()

    await expect(
      guard(
        {
          path: '/sys/user',
          fullPath: '/sys/user',
          meta: { title: '用户管理' },
        },
        { path: '/' },
        next,
      ),
    ).resolves.toBeUndefined()

    expect(next).toHaveBeenCalledWith('/auth/login?redirect=/sys/user')
  })

  it('渲染动态路由失败时应回退到登录页而不是中断导航', async () => {
    mockGetToken.mockReturnValue('access-token')
    mockUseUserStore.mockReturnValue({
      currentUser: undefined,
      getCurrentUser: vi.fn().mockResolvedValue(undefined),
      renderRoutes: vi.fn().mockRejectedValue(new Error('render routes failed')),
      logout: vi.fn().mockResolvedValue(undefined),
    })

    await import('./guard.ts')

    const guard = mockBeforeEach.mock.calls[0][0]
    const next = vi.fn()

    await expect(
      guard(
        {
          path: '/sys/role',
          fullPath: '/sys/role',
          meta: { title: '角色管理' },
        },
        { path: '/' },
        next,
      ),
    ).resolves.toBeUndefined()

    expect(next).toHaveBeenCalledWith('/auth/login?redirect=/sys/role')
  })
})
