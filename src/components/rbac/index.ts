/**
 * RBAC 组件导出
 */
export { default as MenuTree } from './MenuTree.vue'
export { default as RoleMenuDrawer } from './RoleMenuDrawer.vue'
export { default as RolePermissionDrawer } from './RolePermissionDrawer.vue'
export { default as RoleSelector } from './RoleSelector.vue'
export { default as PermissionTable } from './PermissionTable.vue'
export { default as UserRoleDrawer } from './UserRoleDrawer.vue'
export { default as UserPermissionDrawer } from './UserPermissionDrawer.vue'

// 注意：RoleInheritTree 故意不从这里导出。
// 它内部静态引入 @vue-flow（约 268KB），而 barrel 是静态 import 边 ——
// 只要在此 re-export，任何 `import { UserRoleDrawer } from '@/components/rbac'`
// 都会把 @vue-flow 拉进入口依赖图（实测：会出现在 index.html 的 modulepreload 里，
// 登录页也要下载）。唯一的两个使用方都通过 defineAsyncComponent 直接按路径懒加载：
//   UserRoleDrawer.vue / RoleInheritTreeModal.vue
//     -> () => import('@/components/rbac/RoleInheritTree.vue')
