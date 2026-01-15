/**
 * 路由守卫
 * 实现登录检查、权限数据加载、路由权限校验
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
 */
function isWhiteList(path: string): boolean {
  return WHITE_LIST_ROUTES.some((item) => path.startsWith(item))
}

/**
 * 加载用户权限数据
 */
async function loadUserPermissions(): Promise<boolean> {
  const userStore = useUserStore()
  const permissionStore = usePermissionStore()
  const appStore = useAppStore()

  try {
    // 1. 获取用户信息
    if (!userStore.isLoaded) {
      await userStore.fetchUserInfo()
    }

    // 2. 同步当前语言到 permission store
    permissionStore.setLocale(appStore.currentLocale)

    // 3. 获取权限数据（菜单 + 权限）
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
 * 添加动态路由
 * 后端顶级菜单的 component="Layout"，直接注册为顶级路由
 */
function addDynamicRoutes(router: Router): void {
  const permissionStore = usePermissionStore()

  // 获取生成的路由
  const dynamicRoutes = permissionStore.routes

  // 直接添加为顶级路由（后端顶级菜单已经是 Layout）
  for (const route of dynamicRoutes) {
    // 检查路由是否已存在
    if (!router.hasRoute(route.name as string)) {
      router.addRoute(route)
    }
  }

  // 添加根路由重定向（如果有动态路由）
  if (dynamicRoutes.length > 0) {
    const firstRoute = dynamicRoutes[0]
    if (firstRoute) {
      // 移除旧的 Root 路由
      if (router.hasRoute('Root')) {
        router.removeRoute('Root')
      }
      // 添加根路由重定向到第一个动态路由
      const redirectPath =
        (typeof firstRoute.redirect === 'string' ? firstRoute.redirect : null) || firstRoute.path
      router.addRoute({
        path: '/',
        name: 'Root',
        redirect: redirectPath,
      })
    }
  }

  // 添加 404 兜底路由（必须在最后）
  if (!router.hasRoute('NotFoundRedirect')) {
    router.addRoute({
      path: '/:pathMatch(.*)*',
      name: 'NotFoundRedirect',
      redirect: '/404',
    })
  }
}

/**
 * 检查路由权限
 */
function checkRoutePermission(to: RouteLocationNormalized): boolean {
  const permissionStore = usePermissionStore()

  // 如果路由没有设置 requiresAuth，默认需要认证
  const requiresAuth = to.meta.requiresAuth !== false

  if (!requiresAuth) {
    return true
  }

  // 根路由直接放行
  if (to.path === '/') {
    return true
  }

  // 检查是否有对应的菜单权限
  const menuId = to.meta.menuId
  if (menuId) {
    return !!permissionStore.getMenuById(menuId)
  }

  // 检查路由路径是否在菜单中
  const menu = permissionStore.getMenuByPath(to.path)
  if (menu) {
    return true
  }

  // 如果是动态添加的路由，检查是否存在
  const flatMenus = permissionStore.flatMenus
  const hasAccess = flatMenus.some((m) => {
    if (!m.path) return false
    // 检查完整路径匹配
    const menuFullPath = m.path.startsWith('/') ? m.path : `/${m.path}`
    return to.path === menuFullPath || to.path.startsWith(menuFullPath + '/')
  })

  return hasAccess
}

/**
 * 设置路由守卫
 */
export function setupRouterGuard(router: Router): void {
  // 全局前置守卫
  router.beforeEach(
    async (
      to: RouteLocationNormalized,
      _from: RouteLocationNormalized,
      next: NavigationGuardNext
    ) => {
      const authStore = useAuthStore()
      const permissionStore = usePermissionStore()

      // 1. 白名单路由直接放行
      if (isWhiteList(to.path)) {
        next()
        return
      }

      // 2. 检查是否已登录
      if (!authStore.isLoggedIn) {
        // 未登录，跳转到登录页
        next({
          path: '/login',
          query: { redirect: to.fullPath },
        })
        return
      }

      // 3. 已登录但未加载权限数据
      if (!permissionStore.isLoaded) {
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
        console.log(router.getRoutes())
        // 重新导航到目标路由（确保动态路由已添加）
        next({ ...to, replace: true })
        return
      }

      // 4. 检查路由权限
      // 对于静态路由（如 /dashboard），如果没有设置 menuId，则默认放行
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

  // 全局后置守卫（可用于页面标题设置等）
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

    if (title) {
      document.title = `${title} - Admin Console`
    } else {
      document.title = 'Admin Console'
    }
  })
}

/**
 * 重置路由（用于退出登录时）
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
