/**
 * 动态管理相关类型定义
 */
import type { PaginationParams } from './common'

/**
 * 动态项
 */
export interface DynamicItem {
  /** 动态 ID */
  id: number
  /** 用户 ID */
  userId: number
  /** 动态内容 */
  content: string
  /** 图片 URL */
  imageUrl: string
  /** 是否置顶 */
  isPinned: boolean
  /** 创建时间 */
  createdAt: string
}

/**
 * 动态列表查询参数
 */
export interface DynamicListParams extends PaginationParams {
  /** 用户 ID 筛选（可选） */
  userId?: number
  /** 用户名筛选（可选） */
  username?: string
  /** 关键词筛选（可选） */
  keyword?: string
}

/**
 * 删除动态参数
 */
export interface DeleteDynamicParams {
  /** 动态 ID 列表 */
  dynamicIds: number[]
}

/**
 * 删除动态响应
 */
export interface DeleteDynamicResult {
  /** 删除数量 */
  deleted: number
}
