/**
 * 轮播图管理 API
 * Requirements: 14.1-14.5
 */
import request from '@/utils/request'
import type { PaginatedData, EmptyData } from './types/common'
import type {
  BannerItem,
  BannerListParams,
  CreateBannerParams,
  UpdateBannerParams,
  DeleteBannerParams,
  SetRegisterDefaultBannerParams,
  UpdateDefaultUserBannerListParams,
  UpdateDefaultUserBannerListResult,
} from './types'

/**
 * 获取轮播图列表
 * GET /admin/banners
 */
export function getBannerList(params?: BannerListParams): Promise<PaginatedData<BannerItem>> {
  return request.get('/admin/banners', { params })
}

/**
 * 创建轮播图
 * POST /admin/banner
 */
export function createBanner(params: CreateBannerParams): Promise<BannerItem> {
  return request.post('/admin/banner', params)
}

/**
 * 更新轮播图
 * PUT /admin/banner
 */
export function updateBanner(params: UpdateBannerParams): Promise<EmptyData> {
  return request.put('/admin/banner', params)
}

/**
 * 删除轮播图
 * DELETE /admin/banner
 */
export function deleteBanner(params: DeleteBannerParams): Promise<EmptyData> {
  return request.delete('/admin/banner', { data: params })
}

/**
 * 设置用户注册时主页默认横幅
 * PUT /admin/user/banner
 */
export function setRegisterDefaultBanner(
  params: SetRegisterDefaultBannerParams
): Promise<EmptyData> {
  return request.put('/admin/user/banner', params)
}

/**
 * 维护系统默认用户主页横幅列表
 * PUT /admin/user/banner/defaults
 */
export function updateDefaultUserBannerList(
  params: UpdateDefaultUserBannerListParams
): Promise<UpdateDefaultUserBannerListResult> {
  return request.put('/admin/user/banner/defaults', params)
}
