/**
 * 轮播图管理相关类型定义
 */
import type { PaginationParams } from './common'

/**
 * 轮播图类型
 * 1=首页轮播 2=顶部横幅
 */
export type BannerType = 1 | 2

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
  /** 轮播图类型（1首页轮播 2顶部横幅） */
  type: BannerType
}

/**
 * 轮播图列表查询参数
 */
export interface BannerListParams extends PaginationParams {
  /** 轮播图类型（1首页轮播 2顶部横幅） */
  type?: BannerType
  /** 是否显示 */
  show?: boolean
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
  /** 轮播图类型（1首页轮播 2顶部横幅） */
  type?: BannerType
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
  /** 轮播图类型（可选） */
  type?: BannerType
}

/**
 * 删除轮播图参数
 */
export interface DeleteBannerParams {
  /** 轮播图 ID 列表 */
  bannerIds: number[]
}
