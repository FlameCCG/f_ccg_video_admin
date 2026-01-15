/**
 * 应用状态 Store
 * 管理主题、语言、侧边栏折叠状态
 * Requirements: 2.4, 3.5, 6.5
 */
import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { usePreferredDark, useStorage } from '@vueuse/core'
import type { LocaleType } from '@/locales'
import { localeConfigs, DEFAULT_LOCALE, LOCALE_STORAGE_KEY } from '@/locales'

/**
 * 主题名称类型
 */
export type ThemeName = 'pearl' | 'obsidian' | 'aurum' | 'sakura'

/**
 * 主题配置接口
 */
export interface ThemeConfig {
  name: ThemeName
  label: string
  labelZh: string
  labelJa: string
  isDark: boolean
}

/**
 * 主题配置列表
 */
export const themeConfigs: ThemeConfig[] = [
  {
    name: 'pearl',
    label: 'Pearl',
    labelZh: '珍珠白',
    labelJa: 'パール',
    isDark: false,
  },
  {
    name: 'obsidian',
    label: 'Obsidian',
    labelZh: '黑曜石',
    labelJa: 'オブシディアン',
    isDark: true,
  },
  {
    name: 'aurum',
    label: 'Aurum',
    labelZh: '鎏金',
    labelJa: 'オーラム',
    isDark: true,
  },
  {
    name: 'sakura',
    label: 'Sakura',
    labelZh: '樱',
    labelJa: 'サクラ',
    isDark: false,
  },
]

// 存储 keys
const THEME_STORAGE_KEY = 'admin-console-theme'
const SIDEBAR_COLLAPSED_KEY = 'admin-console-sidebar-collapsed'
const MENU_SWIPER_INDEX_KEY = 'admin-console-menu-swiper-index'

/**
 * 获取主题配置
 */
export function getThemeConfig(themeName: ThemeName): ThemeConfig | undefined {
  return themeConfigs.find((t) => t.name === themeName)
}

/**
 * 应用主题到 DOM
 */
function applyTheme(themeName: ThemeName): void {
  document.documentElement.setAttribute('data-theme', themeName)
}

/**
 * 获取浏览器语言
 */
function getBrowserLocale(): LocaleType {
  const browserLang = navigator.language
  if (browserLang.startsWith('zh')) return 'zh-CN'
  if (browserLang.startsWith('ja')) return 'ja-JP'
  if (browserLang.startsWith('en')) return 'en-US'
  return DEFAULT_LOCALE
}

/**
 * 获取初始语言
 * 优先级: localStorage > 浏览器语言 > 默认语言
 */
function getInitialLocale(): LocaleType {
  const stored = localStorage.getItem(LOCALE_STORAGE_KEY)
  if (stored && localeConfigs.some((c) => c.locale === stored)) {
    return stored as LocaleType
  }
  return getBrowserLocale()
}

/**
 * 应用状态 Store
 */
