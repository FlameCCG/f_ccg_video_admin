<script setup lang="ts">
/**
 * 图表骨架屏组件
 * 用于图表加载时的占位展示
 * Requirements: 7.2, 7.3, 7.4, 7.5
 */
import { computed } from 'vue'
import { NCard, NSkeleton } from 'naive-ui'

type SkeletonType = 'stat' | 'line' | 'bar' | 'pie'

interface Props {
  /** 骨架屏类型 */
  type?: SkeletonType
  /** 高度 */
  height?: number
  /** 是否显示标题 */
  showTitle?: boolean
  /** 是否激活动画 */
  animated?: boolean
  /** 统计卡片数量（type=stat 时有效） */
  statCount?: number
}

const props = withDefaults(defineProps<Props>(), {
  type: 'line',
  height: 200,
  showTitle: true,
  animated: true,
  statCount: 4,
})

/** 统计卡片数组 */
const statItems = computed(() => Array.from({ length: props.statCount }, (_, i) => i))

/** 柱状图条数 */
const barCount = 7
const barItems = Array.from({ length: barCount }, (_, i) => i)
</script>

<template>
  <div class="chart-skeleton">
    <!-- 统计卡片骨架 -->
    <template v-if="type === 'stat'">
      <div class="chart-skeleton__stats">
        <n-card v-for="i in statItems" :key="i" class="chart-skeleton__stat-card" :bordered="false">
          <div class="chart-skeleton__stat-content">
            <n-skeleton :animated="animated" width="48px" height="48px" />
            <div class="chart-skeleton__stat-data">
              <n-skeleton :animated="animated" width="60%" height="14px" text />
              <n-skeleton :animated="animated" width="80%" height="28px" text />
              <n-skeleton :animated="animated" width="40%" height="12px" text />
            </div>
          </div>
        </n-card>
      </div>
    </template>

    <!-- 折线图骨架 -->
    <template v-else-if="type === 'line'">
      <n-card class="chart-skeleton__chart" :bordered="false">
        <template v-if="showTitle" #header>
          <n-skeleton :animated="animated" width="120px" height="20px" text />
        </template>
        <div class="chart-skeleton__line" :style="{ height: `${height}px` }">
          <!-- Y 轴 -->
          <div class="chart-skeleton__y-axis">
            <n-skeleton
              v-for="i in 5"
              :key="i"
              :animated="animated"
              width="30px"
              height="12px"
              text
            />
          </div>
          <!-- 图表区域 -->
          <div class="chart-skeleton__area">
            <svg
              width="100%"
              :height="height - 30"
              viewBox="0 0 400 170"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="skeleton-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" style="stop-color: var(--color-skeleton); stop-opacity: 0.3" />
                  <stop
                    offset="100%"
                    style="stop-color: var(--color-skeleton); stop-opacity: 0.05"
                  />
                </linearGradient>
              </defs>
              <path
                d="M0,120 Q50,100 100,80 T200,60 T300,90 T400,70 L400,170 L0,170 Z"
                fill="url(#skeleton-gradient)"
              />
              <path
                d="M0,120 Q50,100 100,80 T200,60 T300,90 T400,70"
                fill="none"
                stroke="var(--color-skeleton)"
                stroke-width="2"
              />
            </svg>
            <!-- X 轴 -->
            <div class="chart-skeleton__x-axis">
              <n-skeleton
                v-for="i in 7"
                :key="i"
                :animated="animated"
                width="40px"
                height="12px"
                text
              />
            </div>
          </div>
        </div>
      </n-card>
    </template>

    <!-- 柱状图骨架 -->
    <template v-else-if="type === 'bar'">
      <n-card class="chart-skeleton__chart" :bordered="false">
        <template v-if="showTitle" #header>
          <n-skeleton :animated="animated" width="120px" height="20px" text />
        </template>
        <div class="chart-skeleton__bar" :style="{ height: `${height}px` }">
          <!-- Y 轴 -->
          <div class="chart-skeleton__y-axis">
            <n-skeleton
              v-for="i in 5"
              :key="i"
              :animated="animated"
              width="30px"
              height="12px"
              text
            />
          </div>
          <!-- 柱状图区域 -->
          <div class="chart-skeleton__bars">
            <div
              v-for="i in barItems"
              :key="i"
              class="chart-skeleton__bar-item"
              :style="{ height: `${30 + Math.random() * 50}%` }"
            >
              <n-skeleton :animated="animated" width="100%" height="100%" />
            </div>
          </div>
        </div>
      </n-card>
    </template>

    <!-- 饼图骨架 -->
    <template v-else-if="type === 'pie'">
      <n-card class="chart-skeleton__chart" :bordered="false">
        <template v-if="showTitle" #header>
          <n-skeleton :animated="animated" width="120px" height="20px" text />
        </template>
        <div class="chart-skeleton__pie" :style="{ height: `${height}px` }">
          <div class="chart-skeleton__pie-circle">
            <n-skeleton :animated="animated" width="160px" height="160px" circle />
          </div>
          <div class="chart-skeleton__pie-legend">
            <div v-for="i in 4" :key="i" class="chart-skeleton__legend-item">
              <n-skeleton :animated="animated" width="12px" height="12px" />
              <n-skeleton :animated="animated" width="60px" height="14px" text />
              <n-skeleton :animated="animated" width="40px" height="14px" text />
            </div>
          </div>
        </div>
      </n-card>
    </template>
  </div>
</template>

<style scoped lang="scss">
.chart-skeleton {
  &__stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: var(--spacing-4);
  }

  &__stat-card {
    background-color: var(--color-surface);
    border-radius: var(--radius-card);
    box-shadow: var(--shadow-sm);
  }

  &__stat-content {
    display: flex;
    align-items: flex-start;
    gap: var(--spacing-4);
  }

  &__stat-data {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2);
  }

  &__chart {
    background-color: var(--color-surface);
    border-radius: var(--radius-card);
    box-shadow: var(--shadow-sm);
  }

  &__line,
  &__bar {
    display: flex;
    gap: var(--spacing-3);
  }

  &__y-axis {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: var(--spacing-2) 0;
  }

  &__area {
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  &__x-axis {
    display: flex;
    justify-content: space-between;
    padding-top: var(--spacing-2);
  }

  &__bars {
    flex: 1;
    display: flex;
    align-items: flex-end;
    justify-content: space-around;
    gap: var(--spacing-2);
    padding-bottom: var(--spacing-6);
  }

  &__bar-item {
    flex: 1;
    max-width: 40px;
    border-radius: var(--radius-sm) var(--radius-sm) 0 0;
    overflow: hidden;
  }

  &__pie {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-8);
  }

  &__pie-circle {
    flex-shrink: 0;
  }

  &__pie-legend {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-3);
  }

  &__legend-item {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
  }
}
</style>
