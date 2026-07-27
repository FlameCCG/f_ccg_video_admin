<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useQuery } from '@tanstack/vue-query'
import { NButton, NIcon } from 'naive-ui'
import { CalendarClearOutline, PulseOutline, RefreshOutline } from '@vicons/ionicons5'
import { getSiteStats } from '@/api/site'
import type { TrendSeries } from '@/api/types'
import { ChartSkeleton, StatCard, TrendChart } from '@/components/chart'
import { AppEmpty } from '@/components/common'
import { DAILY_TREND_DEFINITIONS } from './model'

const { t, locale } = useI18n()

const {
  data: stats,
  dataUpdatedAt,
  isLoading,
  isFetching,
  isError,
  refetch,
} = useQuery({
  queryKey: ['siteStats'],
  queryFn: getSiteStats,
  staleTime: 5 * 60 * 1000,
  retry: 2,
})

const EMPTY_TREND: TrendSeries = { x: [], values: [], rates: [] }
const MONTHLY_CHART_HEIGHT = 260

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
type OverviewIcon = 'users' | 'videos' | 'comments' | 'views' | 'login' | 'register'

interface Delta {
  trend: TrendDirection
  trendValue: number
}

interface OverviewCard {
  key: string
  title: string
  value: number
  icon: OverviewIcon
  series: SeriesIndex
  trend?: TrendDirection
  trendValue?: number
}

function toDelta(rate: number): Delta {
  if (rate > 0) return { trend: 'up', trendValue: rate }
  if (rate < 0) return { trend: 'down', trendValue: rate }
  return { trend: 'flat', trendValue: 0 }
}

/** 新增量指标直接使用后端末位 rates。 */
function incrementDelta(series: TrendSeries | undefined): Delta | undefined {
  const rates = series?.rates
  if (!rates || rates.length === 0) return undefined
  const rate = rates[rates.length - 1]
  if (rate === undefined || !Number.isFinite(rate)) return undefined
  return toDelta(rate)
}

/** 存量指标用「今日新增 / 昨日存量」推算，不能冒用新增量自身环比。 */
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

const todayCards = computed<OverviewCard[]>(() => {
  const overview = stats.value?.overview
  const daily = stats.value?.daily
  const loginDelta = incrementDelta(daily?.loginUsers)
  const registerDelta = incrementDelta(daily?.newUsers)

  return [
    {
      key: 'todayLoginUsers',
      title: t('dashboard.overview.todayLoginUsers'),
      value: overview?.todayLoginUsers ?? 0,
      icon: 'login',
      series: 2,
      trend: loginDelta?.trend,
      trendValue: loginDelta?.trendValue,
    },
    {
      key: 'todayRegisters',
      title: t('dashboard.overview.todayRegisters'),
      value: overview?.todayRegisters ?? 0,
      icon: 'register',
      series: 3,
      trend: registerDelta?.trend,
      trendValue: registerDelta?.trendValue,
    },
  ]
})

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

/**
 * 四条 daily 序列全部由统一定义生成。loginUsers 在这里是独立图表，
 * 不再被 visitUsers（含匿名访客的日 UV）错误替代或遗漏。
 */
const dailyCharts = computed(() => {
  const daily = stats.value?.daily
  return DAILY_TREND_DEFINITIONS.map((definition) => ({
    ...definition,
    title: t(definition.titleKey),
    data: daily?.[definition.key] ?? EMPTY_TREND,
    color: `var(--color-chart-${definition.series})`,
  }))
})

const monthlyChart = computed(() => ({
  key: 'newVideos',
  title: t('dashboard.trends.newVideos'),
  data: stats.value?.monthly?.newVideos ?? EMPTY_TREND,
  color: 'var(--color-chart-5)',
}))

const hasData = computed(() => {
  const value = stats.value
  if (!value) return false

  if (OVERVIEW_KEYS.some((key) => (value.overview?.[key] ?? 0) > 0)) return true

  const series = [
    value.daily?.visitUsers,
    value.daily?.loginUsers,
    value.daily?.publishVideos,
    value.daily?.newUsers,
    value.monthly?.newVideos,
  ]
  return series.some((item) => (item?.x.length ?? 0) > 0)
})

