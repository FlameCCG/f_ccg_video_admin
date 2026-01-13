/**
 * 路由实例配置
 * Requirements: 5.2
 */
import { createRouter, createWebHistory } from 'vue-router'
import { setupRouterGuard } from './guard'
import { getBaseRoutes } from './routes'

/**
 * 创建路由实例
 */
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: getBaseRoutes(),
  // 滚动行为：切换路由时滚动到顶部
  scrollBehavior(_to, _from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    }
    return { top: 0 }
  },
})

// 设置路由守卫
setupRouterGuard(router)

export default router
