import { beforeEach, describe, expect, it, vi } from 'vitest'

const createMockStore = () => ({
  isLocked: false,
})

const mockRouter = {
  currentRoute: {
    value: {
      fullPath: '/sys/user',
    },
  },
  push: vi.fn(),
}

const tokenState = {
  token: 'expired-access-token',
  refreshToken: 'expired-refresh-token',
}

const mockLockStore = createMockStore()
const mockElMessageError = vi.fn()

const mockAxiosPost = vi.fn()

function create401Error(url: string, config?: Record<string, unknown>) {
  return {
    config: {
      url,
      method: 'get',
      headers: {},
      ...config,
    },
    response: {
      status: 401,
      data: {
        message: '登录状态已过期',
      },
    },
    message: 'Request failed with status code 401',
  }
}

vi.mock('axios', async () => {
  const actual = await vi.importActual<typeof import('axios')>('axios')
  return {
    ...actual,
    default: {
      ...actual.default,
      create: actual.default.create,
      post: (...args: Parameters<typeof mockAxiosPost>) => mockAxiosPost(...args),
    },
  }
})

vi.mock('@/constants/constant.ts', () => ({
  BASE_API: '/api',
}))

vi.mock('@/utils/auth.ts', () => ({
  getToken: () => tokenState.token,
  setToken: (token: string) => {
    tokenState.token = token
  },
  getRefreshToken: () => tokenState.refreshToken,
  clearTokens: () => {
    tokenState.token = null
    tokenState.refreshToken = null
  },
}))

vi.mock('@/router', () => ({
  default: mockRouter,
}))

vi.mock('@/stores/modules/lock', () => ({
  useLockStore: () => mockLockStore,
}))

vi.mock('element-plus', () => ({
  ElMessage: {
    error: (...args: Parameters<typeof mockElMessageError>) => mockElMessageError(...args),
  },
}))

describe('request token refresh queue', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    tokenState.token = 'expired-access-token'
    tokenState.refreshToken = 'expired-refresh-token'
    mockLockStore.isLocked = false
    mockRouter.currentRoute.value.fullPath = '/sys/user'
  })

  it('refresh 失败时应 reject 所有排队请求并清理登录态', async () => {
    mockAxiosPost.mockRejectedValueOnce(new Error('refresh failed'))

    const { default: request } = await import('./request.ts')

    const firstPromise = request.interceptors.response.handlers[0].rejected(create401Error('/sys/user'))
    const secondPromise = request.interceptors.response.handlers[0].rejected(create401Error('/sys/role'))

    await expect(firstPromise).rejects.toThrow('refresh failed')
    await expect(secondPromise).rejects.toThrow('refresh failed')

    expect(mockAxiosPost).toHaveBeenCalledTimes(1)
    expect(mockRouter.push).toHaveBeenCalledWith('/auth/login?redirect=%2Fsys%2Fuser')
    expect(tokenState.token).toBeNull()
    expect(tokenState.refreshToken).toBeNull()
  })

  it('排队请求重试后再次收到 401 时不应触发二次 refresh', async () => {
    mockAxiosPost.mockResolvedValue({
      data: {
        data: {
          accessToken: 'new-access-token',
        },
      },
    })

    const { default: request } = await import('./request.ts')

    request.defaults.adapter = vi.fn(async (config) => {
      throw create401Error(config.url || '', config)
    })

    const firstPromise = request.get('/sys/user')
    const secondPromise = request.get('/sys/role')

    await expect(firstPromise).rejects.toMatchObject({
      response: {
        status: 401,
      },
    })
    await expect(secondPromise).rejects.toMatchObject({
      response: {
        status: 401,
      },
    })

    expect(mockAxiosPost).toHaveBeenCalledTimes(1)
  })

  it('锁屏状态下应拦截业务请求但放行 auth 请求', async () => {
    mockLockStore.isLocked = true

    const { default: request } = await import('./request.ts')

    const requestFulfilled = request.interceptors.request.handlers[0].fulfilled

    await expect(
      requestFulfilled({
        url: '/sys/user',
        headers: {},
      }),
    ).rejects.toThrow('屏幕已锁定')

    expect(
      requestFulfilled({
        url: '/auth/login',
        headers: {},
      }),
    ).toMatchObject({
      url: '/auth/login',
    })
  })

  it('401 且没有 refreshToken 时应直接清理登录态并跳转登录页', async () => {
    tokenState.refreshToken = null

    const { default: request } = await import('./request.ts')

    await expect(
      request.interceptors.response.handlers[0].rejected(create401Error('/sys/user')),
    ).rejects.toMatchObject({
      response: {
        status: 401,
      },
    })

    expect(mockAxiosPost).not.toHaveBeenCalled()
    expect(mockRouter.push).toHaveBeenCalledWith('/auth/login?redirect=%2Fsys%2Fuser')
    expect(tokenState.token).toBeNull()
    expect(tokenState.refreshToken).toBeNull()
  })
})
