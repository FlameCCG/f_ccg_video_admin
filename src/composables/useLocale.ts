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
import {
  localeConfigs,
  LOCALE_STORAGE_KEY,
  setI18nLanguage,
  i18n,
  getInitialLocale,
} from '@/locales'
import { usePermissionStore } from '@/stores/permission'
import { useTabsStore } from '@/stores/tabs'

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

    // 同步更新 permission store 的语言（用于路由标题）
    const permissionStore = usePermissionStore()
    permissionStore.setLocale(locale)

    // 同步更新已打开标签的多语言标题
    syncTabTitlesFromMenus(permissionStore)
  }

  /**
   * 从权限菜单同步标签标题
   */
  function syncTabTitlesFromMenus(permissionStore: ReturnType<typeof usePermissionStore>): void {
    const tabsStore = useTabsStore()
    const titleMap: Array<{ path: string; title: string; titleEn?: string; titleJa?: string }> = []

    for (const tab of tabsStore.tabs) {
      const menu = findMenuByFullPath(permissionStore.menus, tab.path)
      if (menu) {
        titleMap.push({
          path: tab.path,
          title: menu.title,
          titleEn: menu.titleEn,
          titleJa: menu.titleJa,
        })
      }
    }

    if (titleMap.length > 0) {
      tabsStore.syncTabI18n(titleMap)
    }
  }

  /**
   * 在菜单树中按完整路径查找菜单
   */
  function findMenuByFullPath(
    menus: ReturnType<typeof usePermissionStore>['menus'],
    targetPath: string,
    parentPath = ''
  ): { title: string; titleEn?: string; titleJa?: string } | undefined {
    for (const menu of menus) {
      if (!menu.path) continue

      let fullPath: string
      if (menu.path.startsWith('/')) {
        fullPath = menu.path
      } else if (parentPath) {
        fullPath = `${parentPath}/${menu.path}`
      } else {
        fullPath = menu.path
      }

      if (fullPath === targetPath) {
        return menu
      }

      if (menu.children && menu.children.length > 0) {
        const found = findMenuByFullPath(menu.children, targetPath, fullPath)
        if (found) return found
      }
    }
    return undefined
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
