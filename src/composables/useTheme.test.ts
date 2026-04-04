/**
 * useTheme composable tests
 * Tests for theme configuration exports
 */
import { describe, it, expect } from 'vitest'
import { themeConfigs, type ThemeName } from './useTheme'

describe('useTheme', () => {
  describe('themeConfigs', () => {
    it('should export themeConfigs array', () => {
      expect(themeConfigs).toBeDefined()
      expect(Array.isArray(themeConfigs)).toBe(true)
    })

    it('should have 4 themes', () => {
      expect(themeConfigs.length).toBe(4)
    })

    it('should have pearl theme as light theme', () => {
      const pearl = themeConfigs.find((t) => t.name === 'pearl')
      expect(pearl).toBeDefined()
      expect(pearl?.isDark).toBe(false)
      expect(pearl?.label).toBe('Pearl')
      expect(pearl?.labelZh).toBe('珍珠白')
    })

    it('should have obsidian theme as dark theme', () => {
      const obsidian = themeConfigs.find((t) => t.name === 'obsidian')
      expect(obsidian).toBeDefined()
      expect(obsidian?.isDark).toBe(true)
      expect(obsidian?.label).toBe('Obsidian')
      expect(obsidian?.labelZh).toBe('黑曜石')
    })

    it('should have cyberpunk theme as dark theme', () => {
      const cyberpunk = themeConfigs.find((t) => t.name === 'cyberpunk')
      expect(cyberpunk).toBeDefined()
      expect(cyberpunk?.isDark).toBe(true)
      expect(cyberpunk?.label).toBe('Cyberpunk')
    })

    it('should have sakura theme as light theme', () => {
      const sakura = themeConfigs.find((t) => t.name === 'sakura')
      expect(sakura).toBeDefined()
      expect(sakura?.isDark).toBe(false)
      expect(sakura?.label).toBe('Sakura')
      expect(sakura?.labelZh).toBe('樱')
    })

    it('should have all required properties for each theme', () => {
      themeConfigs.forEach((theme) => {
        expect(theme.name).toBeDefined()
        expect(theme.label).toBeDefined()
        expect(theme.labelZh).toBeDefined()
        expect(theme.labelJa).toBeDefined()
        expect(typeof theme.isDark).toBe('boolean')
      })
    })

    it('should have unique theme names', () => {
      const names = themeConfigs.map((t) => t.name)
      const uniqueNames = new Set(names)
      expect(uniqueNames.size).toBe(names.length)
    })
  })

  describe('ThemeName type', () => {
    it('should accept valid theme names', () => {
      const validNames: ThemeName[] = ['pearl', 'obsidian', 'cyberpunk', 'sakura']
      validNames.forEach((name) => {
        const theme = themeConfigs.find((t) => t.name === name)
        expect(theme).toBeDefined()
      })
    })
  })
})
