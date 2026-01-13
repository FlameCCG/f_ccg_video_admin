import { ref, computed, watch, onMounted } from 'vue'
import { usePreferredDark, useStorage } from '@vueuse/core'

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

// 存储 key
const THEME_STORAGE_KEY = 'admin-console-theme'

// 全局状态（单例模式）
const currentTheme = ref<ThemeName>('pearl')
const isInitialized = ref(false)

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
 * 主题管理 composable
 */
export function useTheme() {
  const prefersDark = usePreferredDark()
  const storedTheme = useStorage<ThemeName | null>(THEME_STORAGE_KEY, null)

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
  const setTheme = (themeName: ThemeName): void => {
    currentTheme.value = themeName
    storedTheme.value = themeName
    applyTheme(themeName)
  }

  /**
   * 切换深色/浅色主题
   * 深色主题之间切换：obsidian <-> aurum
   * 浅色主题之间切换：pearl <-> sakura
   */
  const toggleDark = (): void => {
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
  const initTheme = (): void => {
    if (isInitialized.value) return

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
    isInitialized.value = true
  }

  // 监听系统主题变化（仅当用户未手动设置时）
  watch(prefersDark, (newPrefersDark) => {
    if (storedTheme.value === null) {
      const newTheme = newPrefersDark ? 'obsidian' : 'pearl'
      currentTheme.value = newTheme
      applyTheme(newTheme)
    }
  })

  // 组件挂载时初始化
  onMounted(() => {
    initTheme()
  })

  return {
    currentTheme: computed(() => currentTheme.value),
    currentThemeConfig,
    isDark,
    themeConfigs,
    setTheme,
    toggleDark,
    initTheme,
  }
}
