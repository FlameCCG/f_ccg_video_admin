/**
 * 路由组件 glob 覆盖测试。
 * 校验 menus.csv 的 component 列中 Layout 及 17 个视图路径均能由 index.vue 懒加载映射解析。
 * 组件路径以字面量列出，避免 src/ 引入 Node 内置模块。
 * 组件路径不以 index.vue 结尾或文件不存在时，测试应失败。
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { resolveComponent } from './permission'

// 与 permission.test.ts 一致：store 模块会连带引入 API 层，这里不需要真实请求
vi.mock('@/api/rbac', () => ({
  getCurrentUserMenus: vi.fn(),
  getUserPermissions: vi.fn(),
}))

/** menus.csv 中出现的布局组件（BlankLayout 目前未被后端使用，但解析逻辑同样支持） */
const LAYOUT_COMPONENTS = ['Layout', 'BlankLayout'] as const

/** menus.csv component 列去重后的全部视图路径 */
const MENU_VIEW_COMPONENTS = [
  'views/content/review/index.vue',
  'views/content/videos/index.vue',
  'views/content/recycle/index.vue',
  'views/content/categories/index.vue',
  'views/community/reports/index.vue',
  'views/community/comments/index.vue',
  'views/community/danmaku/index.vue',
  'views/community/activities/index.vue',
  'views/marketing/banners/index.vue',
  'views/marketing/notifications/index.vue',
  'views/users/list/index.vue',
  'views/users/bans/index.vue',
  'views/users/ban-records/index.vue',
  'views/system/roles/index.vue',
  'views/system/menus/index.vue',
  'views/system/apis/index.vue',
  'views/system/site-config/index.vue',
] as const

/**
 * 顶级菜单 /overview 的 component 是 Layout 且没有子菜单，
 * menuToRoute 会回落到「同名视图」查找，这两条路径必须仍在 glob 覆盖范围内。
 */
const LAYOUT_FALLBACK_COMPONENTS = ['views/overview/dashboard/index.vue'] as const

afterEach(() => {
  vi.restoreAllMocks()
})

describe('resolveComponent（收窄后的 views glob）', () => {
  it('menus.csv 里的视图路径数量与预期一致', () => {
    expect(MENU_VIEW_COMPONENTS).toHaveLength(17)
  })

  it.each(LAYOUT_COMPONENTS)('布局组件 %s 解析为懒加载函数', (component) => {
    expect(typeof resolveComponent(component)).toBe('function')
  })

  it.each(MENU_VIEW_COMPONENTS)('menus.csv 组件 %s 解析为懒加载函数', (component) => {
    expect(typeof resolveComponent(component)).toBe('function')
  })

  it.each(LAYOUT_FALLBACK_COMPONENTS)('Layout 回落视图 %s 解析为懒加载函数', (component) => {
    expect(typeof resolveComponent(component)).toBe('function')
  })

  it('兼容 @/views 前缀与省略 .vue 后缀的写法', () => {
    expect(typeof resolveComponent('@/views/system/roles/index.vue')).toBe('function')
    expect(typeof resolveComponent('views/system/roles/index')).toBe('function')
    // 目录形式：会自动补 /index.vue
    expect(typeof resolveComponent('views/system/roles')).toBe('function')
  })

  it('空组件路径返回 undefined', () => {
    expect(resolveComponent(undefined)).toBeUndefined()
    expect(resolveComponent('')).toBeUndefined()
  })

  it('页面私有组件不再进入 glob（这正是收窄的目的）', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    expect(resolveComponent('views/content/components/VideoDetailDrawer.vue')).toBeUndefined()
    expect(resolveComponent('views/users/list/components/UserEditDrawer.vue')).toBeUndefined()
    // 非 index.vue 的独立页面同样不在 glob 内（它们在 router/routes.ts 中显式懒加载）
    expect(resolveComponent('views/auth/LoginView.vue')).toBeUndefined()
    expect(resolveComponent('views/error/404.vue')).toBeUndefined()

    expect(warn).toHaveBeenCalled()
  })
})
