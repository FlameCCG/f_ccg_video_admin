/**
 * 站点统计与配置 API
 * Requirements: 7.1, 7.2, 7.3
 */
import request from '@/utils/request'
import type { AdminSiteStats, SiteConfigName, SiteConfigMap, PublicConfigResponse } from './types'

/**
 * 获取公开站点配置（无需认证）
 * GET /common/site/config
 */
export function getPublicSiteConfig(): Promise<PublicConfigResponse> {
  return request.get('/common/site/config')
}

/**
 * 获取站点统计数据
 * GET /admin/site/stats
 */
export function getSiteStats(): Promise<AdminSiteStats> {
  return request.get('/admin/site/stats')
}

/**
 * API 响应包装类型
 * 后端返回的配置数据被包装在以配置名为 key 的对象中
 */
type SiteConfigResponse<T extends SiteConfigName> = {
  [K in T]: SiteConfigMap[K]
}

/**
 * 获取站点配置
 * GET /admin/site/config/{name}
 * 注意：后端返回 { [name]: config }，需要解包
 */
export async function getSiteConfig<T extends SiteConfigName>(name: T): Promise<SiteConfigMap[T]> {
  const response = await request.get<SiteConfigResponse<T>>(`/admin/site/config/${name}`)
  // 后端返回 { site: {...} } 或 { logger: {...} } 等，需要解包
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = response as any
  // 如果响应中包含配置名作为 key，则解包
  if (data && typeof data === 'object' && name in data) {
    return data[name] as SiteConfigMap[T]
  }
  // 否则直接返回（兼容直接返回配置对象的情况）
  return data as SiteConfigMap[T]
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