function parsePeriodLabel(label: string): Date | undefined {
  const normalized = /^\d{4}-\d{2}$/.test(label) ? `${label}-01` : label
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return undefined
  const date = new Date(`${normalized}T00:00:00`)
  return Number.isNaN(date.getTime()) ? undefined : date
}

function formatRange(labels: string[], monthly: boolean): string | undefined {
  const firstLabel = labels[0]
  const lastLabel = labels[labels.length - 1]
  if (!firstLabel || !lastLabel) return undefined

  const first = parsePeriodLabel(firstLabel)
  const last = parsePeriodLabel(lastLabel)
  if (!first || !last) return `${firstLabel} — ${lastLabel}`

  const formatter = new Intl.DateTimeFormat(locale.value, {
    year: monthly ? 'numeric' : undefined,
    month: 'short',
    day: monthly ? undefined : 'numeric',
  })
  return `${formatter.format(first)} — ${formatter.format(last)}`
}

const dailyLabels = computed(() => {
  const daily = stats.value?.daily
  const candidates = [
    daily?.visitUsers.x,
    daily?.loginUsers.x,
    daily?.newUsers.x,
    daily?.publishVideos.x,
  ]
  return candidates.find((labels) => labels && labels.length > 0) ?? []
})

const dailyRangeLabel = computed(
  () => formatRange(dailyLabels.value, false) ?? t('dashboard.period.last7Days')
)

const monthlyRangeLabel = computed(
  () =>
    formatRange(stats.value?.monthly?.newVideos.x ?? [], true) ?? t('dashboard.period.last12Months')
)

const latestDayLabel = computed(() => {
  const label = dailyLabels.value[dailyLabels.value.length - 1]
  if (!label) return t('dashboard.status.awaitingData')
  const date = parsePeriodLabel(label)
  if (!date) return label
  return new Intl.DateTimeFormat(locale.value, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date)
})

const syncStatusText = computed(() =>
  isFetching.value ? t('dashboard.status.syncing') : t('dashboard.status.synced')
)

const updatedAtText = computed(() => {
  if (dataUpdatedAt.value <= 0) return t('dashboard.status.waiting')
  const time = new Intl.DateTimeFormat(locale.value, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dataUpdatedAt.value))
  return t('dashboard.status.updatedAt', { time })
})

const noDataText = computed(() => t('dashboard.empty.noData'))

function handleRefresh(): void {
  void refetch()
}
</script>

