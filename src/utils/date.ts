import { useAppStore } from '@/stores/app'

/**
 * 格式化日期时间，支持动态多语言 locale
 * 默认从 Pinia store 读取当前语言，如果在外部（如测试环境）则可手动传入或默认 'zh-CN'
 *
 * @param dateStr 待格式化的日期字符串、Date对象或 null/undefined
 * @param locale 强制指定的语言，如 'zh-CN', 'en-US', 'ja-JP'
 */
export function formatDateTime(dateStr: string | Date | null | undefined, locale?: string): string {
  if (!dateStr) return '-'
  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr
  if (!(date instanceof Date) || isNaN(date.getTime())) return '-'

  let activeLocale = 'zh-CN'
  try {
    const appStore = useAppStore()
    activeLocale = locale || appStore.currentLocale || 'zh-CN'
  } catch {
    // 捕获可能在 Pinia 未加载、无 active pinia instance 时的异常，进行安全回退
    activeLocale = locale || 'zh-CN'
  }

  return new Intl.DateTimeFormat(activeLocale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}
