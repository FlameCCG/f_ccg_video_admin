/**
 * RBAC 权限管理相关类型定义
 */

/**
 * 角色
 */
export interface Role {
  /** 角色 ID */
  id: number
  /** 角色名称 */
  name: string
  /** 角色描述 */
  desc: string
}

/**
 * 菜单
 */
export interface Menu {
  /** 菜单 ID */
  id: number
  /** 菜单标题（中文） */
  title: string
  /** 菜单标题（英文） */
  titleEn: string
  /** 菜单标题（日文） */
  titleJa: string
  /** 菜单图标 */
  icon: string
  /** 路由路径 */
  path?: string
  /** 路由名称 */
  name?: string
  /** 前端组件路径/标识 */
  component?: string
  /** 是否缓存 */
  keepAlive?: boolean
  /** 父菜单 ID */
  parentId: number
  /** 排序顺序 */
  sortOrder: number
  /** 重定向的路由 */
  redirect?: string
  /** 子菜单 */
  children?: Menu[]
}

/**
 * 权限
 */
export interface Permission {
  /** 资源路径 */
  resource: string
  /** 操作方法 */
  action: string
}

/**
 * API 资源
 */
export interface Resource {
  /** 资源路径 */
  path: string
  /** HTTP 方法 */
  method: string
  /** 接口描述 */
  summary: string
  /** 标签 */
  tags: string[]
}

// ============ 角色管理 ============

/**
 * 创建角色参数
 */
export interface CreateRoleParams {
  /** 角色名称 */
  name: string
  /** 角色描述（可选） */
  desc?: string
  /** 菜单 ID 列表（可选） */
  menuIds?: number[]
  /** 权限列表（可选） */
  permissions?: Permission[]
  /** 模板角色 ID（可选） */
  copyRoleId?: number
}

/**
 * 更新角色参数
 */
export interface UpdateRoleParams {
  /** 角色 ID */
  roleId: number
  /** 角色名称（可选） */
  name?: string
  /** 角色描述（可选） */
  desc?: string
}

/**
 * 分配角色参数
 */
export interface AssignRoleParams {
  /** 用户 ID */
  userId: number
  /** 角色 ID 列表 */
  roleIds: number[]
}

/**
 * 移除角色参数
 */
export interface RemoveRoleParams {
  /** 用户 ID */
  userId: number
  /** 角色 ID 列表 */
  roleIds: number[]
}

/**
 * 角色继承参数
 */
export interface RoleInheritParams {
  /** 角色 ID */
  roleId: number
  /** 父角色 ID */
  parentRoleId: number
}

/**
 * 更新用户角色参数
 */
export interface UpdateUserRolesParams {
  /** 用户 ID */
  userId: number
  /** 角色 ID 列表 */
  roleIds: number[]
}

/**
 * 获取用户权限参数
 */
export interface GetUserPermissionsParams {
  /** 用户 ID */
  userId: number
}

/**
 * 获取角色继承列表参数
 */
export interface GetRoleInheritsParams {
  /** 角色 ID */
  roleId: number
}

// ============ 菜单管理 ============

/**
 * 创建菜单参数
 */
export interface CreateMenuParams {
  /** 菜单标题（中文） */
  title: string
  /** 菜单标题（英文） */
  titleEn?: string
  /** 菜单标题（日文） */
  titleJa?: string
  /** 菜单图标（可选） */
  icon?: string
  /** 路由路径（可选） */
  path?: string
  /** 路由名称（可选） */
  name?: string
  /** 前端组件路径/标识（可选） */
  component?: string
  /** 是否缓存（可选） */
  keepAlive?: boolean
  /** 父菜单 ID（可选） */
  parentId?: number
  /** 排序顺序（可选） */
  sortOrder?: number
}

/**
 * 更新菜单参数
 */
export interface UpdateMenuParams {
  /** 菜单 ID */
  id: number
  /** 菜单标题（中文，可选） */
  title?: string
  /** 菜单标题（英文，可选） */
  titleEn?: string
  /** 菜单标题（日文，可选） */
  titleJa?: string
  /** 菜单图标（可选） */
  icon?: string
  /** 路由路径（可选） */
  path?: string
  /** 路由名称（可选） */
  name?: string
  /** 前端组件路径/标识（可选） */
  component?: string
  /** 是否缓存（可选） */
  keepAlive?: boolean
  /** 父菜单 ID（可选） */
  parentId?: number
  /** 排序顺序（可选） */
  sortOrder?: number
}

/**
 * 分配菜单参数
 */
export interface AssignMenuParams {
  /** 角色 ID */
  roleId: number
  /** 菜单 ID 列表 */
  menuIds: number[]
}

/**
 * 移除菜单参数
 */
export interface RemoveMenuParams {
  /** 角色 ID */
  roleId: number
  /** 菜单 ID 列表 */
  menuIds: number[]
}

/**
 * 获取角色菜单参数
 */
export interface GetRoleMenusParams {
  /** 角色 ID */
  roleId: number
}

/**
 * 角色菜单响应（区分直连菜单和继承菜单）
 */
export interface RoleMenusResponse {
  /** 直连菜单（可编辑） */
  directMenus: Menu[]
  /** 继承菜单（只读） */
  inheritMenus: Menu[]
}

// ============ 权限管理 ============

/**
 * 分配权限参数
 * 注意：单条 resource/action 已不再支持，必须使用 permissions 数组
 */
export interface AssignPermissionParams {
  /** 角色名称 */
  roleName: string
  /** 权限列表（必填，不能为空） */
  permissions: Permission[]
}

/**
 * 移除权限参数
 * 注意：单条 resource/action 已不再支持，必须使用 permissions 数组
 */
export interface RemovePermissionParams {
  /** 角色名称 */
  roleName: string
  /** 权限列表（必填，不能为空） */
  permissions: Permission[]
}

/**
 * 替换角色权限参数
 */
export interface ReplaceRolePermissionsParams {
  /** 角色 ID */
  roleId: number
  /** 权限列表（为空则清空） */
  permissions?: Permission[]
}

/**
 * 获取角色权限参数
 */
export interface GetRolePermissionsParams {
  /** 角色名称 */
  name: string
}

/**
 * 角色权限列表响应（Casbin 格式）
 * 格式: [["p", "role:admin", "/admin/user/list", "GET"], ...]
 */
export type RolePermissionsList = string[][]

/**
 * 角色继承树节点
 */
export interface RoleInheritTreeNode {
  /** 角色 ID */
  id: number
  /** 角色名称 */
  name: string
  /** 角色描述 */
  desc: string
  /** 子节点 */
  children?: RoleInheritTreeNode[]
}
