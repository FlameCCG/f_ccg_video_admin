/**
 * 通知管理 API
 * Requirements: 15.1-15.4
 */
import request from '@/utils/request'
import type { PaginatedData, EmptyData } from './types/common'
import type {
  NotificationItem,
  NotificationListParams,
  CreateNotificationParams,
  UpdateNotificationParams,
  DeleteNotificationParams,
} from './types'

/**
 * 获取通知列表
 * GET /admin/notification
 */
export function getNotificationList(
  params?: NotificationListParams
): Promise<PaginatedData<NotificationItem>> {
  return request.get('/admin/notification', { params })
}

/**
 * 发送系统通知
 * POST /admin/notification
 */
export function createNotification(params: CreateNotificationParams): Promise<EmptyData> {
  return request.post('/admin/notification', params)
}

/**
 * 更新系统通知
 * PUT /admin/notification
 */
export function updateNotification(params: UpdateNotificationParams): Promise<EmptyData> {
  return request.put('/admin/notification', params)
}

/**
 * 删除系统通知
 * DELETE /admin/notification
 */
export function deleteNotification(params: DeleteNotificationParams): Promise<EmptyData> {
  return request.delete('/admin/notification', { data: params })
}
