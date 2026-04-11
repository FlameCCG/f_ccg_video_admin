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

// 计算 Y 轴范围
const yRange = computed(() => {
  const values = props.data.values
  if (values.length === 0) return { min: 0, max: 100 }

  const dataMin = Math.min(...values)
  const dataMax = Math.max(...values)

  // 如果所有值都相同（比如都是0）
  if (dataMin === dataMax) {
    return {
      min: 0,
      max: dataMax === 0 ? 5 : dataMax * 2,
    }
  }

  const min = props.yMin ?? 0 // 默认 Y 轴从 0 开始，除非指定

  // 动态计算最大值，确保它是合适的整数（如 5, 10, 20, 50, 100 等）
  let max = props.yMax
  if (max === undefined) {
    const rawMax = dataMax * 1.2 // 顶部留出 20% 空间
    if (rawMax <= 5) max = 5
    else if (rawMax <= 10) max = 10
    else if (rawMax <= 20) max = 20
    else if (rawMax <= 50) max = 50
    else if (rawMax <= 100) max = 100
    else {
      // 对于更大的数，向上取整到最接近的 10, 100, 1000 等的倍数
      const magnitude = Math.pow(10, Math.floor(Math.log10(rawMax)))
      max = Math.ceil(rawMax / magnitude) * magnitude
    }
  }

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
    // 确保 Y 轴标签是整数
    const value = Math.round(
      yRange.value.max - ((yRange.value.max - yRange.value.min) / yLines) * i
    )
    ctx.fillText(formatNumber(value), padding.left - 8, y)
  }

  // 绘制 X 轴标签
  ctx.textBaseline = 'top'

  let lastDrawnRight = -1000
  const minGap = 20 // 标签之间的最小间距
  const maxLabels = Math.max(2, Math.floor(chartWidth / 80)) // 预估最大标签数
  const xLabelStep = Math.max(1, Math.ceil(x.length / maxLabels))

  // 预处理标签，简化日期显示
  const displayLabels = x.map((label) => {
    if (label.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return label.substring(5) // "2026-03-01" -> "03-01"
    }
    if (label.match(/^\d{4}-\d{2}$/)) {
      return label // 保持原样 "2026-01"
    }
    return label
  })

  for (let i = 0; i < x.length; i++) {
    const isFirst = i === 0
    const isLast = i === x.length - 1
    const isStep = i % xLabelStep === 0

    if (isFirst || isLast || isStep) {
      const label = displayLabels[i]!
      const xPos = padding.left + i * xStep
      const textWidth = ctx.measureText(label).width

      let align: CanvasTextAlign = 'center'
      let left = xPos - textWidth / 2
      let right = xPos + textWidth / 2
      let drawX = xPos

      if (isFirst) {
        align = 'left'
        left = xPos
        right = xPos + textWidth
        drawX = xPos
      } else if (isLast) {
        align = 'right'
        left = xPos - textWidth
        right = xPos
        drawX = xPos
      }

      // 检查是否与前一个绘制的标签重叠
      if (left > lastDrawnRight + minGap || isFirst) {
        // 如果不是最后一个，检查是否会与最后一个标签重叠
        if (!isLast && x.length > 1) {
          const lastLabel = displayLabels[x.length - 1]!
          const lastTextWidth = ctx.measureText(lastLabel).width
          const lastXPos = padding.left + (x.length - 1) * xStep
          const lastLeft = lastXPos - lastTextWidth
          if (right > lastLeft - minGap) {
            continue // 跳过当前标签，为最后一个标签留出空间
          }
        }

        ctx.textAlign = align
        ctx.fillText(label, drawX, height - padding.bottom + 8)
        lastDrawnRight = right
      } else if (isLast) {
        // 如果是最后一个且重叠了，清除背景并强制绘制
        ctx.clearRect(left - 5, height - padding.bottom, textWidth + 10, 20)
        ctx.textAlign = align
        ctx.fillText(label, drawX, height - padding.bottom + 8)
      }
    }
  }

  // 计算点坐标
  const points = values.map((value, i) => {
    // 处理所有值都相同且为0的情况
    let y = padding.top + chartHeight
    if (yRange.value.max > yRange.value.min) {
      y = padding.top + chartHeight - (value - yRange.value.min) * yScale
    }
    return {
      x: padding.left + i * xStep,
      y,
    }
  })

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
    ctx.lineTo(firstPoint.x, firstPoint.y)

    // 检查是否所有点都在同一条水平线上（例如所有值都是0）
    const isFlat = points.every((p) => Math.abs(p.y - points[0]!.y) < 0.1)

    if (props.smooth && points.length > 2 && !isFlat) {
      for (let i = 0; i < points.length - 1; i++) {
        const p0 = (i === 0 ? points[0] : points[i - 1])!
        const p1 = points[i]!
        const p2 = points[i + 1]!
        const p3 = (i === points.length - 2 ? points[i + 1] : points[i + 2])!

        const tension = 0.2
        const cp1x = p1.x + (p2.x - p0.x) * tension
        let cp1y = p1.y + (p2.y - p0.y) * tension
        const cp2x = p2.x - (p3.x - p1.x) * tension
        let cp2y = p2.y - (p3.y - p1.y) * tension

        // 限制控制点 Y 坐标在图表区域内，防止过度弯曲
        const minY = padding.top
        const maxY = height - padding.bottom
        cp1y = Math.max(minY, Math.min(maxY, cp1y))
        cp2y = Math.max(minY, Math.min(maxY, cp2y))

        // 进一步限制控制点，防止在极值点出现波浪
        // 如果 p1 是极值点，或者 p1 和 p2 处于同一水平线，压平控制点
        if (
          (p1.y <= p0.y && p1.y <= p2.y) ||
          (p1.y >= p0.y && p1.y >= p2.y) ||
          Math.abs(p1.y - p2.y) < 0.1
        ) {
          cp1y = p1.y
        }
        if (
          (p2.y <= p1.y && p2.y <= p3.y) ||
          (p2.y >= p1.y && p2.y >= p3.y) ||
          Math.abs(p1.y - p2.y) < 0.1
        ) {
          cp2y = p2.y
        }

        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y)
      }
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

  if (lineFirstPoint) {
    ctx.moveTo(lineFirstPoint.x, lineFirstPoint.y)

    // 检查是否所有点都在同一条水平线上（例如所有值都是0）
    const isFlat = points.every((p) => Math.abs(p.y - points[0]!.y) < 0.1)

    if (props.smooth && points.length > 2 && !isFlat) {
      for (let i = 0; i < points.length - 1; i++) {
        const p0 = (i === 0 ? points[0] : points[i - 1])!
        const p1 = points[i]!
        const p2 = points[i + 1]!
        const p3 = (i === points.length - 2 ? points[i + 1] : points[i + 2])!

        const tension = 0.2
        const cp1x = p1.x + (p2.x - p0.x) * tension
        let cp1y = p1.y + (p2.y - p0.y) * tension
        const cp2x = p2.x - (p3.x - p1.x) * tension
        let cp2y = p2.y - (p3.y - p1.y) * tension

        // 限制控制点 Y 坐标在图表区域内，防止过度弯曲
        const minY = padding.top
        const maxY = height - padding.bottom
        cp1y = Math.max(minY, Math.min(maxY, cp1y))
        cp2y = Math.max(minY, Math.min(maxY, cp2y))

        // 进一步限制控制点，防止在极值点出现波浪
        // 关键修复：当当前点和下一个点在同一水平线，或者当前点是峰值/谷值时，压平控制点
        if (
          (p1.y <= p0.y && p1.y <= p2.y) ||
          (p1.y >= p0.y && p1.y >= p2.y) ||
          Math.abs(p1.y - p2.y) < 0.1
        ) {
          cp1y = p1.y
        }
        if (
          (p2.y <= p1.y && p2.y <= p3.y) ||
          (p2.y >= p1.y && p2.y >= p3.y) ||
          Math.abs(p1.y - p2.y) < 0.1
        ) {
          cp2y = p2.y
        }

        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y)
      }
    } else {
      points.forEach((point, i) => {
        if (i === 0) ctx.moveTo(point.x, point.y)
        else ctx.lineTo(point.x, point.y)
      })
    }

    ctx.stroke()
  }

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
    white-space: nowrap;
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
