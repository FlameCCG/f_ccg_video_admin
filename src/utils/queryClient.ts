/**
 * TanStack Vue Query 全局配置
 * - 业务错误（无权限等）不重试，避免页面长时间 loading
 * - 统一 staleTime / gcTime / placeholderData，收敛各页面重复的 query 选项
 */
import { QueryClient, keepPreviousData } from '@tanstack/vue-query'
import { BusinessError } from './request'
import { SessionExpiredError } from './authSession'

/**
 * 默认数据新鲜期为 30 秒，期间重新挂载页面可直接使用缓存；各页面可按需覆盖。
 */
export const DEFAULT_STALE_TIME = 30_000

/**
 * 默认缓存回收时长：5 分钟内返回上一个页面仍能命中缓存
 */
export const DEFAULT_GC_TIME = 5 * 60_000

/**
 * 判断 query 失败是否应重试
 * BusinessError 表示后端已明确返回业务失败，重试无意义
 */
export function shouldRetryQuery(failureCount: number, error: Error): boolean {
  if (error instanceof BusinessError || error instanceof SessionExpiredError) return false
  // 跨 bundle / 序列化边界时 instanceof 可能失效，回退 name 判断
  if (error?.name === 'BusinessError' || error?.name === 'SessionExpiredError') return false
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
        staleTime: DEFAULT_STALE_TIME,
        gcTime: DEFAULT_GC_TIME,
        // 翻页或修改筛选条件时使用上一份数据占位，保持 total 与分页器稳定。
        // isFetching 表示后台加载状态，并驱动顶部加载反馈。
        placeholderData: keepPreviousData,
      },
      mutations: {
        retry: false,
      },
    },
  })
}
