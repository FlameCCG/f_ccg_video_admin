/**
 * 动态管理 API
 * Requirements: 13.1-13.3
 */
import request from '@/utils/request'
import type { PaginatedData } from './types/common'
import type {
  DynamicItem,
  DynamicListParams,
  DeleteDynamicParams,
  DeleteDynamicResult,
} from './types'

/**
 * 获取动态列表
 * GET /admin/dynamic/list
 */
export function getDynamicList(
  params?: DynamicListParams,
  signal?: AbortSignal
): Promise<PaginatedData<DynamicItem>> {
  return request.get('/admin/dynamic/list', { params, signal })
}

/**
 * 删除动态
 * DELETE /admin/dynamic
 */
export function deleteDynamic(params: DeleteDynamicParams): Promise<DeleteDynamicResult> {
  return request.delete('/admin/dynamic', { data: params })
}
