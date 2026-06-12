/**
 * ============================================================================
 * 权限状态 Store - 动态路由与权限管理核心模块
 * ============================================================================
 *
 * 【模块职责】
 * 本模块负责管理用户的菜单、权限和动态路由，是 RBAC（基于角色的访问控制）系统的前端核心。
 *
 * 【整体流程概述】
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │  1. 用户登录成功                                                          │
 * │     ↓                                                                    │
 * │  2. 路由守卫检测到未加载权限数据（isLoaded = false）                         │
 * │     ↓                                                                    │
 * │  3. 调用 fetchUserPermissions() 获取菜单和权限                             │
 * │     ├── GET /admin/rbac/user/menus     → 获取用户可访问的菜单树             │
 * │     └── GET /admin/rbac/user/permissions → 获取用户的操作权限列表           │
 * │     ↓                                                                    │
 * │  4. 调用 generateRoutes() 将菜单树转换为 Vue Router 路由配置                │
 * │     ↓                                                                    │
 * │  5. 路由守卫调用 router.addRoute() 动态注册路由                             │
 * │     ↓                                                                    │
 * │  6. 用户可以访问对应的页面，按钮权限通过 hasPermission() 控制                 │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * 【关键概念】
 * - 菜单（Menu）：后端返回的树形结构，包含路径、组件、标题、图标等信息
 * - 权限（Permission）：资源 + 操作的组合，如 "GET:/admin/user/list"
 * - 动态路由：根据用户菜单动态生成的 Vue Router 路由配置
 *
 * Requirements: 5.1, 5.2
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { RouteRecordRaw, RouteComponent } from 'vue-router'
import { getCurrentUserMenus, getUserPermissions } from '@/api/rbac'
import type { Menu, Permission } from '@/api/types'
import type { LocaleType } from '@/locales'

/**
 * ============================================================================
 * 组件懒加载映射
 * ============================================================================
 *
 * 使用 Vite 的 import.meta.glob 实现视图组件的懒加载。
 * 这样可以实现代码分割，只有在访问对应路由时才加载组件。
 *
 * 【工作原理】
 * import.meta.glob 会在构建时扫描匹配的文件，生成一个对象：
 * {
 *   '/src/views/user/list/index.vue': () => import('/src/views/user/list/index.vue'),
 *   '/src/views/video/list/index.vue': () => import('/src/views/video/list/index.vue'),
 *   ...
 * }
 */
const viewModules = import.meta.glob<{ default: RouteComponent }>('@/views/**/*.vue')

/**
 * 布局组件映射
 *
 * 【说明】
 * - Layout：主布局，包含侧边栏、顶栏、标签栏
 * - BlankLayout：空白布局，用于登录页等不需要侧边栏的页面
 */
const layoutModules: Record<string, () => Promise<{ default: RouteComponent }>> = {
  Layout: () => import('@/layouts/DefaultLayout.vue'),
  BlankLayout: () => import('@/layouts/BlankLayout.vue'),
}

/**
 * ============================================================================
 * 组件路径解析函数
 * ============================================================================
 *
 * 将后端返回的组件路径字符串转换为实际的懒加载组件函数。
 *
 * 【后端返回格式示例】
 * - "Layout"                        → 使用主布局组件
 * - "views/user/list/index.vue"     → 用户列表页面
 * - "views/video/review/index.vue"  → 视频审核页面
 *
 * 【转换过程】
 * 1. 检查是否是布局组件（Layout/BlankLayout）
 * 2. 处理视图组件路径，移除前缀，确保格式正确
 * 3. 从 viewModules 中查找对应的懒加载函数
 *
 * @param component 后端返回的组件路径
 * @returns 懒加载组件函数，如果找不到则返回 undefined
 */
