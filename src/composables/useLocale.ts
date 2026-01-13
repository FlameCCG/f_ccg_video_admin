/**
 * 国际化 Composable
 * 提供语言切换、持久化、Naive UI locale 同步功能
 * Requirements: 3.4, 3.5
 */
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  zhCN as naiveZhCN,
  enUS as naiveEnUS,
  jaJP as naiveJaJP,
  dateZhCN,
  dateEnUS,
  dateJaJP,
  type NLocale,
  type NDateLocale,
} from 'naive-ui'
import type { LocaleType } from '@/locales'
import { localeConfigs, DEFAULT_LOCALE, LOCALE_STORAGE_KEY, setI18nLanguage, i18n } from '@/locales'

/**
 * Naive UI locale 映射
 */
const naiveLocaleMap: Record<LocaleType, NLocale> = {
  'zh-CN': naiveZhCN,
  'en-US': naiveEnUS,
  'ja-JP': naiveJaJP,
}

/**
 * Naive UI dateLocale 映射
 */
const naiveDateLocaleMap: Record<LocaleType, NDateLocale> = {
  'zh-CN': dateZhCN,
  'en-US': dateEnUS,
  'ja-JP': dateJaJP,
}

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

// 全局状态（单例模式）
const currentLocale = ref<LocaleType>(getInitialLocale())
const isInitialized = ref(false)

/**
 * 国际化 composable
 * 提供语言切换、持久化、Naive UI locale 同步
 */
export function useLocale() {
  const { locale: i18nLocale } = useI18n()

  /**
   * 当前语言配置
   */
  const currentLocaleConfig = computed(() => {
    return localeConfigs.find((c) => c.locale === currentLocale.value)
  })

  /**
   * 当前 Naive UI locale
   */
  const naiveLocale = computed<NLocale>(() => {
    return naiveLocaleMap[currentLocale.value]
  })

  /**
   * 当前 Naive UI dateLocale
   */
  const naiveDateLocale = computed<NDateLocale>(() => {
    return naiveDateLocaleMap[currentLocale.value]
  })

  /**
   * 设置语言
   * @param locale 目标语言
   */
  async function setLocale(locale: LocaleType): Promise<void> {
    if (!localeConfigs.some((c) => c.locale === locale)) {
      console.warn(`Unsupported locale: ${locale}`)
      return
    }

    // 更新 vue-i18n 语言（包含懒加载语言包）
    await setI18nLanguage(i18n, locale)

    // 更新本地状态
    currentLocale.value = locale

    // 持久化到 localStorage
    localStorage.setItem(LOCALE_STORAGE_KEY, locale)

    // 更新 HTML lang 属性
    document.documentElement.setAttribute('lang', locale)
  }

  /**
   * 初始化语言
   * 应在应用启动时调用
   */
  async function initLocale(): Promise<void> {
    if (isInitialized.value) return

    const locale = getInitialLocale()
    await setLocale(locale)
    isInitialized.value = true
  }

  /**
   * 切换到下一个语言
   * 循环切换：zh-CN -> en-US -> ja-JP -> zh-CN
   */
  async function toggleLocale(): Promise<void> {
    const currentIndex = localeConfigs.findIndex((c) => c.locale === currentLocale.value)
    const nextIndex = (currentIndex + 1) % localeConfigs.length
    const nextConfig = localeConfigs[nextIndex]
    if (nextConfig) {
      await setLocale(nextConfig.locale)
    }
  }

  // 监听 i18n locale 变化，同步更新本地状态
  watch(
    () => i18nLocale.value,
    (newLocale) => {
      if (newLocale !== currentLocale.value && localeConfigs.some((c) => c.locale === newLocale)) {
        currentLocale.value = newLocale as LocaleType
      }
    }
  )

  return {
    // 当前语言
    currentLocale: computed(() => currentLocale.value),
    currentLocaleConfig,
    // 语言配置列表
    localeConfigs,
    // Naive UI locale
    naiveLocale,
    naiveDateLocale,
    // 方法
    setLocale,
    initLocale,
    toggleLocale,
  }
}

/**
 * 导出类型
 */
export type { LocaleType }