<template>
  <div class="dashboard-page">
    <header class="dashboard-page__header">
      <div class="dashboard-page__heading">
        <div class="dashboard-page__eyebrow">
          <n-icon :component="PulseOutline" aria-hidden="true" />
          <span>{{ t('dashboard.eyebrow') }}</span>
        </div>
        <h1 class="dashboard-page__title">{{ t('dashboard.title') }}</h1>
        <p class="dashboard-page__subtitle">{{ t('dashboard.subtitle') }}</p>
      </div>

      <div class="dashboard-page__header-actions">
        <div class="dashboard-page__sync" aria-live="polite">
          <span
            class="dashboard-page__sync-dot"
            :class="{ 'is-syncing': isFetching }"
            aria-hidden="true"
          />
          <div class="dashboard-page__sync-copy">
            <strong>{{ syncStatusText }}</strong>
            <span>{{ updatedAtText }}</span>
          </div>
        </div>
        <n-button
          class="dashboard-page__refresh"
          :loading="isFetching"
          :disabled="isFetching"
          secondary
          size="medium"
          @click="handleRefresh"
        >
          <template #icon>
            <n-icon :component="RefreshOutline" />
          </template>
          {{ t('dashboard.refresh') }}
        </n-button>
      </div>
    </header>

    <div class="dashboard-page__body">
      <Transition name="swap">
        <div v-if="isError" key="error" class="dashboard-page__state">
          <app-empty
            type="error"
            :description="t('dashboard.empty.loadFailed')"
            show-action
            @action="handleRefresh"
          />
        </div>

        <div v-else-if="isLoading" key="loading" class="dashboard-page__sections">
          <section class="summary-panel" :aria-label="t('dashboard.overview.title')">
            <div class="summary-panel__header">
              <div>
                <span class="summary-panel__kicker">{{ t('dashboard.overview.kicker') }}</span>
                <h2 class="summary-panel__title">{{ t('dashboard.overview.title') }}</h2>
              </div>
              <div class="summary-panel__date">
                <n-icon :component="CalendarClearOutline" aria-hidden="true" />
                <span>{{ t('dashboard.status.loadingSnapshot') }}</span>
              </div>
            </div>
            <div class="summary-panel__body">
              <div class="summary-panel__hero">
                <chart-skeleton type="stat" size="large" embedded />
              </div>
              <div class="summary-panel__metrics">
                <div
                  v-for="i in todayCards.length"
                  :key="`today-${i}`"
                  class="summary-panel__metric summary-panel__metric--pulse"
                >
                  <chart-skeleton type="stat" embedded />
                </div>
                <div
                  v-for="i in stockCards.length"
                  :key="`stock-${i}`"
                  class="summary-panel__metric summary-panel__metric--stock"
                >
                  <chart-skeleton type="stat" size="small" embedded />
                </div>
              </div>
            </div>
          </section>

          <section class="dashboard-page__section">
            <div class="section-heading">
              <div class="section-heading__copy">
                <span class="section-heading__kicker">{{ t('dashboard.trends.dailyKicker') }}</span>
                <h2 class="section-heading__title">{{ t('dashboard.trends.daily') }}</h2>
                <p class="section-heading__description">
                  {{ t('dashboard.trends.dailyDescription') }}
                </p>
              </div>
              <div class="section-heading__period">
                <n-icon :component="CalendarClearOutline" aria-hidden="true" />
                <span>{{ t('dashboard.period.last7Days') }}</span>
              </div>
            </div>
            <div class="dashboard-page__trend-grid">
              <div
                v-for="chart in dailyCharts"
                :key="chart.key"
                class="dashboard-page__trend-item"
                :class="`dashboard-page__trend-item--${chart.layout}`"
              >
                <chart-skeleton type="line" :height="chart.height" />
              </div>
            </div>
          </section>

          <section class="dashboard-page__section">
            <div class="section-heading">
              <div class="section-heading__copy">
                <span class="section-heading__kicker">
                  {{ t('dashboard.trends.monthlyKicker') }}
                </span>
                <h2 class="section-heading__title">{{ t('dashboard.trends.monthly') }}</h2>
                <p class="section-heading__description">
                  {{ t('dashboard.trends.monthlyDescription') }}
                </p>
              </div>
              <div class="section-heading__period">
                <n-icon :component="CalendarClearOutline" aria-hidden="true" />
                <span>{{ t('dashboard.period.last12Months') }}</span>
              </div>
            </div>
            <chart-skeleton type="line" :height="MONTHLY_CHART_HEIGHT" />
          </section>
        </div>

        <div v-else-if="!hasData" key="empty" class="dashboard-page__state">
          <app-empty type="default" :description="noDataText" />
        </div>

        <div v-else key="content" class="dashboard-page__sections">
          <section class="summary-panel" :aria-label="t('dashboard.overview.title')">
            <div class="summary-panel__header">
              <div>
                <span class="summary-panel__kicker">{{ t('dashboard.overview.kicker') }}</span>
                <h2 class="summary-panel__title">{{ t('dashboard.overview.title') }}</h2>
              </div>
              <div class="summary-panel__date">
                <n-icon :component="CalendarClearOutline" aria-hidden="true" />
                <span>{{ latestDayLabel }}</span>
              </div>
            </div>
            <div class="summary-panel__body">
              <div class="summary-panel__hero dashboard-page__reveal" :style="{ '--stagger-i': 0 }">
                <stat-card
                  hero
                  embedded
                  size="large"
                  :title="heroCard.title"
                  :value="heroCard.value"
                  :icon="heroCard.icon"
                  :series="heroCard.series"
                  :trend="heroCard.trend"
                  :trend-value="heroCard.trendValue"
                />
              </div>

              <div class="summary-panel__metrics">
                <div
                  v-for="(card, i) in todayCards"
                  :key="card.key"
                  class="summary-panel__metric summary-panel__metric--pulse dashboard-page__reveal"
                  :style="{ '--stagger-i': i + 1 }"
                >
                  <stat-card
                    embedded
                    :title="card.title"
                    :value="card.value"
                    :icon="card.icon"
                    :series="card.series"
                    :trend="card.trend"
                    :trend-value="card.trendValue"
                  />
                </div>
                <div
                  v-for="(card, i) in stockCards"
                  :key="card.key"
                  class="summary-panel__metric summary-panel__metric--stock dashboard-page__reveal"
                  :style="{ '--stagger-i': i + 3 }"
                >
                  <stat-card
                    embedded
                    size="small"
                    :title="card.title"
                    :value="card.value"
                    :icon="card.icon"
                    :series="card.series"
                    :trend="card.trend"
                    :trend-value="card.trendValue"
                  />
                </div>
              </div>
            </div>
          </section>

          <section class="dashboard-page__section">
            <div class="section-heading">
              <div class="section-heading__copy">
                <span class="section-heading__kicker">{{ t('dashboard.trends.dailyKicker') }}</span>
                <h2 class="section-heading__title">{{ t('dashboard.trends.daily') }}</h2>
                <p class="section-heading__description">
                  {{ t('dashboard.trends.dailyDescription') }}
                </p>
              </div>
              <div class="section-heading__period">
                <n-icon :component="CalendarClearOutline" aria-hidden="true" />
                <span>{{ dailyRangeLabel }}</span>
              </div>
            </div>

            <div class="dashboard-page__trend-grid">
              <div
                v-for="(chart, i) in dailyCharts"
                :key="chart.key"
                class="dashboard-page__trend-item dashboard-page__reveal"
                :class="`dashboard-page__trend-item--${chart.layout}`"
                :style="{ '--stagger-i': i }"
              >
                <trend-chart
                  type="area"
                  smooth
                  show-dots
                  :title="chart.title"
                  :data="chart.data"
                  :color="chart.color"
                  :height="chart.height"
                  :empty-text="noDataText"
                />
              </div>
            </div>
          </section>

          <section class="dashboard-page__section">
            <div class="section-heading">
              <div class="section-heading__copy">
                <span class="section-heading__kicker">
                  {{ t('dashboard.trends.monthlyKicker') }}
                </span>
                <h2 class="section-heading__title">{{ t('dashboard.trends.monthly') }}</h2>
                <p class="section-heading__description">
                  {{ t('dashboard.trends.monthlyDescription') }}
                </p>
              </div>
              <div class="section-heading__period">
                <n-icon :component="CalendarClearOutline" aria-hidden="true" />
                <span>{{ monthlyRangeLabel }}</span>
              </div>
            </div>
            <div class="dashboard-page__monthly-chart dashboard-page__reveal">
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
            </div>
          </section>
        </div>
      </Transition>
    </div>
  </div>
