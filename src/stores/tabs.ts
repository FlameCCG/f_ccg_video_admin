/**
 * 标签页状态 Store
 * 管理已打开的标签页，支持持久化
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useStorage } from '@vueuse/core'
import type { RouteLocationNormalized } from 'vue-router'

/** 标签页信息 */
export interface TabItem {
  /** 路由路径 */
  path: string
  /** 标签标题 */
  title: string
  /** 标签标题（英文） */
  titleEn?: string
  /** 标签标题（日文） */
  titleJa?: string
  /** 图标 */
  icon?: string
  /** 是否固定（不可关闭） */
  affix?: boolean
  /** 路由 query */
  query?: Record<string, string>
}

const TABS_STORAGE_KEY = 'admin-console-tabs'
const ACTIVE_TAB_KEY = 'admin-console-active-tab'

/** 默认首页标签 */
const HOME_TAB: TabItem = {
  path: '/overview/dashboard',
  title: '仪表盘',
  titleEn: 'Dashboard',
  titleJa: 'ダッシュボード',
  affix: true,
}

export const useTabsStore = defineStore('tabs', () => {
  /** 已打开的标签列表 */
  const storedTabs = useStorage<TabItem[]>(TABS_STORAGE_KEY, [HOME_TAB])
  const tabs = ref<TabItem[]>(storedTabs.value.length > 0 ? storedTabs.value : [HOME_TAB])

  /** 当前激活的标签路径 */
  const storedActiveTab = useStorage<string>(ACTIVE_TAB_KEY, HOME_TAB.path)
  const activeTab = ref<string>(storedActiveTab.value || HOME_TAB.path)

  /** 当前激活的标签索引 */
  const activeIndex = computed(() => {
    return tabs.value.findIndex((tab) => tab.path === activeTab.value)
  })

  /** 添加标签 */
  function addTab(route: RouteLocationNormalized): void {
    const path = route.path
    // 检查是否已存在
    const exists = tabs.value.some((tab) => tab.path === path)
    if (exists) {
      activeTab.value = path
      storedActiveTab.value = path
      return
    }

    // 从路由 meta 获取标题
    const meta = route.meta || {}
    const newTab: TabItem = {
      path,
      title: (meta.title as string) || route.name?.toString() || path,
      titleEn: meta.titleEn as string,
      titleJa: meta.titleJa as string,
      icon: meta.icon as string,
      affix: meta.affix as boolean,
      query: route.query as Record<string, string>,
    }

    tabs.value.push(newTab)
    activeTab.value = path
    storedTabs.value = tabs.value
    storedActiveTab.value = path
  }

  /** 关闭标签 */
  function closeTab(path: string): string | null {
    const index = tabs.value.findIndex((tab) => tab.path === path)
    if (index === -1) return null

    const currentTab = tabs.value[index]
    // 不能关闭固定标签
    if (currentTab?.affix) return null

    // 如果关闭的是当前标签，需要切换到其他标签
    let nextPath: string | null = null
    if (activeTab.value === path) {
      // 优先切换到右边的标签，否则切换到左边
      const rightTab = tabs.value[index + 1]
      const leftTab = tabs.value[index - 1]
      if (rightTab) {
        nextPath = rightTab.path
      } else if (leftTab) {
        nextPath = leftTab.path
      }
    }

    tabs.value.splice(index, 1)
    storedTabs.value = tabs.value

    if (nextPath) {
      activeTab.value = nextPath
      storedActiveTab.value = nextPath
    }

    return nextPath
  }

  /** 关闭其他标签 */
  function closeOtherTabs(path: string): void {
    tabs.value = tabs.value.filter((tab) => tab.path === path || tab.affix)
    activeTab.value = path
    storedTabs.value = tabs.value
    storedActiveTab.value = path
  }

  /** 关闭右侧标签 */
  function closeRightTabs(path: string): void {
    const index = tabs.value.findIndex((tab) => tab.path === path)
    if (index === -1) return

    tabs.value = tabs.value.filter((tab, i) => i <= index || tab.affix)
    if (!tabs.value.some((tab) => tab.path === activeTab.value)) {
      activeTab.value = path
      storedActiveTab.value = path
    }
    storedTabs.value = tabs.value
  }

  /** 关闭所有标签（保留固定标签） */
  function closeAllTabs(): void {
    tabs.value = tabs.value.filter((tab) => tab.affix)
    const firstTab = tabs.value[0]
    if (firstTab) {
      activeTab.value = firstTab.path
      storedActiveTab.value = activeTab.value
    }
    storedTabs.value = tabs.value
  }

  /** 设置当前激活标签 */
  function setActiveTab(path: string): void {
    activeTab.value = path
    storedActiveTab.value = path
  }

  /** 更新标签标题 */
  function updateTabTitle(path: string, title: string): void {
    const tab = tabs.value.find((t) => t.path === path)
    if (tab) {
      tab.title = title
      storedTabs.value = tabs.value
    }
  }

  return {
    tabs: computed(() => tabs.value),
    activeTab: computed(() => activeTab.value),
    activeIndex,
    addTab,
    closeTab,
    closeOtherTabs,
    closeRightTabs,
    closeAllTabs,
    setActiveTab,
    updateTabTitle,
  }
})
