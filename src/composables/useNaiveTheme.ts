import { computed } from 'vue'
import { darkTheme, type GlobalThemeOverrides } from 'naive-ui'
import { useTheme } from './useTheme'

/**
 * 读取单个 CSS Variable 的实际值。
 * 保留导出：既有调用方仍在用。
 */
function getCssVar(name: string): string {
  if (typeof window === 'undefined') return ''
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

/**
 * 需要注入 Naive 的 token 名（不含 `--` 前缀）。
 *
 * 之前的实现对每个变量单独调用一次 `getComputedStyle(documentElement)`，
 * 一次主题计算要创建 50+ 个 CSSStyleDeclaration；现在整个过程只创建一个。
 */
const COLOR_TOKENS = [
  // 背景与表面层级
  'bg',
  'bg-elevated',
  'surface',
  'surface-2',
  'surface-3',
  'surface-sunken',
  'surface-hover',
  'surface-active',
  // 边框
  'border-subtle',
  'border',
  'border-strong',
  // 文字
  'text',
  'text-secondary',
  'text-muted',
  'text-disabled',
  'text-inverse',
  // 主色
  'primary',
  'primary-hover',
  'primary-pressed',
  'on-primary',
  'primary-text',
  'primary-subtle',
  'primary-subtle-hover',
  'primary-border',
  // 语义色
  'success',
  'success-hover',
  'success-pressed',
  'on-success',
  'success-text',
  'success-subtle',
  'success-border',
  'warning',
  'warning-hover',
  'warning-pressed',
  'on-warning',
  'warning-text',
  'warning-subtle',
  'warning-border',
  'danger',
  'danger-hover',
  'danger-pressed',
  'on-danger',
  'danger-text',
  'danger-subtle',
  'danger-border',
  'info',
  'info-hover',
  'info-pressed',
  'on-info',
  'info-text',
  'info-subtle',
  'info-border',
  // 焦点 / 选区 / 遮罩
  'focus',
  'focus-ring',
  'selection-bg',
  'overlay',
  'overlay-soft',
  'backdrop',
  // 滚动条
  'scrollbar-thumb',
  'scrollbar-thumb-hover',
  // 代码
  'code-bg',
  'code-text',
  // 骨架屏
  'skeleton',
  'skeleton-highlight',
] as const

const SCALAR_TOKENS = [
  'radius-sm',
  'radius-md',
  'radius-lg',
  'radius-xl',
  'radius-card',
  'radius-modal',
  'shadow-elev-1',
  'shadow-elev-2',
  'shadow-elev-3',
  'shadow-elev-4',
  'font-sans',
  'font-mono',
  'text-xs',
  'text-sm',
  'text-base',
  'text-lg',
  'text-xl',
] as const

type TokenName = (typeof COLOR_TOKENS)[number] | (typeof SCALAR_TOKENS)[number]

/** 一次 getComputedStyle，批量取出所有 token。 */
function readTokens(): Record<string, string> {
  const names: readonly string[] = [
    ...COLOR_TOKENS.map((n) => `--color-${n}`),
    ...SCALAR_TOKENS.map((n) => `--${n}`),
  ]
  const out: Record<string, string> = {}
  if (typeof window === 'undefined') {
    for (const n of names) out[n] = ''
    return out
  }
  const style = getComputedStyle(document.documentElement)
  for (const n of names) out[n] = style.getPropertyValue(n).trim()
  return out
}

/**
 * Naive UI 主题 composable
 *
 * 设计原则：**所有取值都来自 design token**，不做任何 `theme === 'xxx'` 的
 * 单主题特判。此前 cyberpunk 有 15+ 处 `rgba(0, 217, 255, …)` 硬编码，
 * 而该色（#00d9ff）甚至不等于 cyberpunk 的主色，同时另外三套主题
 * 完全拿不到等价的边框/发光处理。改为 token 驱动后四套主题一致受益。
 */
export function useNaiveTheme() {
  const { currentTheme, isDark } = useTheme()

  const naiveTheme = computed(() => {
    return isDark.value ? darkTheme : null
  })

  const naiveThemeOverrides = computed<GlobalThemeOverrides>(() => {
    // 依赖主题状态触发重算（setTheme 会先同步写入 <html data-theme>，
    // 因此这里读到的一定是切换后的值）
    void currentTheme.value
    const dark = isDark.value

    const tokens = readTokens()
    /** 取 token，允许兜底 */
    const c = (name: TokenName, fallback = ''): string => {
      const key = SCALAR_TOKENS.includes(name as (typeof SCALAR_TOKENS)[number])
        ? `--${name}`
        : `--color-${name}`
      return tokens[key] || fallback
    }

    const radiusSm = c('radius-sm', '4px')
    const radiusMd = c('radius-md', '6px')
    const radiusLg = c('radius-lg', '8px')
    const radiusCard = c('radius-card', '12px')
    const radiusModal = c('radius-modal', '16px')

    const shadow1 = c('shadow-elev-1')
    const shadow2 = c('shadow-elev-2')
    const shadow3 = c('shadow-elev-3')

    const surface = c('surface')
    const surfaceHover = c('surface-hover')
    const surfaceActive = c('surface-active')
    const border = c('border')
    const borderSubtle = c('border-subtle')
    const text = c('text')
    const textSecondary = c('text-secondary')
    const textMuted = c('text-muted')
    const textDisabled = c('text-disabled')
    const primary = c('primary')
    const focusRing = c('focus-ring')

    /** 统一的焦点光圈：所有可交互控件共享同一视觉语言 */
    const focusShadow = `0 0 0 2px ${focusRing}`

    return {
      common: {
        primaryColor: primary,
        primaryColorHover: c('primary-hover'),
        primaryColorPressed: c('primary-pressed'),
        primaryColorSuppl: primary,

        infoColor: c('info'),
        infoColorHover: c('info-hover'),
        infoColorPressed: c('info-pressed'),
        infoColorSuppl: c('info'),

        successColor: c('success'),
        successColorHover: c('success-hover'),
        successColorPressed: c('success-pressed'),
        successColorSuppl: c('success'),

        warningColor: c('warning'),
        warningColorHover: c('warning-hover'),
        warningColorPressed: c('warning-pressed'),
        warningColorSuppl: c('warning'),

        errorColor: c('danger'),
        errorColorHover: c('danger-hover'),
        errorColorPressed: c('danger-pressed'),
        errorColorSuppl: c('danger'),

        textColorBase: text,
        textColor1: text,
        textColor2: textSecondary,
        textColor3: textMuted,
        textColorDisabled: textDisabled,
        placeholderColor: textMuted,
        placeholderColorDisabled: textDisabled,

        iconColor: textMuted,
        iconColorHover: textSecondary,
        iconColorPressed: text,
        iconColorDisabled: textDisabled,

        dividerColor: borderSubtle,
        borderColor: border,

        closeIconColor: textMuted,
        closeIconColorHover: textSecondary,
        closeIconColorPressed: text,
        closeColorHover: c('overlay-soft'),
        closeColorPressed: c('surface-active'),

        clearColor: textMuted,
        clearColorHover: textSecondary,
        clearColorPressed: text,

        scrollbarColor: c('scrollbar-thumb'),
        scrollbarColorHover: c('scrollbar-thumb-hover'),

        progressRailColor: c('surface-3'),
        railColor: c('surface-3'),

        popoverColor: c('bg-elevated'),
        tableColor: surface,
        cardColor: surface,
        modalColor: surface,
        bodyColor: c('bg'),
        tagColor: c('surface-3'),
        avatarColor: c('surface-3'),
        invertedColor: c('surface-sunken'),
        inputColor: surface,
        codeColor: c('code-bg'),
        tabColor: surface,
        actionColor: c('surface-2'),
        tableHeaderColor: c('surface-2'),
        hoverColor: surfaceHover,
        tableColorHover: surfaceHover,
        tableColorStriped: c('surface-2'),
        pressedColor: surfaceActive,
        opacityDisabled: dark ? '0.45' : '0.5',
        inputColorDisabled: c('surface-3'),

        // 次级按钮：主色淡底而非灰底
        buttonColor2: c('primary-subtle'),
        buttonColor2Hover: c('primary-subtle-hover'),
        buttonColor2Pressed: c('primary-subtle-hover'),

        boxShadow1: shadow1,
        boxShadow2: shadow2,
        boxShadow3: shadow3,

        borderRadius: radiusMd,
        borderRadiusSmall: radiusSm,

        fontFamily: c('font-sans', 'system-ui, sans-serif'),
        fontFamilyMono: c('font-mono', 'monospace'),
        fontSize: c('text-base', '14px'),
        fontSizeMini: c('text-xs', '12px'),
        fontSizeTiny: c('text-xs', '12px'),
        fontSizeSmall: c('text-sm', '13px'),
        fontSizeMedium: c('text-base', '14px'),
        fontSizeLarge: c('text-lg', '15px'),
        fontSizeHuge: c('text-xl', '16px'),
      },

      // ── 按钮：实心按钮上的文字统一走 on-* token ──────────────────
      // 修复关键问题：此前实心按钮一律用 Naive 默认白字，
      // 在 cyberpunk 的霓虹青主色上白字对比度只有 1.38:1（完全不可读）。
      Button: {
        borderRadiusTiny: radiusSm,
        borderRadiusSmall: radiusSm,
        borderRadiusMedium: radiusMd,
        borderRadiusLarge: radiusLg,

        textColorPrimary: c('on-primary'),
        textColorHoverPrimary: c('on-primary'),
        textColorPressedPrimary: c('on-primary'),
        textColorFocusPrimary: c('on-primary'),
        textColorDisabledPrimary: c('on-primary'),

        textColorInfo: c('on-info'),
        textColorHoverInfo: c('on-info'),
        textColorPressedInfo: c('on-info'),
        textColorFocusInfo: c('on-info'),
        textColorDisabledInfo: c('on-info'),

        textColorSuccess: c('on-success'),
        textColorHoverSuccess: c('on-success'),
        textColorPressedSuccess: c('on-success'),
        textColorFocusSuccess: c('on-success'),
        textColorDisabledSuccess: c('on-success'),

        textColorWarning: c('on-warning'),
        textColorHoverWarning: c('on-warning'),
        textColorPressedWarning: c('on-warning'),
        textColorFocusWarning: c('on-warning'),
        textColorDisabledWarning: c('on-warning'),

        textColorError: c('on-danger'),
        textColorHoverError: c('on-danger'),
        textColorPressedError: c('on-danger'),
        textColorFocusError: c('on-danger'),
        textColorDisabledError: c('on-danger'),

        // 文字/次级按钮用 -text 变体，保证在表面上达到 4.5:1
        textColorTextPrimary: c('primary-text'),
        textColorTextHoverPrimary: c('primary-hover'),
        textColorTextError: c('danger-text'),
        textColorTextHoverError: c('danger-hover'),

        textColorGhostPrimary: c('primary-text'),
        textColorGhostError: c('danger-text'),

        border: `1px solid ${border}`,
        borderHover: `1px solid ${c('primary-border')}`,
        borderFocus: `1px solid ${c('primary-border')}`,
        borderPressed: `1px solid ${c('primary-pressed')}`,

        colorQuaternary: c('surface-2'),
        colorQuaternaryHover: surfaceHover,
        colorQuaternaryPressed: surfaceActive,
      },

      Card: {
        borderRadius: radiusCard,
        paddingSmall: '12px',
        paddingMedium: '16px',
        paddingLarge: '20px',
        borderColor: borderSubtle,
        color: surface,
        colorEmbedded: c('surface-2'),
        titleFontWeight: '600',
        actionColor: c('surface-2'),
      },

      Input: {
        borderRadius: radiusMd,
        color: surface,
        colorFocus: surface,
        border: `1px solid ${border}`,
        borderHover: `1px solid ${c('border-strong')}`,
        borderFocus: `1px solid ${primary}`,
        boxShadowFocus: focusShadow,
        placeholderColor: textMuted,
        caretColor: primary,
      },

      InputNumber: {
        peers: {
          Input: {
            borderRadius: radiusMd,
            boxShadowFocus: focusShadow,
          },
        },
      },

      Select: {
        peers: {
          InternalSelection: {
            borderRadius: radiusMd,
            border: `1px solid ${border}`,
            borderHover: `1px solid ${c('border-strong')}`,
            borderFocus: `1px solid ${primary}`,
            borderActive: `1px solid ${primary}`,
            boxShadowFocus: focusShadow,
            boxShadowActive: focusShadow,
          },
          InternalSelectMenu: {
            borderRadius: radiusLg,
            optionColorPending: surfaceHover,
            optionColorActive: c('primary-subtle'),
            optionTextColorActive: c('primary-text'),
            height: '240px',
          },
        },
      },

      DataTable: {
        borderRadius: radiusCard,
        borderColor: borderSubtle,
        thColor: c('surface-2'),
        thColorHover: c('surface-3'),
        thTextColor: textSecondary,
        thFontWeight: '600',
        tdColor: surface,
        tdColorHover: surfaceHover,
        tdColorStriped: c('surface-2'),
        // 表格正文用主文字色：此前正文是 text-secondary、表头反而是 text，
        // 层级完全反了，导致全站列表数据发灰
        tdTextColor: text,
        tdColorModal: surface,
        thColorModal: c('surface-2'),
        borderColorModal: borderSubtle,
      },

      Pagination: {
        itemBorderRadius: radiusMd,
        itemColorHover: surfaceHover,
        itemColorActive: c('primary-subtle'),
        itemTextColorActive: c('primary-text'),
        itemTextColorHover: text,
        itemBorderActive: `1px solid ${c('primary-border')}`,
      },

      Menu: {
        borderRadius: radiusMd,
        itemColorHover: surfaceHover,
        itemColorActive: c('primary-subtle'),
        itemColorActiveHover: c('primary-subtle-hover'),
        itemColorActiveCollapsed: c('primary-subtle'),
        itemTextColor: textSecondary,
        itemTextColorHover: text,
        itemTextColorActive: c('primary-text'),
        itemTextColorActiveHover: c('primary-text'),
        itemIconColor: textMuted,
        itemIconColorHover: textSecondary,
        itemIconColorActive: c('primary-text'),
        itemIconColorActiveHover: c('primary-text'),
      },

      Tabs: {
        tabBorderRadius: radiusMd,
        tabTextColorLine: textSecondary,
        tabTextColorActiveLine: c('primary-text'),
        tabTextColorHoverLine: text,
        tabTextColorCard: textSecondary,
        tabTextColorActiveCard: c('primary-text'),
        barColor: primary,
        tabColor: surface,
        tabColorSegment: c('surface-2'),
      },

      Tag: {
        borderRadius: radiusSm,
        color: c('surface-3'),
        textColor: textSecondary,
        border: `1px solid ${borderSubtle}`,
        colorPrimary: c('primary-subtle'),
        textColorPrimary: c('primary-text'),
        borderPrimary: `1px solid ${c('primary-border')}`,
        colorSuccess: c('success-subtle'),
        textColorSuccess: c('success-text'),
        borderSuccess: `1px solid ${c('success-border')}`,
        colorWarning: c('warning-subtle'),
        textColorWarning: c('warning-text'),
        borderWarning: `1px solid ${c('warning-border')}`,
        colorError: c('danger-subtle'),
        textColorError: c('danger-text'),
        borderError: `1px solid ${c('danger-border')}`,
        colorInfo: c('info-subtle'),
        textColorInfo: c('info-text'),
        borderInfo: `1px solid ${c('info-border')}`,
      },

      Alert: {
        borderRadius: radiusLg,
        colorInfo: c('info-subtle'),
        borderInfo: `1px solid ${c('info-border')}`,
        iconColorInfo: c('info-text'),
        titleTextColorInfo: text,
        contentTextColorInfo: textSecondary,
        colorSuccess: c('success-subtle'),
        borderSuccess: `1px solid ${c('success-border')}`,
        iconColorSuccess: c('success-text'),
        titleTextColorSuccess: text,
        contentTextColorSuccess: textSecondary,
        colorWarning: c('warning-subtle'),
        borderWarning: `1px solid ${c('warning-border')}`,
        iconColorWarning: c('warning-text'),
        titleTextColorWarning: text,
        contentTextColorWarning: textSecondary,
        colorError: c('danger-subtle'),
        borderError: `1px solid ${c('danger-border')}`,
        iconColorError: c('danger-text'),
        titleTextColorError: text,
        contentTextColorError: textSecondary,
      },

      Dialog: {
        borderRadius: radiusModal,
        color: surface,
        titleFontWeight: '600',
        iconColorInfo: c('info-text'),
        iconColorSuccess: c('success-text'),
        iconColorWarning: c('warning-text'),
        iconColorError: c('danger-text'),
      },

      Modal: {
        color: surface,
        boxShadow: shadow3,
      },

      Drawer: {
        borderRadius: '0',
        color: surface,
        boxShadow: shadow3,
        titleFontWeight: '600',
      },

      Dropdown: {
        borderRadius: radiusLg,
        color: c('bg-elevated'),
        optionColorHover: surfaceHover,
        optionTextColorHover: text,
        optionTextColor: textSecondary,
        boxShadow: shadow2,
      },

      Popover: {
        borderRadius: radiusLg,
        color: c('bg-elevated'),
        boxShadow: shadow2,
        textColor: textSecondary,
      },

      Tooltip: {
        borderRadius: radiusSm,
        peers: {
          Popover: {
            // 反色气泡：深色主题下用最深表面，浅色主题下也保持「暗底亮字」的
            // 常规 tooltip 观感由 Naive 自身的 inverted 处理，这里只统一圆角与阴影
            boxShadow: shadow2,
          },
        },
      },

      Message: {
        borderRadius: radiusLg,
        color: c('bg-elevated'),
        colorInfo: c('bg-elevated'),
        colorSuccess: c('bg-elevated'),
        colorWarning: c('bg-elevated'),
        colorError: c('bg-elevated'),
        textColor: text,
        iconColorInfo: c('info-text'),
        iconColorSuccess: c('success-text'),
        iconColorWarning: c('warning-text'),
        iconColorError: c('danger-text'),
        boxShadow: shadow3,
      },

      Notification: {
        borderRadius: radiusCard,
        color: c('bg-elevated'),
        textColor: textSecondary,
        titleTextColor: text,
        iconColorInfo: c('info-text'),
        iconColorSuccess: c('success-text'),
        iconColorWarning: c('warning-text'),
        iconColorError: c('danger-text'),
        boxShadow: shadow3,
      },

      Tree: {
        nodeBorderRadius: radiusMd,
        nodeColorHover: surfaceHover,
        nodeColorActive: c('primary-subtle'),
        nodeColorPressed: surfaceActive,
      },

      Switch: {
        railColor: c('surface-active'),
        railColorActive: primary,
        buttonColor: c('bg-elevated'),
        boxShadowFocus: focusShadow,
      },

      Radio: {
        boxShadowFocus: `inset 0 0 0 1px ${primary}, ${focusShadow}`,
        boxShadowActive: `inset 0 0 0 1px ${primary}`,
        boxShadowHover: `inset 0 0 0 1px ${c('border-strong')}`,
        dotColorActive: primary,
        buttonBorderRadius: radiusMd,
        buttonColorActive: primary,
        buttonTextColorActive: c('on-primary'),
      },

      Checkbox: {
        borderRadius: radiusSm,
        color: surface,
        colorChecked: primary,
        checkMarkColor: c('on-primary'),
        border: `1px solid ${c('border-strong')}`,
        borderChecked: `1px solid ${primary}`,
        borderFocus: `1px solid ${primary}`,
        boxShadowFocus: focusShadow,
      },

      Slider: {
        fillColor: primary,
        fillColorHover: c('primary-hover'),
        railColor: c('surface-active'),
        handleColor: c('bg-elevated'),
        indicatorColor: c('surface-sunken'),
        indicatorTextColor: text,
      },

      Progress: {
        railColor: c('surface-3'),
        fillColor: primary,
        iconColorInfo: c('info-text'),
        iconColorSuccess: c('success-text'),
        iconColorWarning: c('warning-text'),
        iconColorError: c('danger-text'),
      },

      Skeleton: {
        color: c('skeleton'),
        colorEnd: c('skeleton-highlight'),
        borderRadius: radiusMd,
      },

      Spin: {
        color: primary,
        textColor: textMuted,
      },

      Empty: {
        iconColor: textDisabled,
        textColor: textMuted,
      },

      Result: {
        iconColorInfo: c('info-text'),
        iconColorSuccess: c('success-text'),
        iconColorWarning: c('warning-text'),
        iconColorError: c('danger-text'),
        titleTextColor: text,
        contentTextColor: textSecondary,
      },

      Descriptions: {
        borderRadius: radiusLg,
        thColor: c('surface-2'),
        tdColor: surface,
        borderColor: borderSubtle,
        thTextColor: textSecondary,
        tdTextColor: text,
      },

      Statistic: {
        labelTextColor: textSecondary,
        valueTextColor: text,
        valueFontWeight: '600',
      },

      Breadcrumb: {
        itemTextColor: textMuted,
        itemTextColorHover: c('primary-text'),
        itemTextColorActive: text,
        separatorColor: textDisabled,
      },

      Collapse: {
        titleTextColor: text,
        titleFontWeight: '600',
        dividerColor: borderSubtle,
        itemMargin: '0',
        arrowColor: textMuted,
      },

      Divider: {
        color: borderSubtle,
        textColor: textMuted,
      },

      Avatar: {
        border: `1px solid ${borderSubtle}`,
        color: c('surface-3'),
      },

      Upload: {
        borderRadius: radiusLg,
        draggerColor: c('surface-2'),
        draggerBorder: `1px dashed ${border}`,
        draggerBorderHover: `1px dashed ${primary}`,
        itemColorHover: surfaceHover,
        itemBorderImageCardError: `1px solid ${c('danger')}`,
      },

      DatePicker: {
        panelBorderRadius: radiusLg,
        itemBorderRadius: radiusSm,
        itemColorActive: primary,
        itemTextColorActive: c('on-primary'),
        itemColorHover: surfaceHover,
        panelBoxShadow: shadow2,
      },

      Form: {
        labelTextColor: textSecondary,
        labelFontWeight: '500',
        asteriskColor: c('danger'),
        feedbackTextColorError: c('danger-text'),
        feedbackTextColorWarning: c('warning-text'),
      },

      Scrollbar: {
        color: c('scrollbar-thumb'),
        colorHover: c('scrollbar-thumb-hover'),
      },

      List: {
        color: surface,
        colorHover: surfaceHover,
        borderColor: borderSubtle,
        borderRadius: radiusCard,
      },

      Popconfirm: {
        peers: {
          Button: { borderRadiusMedium: radiusMd },
          Popover: { borderRadius: radiusLg, color: c('bg-elevated') },
        },
      },

      Transfer: {
        borderRadius: radiusLg,
        listColor: surface,
        headerColor: c('surface-2'),
        itemColorPending: surfaceHover,
        borderColor: borderSubtle,
      },

      AutoComplete: {
        peers: {
          Input: { borderRadius: radiusMd, boxShadowFocus: focusShadow },
          InternalSelectMenu: { borderRadius: radiusLg, optionColorPending: surfaceHover },
        },
      },
    }
  })

  return {
    naiveTheme,
    naiveThemeOverrides,
  }
}

export { getCssVar }
