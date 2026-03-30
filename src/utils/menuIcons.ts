/**
 * 菜单图标映射工具
 * 将后端返回的 icon 字符串映射到前端图标组件
 */
import { h, type Component } from 'vue'
import { NIcon } from 'naive-ui'

// 导入所有菜单图标组件
import MenuIconDashboard from '@/components/icons/MenuIconDashboard.vue'
import MenuIconUser from '@/components/icons/MenuIconUser.vue'
import MenuIconVideo from '@/components/icons/MenuIconVideo.vue'
import MenuIconComment from '@/components/icons/MenuIconComment.vue'
import MenuIconDynamic from '@/components/icons/MenuIconDynamic.vue'
import MenuIconBanner from '@/components/icons/MenuIconBanner.vue'
import MenuIconNotification from '@/components/icons/MenuIconNotification.vue'
import MenuIconRbac from '@/components/icons/MenuIconRbac.vue'
import MenuIconSettings from '@/components/icons/MenuIconSettings.vue'
import MenuIconRole from '@/components/icons/MenuIconRole.vue'
import MenuIconMenu from '@/components/icons/MenuIconMenu.vue'
import MenuIconApi from '@/components/icons/MenuIconApi.vue'
import MenuIconAudit from '@/components/icons/MenuIconAudit.vue'
import MenuIconBan from '@/components/icons/MenuIconBan.vue'
import MenuIconRecycle from '@/components/icons/MenuIconRecycle.vue'
import MenuIconCategory from '@/components/icons/MenuIconCategory.vue'
import MenuIconReport from '@/components/icons/MenuIconReport.vue'
import MenuIconDanmaku from '@/components/icons/MenuIconDanmaku.vue'
import MenuIconVideoList from '@/components/icons/MenuIconVideoList.vue'

/**
 * 后端 icon 字符串到前端组件的映射表
 * 支持多种格式：el-icon-xxx, icon-xxx, xxx
 */
const iconComponentMap: Record<string, Component> = {
  // Dashboard / 仪表盘
  dashboard: MenuIconDashboard,
  'el-icon-dashboard': MenuIconDashboard,
  'el-icon-bar-chart': MenuIconDashboard,
  'bar-chart': MenuIconDashboard,

  // User / 用户管理
  user: MenuIconUser,
  'el-icon-user': MenuIconUser,
  'el-icon-team': MenuIconUser,
  team: MenuIconUser,

  // Ban / 封禁管理
  ban: MenuIconBan,
  'el-icon-stop': MenuIconBan,
  stop: MenuIconBan,

  // Video / 视频管理
  video: MenuIconVideo,
  'el-icon-video': MenuIconVideo,
  'el-icon-video-camera': MenuIconVideo,
  'video-camera': MenuIconVideo,

  // Video List / 视频列表
  'video-list': MenuIconVideoList,
  'el-icon-unordered-list': MenuIconVideoList,
  'unordered-list': MenuIconVideoList,

  // Audit / 稿件审核
  audit: MenuIconAudit,
  'el-icon-audit': MenuIconAudit,

  // Recycle / 回收站
  recycle: MenuIconRecycle,
  'el-icon-delete': MenuIconRecycle,

  // Category / 分区配置
  category: MenuIconCategory,
  'el-icon-appstore': MenuIconCategory,
  appstore: MenuIconCategory,

  // Comment / 评论管理
  comment: MenuIconComment,
  'el-icon-comment': MenuIconComment,
  'el-icon-message': MenuIconComment,
  message: MenuIconComment,

  // Report / 举报处理
  report: MenuIconReport,
  'el-icon-warning': MenuIconReport,
  warning: MenuIconReport,

  // Danmaku / 弹幕管控
  danmaku: MenuIconDanmaku,
  'el-icon-danmaku': MenuIconDanmaku,

  // Dynamic / 动态管理
  dynamic: MenuIconDynamic,
  'el-icon-dynamic': MenuIconDynamic,
  'el-icon-thunderbolt': MenuIconDynamic,
  thunderbolt: MenuIconDynamic,

  // Banner / 轮播图
  banner: MenuIconBanner,
  'el-icon-banner': MenuIconBanner,
  'el-icon-picture': MenuIconBanner,
  picture: MenuIconBanner,
  'el-icon-gift': MenuIconBanner,

  // Notification / 通知
  notification: MenuIconNotification,
  'el-icon-notification': MenuIconNotification,
  'el-icon-bell': MenuIconNotification,
  bell: MenuIconNotification,

  // RBAC / 权限管理
  rbac: MenuIconRbac,
  'el-icon-rbac': MenuIconRbac,
  'el-icon-setting': MenuIconRbac,
  'el-icon-cluster': MenuIconRbac,

  // Role / 角色管理
  role: MenuIconRole,
  'el-icon-idcard': MenuIconRole,
  idcard: MenuIconRole,

  // Menu / 菜单管理
  menu: MenuIconMenu,
  'el-icon-menu': MenuIconMenu,

  // API / 接口资源
  api: MenuIconApi,
  'el-icon-api': MenuIconApi,

  // Settings / 系统设置
  settings: MenuIconSettings,
  'el-icon-settings': MenuIconSettings,

  // Community / 社区治理
  'el-icon-safety-certificate': MenuIconComment,
}

/**
 * 根据后端 icon 字符串获取图标组件
 * @param iconName 后端返回的 icon 字符串
 * @returns 图标组件或 undefined
 */
export function getIconComponent(iconName: string | undefined): Component | undefined {
  if (!iconName) return undefined

  // 直接匹配
  if (iconComponentMap[iconName]) {
    return iconComponentMap[iconName]
  }

  // 尝试移除 el-icon- 前缀后匹配
  if (iconName.startsWith('el-icon-')) {
    const shortName = iconName.replace('el-icon-', '')
    if (iconComponentMap[shortName]) {
      return iconComponentMap[shortName]
    }
  }

  // 尝试移除 icon- 前缀后匹配
  if (iconName.startsWith('icon-')) {
    const shortName = iconName.replace('icon-', '')
    if (iconComponentMap[shortName]) {
      return iconComponentMap[shortName]
    }
  }

  return undefined
}

/**
 * 渲染图标（用于 Naive UI Menu）
 * @param iconName 后端返回的 icon 字符串
 * @returns 渲染函数或 undefined
 */
export function renderMenuIcon(iconName: string | undefined) {
  const IconComponent = getIconComponent(iconName)
  if (!IconComponent) return undefined
  return () => h(NIcon, null, { default: () => h(IconComponent) })
}

/**
 * 后端 icon 建议值
 * 可以用这个列表更新后端数据库中的 icon 字段
 */
export const suggestedIcons = {
  // 一级菜单
  运营总览: 'dashboard',
  内容管理: 'video',
  社区治理: 'comment',
  营销推广: 'banner',
  用户管理: 'user',
  系统权限: 'rbac',

  // 二级菜单 - 运营总览
  仪表盘: 'dashboard',

  // 二级菜单 - 内容管理
  稿件审核: 'video',
  视频列表: 'video',
  视频回收站: 'video',
  分区配置: 'video',

  // 二级菜单 - 社区治理
  举报处理: 'comment',
  评论管控: 'comment',
  弹幕管控: 'comment',
  动态管理: 'dynamic',

  // 二级菜单 - 营销推广
  轮播图管理: 'banner',
  全站通知: 'notification',

  // 二级菜单 - 用户管理
  用户列表: 'user',
  封禁管理: 'user',
  封禁记录: 'user',

  // 二级菜单 - 系统权限
  角色管理: 'rbac',
  菜单权限: 'rbac',
  接口资源: 'rbac',
}
