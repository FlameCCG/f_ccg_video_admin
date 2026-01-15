/**
 * ============================================================================
 * 静态路由配置
 * ============================================================================
 *
 * 【模块职责】
 * 定义不需要动态生成的静态路由，这些路由在应用启动时就注册到 router。
 *
 * 【路由分类】
 * 1. 静态路由（本文件）：登录页、错误页等公共路由，不需要权限即可访问
 * 2. 动态路由（permission.ts 生成）：业务页面路由，根据用户菜单权限动态生成
 *
 * 【路由注册流程】
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │  应用启动                                                               │
 * │     ↓                                                                   │
 * │  router/index.ts 创建 router 实例                                       │
 * │     ↓                                                                   │
 * │  注册静态路由（getBaseRoutes()）                                         │
 * │     ↓                                                                   │
 * │  用户登录成功                                                            │
 * │     ↓                                                                   │
 * │  路由守卫加载权限数据                                                     │
 * │     ↓                                                                   │
 * │  permission.ts 生成动态路由                                              │
 * │     ↓                                                                   │
 * │  路由守卫调用 router.addRoute() 注册动态路由                              │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * Requirements: 5.2
 */
import type { RouteRecordRaw } from 'vue-router'

/**
 * ============================================================================
 * 路由 meta 类型扩展
 * ============================================================================
 *
 * 扩展 Vue Router 的 RouteMeta 接口，添加自定义字段。
 * 这些字段用于：
 * - 多语言标题
 * - 权限控制
 * - 组件缓存
 * - 菜单图标
 */
declare module 'vue-router' {
  interface RouteMeta {
    /** 页面标题（中文，默认） */
    title?: string
    /** 页面标题（英文） */
    titleEn?: string
    /** 页面标题（日文） */
    titleJa?: string
    /**
     * 是否需要认证
     * - true（默认）：需要登录才能访问
     * - false：不需要登录即可访问（如登录页、错误页）
     */
    requiresAuth?: boolean
    /**
     * 菜单 ID
     * 用于权限校验，与后端菜单数据关联
     */
    menuId?: number
    /**
     * 是否缓存组件
     * 配合 <keep-alive> 使用，缓存页面状态
     */
    keepAlive?: boolean
    /** 菜单图标（SVG 字符串） */
    icon?: string
    /** 排序顺序 */
    sortOrder?: number
  }
}

/**
 * ============================================================================
 * 白名单路由
 * ============================================================================
 *
 * 这些路由不需要登录即可访问。
 * 路由守卫会检查当前路由是否在白名单中，如果是则直接放行。
 *
 * 【包含的路由】
 * - /login：登录页面
 * - /403：无权限页面
 * - /404：页面不存在
 */
export const WHITE_LIST_ROUTES = ['/login', '/403', '/404']

/**
 * ============================================================================
 * 静态路由配置
 * ============================================================================
 *
 * 这些路由不需要动态生成，始终可用。
 * 主要包括：
 * - 登录页：用户认证入口
 * - 错误页：403（无权限）、404（页面不存在）
 */
export const staticRoutes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    // 使用懒加载，只有访问登录页时才加载组件
    component: () => import('@/views/auth/LoginView.vue'),
    meta: {
      title: '登录',
      titleEn: 'Login',
      titleJa: 'ログイン',
      requiresAuth: false, // 不需要认证
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
 *
 * 【说明】
 * 返回静态路由配置，用于创建 router 实例。
 * 动态路由（业务菜单）由 guard.ts 在登录后添加。
 */
export function getBaseRoutes(): RouteRecordRaw[] {
  return [...staticRoutes]
}
