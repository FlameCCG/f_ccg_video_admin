/**
 * Vue I18n 配置
 * 支持中文(zh-CN)、英文(en-US)、日文(ja-JP)
 * 使用懒加载方式加载语言包
 */
import { createI18n } from 'vue-i18n'
import type { I18n } from 'vue-i18n'

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
}

/**
 * 支持的语言列表
 */
export const localeConfigs: LocaleConfig[] = [
  { locale: 'zh-CN', label: 'Chinese (Simplified)', labelNative: '简体中文' },
  { locale: 'en-US', label: 'English', labelNative: 'English' },
  { locale: 'ja-JP', label: 'Japanese', labelNative: '日本語' },
]

/**
 * 默认语言
 */
export const DEFAULT_LOCALE: LocaleType = 'zh-CN'

/**
 * 本地存储 key
 */
export const LOCALE_STORAGE_KEY = 'admin-console-locale'

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
 * 懒加载语言包
 */
async function loadLocaleMessages(locale: LocaleType): Promise<Record<string, unknown>> {
  const modules = import.meta.glob<{ default: Record<string, unknown> }>('./**/index.ts')
  const path = `./${locale}/index.ts`

  if (modules[path]) {
    const mod = await modules[path]()
    return mod.default
  }

  console.warn(`Locale messages not found for: ${locale}`)
  return {}
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
