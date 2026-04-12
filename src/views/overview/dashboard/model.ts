import type { DailyTrends } from '@/api/types'

export type DailyTrendLayout = 'wide' | 'narrow'

interface DailyTrendDefinition {
  key: keyof DailyTrends
  titleKey: `dashboard.trends.${keyof DailyTrends}`
  series: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8
  layout: DailyTrendLayout
  height: number
}

/**
 * 仪表盘每日趋势的唯一配置源。
 *
 * loginUsers 必须作为独立趋势保留：visitUsers 是包含未登录访客的日 UV，
 * 两者不能互相替代。将配置抽出后，单测可以直接守住接口字段到 UI 的映射，
 * 避免后续排版调整时再次漏掉某条后端序列。
 */
export const DAILY_TREND_DEFINITIONS = [
  {
    key: 'visitUsers',
    titleKey: 'dashboard.trends.visitUsers',
    series: 4,
    layout: 'wide',
    height: 252,
  },
  {
    key: 'loginUsers',
    titleKey: 'dashboard.trends.loginUsers',
    series: 2,
    layout: 'narrow',
    height: 252,
  },
  {
    key: 'newUsers',
    titleKey: 'dashboard.trends.newUsers',
    series: 3,
    layout: 'narrow',
    height: 220,
  },
  {
    key: 'publishVideos',
    titleKey: 'dashboard.trends.publishVideos',
    series: 5,
    layout: 'wide',
    height: 220,
  },
] as const satisfies readonly DailyTrendDefinition[]
