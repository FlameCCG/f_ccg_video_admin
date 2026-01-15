/**
 * ============================================================================
 * 路由守卫 - 动态路由与权限校验核心模块
 * ============================================================================
 *
 * 【模块职责】
 * 本模块负责路由导航的拦截和控制，是前端权限系统的"门卫"。
 *
 * 【整体流程图】
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                           用户访问某个路由                                │
 * │                                 ↓                                       │
 * │  ┌─────────────────────────────────────────────────────────────────┐   │
 * │  │                    beforeEach 路由守卫                           │   │
 * │  └─────────────────────────────────────────────────────────────────┘   │
 * │                                 ↓                                       │
 * │  ┌─────────────────────────────────────────────────────────────────┐   │
 * │  │ 步骤1：检查是否是白名单路由（/login, /403, /404）                  │   │
 * │  │        → 是：直接放行                                            │   │
 * │  │        → 否：继续下一步                                          │   │
 * │  └─────────────────────────────────────────────────────────────────┘   │
 * │                                 ↓                                       │
 * │  ┌─────────────────────────────────────────────────────────────────┐   │
 * │  │ 步骤2：检查是否已登录（authStore.isLoggedIn）                     │   │
 * │  │        → 否：跳转到登录页，携带 redirect 参数                      │   │
 * │  │        → 是：继续下一步                                          │   │
 * │  └─────────────────────────────────────────────────────────────────┘   │
 * │                                 ↓                                       │
 * │  ┌─────────────────────────────────────────────────────────────────┐   │
 * │  │ 步骤3：检查权限数据是否已加载（permissionStore.isLoaded）          │   │
 * │  │        → 否：加载用户信息 + 菜单 + 权限                           │   │
 * │  │              → 生成动态路由                                       │   │
 * │  │              → 注册到 router                                     │   │
 * │  │              → 重新导航（确保新路由生效）                          │   │
 * │  │        → 是：继续下一步                                          │   │
 * │  └─────────────────────────────────────────────────────────────────┘   │
 * │                                 ↓                                       │
 * │  ┌─────────────────────────────────────────────────────────────────┐   │
 * │  │ 步骤4：检查路由权限                                              │   │
 * │  │        → 有权限：放行                                            │   │
 * │  │        → 无权限：跳转到 403 页面                                  │   │
 * │  └─────────────────────────────────────────────────────────────────┘   │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * Requirements: 5.1, 5.4
 */
import type { Router, RouteLocationNormalized, NavigationGuardNext } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useUserStore } from '@/stores/user'
import { usePermissionStore } from '@/stores/permission'
import { useAppStore } from '@/stores/app'
import { WHITE_LIST_ROUTES } from './routes'

/**
 * 检查路由是否在白名单中
 *
 * 【白名单路由】
 * 这些路由不需要登录即可访问：
 * - /login：登录页
 * - /403：无权限页面
 * - /404：页面不存在
 *
 * @param path 路由路径
 */
function isWhiteList(path: string): boolean {
  return WHITE_LIST_ROUTES.some((item) => path.startsWith(item))
}

/**
 * ============================================================================
 * 加载用户权限数据
 * ============================================================================
 *
 * 【执行流程】
 * 1. 获取用户信息（如果未加载）
 * 2. 同步当前语言到 permission store
 * 3. 获取权限数据（菜单 + 权限）
 *
 * 【API 调用顺序】
 * 1. GET /admin/user/info        → 获取当前用户信息
 * 2. GET /admin/rbac/user/menus  → 获取用户可访问的菜单
 * 3. GET /admin/rbac/user/permissions → 获取用户的操作权限
 *
 * @returns 是否加载成功
 */
async function loadUserPermissions(): Promise<boolean> {
  const userStore = useUserStore()
  const permissionStore = usePermissionStore()
  const appStore = useAppStore()

  try {
    // 步骤1：获取用户信息
    if (!userStore.isLoaded) {
      await userStore.fetchUserInfo()
    }

    // 步骤2：同步当前语言到 permission store
    // 这样生成的路由标题会使用正确的语言
    permissionStore.setLocale(appStore.currentLocale)

    // 步骤3：获取权限数据（菜单 + 权限）
    if (!permissionStore.isLoaded && userStore.userId) {
      await permissionStore.fetchUserPermissions(userStore.userId)
    }

    return true
  } catch (error) {
    console.error('[Router Guard] Failed to load user permissions:', error)
    return false
  }
}