export const useAppStore = defineStore('app', () => {
  // ==================== 主题状态 ====================
  const prefersDark = usePreferredDark()
  const storedTheme = useStorage<ThemeName | null>(THEME_STORAGE_KEY, null)
  const currentTheme = ref<ThemeName>('pearl')
  const isThemeInitialized = ref(false)

  /**
   * 当前主题是否为深色
   */
  const isDark = computed(() => {
    const config = getThemeConfig(currentTheme.value)
    return config?.isDark ?? false
  })

  /**
   * 当前主题配置
   */
  const currentThemeConfig = computed(() => {
    return getThemeConfig(currentTheme.value)
  })

  /**
   * 设置主题
   */
  function setTheme(themeName: ThemeName): void {
    currentTheme.value = themeName
    storedTheme.value = themeName
    applyTheme(themeName)
  }

  /**
   * 切换深色/浅色主题
   * 深色主题之间切换：obsidian <-> aurum
   * 浅色主题之间切换：pearl <-> sakura
   */
  function toggleDark(): void {
    if (isDark.value) {
      // 当前是深色，切换到浅色
      setTheme(currentTheme.value === 'obsidian' ? 'pearl' : 'sakura')
    } else {
      // 当前是浅色，切换到深色
      setTheme(currentTheme.value === 'pearl' ? 'obsidian' : 'aurum')
    }
  }

  /**
   * 初始化主题
   */
  function initTheme(): void {
    if (isThemeInitialized.value) return

    // 优先使用存储的主题
    if (storedTheme.value && themeConfigs.some((t) => t.name === storedTheme.value)) {
      currentTheme.value = storedTheme.value
    } else if (prefersDark.value) {
      // 根据系统偏好选择默认深色主题
      currentTheme.value = 'obsidian'
    } else {
      // 默认浅色主题
      currentTheme.value = 'pearl'
    }

    applyTheme(currentTheme.value)
    isThemeInitialized.value = true
  }

  // 监听系统主题变化（仅当用户未手动设置时）
  watch(prefersDark, (newPrefersDark) => {
    if (storedTheme.value === null) {
      const newTheme = newPrefersDark ? 'obsidian' : 'pearl'
      currentTheme.value = newTheme
      applyTheme(newTheme)
    }
  })

  // ==================== 语言状态 ====================
  const storedLocale = useStorage<LocaleType>(LOCALE_STORAGE_KEY, getInitialLocale())
  const currentLocale = ref<LocaleType>(storedLocale.value)

  /**
   * 当前语言配置
   */
  const currentLocaleConfig = computed(() => {
    return localeConfigs.find((c) => c.locale === currentLocale.value)
  })

  /**
   * 设置语言
   * 注意：此方法仅更新 store 状态，实际的 i18n 切换需要在组件中调用 setI18nLanguage
   */
  function setLocale(locale: LocaleType): void {
    currentLocale.value = locale
    storedLocale.value = locale
    document.documentElement.setAttribute('lang', locale)
  }

  // ==================== 侧边栏状态 ====================
  const storedSidebarCollapsed = useStorage<boolean>(SIDEBAR_COLLAPSED_KEY, false)
  const sidebarCollapsed = ref<boolean>(storedSidebarCollapsed.value)

  /**
   * 设置侧边栏折叠状态
   */
  function setSidebarCollapsed(collapsed: boolean): void {
    sidebarCollapsed.value = collapsed
    storedSidebarCollapsed.value = collapsed
  }

  /**
   * 切换侧边栏折叠状态
   */
  function toggleSidebar(): void {
    setSidebarCollapsed(!sidebarCollapsed.value)
  }

  // ==================== 菜单 Swiper 状态 ====================
  const storedMenuSwiperIndex = useStorage<number>(MENU_SWIPER_INDEX_KEY, 0)
  const menuSwiperIndex = ref<number>(storedMenuSwiperIndex.value)

  /**
   * 设置菜单 Swiper 索引
   */
  function setMenuSwiperIndex(index: number): void {
    menuSwiperIndex.value = index
    storedMenuSwiperIndex.value = index
  }

  // ==================== 初始化 ====================
  /**
   * 初始化应用状态
   * 应在应用启动时调用
   */
  function initApp(): void {
    initTheme()
    // 语言初始化由 i18n 模块处理
    document.documentElement.setAttribute('lang', currentLocale.value)
  }

  return {
    // 主题相关
    currentTheme: computed(() => currentTheme.value),
    currentThemeConfig,
    isDark,
    themeConfigs,
    setTheme,
    toggleDark,
    initTheme,

    // 语言相关
    currentLocale: computed(() => currentLocale.value),
    currentLocaleConfig,
    localeConfigs,
    setLocale,

    // 侧边栏相关
    sidebarCollapsed: computed(() => sidebarCollapsed.value),
    setSidebarCollapsed,
    toggleSidebar,

    // 菜单 Swiper 相关
    menuSwiperIndex: computed(() => menuSwiperIndex.value),
    setMenuSwiperIndex,

    // 初始化
    initApp,
  }
})
