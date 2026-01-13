/**
 * 用户管理 API
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
 */
import request from '@/utils/request'
import type { PaginatedData, EmptyData } from './types/common'
import type {
  AdminUserInfo,
  AdminUserListItem,
  UserListParams,
  UpdateUserInfoParams,
  SwitchRoleParams,
  BanUserParams,
  BanUserResult,
  BanRecordParams,
  BanRecordItem,
} from './types'

/**
 * 获取后台当前用户信息
 * GET /admin/user/info
 */
export function getUserInfo(): Promise<AdminUserInfo> {
  return request.get('/admin/user/info')
}

/**
 * 获取用户列表
 * GET /admin/user/list
 */
export function getUserList(params?: UserListParams): Promise<PaginatedData<AdminUserListItem>> {
  return request.get('/admin/user/list', { params })
}

/**
 * 管理员更新用户信息
 * PUT /admin/user/info
 */
export function updateUserInfo(params: UpdateUserInfoParams): Promise<EmptyData> {
  return request.put('/admin/user/info', params)
}

/**
 * 切换用户角色
 * PUT /admin/user/role/switch
 */
export function switchRole(params: SwitchRoleParams): Promise<EmptyData> {
  return request.put('/admin/user/role/switch', params)
}

/**
 * 封禁/解封用户
 * POST /admin/user/ban
 */
export function banUser(params: BanUserParams): Promise<BanUserResult> {
  return request.post('/admin/user/ban', params)
}

/**
 * 获取封禁记录列表
 * GET /admin/user/ban/records
 */
export function getBanRecords(params?: BanRecordParams): Promise<PaginatedData<BanRecordItem>> {
  return request.get('/admin/user/ban/records', { params })
}
