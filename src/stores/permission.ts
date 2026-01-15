/**
 * 权限状态 Store
 * 管理菜单、权限、动态路由
 * Requirements: 5.1, 5.2
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { RouteRecordRaw, RouteComponent } from 'vue-router'
import { getCurrentUserMenus, getUserPermissions } from '@/api/rbac'
import type { Menu, Permission } from '@/api/types'
import type { LocaleType } from '@/locales'

/**
 * 组件映射表
 * 将后端返回的 component 字符串映射到实际的组件
 * 使用 import.meta.glob 实现懒加载
 */
const viewModules = import.meta.glob<{ default: RouteComponent }>('@/views/**/*.vue')

/**
 * 布局组件
 */
const layoutModules: Record<string, () => Promise<{ default: RouteComponent }>> = {
  Layout: () => import('@/layouts/DefaultLayout.vue'),
  BlankLayout: () => import('@/layouts/BlankLayout.vue'),
}

/**
 * 解析组件路径，返回懒加载组件函数
 * @param component 后端返回的组件路径，如 "views/content/review/index.vue" 或 "Layout"
 */
function resolveComponent(
  component: string | undefined
): (() => Promise<{ default: RouteComponent }>) | undefined {
  if (!component) return undefined

  // 1. 检查是否是布局组件
  if (layoutModules[component]) {
    return layoutModules[component]
  }

  // 2. 处理视图组件路径
  // 后端格式: "views/content/review/index.vue"
  // 需要转换为: "/src/views/content/review/index.vue"
  let path = component

  // 移除开头的 views/ 或 @/views/
  if (path.startsWith('views/')) {
    path = path.substring(6) // 移除 "views/"
  } else if (path.startsWith('@/views/')) {
    path = path.substring(8) // 移除 "@/views/"
  }

  // 确保路径以 .vue 结尾
  if (!path.endsWith('.vue')) {
    path = `${path}.vue`
  }

  // 构建完整路径
  const fullPath = `/src/views/${path}`

  // 从 glob 映射中查找
  const module = viewModules[fullPath]
  if (module) {
    return module
  }

  // 如果没找到，尝试添加 /index.vue（针对不带 .vue 后缀的情况）
  if (!component.endsWith('.vue')) {
    const indexPath = `/src/views/${path.replace('.vue', '')}/index.vue`
    const indexModule = viewModules[indexPath]
    if (indexModule) {
      return indexModule
    }
  }

  console.warn(`[Permission] Component not found: ${component}, tried path: ${fullPath}`)
  return undefined
}

/**
 * 根据当前语言获取菜单标题
 * @param menu 菜单对象
 * @param locale 当前语言
 */
function getMenuTitle(menu: Menu, locale: LocaleType): string {
  switch (locale) {
    case 'en-US':
      return menu.titleEn || menu.title
    case 'ja-JP':
      return menu.titleJa || menu.title
    case 'zh-CN':
    default:
      return menu.title
  }
}

/**
 * 将菜单树转换为路由配置
 *
 * 后端数据结构：
 * - 顶级菜单：component="Layout", path="/xxx", redirect="/xxx/yyy"
 * - 子菜单：component="views/xxx/index.vue", path="yyy"（相对路径）
 *
 * @param menu 菜单对象
 * @param locale 当前语言（用于设置路由标题）
 * @param isTopLevel 是否为顶级菜单（parentId === 0）
 */
