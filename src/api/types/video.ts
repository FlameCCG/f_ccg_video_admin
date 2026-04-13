/**
 * 视频管理相关类型定义
 */
import type { PaginationParams } from './common'

/**
 * 视频状态
 * 1=已发布 2=私密 3=已删除 4=审核中
 */
export type VideoStatus = 1 | 2 | 3 | 4

/**
 * 视频排序方式
 */
export type VideoSortType = 'latest' | 'oldest' | 'views' | 'likes' | 'duration'

/**
 * 举报类型
 */
export type ReportType = 'video' | 'danmu'

/**
 * 举报处理状态
 * 1=待处理 2=已处理 3=已驳回
 */
export type ReportStatus = 1 | 2 | 3

/**
 * 审核结果状态
 * 1=通过发布 2=转私密 3=驳回删除
 */
export type ReviewStatus = 1 | 2 | 3

/**
 * 视频作者信息
 */
export interface VideoAuthor {
  /** 用户 ID */
  id: number
  /** 用户名 */
  username: string
  /** 头像 URL */
  avatar: string
}

/**
 * 视频作者详细信息（用于详情页）
 */
export interface VideoAuthorDetail extends VideoAuthor {
  /** 用户等级 */
  level: number
  /** 个人简介 */
  description: string
}

/**
 * 视频列表项
 */
export interface AdminVideoItem {
  /** 视频 ID */
  id: number
  /** 标题 */
  title: string
  /** 封面 */
  cover: string
  /** 时长（秒） */
  duration: number
  /** 播放数 */
  views: number
  /** 点赞数 */
  likes: number
  /** 评论数 */
  commentCount: number
  /** 投币数 */
  coinCount: number
  /** 收藏数 */
  favoriteCount: number
  /** 弹幕数 */
  danmuCount: number
  /** 是否原创 */
  isOriginal: boolean
  /** 存储类型 */
  storageType: string
  /** 视频状态 */
  status: VideoStatus
  /** 分区 ID */
  partitionId: number
  /** 分区名称 */
  partitionName: string
  /** 作者信息 */
  author: VideoAuthor
  /** 创建时间 */
  createdAt: string
}

/**
 * 视频分区信息
 */
export interface VideoPartition {
  /** 分区 ID */
  id: number
  /** 分区名称 */
  name: string
  /** 分区图标 */
  icon: string
  /** 是否启用 */
  isActive: boolean
  /** 是否允许投稿 */
  isSubmittable: boolean
}

/**
 * 视频标签
 */
export interface VideoTag {
  /** 标签 ID */
  id: number
  /** 标签名称 */
  name: string
}

/**
 * 视频资源
 */
export interface VideoResource {
  /** 资源 ID */
  id: number
  /** 清晰度描述 */
  resolution: string
  /** 源文件名 */
  sourceFileName: string
  /** 文件 URL */
  fileUrl: string
  /** 文件大小（字节） */
  fileSize: number
  /** 码率 (kbps) */
  bitrate: number
  /** 格式 */
  format: string
  /** 编码 */
  codec: string
  /** 是否需要 VIP */
  isVip: boolean
  /** 是否为源文件 */
  isSource: boolean
}

/**
 * 视频分P
 */
export interface VideoPart {
  /** 分P ID */
  id: number
  /** 分P标题 */
  title: string
  /** 排序 */
  sortOrder: number
  /** 时长（秒） */
  duration: number
  /** 弹幕数 */
  danmuCount: number
  /** 分P资源列表 */
  resources: VideoResource[]
}

/**
 * 视频详情
 */
export interface VideoDetail {
  /** 视频 ID */
  id: number
  /** 标题 */
  title: string
  /** 描述 */
  description: string
  /** 封面 */
  cover: string
  /** 时长（秒） */
  duration: number
  /** 播放数 */
  views: number
  /** 点赞数 */
  likes: number
  /** 评论数 */
  commentCount: number
  /** 投币数 */
  coinCount: number
  /** 收藏数 */
  favoriteCount: number
  /** 弹幕数 */
  danmuCount: number
  /** 是否原创 */
  isOriginal: boolean
  /** 存储类型 */
  storageType: string
  /** 视频状态 */
  status: VideoStatus
  /** 创建时间 */
  createdAt: string
  /** 分区信息 */
  partition: VideoPartition
  /** 作者信息 */
  author: VideoAuthorDetail
  /** 标签列表 */
  tags: VideoTag[]
  /** 视频资源列表（非分P视频或分P视频的主资源） */
  resources: VideoResource[]
  /** 分P列表（分P视频才有） */
  parts: VideoPart[]
  /** 当前用户是否点赞 */
  isLiked: boolean
  /** 当前用户是否收藏 */
  isFavorited: boolean
  /** 当前用户是否投币 */
  isCoined: boolean
}

/**
 * 视频列表查询参数
 */
export interface VideoListParams extends PaginationParams {
  /** 作者用户 ID（可选） */
  userId?: number
  /** 标题/描述关键词（可选） */
  keyword?: string
  /** 视频状态 */
  status?: VideoStatus
  /** 分区 ID（可选） */
  partitionId?: number
  /** 排序方式 */
  sort?: VideoSortType
}

/**
 * 视频详情查询参数
 */
export interface VideoDetailParams {
  /** 视频 ID */
  videoId: number
}

/**
 * 删除视频参数
 */
export interface DeleteVideoParams {
  /** 视频 ID 列表 */
  videoIds: number[]
  /** 是否物理删除（默认 false） */
  hardDelete?: boolean
}

/**
 * 恢复视频参数
 */
export interface RestoreVideoParams {
  /** 视频 ID 列表 */
  videoIds: number[]
}

