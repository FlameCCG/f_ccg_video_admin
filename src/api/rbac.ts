/**
 * RBAC 权限管理 API
 * Requirements: 16.1-16.5, 17.1-17.5, 18.1-18.4, 19.1-19.4
 */
import request from '@/utils/request'
import type { EmptyData } from './types/common'
import type {
  Role,
  Menu,
  Permission,
  Resource,
  CreateRoleParams,
  UpdateRoleParams,
  AssignRoleParams,
  RemoveRoleParams,
  RoleInheritParams,
  UpdateUserRolesParams,
  GetUserPermissionsParams,
  GetRoleInheritsParams,
  RoleInheritsDetail,
  CreateMenuParams,
  UpdateMenuParams,
  AssignMenuParams,
  RemoveMenuParams,
  GetRoleMenusParams,
  RoleMenusResponse,
  AssignPermissionParams,
  RemovePermissionParams,
  ReplaceRolePermissionsParams,
  GetRolePermissionsParams,
  RolePermissionsDetail,
  WildcardPermissionOption,
  RoleInheritTreeNode,
} from './types'

// ============ 角色管理 ============

/**
 * 获取角色列表
 * GET /admin/rbac/roles
 */
export function getRoles(): Promise<Role[]> {
  return request.get('/admin/rbac/roles')
}

/**
 * 创建角色
 * POST /admin/rbac/role
 */
export function createRole(params: CreateRoleParams): Promise<EmptyData> {
  return request.post('/admin/rbac/role', params)
}

/**
 * 更新角色
 * PUT /admin/rbac/role
 */
export function updateRole(params: UpdateRoleParams): Promise<EmptyData> {
  return request.put('/admin/rbac/role', params)
}

/**
 * 删除角色
 * DELETE /admin/rbac/role?id=
 */
export function deleteRole(id: number): Promise<EmptyData> {
  return request.delete('/admin/rbac/role', { params: { id } })
}

/**
 * 分配角色给用户
 * POST /admin/rbac/role/assign
 */
export function assignRole(params: AssignRoleParams): Promise<EmptyData> {
  return request.post('/admin/rbac/role/assign', params)
}

/**
 * 移除用户角色
 * DELETE /admin/rbac/role/remove
 */
export function removeRole(params: RemoveRoleParams): Promise<EmptyData> {
  return request.delete('/admin/rbac/role/remove', { data: params })
}

/**
 * 角色继承
 * POST /admin/rbac/role/inherit
 */
export function inheritRole(params: RoleInheritParams): Promise<EmptyData> {
  return request.post('/admin/rbac/role/inherit', params)
}

/**
 * 移除角色继承
 * DELETE /admin/rbac/role/inherit
 */
export function removeRoleInherit(params: RoleInheritParams): Promise<EmptyData> {
  return request.delete('/admin/rbac/role/inherit', { data: params })
}

/**
 * 获取角色继承列表（直接 + 间接）
 * GET /admin/rbac/role/inherits
 */
export function getRoleInherits(params: GetRoleInheritsParams): Promise<RoleInheritsDetail> {
  return request.get('/admin/rbac/role/inherits', { params })
}

/**
 * 获取角色继承树
 * GET /admin/rbac/role/inherit/tree
 * @param roleId 可选；有值时只返回该角色相关子树
 */
export function getRoleInheritTree(roleId?: number): Promise<RoleInheritTreeNode[]> {
  return request.get('/admin/rbac/role/inherit/tree', {
    params: roleId != null ? { roleId } : undefined,
  })
}

/**
 * 获取指定角色继承树
 * GET /admin/rbac/role/inherit/tree?roleId=
 */
export function getRoleInheritTreeById(roleId: number): Promise<RoleInheritTreeNode[]> {
  return request.get('/admin/rbac/role/inherit/tree', { params: { roleId } })
}

// ============ 用户角色管理 ============

/**
 * 更新用户角色（替换所有角色）
 * PUT /admin/rbac/user/roles
 */
