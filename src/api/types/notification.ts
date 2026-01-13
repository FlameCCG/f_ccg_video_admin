/**
 * 通知管理相关类型定义
 */
import type { PaginationParams } from './common'

/**
 * 系统通知项
 */
export interface NotificationItem {
  /** 通知 ID */
  id: number
  /** 通知类型 */
  type: number
  /** 接收者用户 ID（-1 表示全员） */
  receiverID: number
  /** 操作用户 ID */
  actionUserID: number
  /** 操作用户头像 */
  actionUserAvatar: string
  /** 操作用户名 */
  actionUserName: string
  /** 通知标题 */
  title: string
  /** 通知内容 */
  content: string
  /** 外部链接 */
  link: string
  /** 视频 ID */
  articleID: number
  /** 视频标题 */
  articleTitle: string
  /** 评论 ID */
  commentID: number
  /** 是否已读 */
  isRead: boolean
}

/**
 * 通知列表查询参数
 */
export type NotificationListParams = PaginationParams

/**
 * 创建通知参数
 */
export interface CreateNotificationParams {
  /** 通知标题 */
  title: string
  /** 通知内容 */
  content: string
  /** 接收者 ID（-1 表示全员） */
  receiverId: number
  /** 关联视频 ID（可选） */
  videoId?: number
  /** 关联视频标题（可选） */
  videoTitle?: string
  /** 跳转链接（可选） */
  link?: string
}

/**
 * 更新通知参数
 */
export interface UpdateNotificationParams {
  /** 通知 ID */
  id: number
  /** 通知标题 */
  title: string
  /** 通知内容 */
  content: string
  /** 接收者 ID（-1 表示全员） */
  receiverId: number
  /** 关联视频 ID（可选） */
  videoId?: number
  /** 关联视频标题（可选） */
  videoTitle?: string
  /** 跳转链接（可选） */
  link?: string
}

/**
 * 删除通知参数
 */
export interface DeleteNotificationParams {
  /** 通知 ID 列表 */
  ids: number[]
}
