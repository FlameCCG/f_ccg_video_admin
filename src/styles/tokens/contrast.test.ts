/**
 * 主题对比度门禁。
 * 直接编译 tokens/themes.scss，对实际生成的 CSS 变量执行 WCAG 2.1 校验，使 SCSS 成为唯一颜色来源。
 * tsconfig.app.json 仅声明 vite/client 类型，因此测试不使用 Node 内置模块或 process，路径相对 vitest 的 root。
 */
import { describe, it, expect } from 'vitest'
import { compile } from 'sass'

const THEMES = ['pearl', 'obsidian', 'cyberpunk', 'sakura'] as const
type ThemeName = (typeof THEMES)[number]

/** WCAG 正文对比度阈值 */
const AA_TEXT = 4.5
/** WCAG 1.4.11 非文本（控件边界/焦点圈）阈值 */
const AA_UI = 3

interface Rgb {
  r: number
  g: number
  b: number
  a: number
}

/**
 * 解析 token 颜色值。
 * 色板里只会出现 6 位 hex、rgb()/rgba() 与 transparent 三种形式，
 * 因此不支持 3 位简写 —— 真出现了就会解析失败并让测试报错，而不是静默放过。
 */
function parseColor(value: string | undefined): Rgb | null {
  const v = (value ?? '').trim()
  if (!v) return null
  if (v === 'transparent') return { r: 0, g: 0, b: 0, a: 0 }

  const hex = /^#([0-9a-f]{6})$/i.exec(v)
  if (hex) {
    const n = Number.parseInt(hex[1] ?? '', 16)
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a: 1 }
  }

  const rgb = /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,/\s]+([\d.]+))?\s*\)$/i.exec(v)
  if (rgb) {
    const alpha = rgb[4]
    return {
      r: Number(rgb[1] ?? 0),
      g: Number(rgb[2] ?? 0),
      b: Number(rgb[3] ?? 0),
      a: alpha === undefined ? 1 : Number(alpha),
    }
  }
  return null
}

/** 半透明色合成到底色上 */
function composite(fg: Rgb, bg: Rgb): Rgb {
  if (fg.a >= 1) return fg
  return {
    r: fg.r * fg.a + bg.r * (1 - fg.a),
    g: fg.g * fg.a + bg.g * (1 - fg.a),
    b: fg.b * fg.a + bg.b * (1 - fg.a),
    a: 1,
  }
}

