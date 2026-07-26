<script setup lang="ts">
/**
 * 统计卡片组件
 * 展示单个统计指标：分类图标 + 数值 + 环比趋势
 *
 * 四条设计约束（改动前请先读）：
 * 1. 图标用「分类色」--color-chart-1..8，不再用 success / warning / danger。
 *    语义色只表示状态：把「今日注册」画成危险红、「总评论」画成警告黄，
 *    整排卡片会长期呈报警外观，真正需要告警时反而没有色彩可用。
 *    旧实现还把语义色直接当前景色用（浅色主题 warning #ffd43b 落在
 *    #fff9db 上只有 1.35:1，等于看不见）——现在前景走 chart-N（对
 *    bg / surface 均已验证 >= 3:1），背景由 chart-N 与 surface 兑出淡色。
 * 2. 数值使用等宽数字（tabular-nums）。NNumberAnimation 是 JS 逐帧改写文本，
 *    比例数字下每一帧宽度都不同，一排卡片会在整个动画时长里横向抖动。
 * 3. NNumberAnimation 是 rAF 驱动的 JS 动画，CSS 的 prefers-reduced-motion
 *    兜不住它（全局的 animation-duration 覆盖只作用于 CSS 动画），
 *    必须在运行时用 useReducedMotion() 决定是否播放。
 * 4. 加载态由骨架屏承担，这里不再渲染 '-' 占位符：占位符 → 真实值 → 动画
 *    是三段切换，而骨架屏 → 内容只有一段。
 */
import { computed, type CSSProperties } from 'vue'
import { useI18n } from 'vue-i18n'
import { NCard, NNumberAnimation } from 'naive-ui'
import { useReducedMotion } from '@/composables/useReducedMotion'

/** 趋势方向：这是「状态」，因此用语义色 */
type TrendType = 'up' | 'down' | 'flat'

/** 内置图标 */
type StatIcon = 'users' | 'videos' | 'comments' | 'views' | 'likes' | 'custom'

/** 分类色序号，对应 --color-chart-1 .. --color-chart-8 */
type SeriesIndex = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8

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
  /** 是否播放数字滚动（减少动效偏好下会被强制关闭） */
  animated?: boolean
  /** 趋势方向 */
  trend?: TrendType
  /** 趋势值（百分比，与后端 rates 同口径） */
  trendValue?: number
  /** 趋势对比口径文案，默认「较昨日」 */
  trendLabel?: string
  /** 图标类型 */
  icon?: StatIcon
  /** 图标颜色（业务特例用，优先级高于 series） */
  iconColor?: string
  /** 分类色序号 1..8，决定图标配色 */
  series?: SeriesIndex
  /** 是否加载中（只用于停掉数字滚动，占位由骨架屏负责） */
  loading?: boolean
  /** 卡片大小 */
  size?: 'small' | 'medium' | 'large'
  /** 是否为主指标：撑满高度 + 顶部强调条 + 更大的数值 */
  hero?: boolean
  /** 数字滚动时长（ms），默认取 --duration-slowest */
  duration?: number
}

const props = withDefaults(defineProps<Props>(), {
  prefix: undefined,
  suffix: undefined,
  precision: 0,
  animated: true,
  trend: undefined,
  trendValue: undefined,
  trendLabel: undefined,
  icon: undefined,
  iconColor: undefined,
  series: 1,
  loading: false,
  size: 'medium',
  hero: false,
  duration: undefined,
})

const { t, locale } = useI18n()
const { shouldAnimate } = useReducedMotion()

/**
 * 从 CSSOM 读取时长 token 并换算成毫秒。
 * 数字滚动是 JS 动画，时长没法交给 CSS，只能把 token 读出来传进组件；
 * 否则又会变成「CSS 一套时长、JS 另一套」。
 * 兜底值与 --duration-slowest 同值，仅在拿不到 CSSOM（SSR / 测试环境）时生效；
 * 减少动效下该 token 会被压到 0ms，此时同样落回兜底值 —— 反正那种情况下
 * shouldAnimate 为 false，根本不会播放。
 */
const FALLBACK_COUNT_UP_MS = 500

function readDurationMs(name: string, fallback: number): number {
  if (typeof window === 'undefined') return fallback
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  if (!raw) return fallback
  const parsed = Number.parseFloat(raw)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return raw.endsWith('ms') ? parsed : parsed * 1000
}

/** token 时长只需读一次：时长不随主题变化 */
const tokenCountUpMs = readDurationMs('--duration-slowest', FALLBACK_COUNT_UP_MS)

/** 数字滚动时长 */
const countUpDuration = computed(() => props.duration ?? tokenCountUpMs)

/** 是否播放数字滚动 */
const playCountUp = computed(() => props.animated && !props.loading && shouldAnimate.value)

/** 强调色：图标前景 + hero 顶部条 */
const accentColor = computed(() => props.iconColor ?? `var(--color-chart-${props.series})`)

