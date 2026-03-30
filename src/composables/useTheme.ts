import { computed } from 'vue'
import { useAppStore, type ThemeName, type ThemeConfig, themeConfigs } from '@/stores/app'

export type { ThemeName, ThemeConfig }
export { themeConfigs }

/**
 * 主题管理 composable
 * 代理到 App Store
 */
export function useTheme() {
  const appStore = useAppStore()

  return {
    currentTheme: computed(() => appStore.currentTheme),
    currentThemeConfig: computed(() => appStore.currentThemeConfig),
    isDark: computed(() => appStore.isDark),
    themeConfigs: appStore.themeConfigs,
    setTheme: appStore.setTheme,
    toggleDark: appStore.toggleDark,
    initTheme: appStore.initTheme,
  }
}