/**
 * ============================================================================
 * 添加动态路由
 * ============================================================================
 *
 * 【工作原理】
 * Vue Router 支持在运行时动态添加路由。我们利用这个特性，
 * 根据用户的菜单权限动态注册路由，实现"用户只能访问有权限的页面"。
 *
 * 【执行流程】
 * 1. 从 permissionStore 获取生成的路由配置
 * 2. 遍历路由，使用 router.addRoute() 注册
 * 3. 添加根路由重定向（/ → 第一个菜单）
 * 4. 添加 404 兜底路由（必须在最后）
 *
 * 【注意事项】
 * - 动态路由必须在访问前注册，否则会 404
 * - 404 兜底路由必须最后添加，否则会拦截所有路由
 * - 重复添加同名路由会被忽略（通过 hasRoute 检查）
 *
 * @param router Vue Router 实例
 */
function addDynamicRoutes(router: Router): void {
  const permissionStore = usePermissionStore()

  // 获取生成的路由配置
  const dynamicRoutes = permissionStore.routes

  // 步骤1：注册动态路由
  for (const route of dynamicRoutes) {
    // 检查路由是否已存在，避免重复注册
    if (!router.hasRoute(route.name as string)) {
      router.addRoute(route)
    }
  }

  // 步骤2：添加根路由重定向
  // 访问 / 时自动跳转到第一个菜单
  if (dynamicRoutes.length > 0) {
    const firstRoute = dynamicRoutes[0]
    if (firstRoute) {
      // 移除旧的 Root 路由（如果存在）
      if (router.hasRoute('Root')) {
        router.removeRoute('Root')
      }
      // 计算重定向目标：优先使用路由的 redirect，否则使用 path
      const redirectPath =
        (typeof firstRoute.redirect === 'string' ? firstRoute.redirect : null) || firstRoute.path
      router.addRoute({
        path: '/',
        name: 'Root',
        redirect: redirectPath,
      })
    }
  }

  // 步骤3：添加 404 兜底路由
  // 这个路由必须最后添加，用于捕获所有未匹配的路由
  if (!router.hasRoute('NotFoundRedirect')) {
    router.addRoute({
      path: '/:pathMatch(.*)*', // 匹配所有路径
      name: 'NotFoundRedirect',
      redirect: '/404',
    })
  }
}

/**
 * ============================================================================
 * 检查路由权限
 * ============================================================================
 *
 * 【检查逻辑】
 * 1. 如果路由设置了 requiresAuth: false，直接放行
 * 2. 如果是根路由（/），直接放行
 * 3. 如果路由有 menuId，检查用户是否有该菜单
 * 4. 检查路由路径是否在用户的菜单中
 *
 * @param to 目标路由
 * @returns 是否有权限访问
 */
function checkRoutePermission(to: RouteLocationNormalized): boolean {
  const permissionStore = usePermissionStore()

  // 检查1：路由是否需要认证
  const requiresAuth = to.meta.requiresAuth !== false
  if (!requiresAuth) {
    return true
  }

  // 检查2：根路由直接放行
  if (to.path === '/') {
    return true
  }

  // 检查3：通过 menuId 检查权限
  const menuId = to.meta.menuId
  if (menuId) {
    return !!permissionStore.getMenuById(menuId)
  }

  // 检查4：通过路由路径检查权限
  const menu = permissionStore.getMenuByPath(to.path)
  if (menu) {
    return true
  }

  // 检查5：检查是否是动态添加的路由
  const flatMenus = permissionStore.flatMenus
  const hasAccess = flatMenus.some((m) => {
    if (!m.path) return false
    const menuFullPath = m.path.startsWith('/') ? m.path : `/${m.path}`
    return to.path === menuFullPath || to.path.startsWith(menuFullPath + '/')
  })

  return hasAccess
}

