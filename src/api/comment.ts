/**
 * 评论管理 API
 * Requirements: 12.1-12.3
 */
import request from '@/utils/request'
import type { PaginatedData } from './types/common'
import type {
  CommentItem,
  CommentListParams,
  DeleteCommentParams,
  DeleteCommentResult,
} from './types'

/**
 * 获取评论列表
 * GET /admin/comment/list
 */
export function getCommentList(params?: CommentListParams): Promise<PaginatedData<CommentItem>> {
  return request.get('/admin/comment/list', { params })
}

/**
 * 删除评论
 * DELETE /admin/comment
 */
export function deleteComment(params: DeleteCommentParams): Promise<DeleteCommentResult> {
  return request.delete('/admin/comment', { data: params })
}
