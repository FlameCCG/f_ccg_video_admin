/**
 * 站点统计 API
 * Requirements: 7.1
 */
import request from '@/utils/request'
import type { AdminSiteStats } from './types'

/**
 * 获取站点统计数据
 * GET /admin/site/stats
 */
export function getSiteStats(): Promise<AdminSiteStats> {
  return request.get('/admin/site/stats')
}
