/**
 * 站点统计相关类型定义
 */

/**
 * 趋势数据系列
 */
export interface TrendSeries {
  /** X 轴标签（日期） */
  x: string[]
  /** 数值 */
  values: number[]
  /** 变化率 */
  rates: number[]
}

/**
 * 站点概览数据
 */
export interface SiteOverview {
  /** 总用户数 */
  totalUsers: number
  /** 在线用户数 */
  onlineUsers: number
  /** 总视频数 */
  totalVideos: number
  /** 总评论数 */
  totalComments: number
  /** 今日登录用户数 */
  todayLoginUsers: number
  /** 今日注册用户数 */
  todayRegisters: number
}

/**
 * 每日趋势数据
 */
export interface DailyTrends {
  /** 访问用户趋势 */
  visitUsers: TrendSeries
  /** 发布视频趋势 */
  publishVideos: TrendSeries
  /** 新增用户趋势 */
  newUsers: TrendSeries
}

/**
 * 每月趋势数据
 */
export interface MonthlyTrends {
  /** 新增视频趋势 */
  newVideos: TrendSeries
}

/**
 * 站点统计数据
 */
export interface AdminSiteStats {
  /** 概览数据 */
  overview: SiteOverview
  /** 每日趋势 */
  daily: DailyTrends
  /** 每月趋势 */
  monthly: MonthlyTrends
}
