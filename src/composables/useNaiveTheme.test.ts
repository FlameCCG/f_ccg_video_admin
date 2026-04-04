import { describe, it, expect, vi } from 'vitest'
import { ref } from 'vue'
import { useNaiveTheme } from './useNaiveTheme'
import { darkTheme } from 'naive-ui'

const mockCurrentTheme = ref('pearl')
const mockIsDark = ref(false)

vi.mock('./useTheme', () => ({
  useTheme: () => ({
    currentTheme: mockCurrentTheme,
    isDark: mockIsDark,
  }),
}))

describe('useNaiveTheme', () => {
  it('should return null for light theme and darkTheme for dark theme', () => {
    const { naiveTheme } = useNaiveTheme()

    // Light theme
    mockIsDark.value = false
    expect(naiveTheme.value).toBeNull()

    // Dark theme
    mockIsDark.value = true
    expect(naiveTheme.value).toBe(darkTheme)
  })

  it('should return global theme overrides config', () => {
    const { naiveThemeOverrides } = useNaiveTheme()
    expect(naiveThemeOverrides.value).toBeDefined()
    expect(naiveThemeOverrides.value.common).toBeDefined()
  })
})
