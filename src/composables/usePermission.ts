/**
 * usePermission composable
 * 提供权限检查的组合式函数
 * Requirements: 5.3
 */
import { computed } from 'vue'
import { usePermissionStore } from '@/stores/permission'
import type { Menu, Permission } from '@/api/types'

/**
 * 权限检查组合式函数
 */
export function usePermission() {
  const permissionStore = usePermissionStore()

  /**
   * 检查是否有指定权限
   * @param resource 资源路径
   * @param action HTTP 方法
   * @returns 是否有权限
   *
   * @example
   * const { hasPermission } = usePermission()
   * if (hasPermission('/admin/user/ban', 'POST')) {
   *   // 有封禁用户的权限
   * }
   */
  function hasPermission(resource: string, action: string): boolean {
    return permissionStore.hasPermission(resource, action)
  }

  /**
   * 检查是否有任意一个权限
   * @param permissions 权限列表，格式为 ["GET:/admin/user/list", "POST:/admin/user/ban"]
   * @returns 是否有任意一个权限
   *
   * @example
   * const { hasAnyPermission } = usePermission()
   * if (hasAnyPermission(['GET:/admin/user/list', 'POST:/admin/user/ban'])) {
   *   // 有用户列表或封禁用户的权限
   * }
   */
  function hasAnyPermission(permissions: string[]): boolean {
    return permissionStore.hasAnyPermission(permissions)
  }

  /**
   * 检查是否有所有权限
   * @param permissions 权限列表，格式为 ["GET:/admin/user/list", "POST:/admin/user/ban"]
   * @returns 是否有所有权限
   *
   * @example
   * const { hasAllPermissions } = usePermission()
   * if (hasAllPermissions(['GET:/admin/user/list', 'PUT:/admin/user/info'])) {
   *   // 同时有用户列表和更新用户信息的权限
   * }
   */
  function hasAllPermissions(permissions: string[]): boolean {
    return permissionStore.hasAllPermissions(permissions)
  }

  /**
   * 检查是否有指定菜单的访问权限
   * @param menuId 菜单 ID
   * @returns 是否有访问权限
   */
  function hasMenuAccess(menuId: number): boolean {
    return !!permissionStore.getMenuById(menuId)
  }

  /**
   * 检查是否有指定路由的访问权限
   * @param path 路由路径
   * @returns 是否有访问权限
   */
  function hasRouteAccess(path: string): boolean {
    return !!permissionStore.getMenuByPath(path)
  }

  // ==================== 计算属性 ====================

  /** 用户菜单列表 */
  const menus = computed<Menu[]>(() => permissionStore.menus)

  /** 扁平化的菜单列表 */
  const flatMenus = computed<Menu[]>(() => permissionStore.flatMenus)

  /** 用户权限列表 */
  const permissions = computed<Permission[]>(() => permissionStore.permissions)

  /** 是否已加载权限数据 */
  const isLoaded = computed<boolean>(() => permissionStore.isLoaded)

  /** 是否正在加载 */
  const isLoading = computed<boolean>(() => permissionStore.isLoading)

  return {
    // 方法
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasMenuAccess,
    hasRouteAccess,

    // 计算属性
    menus,
    flatMenus,
    permissions,
    isLoaded,
    isLoading,
  }
}
