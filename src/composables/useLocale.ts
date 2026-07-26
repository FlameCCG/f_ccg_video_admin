/**
 * 国际化 Composable
 * 提供语言切换、持久化、Naive UI locale 同步功能
 * Requirements: 3.4, 3.5
 */
import { computed, ref, shallowRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { NLocale, NDateLocale } from 'naive-ui'
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
 * 一种语言对应的 Naive UI 语言包（界面文案 + 日期文案）
 */
interface NaiveLocalePair {
  locale: NLocale
  dateLocale: NDateLocale
}

/**
 * 并行加载一种语言的界面/日期语言包
 */
async function loadNaiveLocalePair(
  importCommon: () => Promise<{ default: NLocale }>,
  importDate: () => Promise<{ default: NDateLocale }>
): Promise<NaiveLocalePair> {
  const [common, date] = await Promise.all([importCommon(), importDate()])
  return { locale: common.default, dateLocale: date.default }
}

/**
 * Naive UI 语言包按需加载表（与 src/locales/index.ts 的懒加载表同一套写法：
 * 静态可分析的 import()，Vite 能生成对应 chunk 与预加载提示）
 *
 * 原实现从 'naive-ui' 静态引入 6 个语言对象，其中 3 个 date* 各自内联一份 date-fns
 * 语言数据；而 useLocale 由 App.vue 调用，等于每次首屏都要下载两份本次会话永远
 * 不会渲染的语言数据。naive-ui 的 package.json 没有 exports 字段，深层子路径可以
 * 直接引入（es/locales/{common,date}/<locale>.mjs，各带同名 .d.ts），因此这里按
 * 「界面 + 日期」成对懒加载，只有当前语言会进入运行时。
 */
const naiveLocaleLoaders: Record<LocaleType, () => Promise<NaiveLocalePair>> = {
  'zh-CN': () =>
    loadNaiveLocalePair(
      () => import('naive-ui/es/locales/common/zhCN'),
      () => import('naive-ui/es/locales/date/zhCN')
    ),
  'en-US': () =>
    loadNaiveLocalePair(
      () => import('naive-ui/es/locales/common/enUS'),
      () => import('naive-ui/es/locales/date/enUS')
    ),
  'ja-JP': () =>
    loadNaiveLocalePair(
      () => import('naive-ui/es/locales/common/jaJP'),
      () => import('naive-ui/es/locales/date/jaJP')
    ),
}

// 全局状态（单例模式）
const currentLocale = ref<LocaleType>(getInitialLocale())
const isInitialized = ref(false)

/** 已加载的 Naive 语言包缓存 */
const loadedNaiveLocales = new Map<LocaleType, NaiveLocalePair>()

/** 进行中的加载：同一语言并发调用只发一次请求 */
const pendingNaiveLocales = new Map<LocaleType, Promise<NaiveLocalePair | null>>()

// Naive 语言包改为异步加载，就绪前保持 null：NConfigProvider 的
// locale / date-locale prop 类型即 `NLocale | null`，此时 Naive 内部回落到 enUS。
// 用 shallowRef 避免把整棵语言包对象树代理成深层响应式。
const naiveLocaleRef = shallowRef<NLocale | null>(null)
const naiveDateLocaleRef = shallowRef<NDateLocale | null>(null)

/**
 * 加载指定语言的 Naive 语言包（带缓存与请求合并）
 * 失败时返回 null 而不抛错：语言包缺失不应阻断语言切换
 */
function loadNaiveLocale(locale: LocaleType): Promise<NaiveLocalePair | null> {
  const loaded = loadedNaiveLocales.get(locale)
  if (loaded) return Promise.resolve(loaded)

  const pending = pendingNaiveLocales.get(locale)
  if (pending) return pending

  const task = naiveLocaleLoaders[locale]()
    .then((pair) => {
      loadedNaiveLocales.set(locale, pair)
      return pair
    })
    .catch((error: unknown) => {
      console.warn(`Failed to load Naive UI locale: ${locale}`, error)
      return null
    })
    .finally(() => {
      pendingNaiveLocales.delete(locale)
    })

  pendingNaiveLocales.set(locale, task)
  return task
}

/**
 * 把语言包提交给视图
 */
function commitNaiveLocale(pair: NaiveLocalePair): void {
  naiveLocaleRef.value = pair.locale
  naiveDateLocaleRef.value = pair.dateLocale
}

/**
 * 加载并提交指定语言的 Naive 语言包
 * 加载期间语言又被切走时丢弃结果，避免旧请求覆盖新语言
 */
async function syncNaiveLocale(locale: LocaleType): Promise<void> {
  const pair = await loadNaiveLocale(locale)
  if (pair && currentLocale.value === locale) {
    commitNaiveLocale(pair)
  }
}

// 模块求值即预取初始语言的语言包：useLocale 由 App.vue 调用，而 App.vue 在
// main.ts 挂载前就已 import，因此这里发起的请求通常能在首屏渲染前完成，
// 不会出现一闪而过的英文日期格式
void syncNaiveLocale(currentLocale.value)

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
   * 当前 Naive UI locale（按需加载，就绪前为 null）
   */
  const naiveLocale = computed<NLocale | null>(() => {
    return naiveLocaleRef.value
  })

  /**
   * 当前 Naive UI dateLocale（按需加载，就绪前为 null）
   */
  const naiveDateLocale = computed<NDateLocale | null>(() => {
    return naiveDateLocaleRef.value
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

    // vue-i18n 语言包与 Naive 语言包并行加载，两者都就绪后再一起提交，
    // 避免出现「正文已换语言、分页器/日期选择器还是旧语言」的半翻译中间态
    const [naivePair] = await Promise.all([
      loadNaiveLocale(locale),
      // 更新 vue-i18n 语言（包含懒加载语言包）
      setI18nLanguage(i18n, locale),
    ])

    // 更新本地状态
    currentLocale.value = locale

    // 同步 Naive UI 语言包
    if (naivePair) {
      commitNaiveLocale(naivePair)
    }

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
        // i18n 语言被外部改动（如 main.ts 的 initI18n）时补齐对应的 Naive 语言包
        void syncNaiveLocale(currentLocale.value)
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
