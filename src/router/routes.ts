/**
 * 静态路由配置
 * 只包含登录页、错误页等公共路由
 * 业务路由由后端菜单动态生成
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
    /** 排序顺序 */
    sortOrder?: number
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
 * 获取所有基础路由
 * 动态路由（业务菜单）由 guard.ts 在登录后添加
 */
export function getBaseRoutes(): RouteRecordRaw[] {
  return [...staticRoutes]
}
