<script setup lang="ts">
/**
 * 趋势图表组件
 * 用于展示数据趋势的折线图/面积图
 * Requirements: 7.2, 7.3, 7.4, 7.5
 */
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { NCard, NSpin } from 'naive-ui'
import { useTheme } from '@/composables/useTheme'

interface TrendData {
  /** X 轴标签 */
  x: string[]
  /** 数值 */
  values: number[]
  /** 变化率（可选） */
  rates?: number[]
}

interface Props {
  /** 图表标题 */
  title?: string
  /** 趋势数据 */
  data: TrendData
  /** 图表类型 */
  type?: 'line' | 'area' | 'bar'
  /** 图表高度 */
  height?: number
  /** 是否显示网格 */
  showGrid?: boolean
  /** 是否显示数据点 */
  showDots?: boolean
  /** 是否平滑曲线 */
  smooth?: boolean
  /** 线条颜色 */
  color?: string
  /** 是否加载中 */
  loading?: boolean
  /** 是否显示工具提示 */
  showTooltip?: boolean
  /** Y 轴最小值 */
  yMin?: number
  /** Y 轴最大值 */
  yMax?: number
}

const props = withDefaults(defineProps<Props>(), {
  title: undefined,
  type: 'area',
  height: 200,
  showGrid: true,
  showDots: true,
  smooth: true,
  color: undefined,
  loading: false,
  showTooltip: true,
  yMin: undefined,
  yMax: undefined,
})

const { currentTheme } = useTheme()

/** Canvas 引用 */
const canvasRef = ref<HTMLCanvasElement | null>(null)

/** 容器引用 */
const containerRef = ref<HTMLDivElement | null>(null)

/** 工具提示状态 */
const tooltip = ref({
  show: false,
  x: 0,
  y: 0,
  label: '',
  value: 0,
  rate: 0,
})

/** 计算 Y 轴范围 */
const yRange = computed(() => {
  const values = props.data.values
  if (values.length === 0) return { min: 0, max: 100 }

  const min = props.yMin ?? Math.min(...values) * 0.9
  const max = props.yMax ?? Math.max(...values) * 1.1

  return {
    min: Math.floor(min),
    max: Math.ceil(max),
  }
})