function resolveComponent(
  component: string | undefined
): (() => Promise<{ default: RouteComponent }>) | undefined {
  if (!component) return undefined

  // 步骤1：检查是否是布局组件
  if (layoutModules[component]) {
    return layoutModules[component]
  }

  // 步骤2：处理视图组件路径
  let path = component

  // 移除可能的前缀：views/ 或 @/views/
  if (path.startsWith('views/')) {
    path = path.substring(6) // 移除 "views/"
  } else if (path.startsWith('@/views/')) {
    path = path.substring(8) // 移除 "@/views/"
  }

  // 确保路径以 .vue 结尾
  if (!path.endsWith('.vue')) {
    path = `${path}.vue`
  }

  // 构建完整路径（与 import.meta.glob 的 key 格式匹配）
  const fullPath = `/src/views/${path}`

  // 步骤3：从 glob 映射中查找
  const module = viewModules[fullPath]
  if (module) {
    return module
  }

  // 尝试添加 /index.vue（针对目录形式的组件）
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
 *
 * 【多语言支持】
 * 后端菜单数据包含三种语言的标题：
 * - title：中文标题（默认）
 * - titleEn：英文标题
 * - titleJa：日文标题
 *
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
 * ============================================================================
 * 菜单转路由核心函数
 * ============================================================================
 *
 * 将后端返回的菜单对象转换为 Vue Router 的路由配置。
 *
 * 【后端菜单数据结构】
 * {
 *   id: 1,
 *   name: "content",
 *   title: "内容管理",
 *   titleEn: "Content",
 *   titleJa: "コンテンツ",
 *   path: "/content",
 *   component: "Layout",           // 顶级菜单使用 Layout
 *   redirect: "/content/videos",   // 重定向到第一个子菜单
 *   icon: "<svg>...</svg>",        // SVG 图标字符串
 *   sortOrder: 2,
 *   children: [
 *     {
 *       id: 11,
 *       name: "videos",
 *       title: "视频列表",
 *       path: "videos",            // 子菜单使用相对路径
 *       component: "views/content/videos/index.vue",
 *       ...
 *     }
 *   ]
 * }
 *
 * 【转换规则】
 * 1. 顶级菜单（parentId === 0）强制使用 Layout 组件
 * 2. 子菜单使用相对路径，会自动拼接父路径
 * 3. 如果顶级菜单没有子路由，会尝试创建默认子路由
 *
 * @param menu 菜单对象
 * @param locale 当前语言（用于设置路由标题）
 * @param isTopLevel 是否为顶级菜单
 */
function menuToRoute(menu: Menu, locale: LocaleType, isTopLevel = false): RouteRecordRaw | null {
  // 没有 path 的菜单不生成路由
  if (!menu.path) return null

  // 获取当前语言的标题
  const title = getMenuTitle(menu, locale)

  // 构建路由 meta 信息
  // meta 用于存储路由的额外信息，可在路由守卫和组件中访问
  const baseMeta = {
    title, // 当前语言的标题
    titleZh: menu.title, // 中文标题（用于切换语言时）
    titleEn: menu.titleEn, // 英文标题
    titleJa: menu.titleJa, // 日文标题
    icon: menu.icon, // SVG 图标
    menuId: menu.id, // 菜单 ID（用于权限校验）
    keepAlive: menu.keepAlive ?? false, // 是否缓存组件
    sortOrder: menu.sortOrder, // 排序顺序
    requiresAuth: true, // 需要认证
  }

  // 解析组件
  // 顶级菜单强制使用 Layout，即使后端配置了其他组件
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

  // 构建路由对象
  const baseRoute = {
    path: menu.path,
    name: menu.name || `menu-${menu.id}`,
    meta: baseMeta,
    component,
    children,
  }

  // 添加重定向（如果后端提供了）
  const route = (
    menu.redirect ? { ...baseRoute, redirect: menu.redirect } : baseRoute
  ) as RouteRecordRaw

  // 特殊处理：Layout 组件但没有子路由的情况
  // 例如：仪表盘页面，顶级菜单直接对应一个页面
  if (menu.component === 'Layout' && (!children || children.length === 0)) {
    // 尝试查找同名视图组件
    const pathSegment = menu.path.replace(/^\//, '')
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
      // 创建默认子路由（path 为空字符串表示默认路由）
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
 * ============================================================================
 * 权限状态 Store
 * ============================================================================
 */
export const usePermissionStore = defineStore('permission', () => {
  // ==================== 状态定义 ====================

  /** 用户菜单列表（树形结构，来自后端） */
  const menus = ref<Menu[]>([])

  /** 用户权限列表（来自后端） */
  const permissions = ref<Permission[]>([])

  /** 动态生成的路由配置 */
  const routes = ref<RouteRecordRaw[]>([])

  /** 是否已加载权限数据（用于路由守卫判断） */
  const isLoaded = ref(false)

  /** 是否正在加载（防止重复请求） */
  const isLoading = ref(false)

  /** 当前语言（用于路由标题的多语言支持） */
  const currentLocale = ref<LocaleType>('zh-CN')

  // ==================== 计算属性 ====================

  /**
   * 扁平化的菜单列表
   *
   * 【用途】
   * 将树形菜单结构展平为一维数组，便于快速查找菜单。
   * 例如：根据路由路径查找对应的菜单信息。
   */
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

  /**
   * 权限 Map
   *
   * 【数据结构】
   * Map<资源路径, Set<操作方法>>
   * 例如：
   * {
   *   "/admin/user/list" => Set { "GET" },
   *   "/admin/user/**" => Set { "GET", "POST", "PUT", "DELETE" },
   *   "/admin/video/*" => Set { "*" }
   * }
   *
   * 【用途】
   * 快速判断用户是否有某个资源的某个操作权限。
   */
  const permissionMap = computed(() => {
    const map = new Map<string, Set<string>>()

    for (const perm of permissions.value) {
      // 标准化资源路径：移除 /v1 前缀（后端可能返回带前缀的路径）
      let resource = perm.resource
      if (resource.startsWith('/v1')) {
        resource = resource.substring(3)
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
   * 设置当前语言
   *
   * 【触发时机】
   * 用户切换语言时调用，会重新生成路由以更新标题。
   */
  function setLocale(locale: LocaleType): void {
    currentLocale.value = locale
    // 如果已加载菜单，重新生成路由以更新标题
    if (menus.value.length > 0) {
      generateRoutes()
    }
  }

  /**
   * ============================================================================
   * 获取用户权限数据（核心方法）
   * ============================================================================
   *
   * 【调用时机】
   * 路由守卫在检测到 isLoaded = false 时调用此方法。
   *
   * 【执行流程】
   * 1. 并行请求菜单和权限数据
   * 2. 存储到 store 状态
   * 3. 调用 generateRoutes() 生成动态路由
   * 4. 设置 isLoaded = true
   *
   * @param userId 用户 ID（用于获取权限列表）
   */
  async function fetchUserPermissions(userId: number): Promise<void> {
    // 防止重复请求
    if (isLoading.value) return

    isLoading.value = true

    try {
      // 并行获取菜单和权限，提高加载速度
      const [menusData, permissionsData] = await Promise.all([
        getCurrentUserMenus(), // GET /admin/rbac/user/menus
        getUserPermissions({ userId }), // GET /admin/rbac/user/permissions
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
   * ============================================================================
   * 生成动态路由
   * ============================================================================
   *
   * 【执行流程】
   * 1. 对顶级菜单按 sortOrder 排序
   * 2. 遍历菜单，调用 menuToRoute() 转换为路由配置
   * 3. 存储到 routes 状态
   *
   * 【注意】
   * 此方法只生成路由配置，实际注册到 router 是在路由守卫中完成的。
   */
  function generateRoutes(): RouteRecordRaw[] {
    const generatedRoutes: RouteRecordRaw[] = []

    // 按 sortOrder 排序顶级菜单
    const sortedMenus = [...menus.value].sort((a, b) => a.sortOrder - b.sortOrder)

    for (const menu of sortedMenus) {
      // isTopLevel = true 表示这是顶级菜单
      const route = menuToRoute(menu, currentLocale.value, true)
      if (route) {
        generatedRoutes.push(route)
      }
    }

    routes.value = generatedRoutes
    return generatedRoutes
  }

  /**
   * ============================================================================
   * 资源路径匹配（支持通配符）
   * ============================================================================
   *
   * 【通配符规则】
   * - ** ：匹配任意层级路径，如 /admin/** 匹配 /admin/user/list
   * - *  ：匹配单层路径，如 /admin/* 匹配 /admin/user 但不匹配 /admin/user/list
   *
   * @param pattern 权限模式（可能包含通配符）
   * @param resource 实际资源路径
   */
  function matchResource(pattern: string, resource: string): boolean {
    // 精确匹配
    if (pattern === resource) return true

    // ** 通配符：匹配任意路径
    if (pattern.endsWith('/**')) {
      const prefix = pattern.slice(0, -3)
      return resource.startsWith(prefix)
    }

    // * 通配符：匹配单层路径
    if (pattern.includes('*')) {
      const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&')
      const regex = new RegExp('^' + escaped.replace(/\*/g, '[^/]+') + '$')
      return regex.test(resource)
    }

    return false
  }

  /**
   * ============================================================================
   * 检查是否有指定权限
   * ============================================================================
   *
   * 【使用场景】
   * - 按钮级权限控制：v-permission 指令
   * - 代码中的权限判断
   *
   * 【示例】
   * hasPermission('/admin/user/ban', 'POST')  // 检查是否有封禁用户的权限
   * hasPermission('/admin/video/delete', 'DELETE')  // 检查是否有删除视频的权限
   *
   * @param resource 资源路径
   * @param action HTTP 方法（GET/POST/PUT/DELETE）
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
   *
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
   *
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
   *
   * 【匹配规则】
   * 1. 先尝试直接匹配
   * 2. 再尝试构建完整路径匹配（父路径 + 子路径）
   */
  function getMenuByPath(path: string): Menu | undefined {
    // 直接匹配
    const directMatch = flatMenus.value.find((m) => m.path === path)
    if (directMatch) return directMatch

    // 构建完整路径匹配
    function findMenuWithFullPath(items: Menu[], parentPath = ''): Menu | undefined {
      for (const item of items) {
        if (!item.path) continue

        // 计算完整路径
        let fullPath: string
        if (item.path.startsWith('/')) {
          fullPath = item.path
        } else if (parentPath) {
          fullPath = `${parentPath}/${item.path}`
        } else {
          fullPath = item.path
        }

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
   * 根据路由路径获取菜单路径（面包屑导航用）
   *
   * @param routePath 当前路由路径
   * @returns 菜单链路数组，从父到子
   */
  function getMenuPathByRoutePath(routePath: string): Menu[] {
    const result: Menu[] = []

    function findMenuPath(items: Menu[], parentPath = '', ancestors: Menu[] = []): boolean {
      for (const item of items) {
        if (!item.path) continue

        // 计算完整路径
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

        // 子路径匹配
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
   *
   * 【调用时机】
   * 用户退出登录时调用，清除所有权限数据。
   */
  function resetPermission(): void {
    menus.value = []
    permissions.value = []
    routes.value = []
    isLoaded.value = false
    isLoading.value = false
  }

  return {
    // 状态（只读）
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