/**
 * 恢复视频响应
 */
export interface RestoreVideoResult {
  /** 恢复数量 */
  restored: number
}

/**
 * 审核视频参数
 */
export interface ReviewVideoParams {
  /** 视频 ID 列表 */
  videoIds: number[]
  /** 审核结果（1通过发布 2转私密 3驳回删除） */
  status: ReviewStatus
}

/**
 * 审核视频响应
 */
export interface ReviewVideoResult {
  /** 更新数量 */
  updated: number
}

/**
 * 弹幕位置类型
 * 0=滚动 1=顶部 2=底部
 */
export type DanmuPosition = 0 | 1 | 2

/**
 * 弹幕列表项
 */
export interface AdminDanmuItem {
  /** 弹幕 ID */
  id: number
  /** 用户 ID */
  userId: number
  /** 用户名 */
  username: string
  /** 用户头像 */
  avatar: string
  /** 视频 ID */
  videoId: number
  /** 视频标题 */
  videoTitle: string
  /** 视频封面 */
  videoCover: string
  /** 分P ID */
  videoPartId: number
  /** 弹幕内容 */
  content: string
  /** 弹幕时间偏移(秒) */
  timeOffset: number
  /** 弹幕颜色 */
  color: string
  /** 字体大小 */
  fontSize: number
  /** 位置: 0-滚动 1-顶部 2-底部 */
  position: DanmuPosition
  /** 点赞数 */
  likeCount: number
  /** 创建时间 */
  createdAt: string
}

/**
 * 弹幕列表查询参数
 */
export interface DanmuListParams extends PaginationParams {
  /** 用户 ID 筛选（可选） */
  userId?: number
  /** 用户名筛选（可选） */
  username?: string
  /** 关键词筛选（可选） */
  keyword?: string
}

/**
 * 删除弹幕参数
 */
export interface DeleteDanmuParams {
  /** 弹幕 ID 列表 */
  danmuIds: number[]
}

/**
 * 删除弹幕响应
 */
export interface DeleteDanmuResult {
  /** 删除数量 */
  deleted: number
}

/**
 * 分区
 */
export interface Partition {
  /** 分区 ID */
  id: number
  /** 分区名称 */
  name: string
  /** 分区图标（SVG 字符串） */
  icon: string
  /** 排序顺序 */
  sortOrder: number
  /** 是否启用 */
  isActive: boolean
  /** 是否允许投稿 */
  isSubmittable: boolean
}

/**
 * 创建分区参数
 */
export interface CreatePartitionParams {
  /** 分区名称 */
  name: string
  /** 分区图标（SVG 字符串，可选） */
  icon?: string
  /** 排序顺序（可选） */
  sortOrder?: number
  /** 是否启用 */
  isActive?: boolean
  /** 是否允许投稿 */
  isSubmittable?: boolean
}

/**
 * 更新分区参数
 */
export interface UpdatePartitionParams {
  /** 分区 ID */
  id: number
  /** 分区名称 */
  name: string
  /** 分区图标（SVG 字符串，可选） */
  icon?: string
  /** 排序顺序（可选） */
  sortOrder?: number
  /** 是否启用 */
  isActive?: boolean
  /** 是否允许投稿 */
  isSubmittable?: boolean
}

/**
 * 删除分区参数
 */
export interface DeletePartitionParams {
  /** 分区 ID */
  id: number
}

/**
 * 视频举报项
 */
export interface VideoReportItem {
  /** 举报 ID */
  id: number
  /** 举报人用户名 */
  reporterUsername: string
  /** 视频 ID */
  videoId: number
  /** 视频标题 */
  videoTitle: string
  /** 视频封面 */
  videoCover: string
  /** 举报原因 */
  reason: string
  /** 举报详情 */
  detail: string
  /** 证据图片 */
  imageUrls: string[]
  /** 处理状态 */
  status: ReportStatus
  /** 处理说明 */
  handleNote: string
  /** 处理人 ID */
  handledBy: number
  /** 处理时间 */
  handledAt: string
  /** 举报时间 */
  createdAt: string
}

/**
 * 弹幕举报项
 */
export interface DanmuReportItem {
  /** 举报 ID */
  id: number
  /** 举报人用户名 */
  reporterUsername: string
  /** 弹幕 ID */
  danmuId: number
  /** 弹幕内容 */
  danmuContent: string
  /** 视频 ID */
  videoId: number
  /** 视频标题 */
  videoTitle: string
  /** 举报原因 */
  reason: string
  /** 举报详情 */
  detail: string
  /** 证据图片 */
  imageUrls: string[]
  /** 处理状态 */
  status: ReportStatus
  /** 处理说明 */
  handleNote: string
  /** 处理人 ID */
  handledBy: number
  /** 处理时间 */
  handledAt: string
  /** 举报时间 */
  createdAt: string
}

/**
 * 举报项（联合类型）
 */
export type ReportItem = VideoReportItem | DanmuReportItem

/**
 * 举报列表查询参数
 */
export interface ReportListParams extends PaginationParams {
  /** 举报类型 */
  type: ReportType
  /** 处理状态（1待处理 2已处理 3已驳回） */
  status?: ReportStatus
}

/**
 * 处理举报参数
 */
export interface HandleReportParams {
  /** 举报类型 */
  type: ReportType
  /** 举报记录 ID 列表 */
  reportIds: number[]
  /** 处理状态（2已处理 3已驳回） */
  status: 2 | 3
  /** 处理说明（可选） */
  handleNote?: string
}

/**
 * 处理举报响应
 */
export interface HandleReportResult {
  /** 实际处理数量 */
  handled: number
}