/** 趋势色：语义色的「文字版」，保证在表面上 >= 4.5:1 */
const trendTone = computed(() => {
  if (!props.trend) return undefined
  const tones: Record<TrendType, string> = {
    up: 'var(--color-success-text)',
    down: 'var(--color-danger-text)',
    flat: 'var(--color-text-muted)',
  }
  return tones[props.trend]
})

/** 趋势文案：带符号的百分比，箭头只是装饰，方向信息由符号承载 */
const trendText = computed(() => {
  if (props.trendValue === undefined) return ''
  return new Intl.NumberFormat(locale.value, {
    style: 'percent',
    signDisplay: 'exceptZero',
    maximumFractionDigits: 1,
  }).format(props.trendValue / 100)
})

/** 趋势对比口径 */
const trendLabelText = computed(() => props.trendLabel ?? t('dashboard.comparison.yesterday'))

/** 不播放动画时的静态数值：与 NNumberAnimation 的 show-separator + locale 保持一致 */
const staticValue = computed(() =>
  new Intl.NumberFormat(locale.value, {
    minimumFractionDigits: props.precision,
    maximumFractionDigits: props.precision,
  }).format(props.value)
)

/** 卡片内边距 */
const cardPadding = computed(() => {
  const paddings: Record<NonNullable<Props['size']>, string> = {
    small: 'var(--spacing-3)',
    medium: 'var(--spacing-4)',
    large: 'var(--spacing-5)',
  }
  return paddings[props.size]
})

/**
 * n-card 内容区样式。
 * 撑满高度是为了让同一行卡片底部对齐：只有部分卡片带趋势行时，
 * 不撑高会让这一排卡片高低不齐。
 */
const contentStyle = computed<CSSProperties>(() => ({
  display: 'flex',
  height: '100%',
  padding: cardPadding.value,
}))
</script>

<template>
  <n-card
    class="stat-card"
    :class="[`stat-card--${size}`, { 'is-hero': hero }]"
    :style="{ '--stat-accent': accentColor }"
    :content-style="contentStyle"
    :bordered="false"
  >
    <div class="stat-card__content">
      <!-- 图标：单一 svg 元素，尺寸与描边由 CSS 变量统一驱动 -->
      <div v-if="icon" class="stat-card__icon">
        <slot v-if="icon === 'custom'" name="icon" />
        <svg
          v-else
          class="stat-card__glyph"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <g v-if="icon === 'users'">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </g>
          <g v-else-if="icon === 'videos'">
            <polygon points="23 7 16 12 23 17 23 7" />
            <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
          </g>
          <g v-else-if="icon === 'comments'">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </g>
          <g v-else-if="icon === 'views'">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </g>
          <g v-else-if="icon === 'likes'">
            <path
              d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"
            />
          </g>
        </svg>
      </div>

      <!-- 数据 -->
      <div class="stat-card__data">
        <div class="stat-card__title">{{ title }}</div>
        <!--
          不用 n-statistic：它的 .n-statistic-value__content 自带
          font-size: var(--n-value-font-size)，会盖掉 --stat-value-size，
          于是 size / hero 的字号档位全部失效（旧实现的 --text-2xl 从未生效过），
          而且 .n-statistic-value 还带一段 margin-top: 4px。
          这里需要的只是「数字 + 可选前后缀」，自己排比跟 Naive 抢样式更干净。
        -->
        <div class="stat-card__value">
          <span v-if="prefix" class="stat-card__affix">{{ prefix }}</span>
          <n-number-animation
            v-if="playCountUp"
            :from="0"
            :to="value"
            :precision="precision"
            :duration="countUpDuration"
            :locale="locale"
            show-separator
          />
          <span v-else>{{ staticValue }}</span>
          <span v-if="suffix" class="stat-card__affix">{{ suffix }}</span>
        </div>

        <!-- 趋势 -->
        <div v-if="trend && trendValue !== undefined" class="stat-card__trend">
          <svg
            class="stat-card__trend-arrow"
            :class="`is-${trend}`"
            :style="{ color: trendTone }"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M12 20V4" />
            <path d="M5 11l7-7 7 7" />
          </svg>
          <span class="stat-card__trend-value" :style="{ color: trendTone }">{{ trendText }}</span>
          <span class="stat-card__trend-label">{{ trendLabelText }}</span>
        </div>
      </div>
    </div>
  </n-card>
</template>

<style scoped lang="scss">
@use '@/styles/transitions/interaction' as ix;

