/**
 * Menu icons utility tests
 * Tests for icon mapping functionality
 */
import { describe, it, expect } from 'vitest'
import { suggestedIcons } from './menuIcons'

describe('menuIcons utils', () => {
  describe('suggestedIcons', () => {
    it('should have suggested icons for main menus', () => {
      expect(suggestedIcons['运营总览']).toBe('dashboard')
      expect(suggestedIcons['内容管理']).toBe('video')
      expect(suggestedIcons['社区治理']).toBe('comment')
      expect(suggestedIcons['营销推广']).toBe('banner')
      expect(suggestedIcons['用户管理']).toBe('user')
      expect(suggestedIcons['系统权限']).toBe('rbac')
    })

    it('should have suggested icons for sub menus', () => {
      expect(suggestedIcons['仪表盘']).toBe('dashboard')
      expect(suggestedIcons['用户列表']).toBe('user')
      expect(suggestedIcons['轮播图管理']).toBe('banner')
      expect(suggestedIcons['全站通知']).toBe('notification')
      expect(suggestedIcons['角色管理']).toBe('rbac')
    })

    it('should have all expected menu items', () => {
      const expectedMenus = [
        '运营总览',
        '内容管理',
        '社区治理',
        '营销推广',
        '用户管理',
        '系统权限',
        '仪表盘',
        '稿件审核',
        '视频列表',
        '视频回收站',
        '分区配置',
        '举报处理',
        '评论管控',
        '弹幕管控',
        '动态管理',
        '轮播图管理',
        '全站通知',
        '用户列表',
        '封禁管理',
        '封禁记录',
        '角色管理',
        '菜单权限',
        '接口资源',
      ]

      expectedMenus.forEach((menu) => {
        expect(suggestedIcons[menu as keyof typeof suggestedIcons]).toBeDefined()
      })
    })

    it('should only contain valid icon names', () => {
      const validIconNames = [
        'dashboard',
        'video',
        'comment',
        'banner',
        'user',
        'rbac',
        'notification',
        'dynamic',
      ]

      Object.values(suggestedIcons).forEach((iconName) => {
        expect(validIconNames).toContain(iconName)
      })
    })
  })
})
