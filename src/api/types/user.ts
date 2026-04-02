/**
 * 用户管理相关类型定义
 */
import type { PaginationParams } from './common'

/**
 * 用户性别
 * 0=未知 1=男 2=女
 */
export type Gender = 0 | 1 | 2

/**
 * 用户状态
 * 1=正常 2=封禁 3=永久封禁
 */
export type UserStatus = 1 | 2 | 3

/**
 * 后台当前用户信息
 */
export interface AdminUserInfo {
  /** 用户 ID */
  id: number
  /** 用户名 */
  username: string
  /** 邮箱 */
  email: string
  /** 头像 URL */
  avatar: string
  /** 个人简介 */
  description: string
  /** 性别（0未知 1男 2女） */
  gender: Gender
  /** 生日（YYYY-MM-DD 格式） */
  birthday: string
  /** 用户等级 */
  level: number
  /** 经验值 */
  exp: number
  /** 硬币数量 */
  coinCount: number
  /** 关注数 */
  followCount: number
  /** 粉丝数 */
  fansCount: number
  /** 动态数量 */
  dynamicCount: number
  /** 当前角色 ID */
  currentRoleID: number
  /** 注册来源 */
  registerSource: string
  /** 角色名列表 */
  roleNames: string[]
}

/**
 * 用户列表项
 */
export interface AdminUserListItem {
  /** 用户 ID */
  id: number
  /** 用户名 */
  username: string
  /** 邮箱 */
  email: string
  /** 头像 URL */
  avatar: string
  /** 状态（1正常 2封禁 3永久封禁） */
  status: UserStatus
  /** 用户等级 */
  level: number
  /** 经验值 */
  exp: number
  /** 硬币数量 */
  coinCount: number
  /** 当前角色 ID */
  currentRoleId: number
  /** 注册来源 */
  registerSource: string
  /** 角色名列表 */
  roleNames: string[]
  /** 注册时间 */
  createdAt: string
}

/**
 * 用户列表查询参数
 */
export interface UserListParams extends PaginationParams {
  /** 用户名或邮箱关键词 */
  keyword?: string
  /** 状态（1正常 2封禁 3永久封禁） */
  status?: UserStatus
  /** 角色 ID */
  roleId?: number
}

/**
 * 更新用户信息参数
 */
export interface UpdateUserInfoParams {
  /** 用户 ID */
  userId: number
  /** 用户名 */
  username?: string
  /** 头像 URL */
  avatar?: string
  /** 个人简介 */
  description?: string
  /** 性别（0未知 1男 2女） */
  gender?: Gender
  /** 生日（YYYY-MM-DD 格式） */
  birthday?: string
}

/**
 * 切换角色参数
 */
export interface SwitchRoleParams {
  /** 角色 ID */
  roleId: number
}

/**
 * 封禁/解封用户参数
 */
export interface BanUserParams {
  /** 用户 ID */
  userId: number
  /** 封禁天数（状态为封禁时必填） */
  days?: number
  /** 封禁原因 */
  reason?: string
  /** 状态（1正常 2封禁 3永久封禁；不传时按 days 判断） */
  status?: UserStatus
}

/**
 * 封禁操作响应
 */
export interface BanUserResult {
  /** 记录 ID */
  id: number
  /** 用户 ID */
  userId: number
  /** 状态 */
  status: UserStatus
  /** 封禁原因 */
  reason: string
  /** 封禁天数 */
  days: number
  /** 封禁开始时间 */
  startAt: string
  /** 封禁结束时间 */
  endAt: string
}

/**
 * 封禁记录查询参数
 */
export interface BanRecordParams extends PaginationParams {
  /** 用户 ID（可选） */
  userId?: number
  /** 状态（1正常 2封禁 3永久封禁） */
  status?: UserStatus
}

/**
 * 封禁记录项
 */
export interface BanRecordItem {
  /** 记录 ID */
  id: number
  /** 被封禁用户 ID */
  userId: number
  /** 用户名 */
  username: string
  /** 用户状态（1正常 2封禁中 3永久封禁） */
  status: UserStatus
  /** 封禁原因 */
  reason: string
  /** 封禁天数 */
  days: number
  /** 封禁开始时间 */
  startAt: string
  /** 封禁结束时间 */
  endAt: string
  /** 操作人 ID */
  operatorId: number
  /** 操作人用户名 */
  operatorUsername: string
  /** 创建时间 */
  createdAt: string
}
