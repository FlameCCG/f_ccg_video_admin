<script setup lang="ts">
/**
 * 仪表盘页面
 * Dashboard Page - 运营总览
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6
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
  isError,
  refetch,
} = useQuery({
  queryKey: ['siteStats'],
  queryFn: getSiteStats,
  staleTime: 5 * 60 * 1000, // 5 分钟
  retry: 2,
})

/** 概览卡片配置 */
const overviewCards = computed(() => {
  const overview = stats.value?.overview
  return [
    {
      key: 'totalUsers',
      title: t('dashboard.overview.totalUsers'),
      value: overview?.totalUsers ?? 0,
      icon: 'users' as const,
    },
    {
      key: 'onlineUsers',
      title: t('dashboard.overview.onlineUsers'),
      value: overview?.onlineUsers ?? 0,
      icon: 'views' as const,
    },
    {
      key: 'totalVideos',
      title: t('dashboard.overview.totalVideos'),
      value: overview?.totalVideos ?? 0,
      icon: 'videos' as const,
    },
    {
      key: 'totalComments',
      title: t('dashboard.overview.totalComments'),
      value: overview?.totalComments ?? 0,
      icon: 'comments' as const,
    },
    {
      key: 'todayLoginUsers',
      title: t('dashboard.overview.todayLoginUsers'),
      value: overview?.todayLoginUsers ?? 0,
      icon: 'users' as const,
    },
    {
      key: 'todayRegisters',
      title: t('dashboard.overview.todayRegisters'),
      value: overview?.todayRegisters ?? 0,
      icon: 'likes' as const,
    },
  ]
})

/** 每日趋势图表配置 */
const dailyCharts = computed(() => {
  const daily = stats.value?.daily
  return [
    {
      key: 'visitUsers',
      title: t('dashboard.trends.visitUsers'),
      data: daily?.visitUsers ?? emptyTrendData,
      color: 'var(--color-primary)',
    },
    {
      key: 'publishVideos',
      title: t('dashboard.trends.publishVideos'),
      data: daily?.publishVideos ?? emptyTrendData,
      color: 'var(--color-success)',
    },
    {
      key: 'newUsers',
      title: t('dashboard.trends.newUsers'),
      data: daily?.newUsers ?? emptyTrendData,
      color: 'var(--color-warning)',
    },
  ]
})

/** 每月趋势图表配置 */
const monthlyChart = computed(() => ({
  key: 'newVideos',
  title: t('dashboard.trends.newVideos'),
  data: stats.value?.monthly?.newVideos ?? emptyTrendData,
  color: 'var(--color-info)',
}))

/** 空趋势数据 */
const emptyTrendData: TrendSeries = {
  x: [],
  values: [],
  rates: [],
}

/** 是否有数据 */
const hasData = computed(() => {
  return stats.value && stats.value.overview.totalUsers > 0
})

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
        :loading="isLoading"
        :disabled="isLoading"
        size="small"
        secondary
        @click="handleRefresh"
      >
        <template #icon>
          <n-icon>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
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

    <!-- 错误状态 -->
    <template v-if="isError">
      <app-empty
        type="error"
        :description="t('dashboard.empty.loadFailed')"
        show-action
        @action="handleRefresh"
      />
    </template>

    <!-- 加载状态 - 骨架屏 -->
    <template v-else-if="isLoading">
      <!-- 概览卡片骨架屏 -->
      <div class="dashboard-page__section">
        <h2 class="dashboard-page__section-title">{{ t('dashboard.overview.title') }}</h2>
        <chart-skeleton type="stat" :stat-count="6" />
      </div>

      <!-- 每日趋势骨架屏 -->
      <div class="dashboard-page__section">
        <h2 class="dashboard-page__section-title">{{ t('dashboard.trends.daily') }}</h2>
        <n-grid :x-gap="16" :y-gap="16" :cols="3" responsive="screen" item-responsive>
          <n-gi v-for="i in 3" :key="i" span="3 m:1">
            <chart-skeleton type="line" :height="200" />
          </n-gi>
        </n-grid>
      </div>

      <!-- 每月趋势骨架屏 -->
      <div class="dashboard-page__section">
        <h2 class="dashboard-page__section-title">{{ t('dashboard.trends.monthly') }}</h2>
        <chart-skeleton type="line" :height="240" />
      </div>
    </template>

    <!-- 数据展示 -->
    <template v-else>
      <!-- 空数据状态 -->
      <template v-if="!hasData">
        <app-empty type="default" :description="t('dashboard.empty.noData')" />
      </template>

      <!-- 有数据时展示 -->
      <template v-else>
        <!-- 概览卡片 -->
        <div class="dashboard-page__section">
          <h2 class="dashboard-page__section-title">{{ t('dashboard.overview.title') }}</h2>
          <n-grid :x-gap="16" :y-gap="16" :cols="6" responsive="screen" item-responsive>
            <n-gi v-for="card in overviewCards" :key="card.key" span="6 s:3 m:2 l:1">
              <stat-card
                :title="card.title"
                :value="card.value"
                :icon="card.icon"
                :animated="true"
              />
            </n-gi>
          </n-grid>
        </div>

        <!-- 每日趋势图表 -->
        <div class="dashboard-page__section">
          <h2 class="dashboard-page__section-title">{{ t('dashboard.trends.daily') }}</h2>
          <n-grid :x-gap="16" :y-gap="16" :cols="3" responsive="screen" item-responsive>
            <n-gi v-for="chart in dailyCharts" :key="chart.key" span="3 m:1">
              <trend-chart
                :title="chart.title"
                :data="chart.data"
                :color="chart.color"
                :height="200"
                type="area"
                :smooth="true"
                :show-dots="true"
              />
            </n-gi>
          </n-grid>
        </div>

        <!-- 每月趋势图表 -->
        <div class="dashboard-page__section">
          <h2 class="dashboard-page__section-title">{{ t('dashboard.trends.monthly') }}</h2>
          <trend-chart
            :title="monthlyChart.title"
            :data="monthlyChart.data"
            :color="monthlyChart.color"
            :height="240"
            type="area"
            :smooth="true"
            :show-dots="true"
          />
        </div>
      </template>
    </template>
  </div>
</template>

<style scoped lang="scss">
.dashboard-page {
  padding: var(--spacing-6);

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--spacing-6);
  }

  &__title {
    font-size: var(--text-2xl);
    font-weight: 600;
    color: var(--color-text);
    margin: 0;
  }

  &__section {
    margin-bottom: var(--spacing-8);

    &:last-child {
      margin-bottom: 0;
    }
  }

  &__section-title {
    font-size: var(--text-lg);
    font-weight: 500;
    color: var(--color-text);
    margin: 0 0 var(--spacing-4) 0;
  }
}
</style>
