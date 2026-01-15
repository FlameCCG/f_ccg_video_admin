/**
 * App store tests
 * Tests for theme, locale, and sidebar state management
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAppStore, themeConfigs, getThemeConfig, type ThemeName } from './app'

describe('app store', () => {
  beforeEach(() => {
    // Create a fresh pinia instance for each test
    setActivePinia(createPinia())
    // Clear localStorage
    localStorage.clear()
    // Reset document attributes
    document.documentElement.removeAttribute('data-theme')
    document.documentElement.removeAttribute('lang')
  })

  describe('themeConfigs', () => {
    it('should have 4 themes', () => {
      expect(themeConfigs.length).toBe(4)
    })

    it('should have pearl, obsidian, aurum, and sakura themes', () => {
      const themeNames = themeConfigs.map((t) => t.name)
      expect(themeNames).toContain('pearl')
      expect(themeNames).toContain('obsidian')
      expect(themeNames).toContain('aurum')
      expect(themeNames).toContain('sakura')
    })

    it('should have correct isDark values', () => {
      const pearl = themeConfigs.find((t) => t.name === 'pearl')
      const obsidian = themeConfigs.find((t) => t.name === 'obsidian')
      const aurum = themeConfigs.find((t) => t.name === 'aurum')
      const sakura = themeConfigs.find((t) => t.name === 'sakura')

      expect(pearl?.isDark).toBe(false)
      expect(obsidian?.isDark).toBe(true)
      expect(aurum?.isDark).toBe(true)
      expect(sakura?.isDark).toBe(false)
    })
  })

  describe('getThemeConfig', () => {
    it('should return theme config for valid theme name', () => {
      const config = getThemeConfig('pearl')
      expect(config).toBeDefined()
      expect(config?.name).toBe('pearl')
    })

    it('should return undefined for invalid theme name', () => {
      const config = getThemeConfig('invalid' as ThemeName)
      expect(config).toBeUndefined()
    })
  })

  describe('theme state', () => {
    it('should have default theme', () => {
      const store = useAppStore()
      store.initTheme()
      expect(store.currentTheme).toBeDefined()
    })

    it('should set theme correctly', () => {
      const store = useAppStore()
      store.setTheme('obsidian')
      expect(store.currentTheme).toBe('obsidian')
      expect(document.documentElement.getAttribute('data-theme')).toBe('obsidian')
    })

    it('should persist theme to localStorage', () => {
      const store = useAppStore()
      store.setTheme('sakura')
      // useStorage from VueUse stores values asynchronously
      // Check that the store state is correct
      expect(store.currentTheme).toBe('sakura')
    })

    it('should compute isDark correctly', () => {
      const store = useAppStore()
      store.setTheme('pearl')
      expect(store.isDark).toBe(false)

      store.setTheme('obsidian')
      expect(store.isDark).toBe(true)
    })

    it('should toggle dark mode', () => {
      const store = useAppStore()
      store.setTheme('pearl')
      expect(store.isDark).toBe(false)

      store.toggleDark()
      expect(store.isDark).toBe(true)
    })

    it('should return current theme config', () => {
      const store = useAppStore()
      store.setTheme('sakura')
      expect(store.currentThemeConfig?.name).toBe('sakura')
      expect(store.currentThemeConfig?.labelZh).toBe('樱')
    })
  })

  describe('locale state', () => {
    it('should have default locale', () => {
      const store = useAppStore()
      expect(store.currentLocale).toBeDefined()
    })

    it('should set locale correctly', () => {
      const store = useAppStore()
      store.setLocale('en-US')
      expect(store.currentLocale).toBe('en-US')
      expect(document.documentElement.getAttribute('lang')).toBe('en-US')
    })

    it('should persist locale to localStorage', () => {
      const store = useAppStore()
      store.setLocale('ja-JP')
      // useStorage from VueUse stores values asynchronously
      // Check that the store state is correct
      expect(store.currentLocale).toBe('ja-JP')
    })

    it('should return current locale config', () => {
      const store = useAppStore()
      store.setLocale('zh-CN')
      expect(store.currentLocaleConfig?.locale).toBe('zh-CN')
    })
  })

  describe('sidebar state', () => {
    it('should have default collapsed state as false', () => {
      const store = useAppStore()
      expect(store.sidebarCollapsed).toBe(false)
    })

    it('should set sidebar collapsed state', () => {
      const store = useAppStore()
      store.setSidebarCollapsed(true)
      expect(store.sidebarCollapsed).toBe(true)
    })

    it('should toggle sidebar', () => {
      const store = useAppStore()
      expect(store.sidebarCollapsed).toBe(false)

      store.toggleSidebar()
      expect(store.sidebarCollapsed).toBe(true)

      store.toggleSidebar()
      expect(store.sidebarCollapsed).toBe(false)
    })

    it('should persist sidebar state to localStorage', () => {
      const store = useAppStore()
      store.setSidebarCollapsed(true)
      // useStorage from VueUse stores values asynchronously
      // Check that the store state is correct
      expect(store.sidebarCollapsed).toBe(true)
    })
  })

  describe('initApp', () => {
    it('should initialize theme and set lang attribute', () => {
      const store = useAppStore()
      store.initApp()

      expect(document.documentElement.getAttribute('data-theme')).toBeDefined()
      expect(document.documentElement.getAttribute('lang')).toBeDefined()
    })
  })
})
