<script setup lang="ts">
/**
 * 仪表盘页面 - 运营总览
 *
 * 三条设计约束（改动前请先读）：
 * 1. 有层级。登录后第一屏不能是 6 个等权重的方块：总用户数作为主指标
 *    （更宽、更大、带分类色顶边），今日脉搏两张次级卡，存量指标一排小卡。
 * 2. 环比数据必须真的喂进去。StatCard 的 trend / trendValue 早就实现了，
 *    但此前 6 张卡一张都没传，方向箭头与百分比是死代码。
 *    注意两种「环比」不是同一个量：
 *      - 今日新增类指标：直接用 daily.*.rates 末位（新增量自身的环比变化率）
 *      - 存量类指标：用「今日新增 / 昨日存量」推算存量增幅
 *    混用会给出错误数字，所以下面分成两个函数。
 * 3. 分类色只从 --color-chart-N 取。语义色（success / warning / danger）
 *    留给真实状态，不做装饰。
 */
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useQuery } from '@tanstack/vue-query'
import { NGrid, NGi, NButton, NIcon } from 'naive-ui'
import { getSiteStats } from '@/api/site'
import { StatCard, TrendChart, ChartSkeleton } from '@/components/chart'
import { AppEmpty } from '@/components/common'
import type { TrendSeries } from '@/api/types'

const { t } = useI18n()

/** 获取站点统计数据 */
const {
  data: stats,
  isLoading,
  isFetching,
  isError,
  refetch,
} = useQuery({
  queryKey: ['siteStats'],
  queryFn: getSiteStats,
  staleTime: 5 * 60 * 1000, // 5 分钟
  retry: 2,
})

/** 空趋势数据 */
const EMPTY_TREND: TrendSeries = { x: [], values: [], rates: [] }

/**
 * 网格间距（px）。n-grid 的 x-gap / y-gap 只接受数值，吃不了 CSS 变量，
 * 该值与 --spacing-card-gap（16px）同值，改 token 时需一并同步。
 */
const GRID_GAP = 16

/**
 * 网格列数与跨度：骨架屏与真实内容共用同一组常量。
 * 这是「骨架 → 内容」能淡入而不是重排一次的前提 —— 写两遍必然漂移。
 */
const LEAD_COLS = 4
const LEAD_HERO_SPAN = '4 s:4 m:2'
const LEAD_SPAN = '4 s:2 m:1'
const STOCK_COLS = 6
const STOCK_SPAN = '6 s:3 m:2'
const DAILY_COLS = 3
const DAILY_SPAN = '3 m:1'

/** 图表高度（px） */
const DAILY_CHART_HEIGHT = 200
const MONTHLY_CHART_HEIGHT = 240

/** 概览指标的 key（也用于「是否有数据」判断） */
const OVERVIEW_KEYS = [
  'totalUsers',
  'onlineUsers',
  'totalVideos',
  'totalComments',
  'todayLoginUsers',
  'todayRegisters',
] as const

type TrendDirection = 'up' | 'down' | 'flat'
type SeriesIndex = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8

interface Delta {
  trend: TrendDirection
  trendValue: number
}

interface OverviewCard {
  key: string
  title: string
  value: number
  icon: 'users' | 'videos' | 'comments' | 'views' | 'likes'
  /** 分类色序号，与对应趋势图的颜色保持一致 */
  series: SeriesIndex
  trend?: TrendDirection
  trendValue?: number
}

/** 由变化率得出方向 */
function toDelta(rate: number): Delta {
  if (rate > 0) return { trend: 'up', trendValue: rate }
  if (rate < 0) return { trend: 'down', trendValue: rate }
  return { trend: 'flat', trendValue: 0 }
}

/**
 * 「今日新增」类指标的环比：直接取序列末位的 rates。
 * 后端 rates 已是百分数（0.5 表示 0.5%），与 TrendChart 的提示框同口径。
 */
function incrementDelta(series: TrendSeries | undefined): Delta | undefined {
  const rates = series?.rates
  if (!rates || rates.length === 0) return undefined
  const rate = rates[rates.length - 1]
  if (rate === undefined || !Number.isFinite(rate)) return undefined
  return toDelta(rate)
}

/**
 * 存量类指标的环比增幅：今日新增 / 昨日存量。
 * 不能直接用 daily.*.rates —— 那是新增量自身的环比变化率，
 * 把它标在「总视频数」上会给出一个完全不同的数。
 * 前提：序列末位就是今天（后端 /admin/site/stats 按日聚合，末位为当日）。
 */
