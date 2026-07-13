/**
 * 视频管理 API
 * Requirements: 9.1-9.6, 10.1-10.4, 11.1-11.3
 */
import request from '@/utils/request'
import type { PaginatedData, EmptyData } from './types/common'
import type {
  AdminVideoItem,
  VideoDetail,
  VideoListParams,
  VideoDetailParams,
  DeleteVideoParams,
  RestoreVideoParams,
  RestoreVideoResult,
  ReviewVideoParams,
  ReviewVideoResult,
  AdminDanmuItem,
  DanmuListParams,
  DeleteDanmuParams,
  DeleteDanmuResult,
  Partition,
  CreatePartitionParams,
  UpdatePartitionParams,
  DeletePartitionParams,
  VideoReportItem,
  DanmuReportItem,
  ReportListParams,
  HandleReportParams,
  HandleReportResult,
  TranscodeProgress,
} from './types'
import type { PaginationParams } from './types/common'

// ============ 视频管理 ============

/**
 * 获取视频列表
 * GET /admin/video/list
 */
export function getVideoList(params?: VideoListParams): Promise<PaginatedData<AdminVideoItem>> {
  return request.get('/admin/video/list', { params })
}

/**
 * 批量获取转码进度快照（首次加载与 SSE 重连同步）
 * GET /admin/video/transcode/progress
 */
export function getTranscodeProgress(videoIds: number[]): Promise<{ items: TranscodeProgress[] }> {
  return request.get('/admin/video/transcode/progress', {
    params: { videoIds: videoIds.join(',') },
  })
}

/**
 * 构建转码进度 SSE URL（EventSource 用 query token）
 * GET /admin/video/transcode/progress/stream
 */
export function buildTranscodeProgressStreamUrl(videoIds: number[], token: string): string {
  const params = new URLSearchParams()
  params.set('videoIds', videoIds.join(','))
  params.set('token', token)
  return `/v1/admin/video/transcode/progress/stream?${params.toString()}`
}

/**
 * 获取视频详情
 * GET /admin/video/detail
 */
export function getVideoDetail(params: VideoDetailParams): Promise<VideoDetail> {
  return request.get('/admin/video/detail', { params })
}

/**
 * 删除视频
 * DELETE /admin/video/delete
 */
export function deleteVideo(params: DeleteVideoParams): Promise<EmptyData> {
  return request.delete('/admin/video/delete', { data: params })
}

/**
 * 恢复视频
 * PUT /admin/video/restore
 */
export function restoreVideo(params: RestoreVideoParams): Promise<RestoreVideoResult> {
  return request.put('/admin/video/restore', params)
}

/**
 * 审核视频
 * PUT /admin/video/review
 */
export function reviewVideo(params: ReviewVideoParams): Promise<ReviewVideoResult> {
  return request.put('/admin/video/review', params)
}

// ============ 弹幕管理 ============

/**
 * 获取弹幕列表
 * GET /admin/video/danmu/list
 */
export function getDanmuList(params?: DanmuListParams): Promise<PaginatedData<AdminDanmuItem>> {
  return request.get('/admin/video/danmu/list', { params })
}

/**
 * 删除弹幕
 * DELETE /admin/video/danmu
 */
export function deleteDanmu(params: DeleteDanmuParams): Promise<DeleteDanmuResult> {
  return request.delete('/admin/video/danmu', { data: params })
}

// ============ 分区管理 ============

/**
 * 获取分区列表 (客户端可见)
 * GET /common/video/partitions
 */
export function getCommonPartitions(): Promise<Partition[]> {
  return request.get('/common/video/partitions')
}

/**
 * 获取分区列表
 * GET /admin/video/partitions
 */
export function getPartitions(params?: PaginationParams): Promise<PaginatedData<Partition>> {
  return request.get('/admin/video/partitions', { params })
}

/**
 * 创建分区
 * POST /admin/video/partition
 */
export function createPartition(params: CreatePartitionParams): Promise<Partition> {
  return request.post('/admin/video/partition', params)
}

/**
 * 更新分区
 * PUT /admin/video/partition
 */
export function updatePartition(params: UpdatePartitionParams): Promise<EmptyData> {
  return request.put('/admin/video/partition', params)
}

/**
 * 删除分区
 * DELETE /admin/video/partition
 */
export function deletePartition(params: DeletePartitionParams): Promise<EmptyData> {
  return request.delete('/admin/video/partition', { data: params })
}

// ============ 举报管理 ============

/**
 * 获取举报列表
 * GET /admin/video/report/list
 */
export function getReportList(
  params: ReportListParams
): Promise<PaginatedData<VideoReportItem | DanmuReportItem>> {
  return request.get('/admin/video/report/list', { params })
}

/**
 * 处理举报
 * PUT /admin/video/report/handle
 */
export function handleReport(params: HandleReportParams): Promise<HandleReportResult> {
  return request.put('/admin/video/report/handle', params)
}