</template>

<style scoped lang="scss">
.dashboard-page {
  container: dashboard / inline-size;
  padding-bottom: var(--spacing-8);

  &__header {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: var(--spacing-8);
    margin-bottom: var(--spacing-8);
  }

  &__heading {
    min-width: 0;
  }

  &__eyebrow {
    display: inline-flex;
    align-items: center;
    gap: var(--spacing-2);
    margin-bottom: var(--spacing-2);
    font-size: var(--text-xs);
    font-weight: var(--font-semibold);
    line-height: var(--leading-none);
    color: var(--color-primary-text);
    letter-spacing: var(--tracking-wider);
    text-transform: uppercase;

    .n-icon {
      font-size: var(--text-base);
    }
  }

  &__title {
    margin: 0;
    font-size: var(--text-4xl);
    font-weight: var(--font-semibold);
    line-height: var(--leading-tight);
    color: var(--color-text);
    letter-spacing: var(--tracking-tighter);
  }

  &__subtitle {
    max-width: 62ch;
    margin: var(--spacing-2) 0 0;
    font-size: var(--text-sm);
    line-height: var(--leading-relaxed);
    color: var(--color-text-muted);
  }

  &__header-actions {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    gap: var(--spacing-3);
  }

  &__sync {
    display: flex;
    align-items: center;
    gap: var(--spacing-3);
    min-height: var(--spacing-10);
    padding: var(--spacing-2) var(--spacing-3);
    background-color: var(--color-surface);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-full);
    box-shadow: var(--shadow-elev-1);
  }

  &__sync-dot {
    width: var(--spacing-2);
    height: var(--spacing-2);
    background-color: var(--color-success);
    border-radius: var(--radius-full);
    box-shadow: 0 0 0 var(--spacing-1) color-mix(in srgb, var(--color-success) 13%, transparent);

    &.is-syncing {
      background-color: var(--color-primary);
      animation: sync-pulse var(--duration-slowest) var(--easing-ease-in-out) infinite alternate;
    }
  }

  &__sync-copy {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-1);
    line-height: var(--leading-none);

    strong {
      font-size: var(--text-xs);
      font-weight: var(--font-medium);
      color: var(--color-text);
    }

    span {
      font-size: var(--text-xs);
      color: var(--color-text-muted);
    }
  }

  &__refresh {
    min-height: var(--spacing-10);
    border-radius: var(--radius-full);
  }

  &__body {
    position: relative;
  }

  &__sections {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-10);
  }

  &__section {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-5);
  }

  &__state {
    display: grid;
    min-height: calc(var(--spacing-24) * 4);
    place-items: center;
  }

  &__trend-grid {
    display: grid;
    grid-template-columns: repeat(12, minmax(0, 1fr));
    gap: var(--spacing-card-gap);
  }

  &__trend-item {
    min-width: 0;

    &--wide {
      grid-column: span 7;
    }

    &--narrow {
      grid-column: span 5;
    }
  }

  &__monthly-chart {
    min-width: 0;
  }

  &__reveal {
    animation: card-reveal var(--motion-enter-duration) var(--motion-enter-easing) backwards;
    animation-delay: calc(var(--stagger-i, 0) * var(--stagger-step));
  }
}

