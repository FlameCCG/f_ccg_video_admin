/**
 * TanStack Vue Query 全局配置
 * - 业务错误（无权限等）不重试，避免页面长时间 loading
 */
import { QueryClient } from '@tanstack/vue-query'
import { BusinessError } from './request'

/**
 * 判断 query 失败是否应重试
 * BusinessError 表示后端已明确返回业务失败，重试无意义
 */
export function shouldRetryQuery(failureCount: number, error: Error): boolean {
  if (error instanceof BusinessError) return false
  // 跨 bundle / 序列化边界时 instanceof 可能失效，回退 name 判断
  if (error?.name === 'BusinessError') return false
  return failureCount < 2
}

/**
 * 创建全局 QueryClient
 */
export function createAppQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: shouldRetryQuery,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: false,
      },
    },
  })
}
