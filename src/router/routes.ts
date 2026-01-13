/**
 * 静态路由配置
 * 包含登录页、错误页等公共路由
 * Requirements: 5.2
 */
import type { RouteRecordRaw } from 'vue-router'

/**
 * 路由 meta 类型扩展
 */
declare module 'vue-router' {
  interface RouteMeta {
    /** 页面标题（中文） */
    title?: string
    /** 页面标题（英文） */
    titleEn?: string
    /** 页面标题（日文） */
    titleJa?: string
    /** 是否需要认证 */
    requiresAuth?: boolean
    /** 菜单 ID（用于权限校验） */
    menuId?: number
    /** 是否缓存组件 */
    keepAlive?: boolean
    /** 菜单图标 */
    icon?: string
  }
}

/**
 * 白名单路由（不需要登录即可访问）
 */
export const WHITE_LIST_ROUTES = ['/login', '/403', '/404']

/**
 * 静态路由
 * 这些路由不需要动态生成，始终可用
 */
export const staticRoutes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/auth/LoginView.vue'),
    meta: {
      title: '登录',
      titleEn: 'Login',
      titleJa: 'ログイン',
      requiresAuth: false,
    },
  },
  {
    path: '/403',
    name: 'Forbidden',
    component: () => import('@/views/error/403.vue'),
    meta: {
      title: '无权限',
      titleEn: 'Forbidden',
      titleJa: 'アクセス拒否',
      requiresAuth: false,
    },
  },
  {
    path: '/404',
    name: 'NotFound',
    component: () => import('@/views/error/404.vue'),
    meta: {
      title: '页面不存在',
      titleEn: 'Not Found',
      titleJa: 'ページが見つかりません',
      requiresAuth: false,
    },
  },
]

/**
 * 根路由
 * 使用默认布局，子路由由动态路由生成
 */
export const rootRoute: RouteRecordRaw = {
  path: '/',
  name: 'Root',
  component: () => import('@/layouts/DefaultLayout.vue'),
  redirect: '/overview/dashboard',
  meta: {
    requiresAuth: true,
  },
  children: [
    // 运营总览 - 数据看板
    {
      path: 'overview',
      name: 'Overview',
      redirect: '/overview/dashboard',
      meta: {
        title: '运营总览',
        titleEn: 'Overview',
        titleJa: '運営概要',
        requiresAuth: true,
      },
      children: [
        {
          path: 'dashboard',
          name: 'DataDashboard',
          component: () => import('@/views/overview/dashboard/index.vue'),
          meta: {
            title: '数据看板',
            titleEn: 'Dashboard',
            titleJa: 'ダッシュボード',
            requiresAuth: true,
            icon: 'dashboard',
          },
        },
      ],
    },
    // 兼容旧路由 - 重定向到新路由
    {
      path: 'dashboard',
      redirect: '/overview/dashboard',
    },
  ],
}

/**
 * 404 兜底路由
 * 必须放在最后，匹配所有未定义的路由
 */
export const notFoundRoute: RouteRecordRaw = {
  path: '/:pathMatch(.*)*',
  name: 'NotFoundRedirect',
  redirect: '/404',
}

/**
 * 获取所有基础路由
 */
export function getBaseRoutes(): RouteRecordRaw[] {
  return [...staticRoutes, rootRoute, notFoundRoute]
}