.summary-panel {
  position: relative;
  overflow: hidden;
  background-color: var(--color-surface);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-2xl);
  box-shadow: var(--shadow-elev-1);

  &::before {
    position: absolute;
    top: 0;
    left: var(--spacing-6);
    z-index: 1;
    width: var(--spacing-16);
    height: 2px;
    content: '';
    background-color: var(--color-chart-1);
    border-radius: 0 0 var(--radius-full) var(--radius-full);
  }

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-5);
    padding: var(--spacing-5) var(--spacing-6);
  }

  &__kicker {
    display: block;
    margin-bottom: var(--spacing-1);
    font-size: var(--text-xs);
    font-weight: var(--font-semibold);
    line-height: var(--leading-none);
    color: var(--color-primary-text);
    letter-spacing: var(--tracking-wider);
    text-transform: uppercase;
  }

  &__title {
    margin: 0;
    font-size: var(--text-xl);
    font-weight: var(--font-semibold);
    line-height: var(--leading-tight);
    color: var(--color-text);
    letter-spacing: var(--tracking-tight);
  }

  &__date {
    display: inline-flex;
    flex-shrink: 0;
    align-items: center;
    gap: var(--spacing-2);
    min-height: var(--spacing-8);
    padding-inline: var(--spacing-3);
    font-size: var(--text-xs);
    color: var(--color-text-secondary);
    background-color: var(--color-surface-2);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-full);

    .n-icon {
      color: var(--color-primary-text);
    }
  }

  &__body {
    display: grid;
    grid-template-columns: minmax(0, 5fr) minmax(0, 8fr);
    border-top: 1px solid var(--color-border-subtle);
  }

  &__hero {
    position: relative;
    min-height: calc(var(--spacing-24) * 2 + var(--spacing-8));
    overflow: hidden;
    background-color: color-mix(in srgb, var(--color-chart-1) 5%, var(--color-surface));
    border-right: 1px solid var(--color-border-subtle);
    isolation: isolate;

    &::after {
      position: absolute;
      right: calc(-1 * var(--spacing-12));
      bottom: calc(-1 * var(--spacing-12));
      z-index: -1;
      width: calc(var(--spacing-24) * 2);
      height: calc(var(--spacing-24) * 2);
      content: '';
      border: 1px solid color-mix(in srgb, var(--color-chart-1) 18%, transparent);
      border-radius: var(--radius-full);
      box-shadow:
        0 0 0 var(--spacing-6) color-mix(in srgb, var(--color-chart-1) 5%, transparent),
        0 0 0 var(--spacing-12) color-mix(in srgb, var(--color-chart-1) 3%, transparent);
    }
  }

  &__metrics {
    display: grid;
    grid-template-columns: repeat(6, minmax(0, 1fr));
    grid-auto-rows: minmax(calc(var(--spacing-24) + var(--spacing-8)), 1fr);
    gap: 1px;
    background-color: var(--color-border-subtle);
  }

  &__metric {
    min-width: 0;
    background-color: var(--color-surface);

    &--pulse {
      grid-column: span 3;
    }

    &--stock {
      grid-column: span 2;
    }
  }
}

