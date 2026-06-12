import { computed } from 'vue'
import { darkTheme, type GlobalThemeOverrides } from 'naive-ui'
import { useTheme } from './useTheme'

/**
 * 获取 CSS Variable 的实际值
 */
function getCssVar(name: string): string {
  if (typeof window === 'undefined') return ''
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

/**
 * Naive UI 主题 composable
 * 与 useTheme 配合使用，提供 Naive UI 的主题覆盖配置
 */
export function useNaiveTheme() {
  const { currentTheme, isDark } = useTheme()

  /**
   * 当前 Naive UI 主题（深色/浅色）
   */
  const naiveTheme = computed(() => {
    return isDark.value ? darkTheme : null
  })

  /**
   * 当前 Naive UI 主题覆盖配置
   * 动态从 DOM 读取 CSS variables 以实现主题的完美响应
   */
  const naiveThemeOverrides = computed<GlobalThemeOverrides>(() => {
    // 依赖 currentTheme 触发重新计算
    const theme = currentTheme.value
    const dark = isDark.value

    // 基础颜色读取
    const primary = getCssVar('--color-primary')
    const primaryHover = getCssVar('--color-primary-hover')
    const primaryPressed = getCssVar('--color-primary-pressed')

    const info = getCssVar('--color-info')
    const infoHover = getCssVar('--color-info-hover')
    const infoPressed = getCssVar('--color-info-hover') // info 暂无-pressed变量，退化使用-hover

    const success = getCssVar('--color-success')
    const successHover = getCssVar('--color-success-hover')
    const successPressed = getCssVar('--color-success-hover')

    const warning = getCssVar('--color-warning')
    const warningHover = getCssVar('--color-warning-hover')
    const warningPressed = getCssVar('--color-warning-hover')

    const danger = getCssVar('--color-danger')
    const dangerHover = getCssVar('--color-danger-hover')
    const dangerPressed = getCssVar('--color-danger-hover')

    const text = getCssVar('--color-text')
    const textSecondary = getCssVar('--color-text-secondary')
    const textMuted = getCssVar('--color-text-muted')
    const textDisabled = getCssVar('--color-text-disabled')

    const border = getCssVar('--color-border')
    const surface = getCssVar('--color-surface')
    const surfaceHover = getCssVar('--color-surface-hover')
    const surfaceActive = getCssVar('--color-surface-active')
    const bg = getCssVar('--color-bg')
    const bgElevated = getCssVar('--color-bg-elevated')

    const radiusMd = getCssVar('--radius-md') || '8px'
    const radiusSm = getCssVar('--radius-sm') || '6px'
    const radiusLg = getCssVar('--radius-lg') || '12px'

    const shadow1 = getCssVar('--shadow-elev-1')
    const shadow2 = getCssVar('--shadow-elev-2')
    const shadow3 = getCssVar('--shadow-elev-3')

    return {
      common: {
        primaryColor: primary,
        primaryColorHover: primaryHover,
        primaryColorPressed: primaryPressed,
        primaryColorSuppl: primary,

        infoColor: info,
        infoColorHover: infoHover,
        infoColorPressed: infoPressed,
        infoColorSuppl: info,

        successColor: success,
        successColorHover: successHover,
        successColorPressed: successPressed,
        successColorSuppl: success,

        warningColor: warning,
        warningColorHover: warningHover,
        warningColorPressed: warningPressed,
        warningColorSuppl: warning,

        errorColor: danger,
        errorColorHover: dangerHover,
        errorColorPressed: dangerPressed,
        errorColorSuppl: danger,

        textColorBase: text,
        textColor1: text,
        textColor2: textSecondary,
        textColor3: textMuted,
        textColorDisabled: textDisabled,
        placeholderColor: textMuted,
        placeholderColorDisabled: textDisabled,

        iconColor: textSecondary,
        iconColorHover: text,
        iconColorPressed: text,
        iconColorDisabled: textDisabled,

        dividerColor: border,
        borderColor: border,

        closeIconColor: textMuted,
        closeIconColorHover: textSecondary,
        closeIconColorPressed: text,
        closeColorHover: dark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
        closeColorPressed: dark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.1)',

        clearColor: textMuted,
        clearColorHover: textSecondary,
        clearColorPressed: text,

        scrollbarColor: dark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.25)',
        scrollbarColorHover: dark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.35)',

        progressRailColor: border,
        railColor: border,

        popoverColor: surface,
        tableColor: surface,
        cardColor: surface,
        modalColor: surface,
        bodyColor: bg,
        tagColor: surfaceHover,
        avatarColor: border,
        invertedColor: text,
        inputColor: surface,
        codeColor: surfaceHover,
        tabColor: surface,
        actionColor: surfaceHover,
        tableHeaderColor: bgElevated || bg,
        hoverColor: surfaceHover || 'rgba(0, 0, 0, 0.04)',
        tableColorHover: surfaceHover || 'rgba(0, 0, 0, 0.04)',
        tableColorStriped: dark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
        pressedColor: surfaceActive || 'rgba(0, 0, 0, 0.08)',
        opacityDisabled: dark ? '0.4' : '0.5',
        inputColorDisabled: bg,

        buttonColor2:
          getCssVar('--color-primary-light') ||
          (dark ? 'rgba(124, 138, 255, 0.15)' : 'rgba(92, 124, 250, 0.1)'),
        buttonColor2Hover: dark ? 'rgba(124, 138, 255, 0.2)' : 'rgba(92, 124, 250, 0.15)',
        buttonColor2Pressed: dark ? 'rgba(124, 138, 255, 0.25)' : 'rgba(92, 124, 250, 0.2)',

        boxShadow1:
          shadow1 || (dark ? '0 1px 3px 0 rgba(0, 0, 0, 0.4)' : '0 1px 3px 0 rgba(0, 0, 0, 0.08)'),
        boxShadow2:
          shadow2 ||
          (dark ? '0 4px 6px -1px rgba(0, 0, 0, 0.45)' : '0 4px 6px -1px rgba(0, 0, 0, 0.1)'),
        boxShadow3:
          shadow3 ||
          (dark ? '0 10px 15px -3px rgba(0, 0, 0, 0.5)' : '0 10px 15px -3px rgba(0, 0, 0, 0.12)'),

        borderRadius: radiusMd,
        borderRadiusSmall: radiusSm,

        fontFamily: getCssVar('--font-sans') || 'Inter, sans-serif',
        fontFamilyMono: getCssVar('--font-mono') || 'monospace',
        fontSize: getCssVar('--text-base') || '14px',
        fontSizeMini: getCssVar('--text-xs') || '12px',
        fontSizeTiny: getCssVar('--text-xs') || '12px',
        fontSizeSmall: getCssVar('--text-sm') || '13px',
        fontSizeMedium: getCssVar('--text-base') || '14px',
        fontSizeLarge: getCssVar('--text-lg') || '15px',
        fontSizeHuge: getCssVar('--text-xl') || '16px',
      },
      Button: {
        borderRadiusMedium: radiusMd,
        borderRadiusSmall: radiusSm,
        borderRadiusLarge: radiusLg,
        ...(theme === 'cyberpunk'
          ? {
              textColorPrimary: '#0a0118',
              textColorHoverPrimary: '#0a0118',
              textColorPressedPrimary: '#0a0118',
              textColorFocusPrimary: '#0a0118',
              borderPrimary: '1px solid rgba(0, 217, 255, 0.3)',
              borderHoverPrimary: '1px solid rgba(0, 217, 255, 0.5)',
              borderPressedPrimary: '1px solid rgba(0, 217, 255, 0.7)',
              borderFocusPrimary: '1px solid rgba(0, 217, 255, 0.5)',
            }
          : {}),
      },
      Card: {
        borderRadius: radiusLg,
        paddingMedium: '16px',
        paddingLarge: '20px',
        ...(theme === 'cyberpunk'
          ? {
              border: '1px solid rgba(0, 217, 255, 0.15)',
            }
          : {}),
      },
      Input: {
        borderRadius: radiusMd,
        ...(theme === 'cyberpunk'
          ? {
              border: '1px solid rgba(0, 217, 255, 0.2)',
              borderHover: '1px solid rgba(0, 217, 255, 0.4)',
              borderFocus: '1px solid rgba(0, 217, 255, 0.6)',
              boxShadowFocus: '0 0 8px 0 rgba(0, 217, 255, 0.3)',
            }
          : {}),
      },
      Select: {
        borderRadius: radiusMd,
      },
      DataTable: {
        borderRadius: radiusLg,
        ...(theme === 'cyberpunk'
          ? {
              thColor: 'rgba(0, 217, 255, 0.05)',
              thColorHover: 'rgba(0, 217, 255, 0.08)',
              borderColor: 'rgba(0, 217, 255, 0.15)',
            }
          : {}),
      },
      Dialog: {
        borderRadius: radiusLg,
        ...(theme === 'cyberpunk'
          ? {
              boxShadow: '0 0 30px 0 rgba(0, 217, 255, 0.3), 0 20px 25px -5px rgba(0, 0, 0, 0.8)',
            }
          : {}),
      },
      Drawer: {
        borderRadius: '0',
        ...(theme === 'cyberpunk'
          ? {
              boxShadow: '0 0 20px 0 rgba(0, 217, 255, 0.2)',
            }
          : {}),
      },
      Dropdown: {
        borderRadius: radiusMd,
        ...(theme === 'cyberpunk'
          ? {
              boxShadow: '0 0 12px 0 rgba(0, 217, 255, 0.2), 0 4px 6px -1px rgba(0, 0, 0, 0.6)',
            }
          : {}),
      },
      Menu: {
        borderRadius: radiusMd,
        ...(theme === 'cyberpunk'
          ? {
              itemColorActive: 'rgba(0, 217, 255, 0.15)',
              itemColorActiveHover: 'rgba(0, 217, 255, 0.2)',
              itemColorHover: 'rgba(0, 217, 255, 0.1)',
            }
          : {}),
      },
      Message: {
        borderRadius: radiusMd,
        ...(theme === 'cyberpunk'
          ? {
              boxShadow: '0 0 12px 0 rgba(0, 217, 255, 0.3)',
            }
          : {}),
      },
      Notification: {
        borderRadius: radiusLg,
        ...(theme === 'cyberpunk'
          ? {
              boxShadow: '0 0 15px 0 rgba(0, 217, 255, 0.3)',
            }
          : {}),
      },
      Popover: {
        borderRadius: radiusMd,
        ...(theme === 'cyberpunk'
          ? {
              boxShadow: '0 0 12px 0 rgba(0, 217, 255, 0.2), 0 4px 6px -1px rgba(0, 0, 0, 0.6)',
            }
          : {}),
      },
      Tag: {
        borderRadius: radiusSm,
        ...(theme === 'cyberpunk'
          ? {
              border: '1px solid rgba(0, 217, 255, 0.3)',
            }
          : {}),
      },
      Tooltip: {
        borderRadius: radiusSm,
        ...(theme === 'cyberpunk'
          ? {
              boxShadow: '0 0 8px 0 rgba(0, 217, 255, 0.3)',
            }
          : {}),
      },
    }
  })

  return {
    naiveTheme,
    naiveThemeOverrides,
  }
}

export { getCssVar }