/**
 * ============================================================================
 * 设置路由守卫（主入口）
 * ============================================================================
 *
 * 【调用时机】
 * 在 router/index.ts 中创建 router 实例后调用。
 *
 * 【守卫类型】
 * - beforeEach：全局前置守卫，在路由跳转前执行
 * - afterEach：全局后置守卫，在路由跳转后执行
 *
 * @param router Vue Router 实例
 */
export function setupRouterGuard(router: Router): void {
  /**
   * 全局前置守卫
   *
   * 【参数说明】
   * - to：目标路由对象
   * - from：来源路由对象（本例中未使用，用 _ 前缀标记）
   * - next：导航控制函数
   *   - next()：放行
   *   - next('/path')：重定向
   *   - next(false)：取消导航
   */
  router.beforeEach(
    async (
      to: RouteLocationNormalized,
      _from: RouteLocationNormalized,
      next: NavigationGuardNext
    ) => {
      const authStore = useAuthStore()
      const permissionStore = usePermissionStore()

      // ========== 步骤1：白名单检查 ==========
      if (isWhiteList(to.path)) {
        next()
        return
      }

      // ========== 步骤2：登录状态检查 ==========
      if (!authStore.isLoggedIn) {
        // 未登录，跳转到登录页
        // 携带 redirect 参数，登录成功后可以跳回原页面
        next({
          path: '/login',
          query: { redirect: to.fullPath },
        })
        return
      }

      // ========== 步骤3：权限数据加载 ==========
      if (!permissionStore.isLoaded) {
        // 加载用户信息和权限数据
        const success = await loadUserPermissions()

        if (!success) {
          // 加载失败，清除登录状态并跳转登录页
          authStore.logout()
          next({
            path: '/login',
            query: { redirect: to.fullPath },
          })
          return
        }

        // 添加动态路由
        addDynamicRoutes(router)

        // 【关键】重新导航到目标路由
        // 因为动态路由刚刚添加，需要重新匹配
        // replace: true 表示替换当前历史记录，避免用户点击后退时回到空白页
        next({ ...to, replace: true })
        return
      }

      // ========== 步骤4：路由权限检查 ==========
      const requiresAuth = to.meta.requiresAuth !== false
      if (!requiresAuth) {
        next()
        return
      }

      // 检查是否有访问权限
      const hasAccess = checkRoutePermission(to)

      if (hasAccess) {
        next()
      } else {
        // 无权限，跳转到 403 页面
        next({ path: '/403' })
      }
    }
  )

  /**
   * 全局后置守卫
   *
   * 【用途】
   * - 设置页面标题
   * - 页面访问统计
   * - 滚动位置恢复等
   */
  router.afterEach((to: RouteLocationNormalized) => {
    const appStore = useAppStore()
    const locale = appStore.currentLocale

    // 根据当前语言获取页面标题
    let title: string | undefined
    switch (locale) {
      case 'en-US':
        title = (to.meta.titleEn as string) || (to.meta.title as string)
        break
      case 'ja-JP':
        title = (to.meta.titleJa as string) || (to.meta.title as string)
        break
      case 'zh-CN':
      default:
        title = (to.meta.titleZh as string) || (to.meta.title as string)
    }

    // 设置文档标题
    if (title) {
      document.title = `${title} - Admin Console`
    } else {
      document.title = 'Admin Console'
    }
  })
}

/**
 * ============================================================================
 * 重置路由
 * ============================================================================
 *
 * 【调用时机】
 * 用户退出登录时调用，清除动态添加的路由。
 *
 * 【执行流程】
 * 1. 遍历动态路由，使用 router.removeRoute() 移除
 * 2. 重置 permissionStore 状态
 *
 * 【为什么需要重置】
 * 如果不重置，下一个用户登录时可能会看到上一个用户的路由，
 * 导致权限泄露。
 *
 * @param router Vue Router 实例
 */
export function resetRouter(router: Router): void {
  const permissionStore = usePermissionStore()

  // 移除动态添加的路由
  for (const route of permissionStore.routes) {
    if (route.name && router.hasRoute(route.name)) {
      router.removeRoute(route.name)
    }
  }

  // 重置权限状态
  permissionStore.resetPermission()
}
