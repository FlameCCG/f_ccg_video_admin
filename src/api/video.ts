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

/**
 * 删除弹幕
 * DELETE /admin/video/danmu
 */
export function deleteDanmu(params: DeleteDanmuParams): Promise<DeleteDanmuResult> {
  return request.delete('/admin/video/danmu', { data: params })
}

// ============ 分区管理 ============

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