.section-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--spacing-6);

  &__copy {
    min-width: 0;
  }

  &__kicker {
    display: block;
    margin-bottom: var(--spacing-1);
    font-size: var(--text-xs);
    font-weight: var(--font-semibold);
    line-height: var(--leading-none);
    color: var(--color-primary-text);
    letter-spacing: var(--tracking-wider);
    text-transform: uppercase;
  }

  &__title {
    margin: 0;
    font-size: var(--text-2xl);
    font-weight: var(--font-semibold);
    line-height: var(--leading-tight);
    color: var(--color-text);
    letter-spacing: var(--tracking-tight);
  }

  &__description {
    max-width: 62ch;
    margin: var(--spacing-2) 0 0;
    font-size: var(--text-sm);
    line-height: var(--leading-relaxed);
    color: var(--color-text-muted);
  }

  &__period {
    display: inline-flex;
    flex-shrink: 0;
    align-items: center;
    gap: var(--spacing-2);
    min-height: calc(var(--spacing-8) + var(--spacing-1));
    padding-inline: var(--spacing-3);
    font-size: var(--text-xs);
    color: var(--color-text-secondary);
    background-color: var(--color-surface);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-full);
    box-shadow: var(--shadow-elev-1);

    .n-icon {
      color: var(--color-primary-text);
    }
  }
}

@keyframes card-reveal {
  from {
    opacity: 0;
    transform: translateY(var(--spacing-2));
  }
}

@keyframes sync-pulse {
  to {
    opacity: 0.35;
    transform: scale(0.78);
  }
}

@container dashboard (max-width: 64rem) {
  .dashboard-page {
    &__trend-item {
      &--wide,
      &--narrow {
        grid-column: span 6;
      }
    }
  }
}

@container dashboard (max-width: 52rem) {
  .dashboard-page {
    &__header {
      align-items: flex-start;
    }
  }

  .summary-panel {
    &__body {
      grid-template-columns: minmax(0, 1fr);
    }

    &__hero {
      min-height: calc(var(--spacing-24) * 2);
      border-right: 0;
      border-bottom: 1px solid var(--color-border-subtle);
    }
  }
}

@container dashboard (max-width: 44rem) {
  .dashboard-page {
    &__header {
      flex-direction: column;
      gap: var(--spacing-5);
    }

    &__header-actions {
      width: 100%;
    }

    &__sync {
      flex: 1;
    }

    &__sections {
      gap: var(--spacing-8);
    }

    &__trend-item {
      &--wide,
      &--narrow {
        grid-column: 1 / -1;
      }
    }
  }

  .section-heading {
    align-items: flex-start;
  }
}

@container dashboard (max-width: 34rem) {
  .dashboard-page {
    &__header-actions {
      align-items: stretch;
      flex-direction: column;
    }

    &__refresh {
      width: 100%;
    }

    &__title {
      font-size: var(--text-3xl);
    }
  }

  .summary-panel {
    &__header {
      align-items: flex-start;
      flex-direction: column;
    }

    &__metric {
      &--pulse,
      &--stock {
        grid-column: 1 / -1;
      }
    }
  }

  .section-heading {
    flex-direction: column;
    gap: var(--spacing-3);
  }
}

@media (prefers-reduced-motion: reduce) {
  .dashboard-page__reveal,
  .dashboard-page__sync-dot {
    animation: none;
  }
}
</style>