export function updateUserRoles(params: UpdateUserRolesParams): Promise<EmptyData> {
  return request.put('/admin/rbac/user/roles', params)
}

/**
 * 获取用户角色列表
 * GET /admin/rbac/user/roles?userId=
 */
export function getUserRoles(userId: number): Promise<Role[]> {
  return request.get('/admin/rbac/user/roles', { params: { userId } })
}

/**
 * 获取用户权限列表
 * GET /admin/rbac/user/permissions
 */
export function getUserPermissions(params: GetUserPermissionsParams): Promise<Permission[]> {
  return request.get('/admin/rbac/user/permissions', { params })
}

/**
 * 获取当前用户菜单
 * GET /admin/rbac/user/menus
 */
export function getCurrentUserMenus(): Promise<Menu[]> {
  return request.get('/admin/rbac/user/menus')
}

// ============ 菜单管理 ============

/**
 * 获取菜单列表（树形结构）
 * GET /admin/rbac/menus
 */
export function getMenus(): Promise<Menu[]> {
  return request.get('/admin/rbac/menus')
}

/**
 * 创建菜单
 * POST /admin/rbac/menu
 */
export function createMenu(params: CreateMenuParams): Promise<EmptyData> {
  return request.post('/admin/rbac/menu', params)
}

/**
 * 更新菜单
 * PUT /admin/rbac/menu
 */
export function updateMenu(params: UpdateMenuParams): Promise<EmptyData> {
  return request.put('/admin/rbac/menu', params)
}

/**
 * 删除菜单
 * DELETE /admin/rbac/menu?id=
 */
export function deleteMenu(id: number): Promise<EmptyData> {
  return request.delete('/admin/rbac/menu', { params: { id } })
}

/**
 * 分配菜单给角色
 * POST /admin/rbac/menu/assign
 */
export function assignMenu(params: AssignMenuParams): Promise<EmptyData> {
  return request.post('/admin/rbac/menu/assign', params)
}

/**
 * 移除角色菜单
 * DELETE /admin/rbac/menu/remove
 */
export function removeMenu(params: RemoveMenuParams): Promise<EmptyData> {
  return request.delete('/admin/rbac/menu/remove', { data: params })
}

/**
 * 获取角色菜单列表（区分直连菜单和继承菜单）
 * GET /admin/rbac/role/menus
 */
export function getRoleMenus(params: GetRoleMenusParams): Promise<RoleMenusResponse> {
  return request.get('/admin/rbac/role/menus', { params })
}

// ============ 权限管理 ============

/**
 * 获取资源列表
 * GET /admin/rbac/resources
 */
export function getResources(): Promise<Resource[]> {
  return request.get('/admin/rbac/resources')
}

/**
 * 分配权限给角色
 * POST /admin/rbac/permission
 */
export function assignPermission(params: AssignPermissionParams): Promise<EmptyData> {
  return request.post('/admin/rbac/permission', params)
}

/**
 * 移除角色权限
 * DELETE /admin/rbac/permission
 */
export function removePermission(params: RemovePermissionParams): Promise<EmptyData> {
  return request.delete('/admin/rbac/permission', { data: params })
}

/**
 * 替换角色权限
 * PUT /admin/rbac/role/permissions
 */
export function replaceRolePermissions(params: ReplaceRolePermissionsParams): Promise<EmptyData> {
  return request.put('/admin/rbac/role/permissions', params)
}

/**
 * 获取角色权限详情（直接权限 + 有效权限 + 覆盖的具体 API）
 * GET /admin/rbac/role/permissions
 */
export function getRolePermissions(
  params: GetRolePermissionsParams
): Promise<RolePermissionsDetail> {
  return request.get('/admin/rbac/role/permissions', { params })
}

/**
 * 获取系统中已配置的通配符权限列表（跨角色去重）
 * GET /admin/rbac/permission/wildcards
 */
export function getWildcardPermissions(): Promise<WildcardPermissionOption[]> {
  return request.get('/admin/rbac/permission/wildcards')
}