function stockDelta(total: number, series: TrendSeries | undefined): Delta | undefined {
  const values = series?.values
  if (!values || values.length === 0) return undefined
  const increment = values[values.length - 1]
  if (increment === undefined || !Number.isFinite(increment)) return undefined
  if (increment === 0) return { trend: 'flat', trendValue: 0 }
  const previous = total - increment
  if (previous <= 0) return undefined
  return toDelta((increment / previous) * 100)
}

/** 主指标：站点规模的头条数字 */
const heroCard = computed<OverviewCard>(() => {
  const overview = stats.value?.overview
  const total = overview?.totalUsers ?? 0
  const delta = stockDelta(total, stats.value?.daily?.newUsers)
  return {
    key: 'totalUsers',
    title: t('dashboard.overview.totalUsers'),
    value: total,
    icon: 'users',
    series: 1,
    trend: delta?.trend,
    trendValue: delta?.trendValue,
  }
})

/** 今日脉搏：与主指标同排，都有真实环比 */
const todayCards = computed<OverviewCard[]>(() => {
  const overview = stats.value?.overview
  const daily = stats.value?.daily
  const loginDelta = incrementDelta(daily?.visitUsers)
  const registerDelta = incrementDelta(daily?.newUsers)
  return [
    {
      key: 'todayLoginUsers',
      title: t('dashboard.overview.todayLoginUsers'),
      value: overview?.todayLoginUsers ?? 0,
      icon: 'users',
      series: 2,
      trend: loginDelta?.trend,
      trendValue: loginDelta?.trendValue,
    },
    {
      key: 'todayRegisters',
      title: t('dashboard.overview.todayRegisters'),
      value: overview?.todayRegisters ?? 0,
      icon: 'likes',
      series: 3,
      trend: registerDelta?.trend,
      trendValue: registerDelta?.trendValue,
    },
  ]
})

/** 存量指标：密度更高的一排，只有视频数能算出环比 */
const stockCards = computed<OverviewCard[]>(() => {
  const overview = stats.value?.overview
  const videoDelta = stockDelta(overview?.totalVideos ?? 0, stats.value?.daily?.publishVideos)
  return [
    {
      key: 'onlineUsers',
      title: t('dashboard.overview.onlineUsers'),
      value: overview?.onlineUsers ?? 0,
      icon: 'views',
      series: 4,
    },
    {
      key: 'totalVideos',
      title: t('dashboard.overview.totalVideos'),
      value: overview?.totalVideos ?? 0,
      icon: 'videos',
      series: 5,
      trend: videoDelta?.trend,
      trendValue: videoDelta?.trendValue,
    },
    {
      key: 'totalComments',
      title: t('dashboard.overview.totalComments'),
      value: overview?.totalComments ?? 0,
      icon: 'comments',
      series: 6,
    },
  ]
})

/** 每日趋势图表配置：颜色与对应卡片的分类色一致 */
const dailyCharts = computed(() => {
  const daily = stats.value?.daily
  return [
    {
      key: 'visitUsers',
      title: t('dashboard.trends.visitUsers'),
      data: daily?.visitUsers ?? EMPTY_TREND,
      color: 'var(--color-chart-2)',
    },
    {
      key: 'newUsers',
      title: t('dashboard.trends.newUsers'),
      data: daily?.newUsers ?? EMPTY_TREND,
      color: 'var(--color-chart-3)',
    },
    {
      key: 'publishVideos',
      title: t('dashboard.trends.publishVideos'),
      data: daily?.publishVideos ?? EMPTY_TREND,
      color: 'var(--color-chart-5)',
    },
  ]
})

/** 每月趋势图表配置 */
const monthlyChart = computed(() => ({
  key: 'newVideos',
  title: t('dashboard.trends.newVideos'),
  data: stats.value?.monthly?.newVideos ?? EMPTY_TREND,
  color: 'var(--color-chart-5)',
}))

/**
 * 是否有数据。
 * 旧实现只看 overview.totalUsers > 0：有视频、有评论但还没有注册用户的站点
 * 会被判成「暂无数据」，整页统计被藏起来。任意概览指标非 0，
 * 或任意趋势序列有点位，都算有数据。
 */
const hasData = computed(() => {
  const value = stats.value
  if (!value) return false

  const overview = value.overview
  if (OVERVIEW_KEYS.some((key) => (overview?.[key] ?? 0) > 0)) return true

  const series = [
    value.daily?.visitUsers,
    value.daily?.publishVideos,
    value.daily?.newUsers,
    value.monthly?.newVideos,
  ]
  return series.some((item) => (item?.x.length ?? 0) > 0)
})