/** 绘制图表 */
function drawChart(): void {
  const canvas = canvasRef.value
  const container = containerRef.value
  if (!canvas || !container) return

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  // 设置 canvas 尺寸
  const rect = container.getBoundingClientRect()
  const dpr = window.devicePixelRatio || 1
  canvas.width = rect.width * dpr
  canvas.height = props.height * dpr
  canvas.style.width = `${rect.width}px`
  canvas.style.height = `${props.height}px`
  ctx.scale(dpr, dpr)

  const width = rect.width
  const height = props.height
  const padding = { top: 20, right: 20, bottom: 30, left: 50 }
  const chartWidth = width - padding.left - padding.right
  const chartHeight = height - padding.top - padding.bottom

  // 清空画布
  ctx.clearRect(0, 0, width, height)

  const { x, values } = props.data
  if (x.length === 0 || values.length === 0) return

  // 计算坐标
  const xStep = chartWidth / (x.length - 1 || 1)
  const yScale = chartHeight / (yRange.value.max - yRange.value.min || 1)

  // 获取主题颜色
  const computedStyle = getComputedStyle(document.documentElement)

  // 解析颜色值：如果是 CSS 变量则获取实际值
  let primaryColor =
    props.color || computedStyle.getPropertyValue('--color-primary').trim() || '#4f46e5'

  // 如果 color 是 CSS 变量格式，解析它
  if (primaryColor.startsWith('var(')) {
    const varMatch = primaryColor.match(/var\(([^)]+)\)/)
    if (varMatch?.[1]) {
      primaryColor = computedStyle.getPropertyValue(varMatch[1]).trim() || '#4f46e5'
    }
  }

  const textColor = computedStyle.getPropertyValue('--color-text-muted').trim() || '#999'
  const borderColor = computedStyle.getPropertyValue('--color-border-light').trim() || '#eee'

  // 绘制网格
  if (props.showGrid) {
    ctx.strokeStyle = borderColor
    ctx.lineWidth = 1

    // 水平网格线
    const yLines = 5
    for (let i = 0; i <= yLines; i++) {
      const y = padding.top + (chartHeight / yLines) * i
      ctx.beginPath()
      ctx.moveTo(padding.left, y)
      ctx.lineTo(width - padding.right, y)
      ctx.stroke()
    }
  }

  // 绘制 Y 轴标签
  ctx.fillStyle = textColor
  ctx.font = '12px sans-serif'
  ctx.textAlign = 'right'
  ctx.textBaseline = 'middle'

  const yLines = 5
  for (let i = 0; i <= yLines; i++) {
    const y = padding.top + (chartHeight / yLines) * i
    const value = yRange.value.max - ((yRange.value.max - yRange.value.min) / yLines) * i
    ctx.fillText(formatNumber(value), padding.left - 8, y)
  }

  // 绘制 X 轴标签
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'

  const xLabelStep = Math.ceil(x.length / 7) // 最多显示 7 个标签
  x.forEach((label, i) => {
    if (i % xLabelStep === 0 || i === x.length - 1) {
      const xPos = padding.left + i * xStep
      ctx.fillText(label, xPos, height - padding.bottom + 8)
    }
  })

  // 计算点坐标
  const points = values.map((value, i) => ({
    x: padding.left + i * xStep,
    y: padding.top + chartHeight - (value - yRange.value.min) * yScale,
  }))

  // 绘制面积图
  if (props.type === 'area') {
    const gradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom)
    gradient.addColorStop(0, `${primaryColor}40`)
    gradient.addColorStop(1, `${primaryColor}05`)

    ctx.fillStyle = gradient
    ctx.beginPath()

    const firstPoint = points[0]
    const lastPoint = points[points.length - 1]
    if (!firstPoint || !lastPoint) return

    ctx.moveTo(firstPoint.x, height - padding.bottom)

    if (props.smooth && points.length > 2) {
      ctx.lineTo(firstPoint.x, firstPoint.y)
      for (let i = 0; i < points.length - 1; i++) {
        const curr = points[i]
        const next = points[i + 1]
        if (!curr || !next) continue
        const xc = (curr.x + next.x) / 2
        const yc = (curr.y + next.y) / 2
        ctx.quadraticCurveTo(curr.x, curr.y, xc, yc)
      }
      ctx.lineTo(lastPoint.x, lastPoint.y)
    } else {
      points.forEach((point) => ctx.lineTo(point.x, point.y))
    }

    ctx.lineTo(lastPoint.x, height - padding.bottom)
    ctx.closePath()
    ctx.fill()
  }

  // 绘制线条
  ctx.strokeStyle = primaryColor
  ctx.lineWidth = 2
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath()

  const lineFirstPoint = points[0]
  const lineLastPoint = points[points.length - 1]

  if (props.smooth && points.length > 2 && lineFirstPoint && lineLastPoint) {
    ctx.moveTo(lineFirstPoint.x, lineFirstPoint.y)
    for (let i = 0; i < points.length - 1; i++) {
      const curr = points[i]
      const next = points[i + 1]
      if (!curr || !next) continue
      const xc = (curr.x + next.x) / 2
      const yc = (curr.y + next.y) / 2
      ctx.quadraticCurveTo(curr.x, curr.y, xc, yc)
    }
    ctx.lineTo(lineLastPoint.x, lineLastPoint.y)
  } else {
    points.forEach((point, i) => {
      if (i === 0) ctx.moveTo(point.x, point.y)
      else ctx.lineTo(point.x, point.y)
    })
  }

  ctx.stroke()

  // 绘制数据点
  if (props.showDots) {
    points.forEach((point) => {
      ctx.fillStyle = '#fff'
      ctx.beginPath()
      ctx.arc(point.x, point.y, 4, 0, Math.PI * 2)
      ctx.fill()

      ctx.strokeStyle = primaryColor
      ctx.lineWidth = 2
      ctx.stroke()
    })
  }
}