function menuToRoute(menu: Menu, locale: LocaleType, isTopLevel = false): RouteRecordRaw | null {
  // 如果没有 path，则不生成路由
  if (!menu.path) return null

  // 获取当前语言的标题
  const title = getMenuTitle(menu, locale)

  // 基础路由配置
  const baseMeta = {
    title,
    titleZh: menu.title,
    titleEn: menu.titleEn,
    titleJa: menu.titleJa,
    icon: menu.icon,
    menuId: menu.id,
    keepAlive: menu.keepAlive ?? false,
    sortOrder: menu.sortOrder,
    requiresAuth: true,
  }

  // 解析组件
  // 顶级菜单（parentId === 0）强制使用 Layout，即使后端配置了其他组件
  const componentPath = isTopLevel && menu.component !== 'Layout' ? 'Layout' : menu.component
  const component = resolveComponent(componentPath)

  // 递归处理子菜单
  let children: RouteRecordRaw[] | undefined

  if (menu.children && menu.children.length > 0) {
    const childRoutes = menu.children
      .map((child) => menuToRoute(child, locale))
      .filter((r): r is RouteRecordRaw => r !== null)
      // 按 sortOrder 排序
      .sort((a, b) => {
        const orderA = (a.meta?.sortOrder as number) ?? 0
        const orderB = (b.meta?.sortOrder as number) ?? 0
        return orderA - orderB
      })

    if (childRoutes.length > 0) {
      children = childRoutes
    }
  }

  // 构建路由对象基础配置
  const baseRoute = {
    path: menu.path,
    name: menu.name || `menu-${menu.id}`,
    meta: baseMeta,
    component,
    children,
  }

  // 使用后端提供的 redirect，如果没有则不设置
  // 使用类型断言，因为 Vue Router 的 RouteRecordRaw 是联合类型
  const route = (
    menu.redirect ? { ...baseRoute, redirect: menu.redirect } : baseRoute
  ) as RouteRecordRaw

  // 特殊处理：如果是 Layout 组件但没有子路由，且有对应的视图组件
  // 则创建一个默认子路由（常见于仪表盘等单页面模块）
  if (menu.component === 'Layout' && (!children || children.length === 0)) {
    // 尝试查找同名视图组件，如 /overview -> views/overview/index.vue
    const pathSegment = menu.path.replace(/^\//, '') // 移除开头的 /
    const possiblePaths = [
      `/src/views/${pathSegment}/index.vue`,
      `/src/views/${pathSegment}/dashboard/index.vue`,
    ]

    let defaultComponent: (() => Promise<{ default: RouteComponent }>) | undefined
    for (const p of possiblePaths) {
      if (viewModules[p]) {
        defaultComponent = viewModules[p]
        break
      }
    }

    if (defaultComponent) {
      // 创建默认子路由
      route.children = [
        {
          path: '',
          name: `${menu.name || `menu-${menu.id}`}-index`,
          component: defaultComponent,
          meta: { ...baseMeta },
        },
      ]
    }
  }

  return route
}

/**
 * 权限状态 Store
 */
export const usePermissionStore = defineStore('permission', () => {
  // ==================== 状态 ====================

  /** 用户菜单列表（树形结构） */
  const menus = ref<Menu[]>([])

  /** 用户权限列表 */
  const permissions = ref<Permission[]>([])

  /** 动态生成的路由 */
  const routes = ref<RouteRecordRaw[]>([])

  /** 是否已加载权限数据 */
  const isLoaded = ref(false)

  /** 是否正在加载 */
  const isLoading = ref(false)

  /** 当前语言（用于路由标题） */
  const currentLocale = ref<LocaleType>('zh-CN')

  // ==================== 计算属性 ====================

  /** 扁平化的菜单列表（用于快速查找） */
  const flatMenus = computed(() => {
    const result: Menu[] = []

    function flatten(items: Menu[]): void {
      for (const item of items) {
        result.push(item)
        if (item.children && item.children.length > 0) {
          flatten(item.children)
        }
      }
    }

    flatten(menus.value)
    return result
  })

  /** 权限 Map（用于快速查找） */
  const permissionMap = computed(() => {
    const map = new Map<string, Set<string>>()

    for (const perm of permissions.value) {
      // 标准化资源路径：移除 /v1 前缀
      let resource = perm.resource
      if (resource.startsWith('/v1')) {
        resource = resource.substring(3) // 移除 "/v1"
      }

      if (!map.has(resource)) {
        map.set(resource, new Set())
      }
      map.get(resource)!.add(perm.action.toUpperCase())
    }

    return map
  })

  // ==================== Actions ====================

  /**
   * 设置当前语言（用于路由标题）
   */
  function setLocale(locale: LocaleType): void {
    currentLocale.value = locale
    // 如果已加载菜单，重新生成路由以更新标题
    if (menus.value.length > 0) {
      generateRoutes()
    }
  }

  /**
   * 获取用户权限数据（菜单 + 权限）
   * @param userId 用户 ID（用于获取权限列表）
   */
  async function fetchUserPermissions(userId: number): Promise<void> {
    if (isLoading.value) return

    isLoading.value = true

    try {
      // 并行获取菜单和权限
      const [menusData, permissionsData] = await Promise.all([
        getCurrentUserMenus(),
        getUserPermissions({ userId }),
      ])

      menus.value = menusData
      permissions.value = permissionsData

      // 生成动态路由
      generateRoutes()

      isLoaded.value = true
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 根据菜单生成动态路由
   * 使用当前语言设置路由标题
   */
  function generateRoutes(): RouteRecordRaw[] {
    const generatedRoutes: RouteRecordRaw[] = []

    // 按 sortOrder 排序顶级菜单
    const sortedMenus = [...menus.value].sort((a, b) => a.sortOrder - b.sortOrder)

    for (const menu of sortedMenus) {
      const route = menuToRoute(menu, currentLocale.value)
      if (route) {
        generatedRoutes.push(route)
      }
    }

    routes.value = generatedRoutes
    return generatedRoutes
  }

  /**
   * 检查资源路径是否匹配（支持通配符）
   * @param pattern 权限模式，如 /admin/** 或 /admin/user/*
   * @param resource 实际资源路径，如 /admin/user/list
   */
  function matchResource(pattern: string, resource: string): boolean {
    // 精确匹配
    if (pattern === resource) return true

    // 通配符 ** 匹配任意路径
    if (pattern.endsWith('/**')) {
      const prefix = pattern.slice(0, -3) // 移除 /**
      return resource.startsWith(prefix)
    }

    // 通配符 * 匹配单层路径
    if (pattern.includes('*')) {
      const regex = new RegExp('^' + pattern.replace(/\*/g, '[^/]+') + '$')
      return regex.test(resource)
    }

    return false
  }

  /**
   * 检查是否有指定权限
   * @param resource 资源路径
   * @param action HTTP 方法
   */
  function hasPermission(resource: string, action: string): boolean {
    const upperAction = action.toUpperCase()

    // 遍历所有权限进行匹配
    for (const [pattern, actions] of permissionMap.value) {
      // 检查资源是否匹配
      if (matchResource(pattern, resource)) {
        // 检查 action：* 表示所有操作
        if (actions.has('*') || actions.has(upperAction)) {
          return true
        }
      }
    }

    return false
  }

  /**
   * 检查是否有任意一个权限
   * @param perms 权限列表，格式为 ["GET:/admin/user/list", "POST:/admin/user/ban"]
   */
  function hasAnyPermission(perms: string[]): boolean {
    return perms.some((perm) => {
      const [action, resource] = perm.split(':')
      if (!action || !resource) return false
      return hasPermission(resource, action)
    })
  }

  /**
   * 检查是否有所有权限
   * @param perms 权限列表，格式为 ["GET:/admin/user/list", "POST:/admin/user/ban"]
   */
  function hasAllPermissions(perms: string[]): boolean {
    return perms.every((perm) => {
      const [action, resource] = perm.split(':')
      if (!action || !resource) return false
      return hasPermission(resource, action)
    })
  }

  /**
   * 根据菜单 ID 获取菜单
   */
  function getMenuById(menuId: number): Menu | undefined {
    return flatMenus.value.find((m) => m.id === menuId)
  }

  /**
   * 根据路由路径获取菜单
   * 支持匹配完整路径（如 /content/videos）和相对路径（如 videos）
   */
  function getMenuByPath(path: string): Menu | undefined {
    // 1. 先尝试直接匹配
    const directMatch = flatMenus.value.find((m) => m.path === path)
    if (directMatch) return directMatch

    // 2. 构建完整路径映射（父路径 + 子路径）
    function findMenuWithFullPath(items: Menu[], parentPath = ''): Menu | undefined {
      for (const item of items) {
        // 跳过没有 path 的菜单
        if (!item.path) continue

        // 计算当前菜单的完整路径
        let fullPath: string
        if (item.path.startsWith('/')) {
          // 绝对路径
          fullPath = item.path
        } else if (parentPath) {
          // 相对路径，拼接父路径
          fullPath = `${parentPath}/${item.path}`
        } else {
          fullPath = item.path
        }

        // 检查是否匹配
        if (fullPath === path) {
          return item
        }

        // 递归检查子菜单
        if (item.children && item.children.length > 0) {
          const found = findMenuWithFullPath(item.children, fullPath)
          if (found) return found
        }
      }
      return undefined
    }

    return findMenuWithFullPath(menus.value)
  }

  /**
   * 根据路由路径获取菜单路径（从根到当前菜单的完整链路）
   * 用于生成面包屑导航
   * @param routePath 当前路由路径，如 /content/videos 或 /overview/dashboard
   * @returns 菜单链路数组，从父到子
   */
  function getMenuPathByRoutePath(routePath: string): Menu[] {
    const result: Menu[] = []

    function findMenuPath(items: Menu[], parentPath = '', ancestors: Menu[] = []): boolean {
      for (const item of items) {
        // 跳过没有 path 的菜单
        if (!item.path) continue

        // 计算当前菜单的完整路径
        let fullPath: string
        if (item.path.startsWith('/')) {
          fullPath = item.path
        } else if (parentPath) {
          fullPath = `${parentPath}/${item.path}`
        } else {
          fullPath = item.path
        }

        // 精确匹配
        if (fullPath === routePath) {
          result.push(...ancestors, item)
          return true
        }

        // 如果菜单没有子菜单，但路由路径是其子路径，也算匹配
        // 例如：菜单 /overview，路由 /overview/dashboard
        if (!item.children || item.children.length === 0) {
          if (routePath.startsWith(fullPath + '/')) {
            result.push(...ancestors, item)
            return true
          }
        }

        // 递归检查子菜单
        if (item.children && item.children.length > 0) {
          const found = findMenuPath(item.children, fullPath, [...ancestors, item])
          if (found) return true
        }
      }
      return false
    }

    findMenuPath(menus.value)
    return result
  }

  /**
   * 重置权限状态
   */
  function resetPermission(): void {
    menus.value = []
    permissions.value = []
    routes.value = []
    isLoaded.value = false
    isLoading.value = false
  }

  return {
    // 状态
    menus: computed(() => menus.value),
    permissions: computed(() => permissions.value),
    routes: computed(() => routes.value),
    isLoaded: computed(() => isLoaded.value),
    isLoading: computed(() => isLoading.value),
    currentLocale: computed(() => currentLocale.value),

    // 计算属性
    flatMenus,
    permissionMap,

    // Actions
    setLocale,
    fetchUserPermissions,
    generateRoutes,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    getMenuById,
    getMenuByPath,
    getMenuPathByRoutePath,
    resetPermission,
  }
})
