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
  path: '/overview',
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
      title: (meta.titleZh as string) || (meta.title as string) || route.name?.toString() || path,
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

  /** 批量同步标签的多语言标题（语言切换时调用） */
  function syncTabI18n(
    titleMap: Array<{ path: string; title: string; titleEn?: string; titleJa?: string }>
  ): void {
    const lookup = new Map(titleMap.map((m) => [m.path, m]))
    let changed = false
    for (const tab of tabs.value) {
      const entry = lookup.get(tab.path)
      if (entry) {
        tab.title = entry.title
        tab.titleEn = entry.titleEn
        tab.titleJa = entry.titleJa
        changed = true
      }
    }
    if (changed) {
      storedTabs.value = tabs.value
    }
  }

  /** 修正首页标签路径（用于迁移旧版 localStorage 数据） */
  function fixHomeTabPath(): void {
    const staleHome = tabs.value.find(
      (t) => t.affix && t.path !== HOME_TAB.path && t.title === HOME_TAB.title
    )
    if (staleHome) {
      staleHome.path = HOME_TAB.path
      staleHome.titleEn = HOME_TAB.titleEn
      staleHome.titleJa = HOME_TAB.titleJa
      storedTabs.value = tabs.value
    }
  }

  /** 去除同路径的重复标签，每个路径只保留一个（优先保留 affix） */
  function deduplicateTabs(): void {
    const seen = new Map<string, TabItem>()
    const kept: TabItem[] = []

    for (const tab of tabs.value) {
      const existing = seen.get(tab.path)
      if (!existing) {
        seen.set(tab.path, tab)
        kept.push(tab)
      } else {
        // 同路径已存在：若当前是 affix 而已有不是，则替换
        if (tab.affix && !existing.affix) {
          const idx = kept.indexOf(existing)
          kept[idx] = tab
          seen.set(tab.path, tab)
        }
        // 否则丢弃当前（保留已有的）
      }
    }

    if (kept.length !== tabs.value.length) {
      tabs.value = kept
      storedTabs.value = tabs.value
      if (!tabs.value.some((t) => t.path === activeTab.value)) {
        const first = tabs.value[0]
        if (first) {
          activeTab.value = first.path
          storedActiveTab.value = first.path
        }
      }
    }
  }

  // 初始化时修正旧路径并去重
  fixHomeTabPath()
  deduplicateTabs()

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
    syncTabI18n,
  }
})
