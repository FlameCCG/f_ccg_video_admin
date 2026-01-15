/**
 * 评论管理相关类型定义
 */
import type { PaginationParams } from './common'

/**
 * 评论排序方式
 */
export type CommentSortType = 'latest' | 'oldest' | 'likes' | 'replies'

/**
 * 评论项
 */
export interface CommentItem {
  /** 评论 ID */
  id: number
  /** 用户 ID */
  userId: number
  /** 用户名 */
  username: string
  /** 用户头像 */
  avatar: string
  /** 评论内容 */
  content: string
  /** 点赞数 */
  likeCount: number
  /** 回复数 */
  replyCount: number
  /** 是否置顶 */
  isPinned: boolean
  /** 置顶时间 */
  pinnedAt: string
  /** 当前用户是否已点赞 */
  isLiked: boolean
  /** 创建时间 */
  createdAt: string
}

/**
 * 评论列表查询参数
 */
export interface CommentListParams extends PaginationParams {
  /** 用户 ID 筛选（可选） */
  userId?: number
  /** 用户名筛选（可选） */
  username?: string
  /** 关键词筛选（可选） */
  keyword?: string
  /** 排序方式（可选） */
  sort?: CommentSortType
}

/**
 * 删除评论参数
 */
export interface DeleteCommentParams {
  /** 评论 ID 列表 */
  commentIds: number[]
}

/**
 * 删除评论响应
 */
export interface DeleteCommentResult {
  /** 删除数量 */
  deleted: number
}
