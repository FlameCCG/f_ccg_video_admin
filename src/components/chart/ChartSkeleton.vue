<script setup lang="ts">
/**
 * 图表骨架屏组件
 *
 * 两条约束（改动前请先读）：
 * 1. `type="stat"` 只画「一张」统计卡片骨架，网格由调用方用与真实内容
 *    完全相同的 n-grid / span 渲染。之前骨架自己用
 *    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr))，
 *    与真实网格的列数不一致，骨架→内容不是淡入而是一次可见的重排。
 * 2. 随机柱高提到模块常量。写在模板里的 Math.random() 每次渲染都会重新取值，
 *    骨架屏会在每次父组件更新时自己抖一下。
 */
import { computed, type CSSProperties } from 'vue'
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
  /** 统计卡片尺寸（type=stat 时有效），与 StatCard 的 size 对齐 */
  size?: 'small' | 'medium' | 'large'
}

const props = withDefaults(defineProps<Props>(), {
  type: 'line',
  height: 200,
  showTitle: true,
  animated: true,
  size: 'medium',
})

/**
 * 统计卡片骨架的文本行高度。
 * n-skeleton 的 width / height 最终落成内联样式，CSS 变量插不进去，
 * 只能在 TS 侧按档位给值；这里的三档与 StatCard 的
 * 标题 / 数值 / 趋势三行字号对应（large 档按 hero 的 --text-4xl 算）。
 */
const STAT_LINE_HEIGHTS: Record<NonNullable<Props['size']>, [string, string, string]> = {
  small: ['13px', '24px', '12px'],
  medium: ['14px', '28px', '12px'],
  large: ['16px', '38px', '12px'],
}

const statLines = computed(() => STAT_LINE_HEIGHTS[props.size])

/** 统计卡片骨架的内边距：与 StatCard 的 cardPadding 逐档一致 */
const STAT_PADDINGS: Record<NonNullable<Props['size']>, string> = {
  small: 'var(--spacing-3)',
  medium: 'var(--spacing-4)',
  large: 'var(--spacing-5)',
}

const statContentStyle = computed<CSSProperties>(() => ({
  padding: STAT_PADDINGS[props.size],
}))

/** 柱状图骨架的柱高（%）：固定值，避免每次渲染重新随机 */
const BAR_HEIGHTS = [46, 72, 38, 63, 55, 80, 42] as const

/** Y 轴刻度数量 */
const Y_TICKS = 5

/** X 轴刻度数量 */
const X_TICKS = 7

/** X 轴标签占用的高度（px），与 TrendChart 的下侧留白同量级 */
const X_AXIS_STRIP = 30
</script>

<template>
  <!-- data-motion-essential：骨架屏微光是「正在加载」的唯一指示，
       减少动效偏好下不能被 base/_accessibility.scss 冻结（见该文件的豁免清单） -->
  <div class="chart-skeleton" data-motion-essential>
    <!-- 统计卡片骨架：结构与 StatCard 一一对应（图标 / 标题 / 数值 / 趋势） -->
    <template v-if="type === 'stat'">
      <n-card
        class="chart-skeleton__stat-card"
        :class="`chart-skeleton__stat-card--${size}`"
        :content-style="statContentStyle"
        :bordered="false"
      >
        <div class="chart-skeleton__stat-content">
          <!-- 尺寸放在外层容器上：n-skeleton 的 width/height 会落成内联样式，
               写在它自己的 class 里会被内联样式盖掉 -->
          <div class="chart-skeleton__stat-icon">
            <n-skeleton :animated="animated" width="100%" height="100%" />
          </div>
          <div class="chart-skeleton__stat-data">
            <n-skeleton :animated="animated" width="60%" :height="statLines[0]" text />
            <n-skeleton :animated="animated" width="80%" :height="statLines[1]" text />
            <n-skeleton :animated="animated" width="40%" :height="statLines[2]" text />
          </div>
        </div>
      </n-card>
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
              v-for="i in Y_TICKS"
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
              :height="height - X_AXIS_STRIP"
              viewBox="0 0 400 170"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <path
                d="M0,120 Q50,100 100,80 T200,60 T300,90 T400,70 L400,170 L0,170 Z"
                class="chart-skeleton__area-fill"
              />
              <path
                d="M0,120 Q50,100 100,80 T200,60 T300,90 T400,70"
                class="chart-skeleton__area-line"
              />
            </svg>
            <!-- X 轴 -->
            <div class="chart-skeleton__x-axis">
              <n-skeleton
                v-for="i in X_TICKS"
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
              v-for="i in Y_TICKS"
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
              v-for="(barHeight, i) in BAR_HEIGHTS"
              :key="i"
              class="chart-skeleton__bar-item"
              :style="{ height: `${barHeight}%` }"
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
  // 撑满网格单元：骨架与真实卡片同高，切换时不会有高度跳动
  height: 100%;

  &__stat-card,
  &__chart {
    height: 100%;
    background-color: var(--color-surface);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-card);
    box-shadow: var(--shadow-elev-1);
  }

  // 图标占位尺寸与 StatCard 的 --stat-icon-box 逐档对齐，
  // 否则骨架与内容的高度不同，切换时仍会跳一下
  &__stat-card {
    --skeleton-icon-box: var(--spacing-12);

    &--small {
      --skeleton-icon-box: var(--spacing-10);
    }

    &--large {
      --skeleton-icon-box: calc(var(--spacing-12) + var(--spacing-2));
    }
  }

  &__stat-content {
    display: flex;
    align-items: flex-start;
    gap: var(--spacing-4);
  }

  &__stat-icon {
    flex-shrink: 0;
    width: var(--skeleton-icon-box);
    height: var(--skeleton-icon-box);
  }

  &__stat-data {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: var(--spacing-2);
    min-width: 0;
  }

  // 折线骨架的填充与线条：用 token，不再依赖 svg 里的 <linearGradient id>
  // （同一页面渲染多张骨架时 id 会重复，属于无效文档）
  &__area-fill {
    fill: var(--color-skeleton);
    opacity: 0.35;
  }

  &__area-line {
    fill: none;
    stroke: var(--color-skeleton);
    stroke-width: 2;
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
    display: flex;
    flex: 1;
    flex-direction: column;
    min-width: 0;
  }

  &__x-axis {
    display: flex;
    justify-content: space-between;
    padding-top: var(--spacing-2);
  }

  &__bars {
    display: flex;
    flex: 1;
    align-items: flex-end;
    justify-content: space-around;
    gap: var(--spacing-2);
    padding-bottom: var(--spacing-6);
  }

  &__bar-item {
    flex: 1;
    max-width: var(--spacing-10);
    overflow: hidden;
    border-radius: var(--radius-sm) var(--radius-sm) 0 0;
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
