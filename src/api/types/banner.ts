/**
 * 轮播图管理相关类型定义
 */
import type { PaginationParams } from './common'

/**
 * 轮播图类型
 * 1=首页轮播 2=顶部横幅 3=用户主页横幅
 */
export type BannerType = 1 | 2 | 3

/**
 * 轮播图项
 */
export interface BannerItem {
  /** 轮播图 ID */
  id: number
  /** 图片链接 */
  cover: string
  /** 跳转链接 */
  href: string
  /** 是否显示 */
  show: boolean
  /** 轮播图类型（1首页/分区轮播图 2顶部横幅 3用户主页横幅） */
  type: BannerType
  /** 分区 ID（0 代表首页） */
  partitionId: number
}

/**
 * 轮播图列表查询参数
 */
export interface BannerListParams extends PaginationParams {
  /** 轮播图类型（1首页轮播 2顶部横幅 3用户主页横幅） */
  type?: BannerType
  /** 是否显示 */
  show?: boolean
  /** 分区 ID */
  partitionId?: number
}

/**
 * 创建轮播图参数
 */
export interface CreateBannerParams {
  /** 图片链接 */
  cover: string
  /** 跳转链接 */
  href?: string
  /** 是否显示 */
  show?: boolean
  /** 轮播图类型（1首页/分区轮播图 2顶部横幅 3用户主页横幅） */
  type?: BannerType
  /** 分区 ID */
  partitionId?: number
}

/**
 * 更新轮播图参数
 */
export interface UpdateBannerParams {
  /** 轮播图 ID */
  id: number
  /** 图片链接（可选） */
  cover?: string
  /** 跳转链接（可选） */
  href?: string
  /** 是否显示（可选） */
  show?: boolean
  /** 轮播图类型（可选，1首页/分区轮播图 2顶部横幅 3用户主页横幅） */
  type?: BannerType
  /** 分区 ID（可选） */
  partitionId?: number
}

/**
 * 删除轮播图参数
 */
export interface DeleteBannerParams {
  /** 轮播图 ID 列表 */
  bannerIds: number[]
}

/**
 * 设置用户注册时主页默认横幅参数
 */
export interface SetRegisterDefaultBannerParams {
  /** 全局默认用户注册时主页横幅 ID */
  bannerId: number
}

/**
 * 维护系统默认用户主页横幅列表操作类型
 * 1=添加 2=删除
 */
export type UpdateDefaultUserBannerListAction = 1 | 2

/**
 * 维护系统默认用户主页横幅列表参数
 */
export interface UpdateDefaultUserBannerListParams {
  /** 要添加或删除的横幅 ID 列表 */
  bannerIds: number[]
  /** 操作类型（1添加 2删除） */
  action: UpdateDefaultUserBannerListAction
}

/**
 * 维护系统默认用户主页横幅列表响应
 */
export interface UpdateDefaultUserBannerListResult {
  /** 更新后的系统默认用户主页横幅 ID 列表 */
  bannerIds: number[]
}
