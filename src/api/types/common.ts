/**
 * 通用 API 类型定义
 */

/**
 * API 统一响应结构
 * @template T 响应数据类型
 */
export interface ApiResponse<T = unknown> {
  /** 业务状态码：0=成功，1=失败 */
  code: 0 | 1
  /** 响应数据 */
  data: T
  /** 提示信息 */
  msg: string
}

/**
 * 分页响应数据结构
 * @template T 列表项类型
 */
export interface PaginatedData<T> {
  /** 数据列表 */
  list: T[]
  /** 总数 */
  total: number
}

/**
 * 分页响应结构（完整）
 * @template T 列表项类型
 */
export type PaginatedResponse<T> = ApiResponse<PaginatedData<T>>

/**
 * 分页请求参数
 */
export interface PaginationParams {
  /** 页码（从1开始） */
  page?: number
  /** 每页数量 */
  pageSize?: number
}

/**
 * 排序参数
 */
export interface SortParams {
  /** 排序字段 */
  sortBy?: string
  /** 排序方向 */
  sortOrder?: 'asc' | 'desc'
}

/**
 * 带分页和排序的请求参数
 */
export interface ListParams extends PaginationParams, SortParams {}

/**
 * 批量操作响应
 */
export interface BatchOperationResult {
  /** 操作影响的数量 */
  affected?: number
  /** 删除数量 */
  deleted?: number
  /** 更新数量 */
  updated?: number
  /** 恢复数量 */
  restored?: number
  /** 处理数量 */
  handled?: number
}

/**
 * ID 参数
 */
export interface IdParam {
  id: number
}

/**
 * 用户ID参数
 */
export interface UserIdParam {
  userId: number
}

/**
 * 角色ID参数
 */
export interface RoleIdParam {
  roleId: number
}

/**
 * 空响应数据
 */
export type EmptyData = Record<string, never>
