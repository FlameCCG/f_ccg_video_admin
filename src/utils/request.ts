/**
 * Axios 请求层封装
 * 实现统一的请求/响应拦截、Token 管理、错误处理
 */
import axios, {
  CanceledError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios'
import {
  getAccessToken,
  isAuthenticationError,
  isLoginRequest,
  refreshAccessToken,
  isRefreshingTokens,
  setSessionExpiredHandler,
  SessionExpiredError,
  isAuthNavigationPending,
} from './authSession'
import { useUserStore } from '@/stores/user'
import { usePermissionStore } from '@/stores/permission'

// ==================== 类型定义 ====================

/**
 * API 统一响应结构
 * code: 0 = 成功, 1 = 失败
 */
export interface ApiResponse<T = unknown> {
  code: 0 | 1
  data: T
  msg: string
}

/**
 * 业务错误类
 */
export class BusinessError extends Error {
  code: number
  readonly data: unknown

  constructor(code: number, message: string, data?: unknown) {
    super(message)
    this.code = code
    this.data = data
    this.name = 'BusinessError'
  }
}

// ==================== 错误消息显示 ====================

/**
 * 显示错误消息
 * 这里使用简单的 console，实际项目中应该使用 Naive UI 的 Message 组件
 * 后续会在 main.ts 中注入实际的消息显示函数
 */
let showErrorMessage: (msg: string) => void = (msg: string) => {
  console.error('[API Error]', msg)
}

/**
 * 设置错误消息显示函数
 * 用于在应用初始化时注入 Naive UI 的 Message 组件
 */
export function setErrorMessageHandler(handler: (msg: string) => void): void {
  showErrorMessage = handler
}

// ==================== 路由跳转 ====================

/**
 * 跳转到登录页
 * 这里使用简单的 location，实际项目中应该使用 vue-router
 * 后续会在 main.ts 中注入实际的路由跳转函数
 */
let redirectToLogin: () => void = () => {
  window.location.href = '/login'
}

/**
 * 设置登录页跳转函数
 * 用于在应用初始化时注入 vue-router 的跳转方法
 */
export function setLoginRedirectHandler(handler: () => void): void {
  redirectToLogin = handler
}

// ==================== Axios 扩展配置 ====================

declare module 'axios' {
  export interface AxiosRequestConfig {
    /** 为 true 时不自动弹出业务错误 toast，由调用方自行处理 */
    silent?: boolean
  }
}

// ==================== 创建 Axios 实例 ====================

/**
 * 创建配置好的 Axios 实例
 */
function createAxiosInstance(): AxiosInstance {
  const instance = axios.create({
    baseURL: '/v1',
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
    },
  })

  return instance
}

// 创建实例
const request = createAxiosInstance()

// 创建 Token 刷新器
const tokenRefresher = {
  refresh: refreshAccessToken,
  isRefreshing: () => isRefreshingTokens.value,
}
setSessionExpiredHandler((message) => {
  useUserStore().resetUser()
  usePermissionStore().resetPermission()
  showErrorMessage(message)
})

// ==================== 请求拦截器 ====================

/**
 * 请求拦截器
 * 自动携带 Authorization header
 */
request.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getAccessToken()

    if (token) {
      config.headers = config.headers || {}
      config.headers['Authorization'] = `Bearer ${token}`
    }

    return config
  },
  (error: unknown) => {
    // Ensure we reject with an Error object
    if (error instanceof Error) {
      return Promise.reject(error)
    }
    return Promise.reject(new Error(String(error)))
  }
)

// ==================== 响应拦截器 ====================

/**
 * 处理 Token 错误
 * 尝试刷新 Token 并重试原请求
 */
async function handleTokenError(
  config: AxiosRequestConfig & { _authRetry?: boolean }
): Promise<AxiosResponse> {
  if (config.signal?.aborted) throw new CanceledError()
  if (config._authRetry || isLoginRequest(config.url)) {
    throw new BusinessError(1, '登录状态验证失败，请重试')
  }
  config._authRetry = true
  const authorization: unknown = config.headers?.Authorization
  const failedToken = typeof authorization === 'string' ? authorization.replace(/^Bearer /, '') : ''
  let newToken: string
  try {
    newToken = await tokenRefresher.refresh(failedToken)
  } catch (error) {
    if (error instanceof SessionExpiredError && !isAuthNavigationPending()) redirectToLogin()
    if (
      !axios.isCancel(error) &&
      !config.silent &&
      !(error instanceof SessionExpiredError && error.notified)
    ) {
      const message = axios.isAxiosError<{ msg?: string }>(error)
        ? error.response?.data?.msg || '网络连接失败，请检查网络'
        : error instanceof Error
          ? error.message
          : '请求失败'
      showErrorMessage(message)
    }
    throw error
  }
  if (config.signal?.aborted) throw new CanceledError()
  return request({ ...config, headers: { ...config.headers, Authorization: `Bearer ${newToken}` } })
}

request.interceptors.response.use(
  async (response: AxiosResponse<ApiResponse>) => {
    const { code, msg, data } = response.data

    // 业务成功
    if (code === 0) {
      // 返回 data 部分，简化调用方使用
      return data as AxiosResponse
    }

    if (code === 1 && isAuthenticationError(msg) && !isLoginRequest(response.config.url)) {
      return handleTokenError(response.config)
    }

    // 普通业务错误（含无权限等）- 展示后端 msg，并 reject 供调用方结束 loading
    const errorMsg = (typeof msg === 'string' && msg.trim()) || '请求失败'
    if (!response.config?.silent) {
      showErrorMessage(errorMsg)
    }
    return Promise.reject(new BusinessError(code, errorMsg, data))
  },
  async (error: unknown) => {
    // 筛选变化/翻页会取消过期查询，这是正常控制流，不应弹出网络错误。
    if (axios.isCancel(error)) return Promise.reject(error)

    // 网络错误或非 200 状态码
    if (axios.isAxiosError(error)) {
      const status = error.response?.status
      const silent = Boolean(error.config?.silent)

      // 401 状态码 - 尝试刷新 Token
      if (status === 401 && error.config && !isLoginRequest(error.config.url)) {
        return handleTokenError(error.config)
      }

      // 业务体可能挂在 HTTP 4xx 上（部分网关/中间层）
      const body = error.response?.data as ApiResponse | undefined
      if (body && typeof body === 'object' && body.code === 1 && body.msg) {
        const bizMsg = body.msg.trim() || '请求失败'
        if (!silent) {
          showErrorMessage(bizMsg)
        }
        return Promise.reject(new BusinessError(1, bizMsg, body.data))
      }

      // 其他网络错误
      const errorMsg = error.response ? `请求失败: ${status}` : '网络连接失败，请检查网络'

      if (!silent) {
        showErrorMessage(errorMsg)
      }
    } else if (!(error instanceof BusinessError)) {
      showErrorMessage('请求发生未知错误')
    }

    // Ensure we reject with an Error object
    if (error instanceof Error) {
      return Promise.reject(error)
    }
    return Promise.reject(new Error(String(error)))
  }
)

// ==================== 导出 ====================

export { request, tokenRefresher }
export default request