.stat-card {
  // 图标几何：全部从这里派生，避免每个 svg 各写一套 width / stroke-width
  // （全仓 113 处内联 svg 粗细不一，是「不精致」最直接的观感来源）。
  --stat-icon-box: var(--spacing-12);
  --stat-icon-glyph: var(--spacing-6);
  --stat-icon-stroke: 2;

  // 趋势箭头只有 12px：stroke-width 是 viewBox 用户单位，缩放后同样按比例变细，
  // 所以这里要比主图标粗，实际落到屏幕上约 1.5px。
  --stat-trend-stroke: 3;
  --stat-value-size: var(--text-2xl);
  --stat-gap: var(--spacing-4);

  // 撑满网格单元，让同一行卡片底部对齐
  height: 100%;
  background-color: var(--color-surface);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-elev-1);

  // 过渡声明集中在 feedback-transition，hover-lift 只给状态值
  @include ix.feedback-transition;
  @include ix.hover-lift;

  &__content {
    display: flex;
    flex: 1;
    align-items: flex-start;
    gap: var(--stat-gap);
    min-width: 0;
  }

  &__icon {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    width: var(--stat-icon-box);
    height: var(--stat-icon-box);
    color: var(--stat-accent);

    // 分类色没有配套的 -subtle 档，用 color-mix 现兑：同一个色相在浅色主题
    // 得到淡底、在深色主题得到暗底，四套主题都不需要各写一次。
    // 12% 是实测上限：pearl 最亮的 chart-3 (#c9721b) 兑到 12% 后，
    // 图标前景与底色仍有 3.09:1（图形元素的 WCAG 门槛是 3:1），再高就掉到线下。
    background-color: color-mix(in srgb, var(--stat-accent) 12%, var(--color-surface));
    border-radius: var(--radius-lg);
  }

  &__glyph {
    width: var(--stat-icon-glyph);
    height: var(--stat-icon-glyph);
    stroke-width: var(--stat-icon-stroke);
  }

  &__data {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-width: 0;
  }

  &__title {
    margin-bottom: var(--spacing-1);
    overflow: hidden;
    font-size: var(--text-sm);
    color: var(--color-text-secondary);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  // 保持行内布局（不用 flex）：NNumberAnimation 渲染出的是「整数 / 小数点 /
  // 小数」三个文本节点，flex 容器会把它们包进匿名 flex item，行为不如行内直观。
  &__value {
    font-size: var(--stat-value-size);
    font-weight: var(--font-semibold);
    line-height: var(--leading-tight);
    color: var(--color-text);

    // 等宽数字：数字滚动逐帧改写文本，比例数字下卡片宽度会跟着抖
    font-variant-numeric: tabular-nums;
    font-feature-settings: 'tnum' 1;
    letter-spacing: var(--tracking-tight);
  }

  &__affix {
    font-size: var(--text-base);
    font-weight: var(--font-normal);
    color: var(--color-text-secondary);
  }

  // margin-top: auto 让趋势行贴底，同排卡片的趋势行落在同一条基线上
  &__trend {
    display: flex;
    align-items: center;
    gap: var(--spacing-1);
    margin-top: auto;
    padding-top: var(--spacing-2);
    font-size: var(--text-xs);
  }

  &__trend-arrow {
    flex-shrink: 0;
    width: var(--spacing-3);
    height: var(--spacing-3);
    stroke-width: var(--stat-trend-stroke);

    // 一个箭头字形转出三种方向：三份 svg 必然出现粗细/尺寸漂移
    &.is-down {
      transform: rotate(180deg);
    }

    &.is-flat {
      transform: rotate(90deg);
    }
  }

  &__trend-value {
    font-weight: var(--font-medium);
    font-variant-numeric: tabular-nums;
  }

  &__trend-label {
    overflow: hidden;
    color: var(--color-text-muted);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  // 各档位的 stroke-width 按 2 × 24 ÷ 字形边长 反推，
  // 保证三档图标落到屏幕上的描边都正好 2px —— 否则同一页里
  // 小图标偏细、大图标偏粗，正是「图标粗细不统一」的来源。
  &--small {
    --stat-icon-box: var(--spacing-10);
    --stat-icon-glyph: var(--spacing-5);
    --stat-icon-stroke: 2.4;
    --stat-value-size: var(--text-xl);
    --stat-gap: var(--spacing-3);
  }

  &--large {
    --stat-icon-box: calc(var(--spacing-12) + var(--spacing-2));
    --stat-icon-glyph: calc(var(--spacing-6) + var(--spacing-1));
    --stat-icon-stroke: 1.72;
    --stat-value-size: var(--text-3xl);
  }

  // 主指标：顶部描边加粗并着上分类色，把它与同色的那条趋势线绑在一起。
  // 用 border 而不是 ::before：边框自动跟随卡片圆角，不需要 overflow: hidden，
  // 也不引入新的长度值（边框宽度本就不在 token 词汇表里，1px 边框同理）。
  &.is-hero {
    --stat-value-size: var(--text-4xl);

    border-top: 3px solid var(--stat-accent);

    .stat-card__title {
      font-size: var(--text-base);
    }
  }
}

// hover 抬升是位移动效：全局的减少动效规则只会去掉过渡，
// 不会去掉终态 —— 不显式关掉的话，卡片会「瞬移」2px。
@media (prefers-reduced-motion: reduce) {
  .stat-card:hover {
    transform: none;
  }
}
</style>