/** 格式化数字 */
function formatNumber(value: number): string {
  if (value >= 10000) {
    return `${(value / 10000).toFixed(1)}w`
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}k`
  }
  return value.toFixed(0)
}

/** 处理鼠标移动 */
function handleMouseMove(e: MouseEvent): void {
  if (!props.showTooltip || !canvasRef.value || !containerRef.value) return

  const rect = canvasRef.value.getBoundingClientRect()
  const x = e.clientX - rect.left
  const padding = { left: 50, right: 20 }
  const chartWidth = rect.width - padding.left - padding.right

  const { x: labels, values, rates } = props.data
  if (labels.length === 0) return

  const xStep = chartWidth / (labels.length - 1 || 1)
  const index = Math.round((x - padding.left) / xStep)

  if (index >= 0 && index < labels.length) {
    const label = labels[index]
    const value = values[index]
    if (label !== undefined && value !== undefined) {
      tooltip.value = {
        show: true,
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        label,
        value,
        rate: rates?.[index] ?? 0,
      }
    }
  }
}

/** 处理鼠标离开 */
function handleMouseLeave(): void {
  tooltip.value.show = false
}

/** 监听数据变化重绘 */
watch(
  () => [props.data, currentTheme.value],
  () => {
    requestAnimationFrame(drawChart)
  },
  { deep: true }
)

/** 监听窗口大小变化 */
let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  drawChart()

  if (containerRef.value) {
    resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(drawChart)
    })
    resizeObserver.observe(containerRef.value)
  }
})

onUnmounted(() => {
  resizeObserver?.disconnect()
})
</script>

<template>
  <n-card class="trend-chart" :bordered="false">
    <template v-if="title" #header>
      <span class="trend-chart__title">{{ title }}</span>
    </template>

    <n-spin :show="loading">
      <div
        ref="containerRef"
        class="trend-chart__container"
        :style="{ height: `${height}px` }"
        @mousemove="handleMouseMove"
        @mouseleave="handleMouseLeave"
      >
        <canvas ref="canvasRef" class="trend-chart__canvas" />

        <!-- 工具提示 -->
        <Transition name="fade">
          <div
            v-if="tooltip.show && showTooltip"
            class="trend-chart__tooltip"
            :style="{ left: `${tooltip.x}px`, top: `${tooltip.y - 60}px` }"
          >
            <div class="trend-chart__tooltip-label">{{ tooltip.label }}</div>
            <div class="trend-chart__tooltip-value">{{ formatNumber(tooltip.value) }}</div>
            <div v-if="tooltip.rate" class="trend-chart__tooltip-rate">
              <span :class="tooltip.rate >= 0 ? 'is-up' : 'is-down'">
                {{ tooltip.rate >= 0 ? '↑' : '↓' }} {{ Math.abs(tooltip.rate).toFixed(1) }}%
              </span>
            </div>
          </div>
        </Transition>
      </div>
    </n-spin>
  </n-card>
</template>

<style scoped lang="scss">
.trend-chart {
  background-color: var(--color-surface);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-sm);

  &__title {
    font-size: var(--text-base);
    font-weight: 500;
    color: var(--color-text);
  }

  &__container {
    position: relative;
    width: 100%;
  }

  &__canvas {
    display: block;
    width: 100%;
  }

  &__tooltip {
    position: absolute;
    padding: var(--spacing-2) var(--spacing-3);
    background-color: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-md);
    pointer-events: none;
    transform: translateX(-50%);
    z-index: 10;
  }

  &__tooltip-label {
    font-size: var(--text-xs);
    color: var(--color-text-muted);
    margin-bottom: var(--spacing-1);
  }

  &__tooltip-value {
    font-size: var(--text-lg);
    font-weight: 600;
    color: var(--color-text);
  }

  &__tooltip-rate {
    font-size: var(--text-xs);
    margin-top: var(--spacing-1);

    .is-up {
      color: var(--color-success);
    }

    .is-down {
      color: var(--color-danger);
    }
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity var(--duration-fast) var(--easing-standard);
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
