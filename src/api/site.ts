/**
 * 站点统计与配置 API
 * Requirements: 7.1, 7.2, 7.3
 */
import request from '@/utils/request'
import type { AdminSiteStats, SiteConfigName, SiteConfigMap } from './types'

/**
 * 获取站点统计数据
 * GET /admin/site/stats
 */
export function getSiteStats(): Promise<AdminSiteStats> {
  return request.get('/admin/site/stats')
}

/**
 * 获取站点配置
 * GET /admin/site/config/{name}
 */
export function getSiteConfig<T extends SiteConfigName>(name: T): Promise<SiteConfigMap[T]> {
  return request.get(`/admin/site/config/${name}`)
}

/**
 * 更新站点配置
 * PUT /admin/site/config/{name}
 */
export function updateSiteConfig<T extends SiteConfigName>(
  name: T,
  data: SiteConfigMap[T]
): Promise<void> {
  return request.put(`/admin/site/config/${name}`, data)
}