/** 空数据提示（同时给趋势图当占位文案） */
const noDataText = computed(() => t('dashboard.empty.noData'))

/** 刷新数据 */
function handleRefresh(): void {
  void refetch()
}
</script>

<template>
  <div class="dashboard-page">
    <!-- 页面标题 -->
    <div class="dashboard-page__header">
      <h1 class="dashboard-page__title">{{ t('dashboard.title') }}</h1>
      <n-button
        :loading="isFetching"
        :disabled="isFetching"
        size="small"
        secondary
        @click="handleRefresh"
      >
        <template #icon>
          <n-icon>
            <!-- 尺寸交给 n-icon（svg 继承 1em），不再写死 width / height -->
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
          </n-icon>
        </template>
        {{ t('dashboard.refresh') }}
      </n-button>
    </div>

    <!-- 四个分支同位互换：骨架 → 内容是淡入，不是硬切 -->
    <div class="dashboard-page__body">
      <Transition name="swap">
        <!-- 错误状态 -->
        <div v-if="isError" key="error">
          <app-empty
            type="error"
            :description="t('dashboard.empty.loadFailed')"
            show-action
            @action="handleRefresh"
          />
        </div>

        <!-- 加载状态：栅格与真实内容完全同构 -->
        <div v-else-if="isLoading" key="loading" class="dashboard-page__sections">
          <section class="dashboard-page__section">
            <h2 class="dashboard-page__section-title">{{ t('dashboard.overview.title') }}</h2>
            <div class="dashboard-page__overview">
              <n-grid
                :x-gap="GRID_GAP"
                :y-gap="GRID_GAP"
                :cols="LEAD_COLS"
                responsive="screen"
                item-responsive
              >
                <n-gi :span="LEAD_HERO_SPAN">
                  <chart-skeleton type="stat" size="large" />
                </n-gi>
                <n-gi v-for="i in todayCards.length" :key="i" :span="LEAD_SPAN">
                  <chart-skeleton type="stat" />
                </n-gi>
              </n-grid>
              <n-grid
                :x-gap="GRID_GAP"
                :y-gap="GRID_GAP"
                :cols="STOCK_COLS"
                responsive="screen"
                item-responsive
              >
                <n-gi v-for="i in stockCards.length" :key="i" :span="STOCK_SPAN">
                  <chart-skeleton type="stat" size="small" />
                </n-gi>
              </n-grid>
            </div>
          </section>

          <section class="dashboard-page__section">
            <h2 class="dashboard-page__section-title">{{ t('dashboard.trends.daily') }}</h2>
            <n-grid
              :x-gap="GRID_GAP"
              :y-gap="GRID_GAP"
              :cols="DAILY_COLS"
              responsive="screen"
              item-responsive
            >
              <n-gi v-for="i in dailyCharts.length" :key="i" :span="DAILY_SPAN">
                <chart-skeleton type="line" :height="DAILY_CHART_HEIGHT" />
              </n-gi>
            </n-grid>
          </section>

          <section class="dashboard-page__section">
            <h2 class="dashboard-page__section-title">{{ t('dashboard.trends.monthly') }}</h2>
            <chart-skeleton type="line" :height="MONTHLY_CHART_HEIGHT" />
          </section>
        </div>

        <!-- 空数据状态 -->
        <div v-else-if="!hasData" key="empty">
          <app-empty type="default" :description="noDataText" />
        </div>

        <!-- 数据展示 -->
        <div v-else key="content" class="dashboard-page__sections">
          <!-- 概览：主指标 + 今日脉搏 / 存量指标 -->
          <section class="dashboard-page__section">
            <h2 class="dashboard-page__section-title">{{ t('dashboard.overview.title') }}</h2>
            <div class="dashboard-page__overview">
              <n-grid
                :x-gap="GRID_GAP"
                :y-gap="GRID_GAP"
                :cols="LEAD_COLS"
                responsive="screen"
                item-responsive
              >
                <n-gi
                  class="dashboard-page__reveal"
                  :span="LEAD_HERO_SPAN"
                  :style="{ '--stagger-i': 0 }"
                >
                  <stat-card
                    hero
                    size="large"
                    :title="heroCard.title"
                    :value="heroCard.value"
                    :icon="heroCard.icon"
                    :series="heroCard.series"
                    :trend="heroCard.trend"
                    :trend-value="heroCard.trendValue"
                  />
                </n-gi>
                <n-gi
                  v-for="(card, i) in todayCards"
                  :key="card.key"
                  class="dashboard-page__reveal"
                  :span="LEAD_SPAN"
                  :style="{ '--stagger-i': i + 1 }"
                >
                  <stat-card
                    :title="card.title"
                    :value="card.value"
                    :icon="card.icon"
                    :series="card.series"
                    :trend="card.trend"
                    :trend-value="card.trendValue"
                  />
                </n-gi>
              </n-grid>
              <n-grid
                :x-gap="GRID_GAP"
                :y-gap="GRID_GAP"
                :cols="STOCK_COLS"
                responsive="screen"
                item-responsive
              >
                <n-gi
                  v-for="(card, i) in stockCards"
                  :key="card.key"
                  class="dashboard-page__reveal"
                  :span="STOCK_SPAN"
                  :style="{ '--stagger-i': i + 3 }"
                >
                  <stat-card
                    size="small"
                    :title="card.title"
                    :value="card.value"
                    :icon="card.icon"
                    :series="card.series"
                    :trend="card.trend"
                    :trend-value="card.trendValue"
                  />
                </n-gi>
              </n-grid>
            </div>
          </section>

          <!-- 每日趋势图表 -->
          <section class="dashboard-page__section">
            <h2 class="dashboard-page__section-title">{{ t('dashboard.trends.daily') }}</h2>
            <n-grid
              :x-gap="GRID_GAP"
              :y-gap="GRID_GAP"
              :cols="DAILY_COLS"
              responsive="screen"
              item-responsive
            >
              <n-gi
                v-for="(chart, i) in dailyCharts"
                :key="chart.key"
                class="dashboard-page__reveal"
                :span="DAILY_SPAN"
                :style="{ '--stagger-i': i }"
              >
                <trend-chart
                  type="area"
                  smooth
                  show-dots
                  :title="chart.title"
                  :data="chart.data"
                  :color="chart.color"
                  :height="DAILY_CHART_HEIGHT"
                  :empty-text="noDataText"
                />
              </n-gi>
            </n-grid>
          </section>

          <!-- 每月趋势图表 -->
          <section class="dashboard-page__section">
            <h2 class="dashboard-page__section-title">{{ t('dashboard.trends.monthly') }}</h2>
            <trend-chart
              type="area"
              smooth
              show-dots
              :title="monthlyChart.title"
              :data="monthlyChart.data"
              :color="monthlyChart.color"
              :height="MONTHLY_CHART_HEIGHT"
              :empty-text="noDataText"
            />
          </section>
        </div>
      </Transition>
    </div>
  </div>
