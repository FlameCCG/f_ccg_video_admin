/**
 * Vue I18n 配置
 * 支持中文(zh-CN)、英文(en-US)、日文(ja-JP)
 * 默认语言（zh-CN）静态打包进首屏 chunk，其余语言懒加载
 */
import { createI18n } from 'vue-i18n'
import type { I18n } from 'vue-i18n'
import zhCN from './zh-CN'

/**
 * 支持的语言类型
 */
export type LocaleType = 'zh-CN' | 'en-US' | 'ja-JP'

/**
 * 语言配置
 */
export interface LocaleConfig {
  locale: LocaleType
  label: string
  labelNative: string
  icon: string
}

/**
 * 支持的语言列表
 */
export const localeConfigs: LocaleConfig[] = [
  { locale: 'zh-CN', label: 'Chinese (Simplified)', labelNative: '简体中文', icon: '🇨🇳' },
  { locale: 'en-US', label: 'English', labelNative: 'English', icon: '🇺🇸' },
  { locale: 'ja-JP', label: 'Japanese', labelNative: '日本語', icon: '🇯🇵' },
]

/**
 * 默认语言
 * 用 satisfies 保留字面量类型：下方 loadLocaleMessages 依赖它做类型收窄
 */
export const DEFAULT_LOCALE = 'zh-CN' satisfies LocaleType

/**
 * 本地存储 key
 */
export const LOCALE_STORAGE_KEY = 'admin-console-locale'

/**
 * 获取浏览器语言
 */
export function getBrowserLocale(): LocaleType {
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
export function getInitialLocale(): LocaleType {
  const stored = localStorage.getItem(LOCALE_STORAGE_KEY)
  if (stored && localeConfigs.some((c) => c.locale === stored)) {
    return stored as LocaleType
  }
  return getBrowserLocale()
}

/**
 * 非默认语言的懒加载表（静态可分析，Vite 能生成对应 chunk 与 modulepreload 提示）
 *
 * 原实现用 `import.meta.glob` + 运行时拼出的 key 取语言包，默认语言也走这条路：
 * Vite 无法为运行时 key 生成预加载提示，导致 100% 用户在首屏渲染前多等一次网络往返；
 * 且 glob 写在函数体内，每次切换语言都会重建一次映射表。
 */
const lazyLocaleLoaders: Record<
  Exclude<LocaleType, typeof DEFAULT_LOCALE>,
  () => Promise<{ default: Record<string, unknown> }>
> = {
  'en-US': () => import('./en-US'),
  'ja-JP': () => import('./ja-JP'),
}

/**
 * 加载语言包（默认语言直接返回静态引入的结果，不产生额外请求）
 */
async function loadLocaleMessages(locale: LocaleType): Promise<Record<string, unknown>> {
  if (locale === DEFAULT_LOCALE) {
    return zhCN
  }

  const mod = await lazyLocaleLoaders[locale]()
  return mod.default
}

/**
 * 已加载的语言包缓存
 */
const loadedLocales = new Set<LocaleType>()

/**
 * 创建 i18n 实例
 */
export function setupI18n(): I18n {
  const initialLocale = getInitialLocale()

  const i18n = createI18n({
    legacy: false, // 使用 Composition API 模式
    locale: initialLocale,
    fallbackLocale: DEFAULT_LOCALE,
    messages: {},
    missingWarn: false,
    fallbackWarn: false,
  })

  return i18n
}

/**
 * 设置语言
 * @param i18n i18n 实例
 * @param locale 目标语言
 */
export async function setI18nLanguage(i18n: I18n, locale: LocaleType): Promise<void> {
  // 加载语言包（如果尚未加载）
  if (!loadedLocales.has(locale)) {
    const messages = await loadLocaleMessages(locale)
    i18n.global.setLocaleMessage(locale, messages)
    loadedLocales.add(locale)
  }

  // 设置当前语言（Composition API 模式）
  // @ts-expect-error - vue-i18n 类型定义问题
  i18n.global.locale.value = locale

  // 更新 HTML lang 属性
  document.documentElement.setAttribute('lang', locale)

  // 持久化到 localStorage
  localStorage.setItem(LOCALE_STORAGE_KEY, locale)
}

/**
 * 初始化 i18n（加载初始语言包）
 */
export async function initI18n(i18n: I18n): Promise<void> {
  const locale = getInitialLocale()
  await setI18nLanguage(i18n, locale)
}

// 创建并导出 i18n 实例
export const i18n = setupI18n()
