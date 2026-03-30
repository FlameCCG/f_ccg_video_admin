/**
 * 页面标题 Composable
 * 从后端菜单数据获取当前页面的多语言标题
 */
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { usePermissionStore } from '@/stores/permission'
import type { LocaleType } from '@/locales'

/**
 * 获取当前页面的菜单标题
 * 根据当前语言返回对应的标题（titleZh/titleEn/titleJa）
 */
export function usePageTitle() {
  const route = useRoute()
  const { locale } = useI18n()
  const permissionStore = usePermissionStore()

  /** 当前页面对应的菜单 */
  const currentMenu = computed(() => {
    return permissionStore.getMenuByPath(route.path)
  })

  /** 当前语言的页面标题 */
  const pageTitle = computed(() => {
    const menu = currentMenu.value
    if (!menu) return ''

    const currentLocale = locale.value as LocaleType
    switch (currentLocale) {
      case 'en-US':
        return menu.titleEn || menu.title
      case 'ja-JP':
        return menu.titleJa || menu.title
      default:
        return menu.title
    }
  })

  return {
    currentMenu,
    pageTitle,
  }
}
