<script setup lang="ts">
/**
 * 统计卡片组件
 * 用于展示单个统计数据
 * Requirements: 7.2, 7.3, 7.4, 7.5
 */
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { NCard, NStatistic, NNumberAnimation } from 'naive-ui'

const { t } = useI18n()

type TrendType = 'up' | 'down' | 'flat'

interface Props {
  /** 标题 */
  title: string
  /** 数值 */
  value: number
  /** 前缀 */
  prefix?: string
  /** 后缀 */
  suffix?: string
  /** 精度 */
  precision?: number
  /** 是否显示动画 */
  animated?: boolean
  /** 趋势类型 */
  trend?: TrendType
  /** 趋势值（百分比） */
  trendValue?: number
  /** 图标类型 */
  icon?: 'users' | 'videos' | 'comments' | 'views' | 'likes' | 'custom'
  /** 图标颜色 */
  iconColor?: string
  /** 是否加载中 */
  loading?: boolean
  /** 卡片大小 */
  size?: 'small' | 'medium' | 'large'
}

const props = withDefaults(defineProps<Props>(), {
  prefix: undefined,
  suffix: undefined,
  precision: 0,
  animated: true,
  trend: undefined,
  trendValue: undefined,
  icon: undefined,
  iconColor: undefined,
  loading: false,
  size: 'medium',
})

/** 趋势颜色 */
const trendColor = computed(() => {
  if (!props.trend) return undefined
  const colors: Record<TrendType, string> = {
    up: 'var(--color-success)',
    down: 'var(--color-danger)',
    flat: 'var(--color-text-muted)',
  }
  return colors[props.trend]
})

/** 趋势图标 */
const trendIcon = computed(() => {
  if (!props.trend) return null
  return props.trend === 'up' ? '↑' : props.trend === 'down' ? '↓' : '→'
})

/** 图标背景色 */
const iconBgColor = computed(() => {
  if (props.iconColor) return props.iconColor
  const colors: Record<string, string> = {
    users: 'var(--color-primary-light)',
    videos: 'var(--color-success-light)',
    comments: 'var(--color-warning-light)',
    views: 'var(--color-info-light)',
    likes: 'var(--color-danger-light)',
    custom: 'var(--color-primary-light)',
  }
  return props.icon ? colors[props.icon] : 'var(--color-primary-light)'
})

/** 图标前景色 */
const iconFgColor = computed(() => {
  const colors: Record<string, string> = {
    users: 'var(--color-primary)',
    videos: 'var(--color-success)',
    comments: 'var(--color-warning)',
    views: 'var(--color-info)',
    likes: 'var(--color-danger)',
    custom: 'var(--color-primary)',
  }
  return props.icon ? colors[props.icon] : 'var(--color-primary)'
})

/** 卡片内边距 */
const cardPadding = computed(() => {
  const paddings: Record<string, string> = {
    small: 'var(--spacing-3)',
    medium: 'var(--spacing-4)',
    large: 'var(--spacing-6)',
  }
  return paddings[props.size]
})
</script>

<template>
  <n-card
    class="stat-card"
    :class="`stat-card--${size}`"
    :content-style="{ padding: cardPadding }"
    :bordered="false"
  >
    <div class="stat-card__content">
      <!-- 图标 -->
      <div
        v-if="icon"
        class="stat-card__icon"
        :style="{ backgroundColor: iconBgColor, color: iconFgColor }"
      >
        <!-- Users Icon -->
        <svg
          v-if="icon === 'users'"
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
        <!-- Videos Icon -->
        <svg
          v-else-if="icon === 'videos'"
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <polygon points="23 7 16 12 23 17 23 7" />
          <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
        </svg>
        <!-- Comments Icon -->
        <svg
          v-else-if="icon === 'comments'"
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        <!-- Views Icon -->
        <svg
          v-else-if="icon === 'views'"
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
        <!-- Likes Icon -->
        <svg
          v-else-if="icon === 'likes'"
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path
            d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"
          />
        </svg>
        <!-- Custom slot -->
        <slot v-else name="icon" />
      </div>

      <!-- 数据 -->
      <div class="stat-card__data">
        <div class="stat-card__title">{{ title }}</div>
        <div class="stat-card__value">
          <n-statistic :value="value">
            <template v-if="prefix" #prefix>{{ prefix }}</template>
            <template v-if="suffix" #suffix>{{ suffix }}</template>
            <template #default>
              <n-number-animation
                v-if="animated && !loading"
                :from="0"
                :to="value"
                :precision="precision"
                :duration="1000"
              />
              <span v-else>{{ loading ? '-' : value.toFixed(precision) }}</span>
            </template>
          </n-statistic>
        </div>

        <!-- 趋势 -->
        <div v-if="trend && trendValue !== undefined" class="stat-card__trend">
          <span class="stat-card__trend-icon" :style="{ color: trendColor }">
            {{ trendIcon }}
          </span>
          <span class="stat-card__trend-value" :style="{ color: trendColor }">
            {{ Math.abs(trendValue).toFixed(1) }}%
          </span>
          <span class="stat-card__trend-label">{{ t('dashboard.comparison.yesterday') }}</span>
        </div>
      </div>
    </div>
  </n-card>
</template>

<style scoped lang="scss">
.stat-card {
  background-color: var(--color-surface);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-sm);
  transition: box-shadow var(--duration-fast) var(--easing-standard);

  &:hover {
    box-shadow: var(--shadow-md);
  }

  &__content {
    display: flex;
    align-items: flex-start;
    gap: var(--spacing-4);
  }

  &__icon {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    border-radius: var(--radius-lg);
  }

  &__data {
    flex: 1;
    min-width: 0;
  }

  &__title {
    font-size: var(--text-sm);
    color: var(--color-text-secondary);
    margin-bottom: var(--spacing-1);
  }

  &__value {
    font-size: var(--text-2xl);
    font-weight: 600;
    color: var(--color-text);
    line-height: 1.2;
  }

  &__trend {
    display: flex;
    align-items: center;
    gap: var(--spacing-1);
    margin-top: var(--spacing-2);
    font-size: var(--text-xs);
  }

  &__trend-icon {
    font-weight: 600;
  }

  &__trend-value {
    font-weight: 500;
  }

  &__trend-label {
    color: var(--color-text-muted);
  }

  &--small {
    .stat-card__icon {
      width: 40px;
      height: 40px;

      svg {
        width: 20px;
        height: 20px;
      }
    }

    .stat-card__value {
      font-size: var(--text-xl);
    }
  }

  &--large {
    .stat-card__icon {
      width: 56px;
      height: 56px;

      svg {
        width: 28px;
        height: 28px;
      }
    }

    .stat-card__value {
      font-size: var(--text-3xl);
    }
  }
}
</style>