</template>

<style scoped lang="scss">
// 页面根节点不带内边距：DefaultLayout 的 .content-wrapper 已经统一给出
// `padding: var(--spacing-page-y) var(--spacing-page-x)`，这里再加一份
// 就会叠成 48px 的内容框内缩（见 base/_page-layouts.scss 顶部的说明）。
// 块间节奏统一走 --spacing-section，与页面内缩同值。
// 根节点保持块级：它是 .content-wrapper 的 grid 单元、会被拉伸到整格高度，
// 改成 flex 列的话内容一超高子项就会被 flex-shrink 压扁。
.dashboard-page {
  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--spacing-section);
  }

  &__title {
    margin: 0;
    font-size: var(--text-2xl);
    font-weight: var(--font-semibold);
    letter-spacing: var(--tracking-tight);
    color: var(--color-text);
  }

  // swap 过渡的离场态是 position: absolute，宿主必须是定位上下文
  &__body {
    position: relative;
  }

  &__sections {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-section);
  }

  // 概览区内部两排卡片的间距，与栅格 gap 同值
  &__overview {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-card-gap);
  }

  &__section-title {
    margin: 0 0 var(--spacing-4);
    font-size: var(--text-lg);
    font-weight: var(--font-medium);
    color: var(--color-text);
  }

  // 逐项揭示：从左到右依次入场。
  // backwards 填充让卡片在自己的延迟窗口里保持不可见，
  // 否则会先闪一下再跳回起始态。
  &__reveal {
    animation: card-reveal var(--motion-enter-duration) var(--motion-enter-easing) backwards;
    animation-delay: calc(var(--stagger-i, 0) * var(--stagger-step));
  }
}

@keyframes card-reveal {
  from {
    opacity: 0;
    transform: translateY(var(--spacing-2));
  }
}

// 时长与步进已由 tokens 侧压到 0，这里直接停掉动画：
// 0ms 的位移动画仍会让卡片在偏移位置闪现一帧。
@media (prefers-reduced-motion: reduce) {
  .dashboard-page__reveal {
    animation: none;
  }
}
</style>