function relativeLuminance(c: Rgb): number {
  const channel = (raw: number): number => {
    const x = raw / 255
    return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * channel(c.r) + 0.7152 * channel(c.g) + 0.0722 * channel(c.b)
}

function contrast(a: Rgb, b: Rgb): number {
  const la = relativeLuminance(a)
  const lb = relativeLuminance(b)
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

type ThemeTokens = Record<string, string>

/** 编译 themes.scss 并解析出每套主题的 --color-* 映射 */
function loadThemeTokens(): Map<ThemeName, ThemeTokens> {
  const css = compile('src/styles/tokens/themes.scss', {
    loadPaths: ['src/styles'],
    style: 'expanded',
  }).css

  const result = new Map<ThemeName, ThemeTokens>()
  for (const theme of THEMES) result.set(theme, {})

  const blockRe = /(:root|\[data-theme=["']?([a-z]+)["']?\])\s*\{([^}]*)\}/g
  let block: RegExpExecArray | null
  while ((block = blockRe.exec(css)) !== null) {
    // 未带 data-theme 的 :root 即默认主题（pearl）
    const name = (block[2] ?? 'pearl') as ThemeName
    const target = result.get(name)
    if (!target) continue

    const declRe = /--color-([a-z0-9-]+)\s*:\s*([^;]+);/g
    let decl: RegExpExecArray | null
    while ((decl = declRe.exec(block[3] ?? '')) !== null) {
      const key = decl[1]
      const val = decl[2]
      if (key && val) target[key] = val.trim()
    }
  }
  return result
}

const themeTokens = loadThemeTokens()

function tokensFor(theme: ThemeName): ThemeTokens {
  const map = themeTokens.get(theme)
  expect(map, `${theme} 未在编译产物中出现`).toBeDefined()
  return map as ThemeTokens
}

/** 取一对 token 的对比度；半透明先合成到页面底色 */
function ratioOf(theme: ThemeName, fgKey: string, bgKey: string): number {
  const map = tokensFor(theme)

  const fgRaw = parseColor(map[fgKey])
  const bgRaw = parseColor(map[bgKey])
  expect(fgRaw, `${theme}: --color-${fgKey} 缺失或无法解析`).not.toBeNull()
  expect(bgRaw, `${theme}: --color-${bgKey} 缺失或无法解析`).not.toBeNull()

  const pageBg = parseColor(map['bg'])
  expect(pageBg, `${theme}: --color-bg 缺失`).not.toBeNull()

  const bg = composite(bgRaw as Rgb, pageBg as Rgb)
  const fg = composite(fgRaw as Rgb, bg)
  return contrast(fg, bg)
}

const SURFACES = [
  'bg',
  'surface',
  'surface-2',
  'surface-3',
  'surface-hover',
  'row-selected',
  'row-selected-hover',
] as const
const SEMANTICS = ['primary', 'success', 'warning', 'danger', 'info'] as const
const INK = ['text', 'text-secondary', 'text-muted'] as const

describe('theme token contrast (WCAG 2.1)', () => {
  it('emits colour variables for every theme', () => {
    for (const theme of THEMES) {
      expect(Object.keys(tokensFor(theme)).length, `${theme} 没有产出颜色变量`).toBeGreaterThan(40)
    }
  })

  describe.each(THEMES)('%s', (theme) => {
    it.each(SURFACES)('body/secondary/muted ink is >= 4.5:1 on %s', (surface) => {
      for (const role of INK) {
        const r = ratioOf(theme, role, surface)
        const msg = `${theme}: --color-${role} on --color-${surface} = ${r.toFixed(2)}`
        expect(r, msg).toBeGreaterThanOrEqual(AA_TEXT)
      }
    })

    it.each(SEMANTICS)('on-%s is readable on its fill, hover and pressed', (sem) => {
      for (const fill of [sem, `${sem}-hover`, `${sem}-pressed`]) {
        const r = ratioOf(theme, `on-${sem}`, fill)
        const msg = `${theme}: --color-on-${sem} on --color-${fill} = ${r.toFixed(2)}`
        expect(r, msg).toBeGreaterThanOrEqual(AA_TEXT)
      }
    })

    it.each(SEMANTICS)('%s-text is readable on surface and on its subtle tint', (sem) => {
      for (const bg of ['surface', `${sem}-subtle`, 'row-selected', 'row-selected-hover']) {
        const r = ratioOf(theme, `${sem}-text`, bg)
        const msg = `${theme}: --color-${sem}-text on --color-${bg} = ${r.toFixed(2)}`
        expect(r, msg).toBeGreaterThanOrEqual(AA_TEXT)
      }
    })

    it('interactive boundaries and focus ring meet 3:1', () => {
      for (const bg of ['surface', 'bg'] as const) {
        for (const role of ['border-strong', 'focus'] as const) {
          const r = ratioOf(theme, role, bg)
          const msg = `${theme}: --color-${role} on --color-${bg} = ${r.toFixed(2)}`
          expect(r, msg).toBeGreaterThanOrEqual(AA_UI)
        }
      }
    })

    it('all 8 chart series are distinguishable from both canvases', () => {
      for (let i = 1; i <= 8; i++) {
        for (const bg of ['bg', 'surface'] as const) {
          const r = ratioOf(theme, `chart-${i}`, bg)
          const msg = `${theme}: --color-chart-${i} on --color-${bg} = ${r.toFixed(2)}`
          expect(r, msg).toBeGreaterThanOrEqual(AA_UI)
        }
      }
    })

    it('text-disabled reads as inactive without vanishing', () => {
      // WCAG 1.4.3 豁免失效控件，但禁用态仍应可辨认，并与正文保持层级差异。
      const r = ratioOf(theme, 'text-disabled', 'surface')
      const msg = `${theme}: --color-text-disabled on surface = ${r.toFixed(2)}`
      expect(r, msg).toBeGreaterThan(1.9)
      expect(r, msg).toBeLessThan(AA_TEXT)
    })
  })
})
