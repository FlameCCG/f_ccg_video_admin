/**
 * Axios 请求层封装
 * 实现统一的请求/响应拦截、Token 管理、错误处理
 * Requirements: 4.2, 4.3, 4.4, 4.5
 */
import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios'
import { getAccessToken, getRefreshToken, setTokens, clearTokens } from './storage'

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

  constructor(code: number, message: string) {
    super(message)
    this.code = code
    this.name = 'BusinessError'
  }
}

/**
 * Token 刷新响应数据
 */
interface RefreshTokenResponse {
  accessToken: string
  refreshToken: string
}

// ==================== Token 刷新 Single-Flight ====================

/**
 * Token 刷新器
 * 实现 Single-Flight 模式，防止并发刷新
 */
class TokenRefresher {
  private refreshing: Promise<string> | null = null

  /**
   * 刷新 Token
   * 如果已有刷新请求在进行中，返回同一个 Promise
   */
  async refresh(): Promise<string> {
    if (this.refreshing) {
      return this.refreshing
    }

    this.refreshing = this.doRefresh()

    try {
      return await this.refreshing
    } finally {
      this.refreshing = null
    }
  }

  /**
   * 执行实际的刷新请求
   */
  private async doRefresh(): Promise<string> {
    const refreshToken = getRefreshToken()

    if (!refreshToken) {
      throw new Error('No refresh token available')
    }

    // 直接使用 axios 发送请求，绕过拦截器避免循环
    const response = await axios.post<ApiResponse<RefreshTokenResponse>>(
      '/v1/common/user/login/refresh',
      { refreshToken },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )

    const { code, data, msg } = response.data

    if (code === 0 && data) {
      setTokens(data.accessToken, data.refreshToken)
      return data.accessToken
    }

    // 刷新失败
    throw new Error(msg || 'Token refresh failed')
  }

  /**
   * 检查是否正在刷新
   */
  isRefreshing(): boolean {
    return this.refreshing !== null
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
const tokenRefresher = new TokenRefresher()

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
async function handleTokenError(config: AxiosRequestConfig): Promise<AxiosResponse> {
  try {
    const newToken = await tokenRefresher.refresh()

    // 重试原请求
    const retryConfig: AxiosRequestConfig = {
      ...config,
      headers: {
        ...config.headers,
        Authorization: `Bearer ${newToken}`,
      },
    }

    return request(retryConfig)
  } catch {
    // 刷新失败，先清除 token 再跳转登录（防止循环刷新）
    clearTokens()
    redirectToLogin()
    return Promise.reject(new BusinessError(1, '认证失败，请重新登录'))
  }
}

request.interceptors.response.use(
  async (response: AxiosResponse<ApiResponse>) => {
    const { code, msg, data } = response.data

    // 业务成功
    if (code === 0) {
      // 返回 data 部分，简化调用方使用
      return data as AxiosResponse
    }

    // 普通业务错误 - 显示 msg 提示
    showErrorMessage(msg)
    return Promise.reject(new BusinessError(code, msg))
  },
  async (error: unknown) => {
    // 网络错误或非 200 状态码
    if (axios.isAxiosError(error)) {
      const status = error.response?.status

      // 401 状态码 - 尝试刷新 Token
      if (status === 401 && error.config) {
        return handleTokenError(error.config)
      }

      // 其他网络错误
      const errorMsg = error.response ? `请求失败: ${status}` : '网络连接失败，请检查网络'

      showErrorMessage(errorMsg)
    } else {
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
