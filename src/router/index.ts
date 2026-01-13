import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Home',
    component: () => import('@/views/HomeView.vue'),
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/auth/LoginView.vue'),
    meta: {
      title: 'Login',
      requiresAuth: false,
    },
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('@/views/HomeView.vue'), // 临时使用 HomeView，后续会替换为 DashboardView
    meta: {
      title: 'Dashboard',
      requiresAuth: true,
    },
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

export default router
