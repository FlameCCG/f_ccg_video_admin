/**
 * TanStack Vue Query 全局配置
 * - 业务错误（无权限等）不重试，避免页面长时间 loading
 * - 统一 staleTime / gcTime / placeholderData，收敛各页面重复的 query 选项
 */
import { QueryClient, keepPreviousData } from '@tanstack/vue-query'
import { BusinessError } from './request'

/**
 * 默认新鲜期：30s 内重新挂载页面直接吃缓存，不再重复请求
 * （与各列表页已有的 `staleTime: 30 * 1000` 保持一致，页面可按需覆盖）
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
        staleTime: DEFAULT_STALE_TIME,
        gcTime: DEFAULT_GC_TIME,
        // 翻页 / 改筛选条件时沿用上一份数据占位：否则 data 会先清空，
        // total 归零后 DataTable 的 `v-if="pagination && total > 0"` 会连同
        // 分页器一起卸载重挂，每次点击翻页整块表格都要塌陷一次。
        // 加载状态改由 isFetching 表达（陈旧数据 + 顶部 loading）。
        placeholderData: keepPreviousData,
      },
      mutations: {
        retry: false,
      },
    },
  })
}
