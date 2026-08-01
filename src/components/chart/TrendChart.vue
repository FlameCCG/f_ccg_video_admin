<script setup lang="ts">
/**
 * 趋势图表组件
 * Canvas 折线 / 面积图
 *
 * 五条约束（改动前请先读）：
 * 1. 所有颜色来自 token：线走 props.color 或 --color-chart-1，网格走
 *    --color-chart-grid，坐标文字走 --color-chart-axis，数据点内芯走
 *    --color-surface。旧实现的兜底值 #4f46e5 / #999 / #eee 不属于任何一套主题，
 *    数据点内芯写死 #fff —— 在 cyberpunk 的 #05060f 上就是四个白点。
 * 2. 字体走 --font-sans + --text-xs。旧实现 ctx.font = '12px sans-serif'，
 *    于是首页四张图的坐标标签全部是 Arial，而周围 UI 是字体栈的第一顺位，
 *    这是落地页上最显眼的「廉价感」来源。
 * 3. CSSOM 读取（getComputedStyle）会强制样式重算，必须缓存：只在主题 / 颜色
 *    变化时重读，resize 重绘复用缓存。
 * 4. rAF 必须去重 + 卸载时取消。ResizeObserver 建立观察时必然回调一次，
 *    与 onMounted 的首绘叠加会让首帧画两次；不取消的 rAF 会在组件卸载后
 *    继续跑，拿着已经失效的 canvas。
 * 5. 鼠标移动不读布局：几何量在绘制时缓存下来，事件里只用 offsetX；
 *    命中的数据点索引没变就直接返回，不触发组件重渲染。
 */
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { NSpin } from 'naive-ui'
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
  /** 线条颜色（支持 var(--x) 形式），默认 --color-chart-1 */
  color?: string
  /** 是否加载中 */
  loading?: boolean
  /** 是否显示工具提示 */
  showTooltip?: boolean
  /** 无数据时的提示文案，缺省则不提示 */
  emptyText?: string
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
  emptyText: undefined,
  yMin: undefined,
  yMax: undefined,
})

const { currentTheme } = useTheme()
const { locale } = useI18n()

/** Canvas 引用 */
const canvasRef = ref<HTMLCanvasElement | null>(null)

/** 容器引用 */
const containerRef = ref<HTMLDivElement | null>(null)

/** 工具提示状态：x / y 是数据点在画布内的坐标，提示框锚定数据点而不是光标 */
const tooltip = ref({
  show: false,
  x: 0,
  y: 0,
  label: '',
  value: 0,
  rate: 0,
})

/** 是否有可绘制的数据 */
const hasPoints = computed(() => props.data.x.length > 0 && props.data.values.length > 0)

// ============================================
// 数值格式化
// ============================================

/**
 * 紧凑数字格式化。
 * 旧实现写死 'w' / 'k' 后缀，英文/日文界面下同样输出「1.2w」；
 * 交给 Intl 之后 zh-CN 得到「1.2万」、en-US 得到「1.2K」，且不需要新增文案 key。
 */
const compactFormatter = computed(
  () =>
    new Intl.NumberFormat(locale.value, {
      notation: 'compact',
      maximumFractionDigits: 1,
    })
)

/** 坐标轴用紧凑格式 */
function formatAxis(value: number): string {
  return compactFormatter.value.format(value)
}

/** 提示框用精确值：鼠标停上去就是为了看准确数字，这里不该再做量级压缩 */
const exactFormatter = computed(() => new Intl.NumberFormat(locale.value))

/** 变化率：带符号百分比，符号本身就表达了方向，不再额外画箭头 */
const percentFormatter = computed(
  () =>
    new Intl.NumberFormat(locale.value, {
      style: 'percent',
      signDisplay: 'exceptZero',
      maximumFractionDigits: 1,
    })
)

const tooltipValueText = computed(() => exactFormatter.value.format(tooltip.value.value))

// 后端 rates 已是百分数（0.5 表示 0.5%），除以 100 换回 Intl percent 需要的小数
const tooltipRateText = computed(() => percentFormatter.value.format(tooltip.value.rate / 100))

/** 卡片标题区展示末位值与真实环比，不必悬停也能读到当前状态。 */
const latestValue = computed(() => props.data.values[props.data.values.length - 1])
const latestRate = computed(() => props.data.rates?.[props.data.rates.length - 1])

const latestValueText = computed(() => {
  const value = latestValue.value
  return value === undefined ? '—' : exactFormatter.value.format(value)
})

const latestRateText = computed(() => {
  const rate = latestRate.value
  return rate === undefined ? '' : percentFormatter.value.format(rate / 100)
})

const latestRateClass = computed(() => {
  const rate = latestRate.value
  if (rate === undefined || rate === 0) return 'is-flat'
  return rate > 0 ? 'is-up' : 'is-down'
})

function parseSeriesLabel(label: string): Date | undefined {
  const normalized = /^\d{4}-\d{2}$/.test(label) ? `${label}-01` : label
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return undefined
  const date = new Date(`${normalized}T00:00:00`)
  return Number.isNaN(date.getTime()) ? undefined : date
}

/** 当前图表覆盖的时间范围，跟随语言环境格式化。 */
const rangeText = computed(() => {
  const firstLabel = props.data.x[0]
  const lastLabel = props.data.x[props.data.x.length - 1]
  if (!firstLabel || !lastLabel) return ''

  const first = parseSeriesLabel(firstLabel)
  const last = parseSeriesLabel(lastLabel)
  if (!first || !last) return `${firstLabel} — ${lastLabel}`

  const isMonthly = /^\d{4}-\d{2}$/.test(firstLabel)
  const formatter = new Intl.DateTimeFormat(locale.value, {
    year: isMonthly ? 'numeric' : undefined,
    month: 'short',
    day: isMonthly ? undefined : 'numeric',
  })
  return `${formatter.format(first)} — ${formatter.format(last)}`
})

const chartAriaLabel = computed(() => {
  const parts = [props.title, rangeText.value]
  if (latestValue.value !== undefined) parts.push(latestValueText.value)
  return parts.filter(Boolean).join('，')
})

// ============================================
// 主题色缓存
// ============================================

/** 绘制用调色板 */
interface ChartPalette {
  /** 线条 / 面积主色 */
  series: string
  /** 面积渐变（已含透明度） */
  areaTop: string
  areaBottom: string
  /** 网格线 */
  grid: string
  /** 坐标文字 */
  axis: string
  /** 数据点内芯 */
  dot: string
  /** 坐标标签字号（单独留一份用于校验 ctx.font 是否赋值成功） */
  fontSize: string
  /** 坐标标签字体（CSS font 简写） */
  font: string
}

/** 面积渐变的上下透明度 */
const AREA_ALPHA_TOP = 0.24
const AREA_ALPHA_BOTTOM = 0.02

/**
 * 给颜色附加透明度。
 * 旧实现直接拼字符串（`${color}40`），只有在色值恰好是 6 位 hex 时才成立；
 * token 一旦换成 rgb() 写法，面积渐变就会静默变成非法颜色。
 * 这里显式识别 hex / rgb()，其余情况原样返回（宁可不透明，也不要画错色）。
 */
function withAlpha(color: string, alpha: number): string {
  const input = color.trim()

  if (input.startsWith('#')) {
    const body = input.slice(1)
    // #abc / #abcd 先展开成 #aabbcc
    const full =
      body.length === 3 || body.length === 4
        ? body.slice(0, 3).replace(/./g, (ch) => ch + ch)
        : body.slice(0, 6)
    if (/^[0-9a-f]{6}$/i.test(full)) {
      const r = Number.parseInt(full.slice(0, 2), 16)
      const g = Number.parseInt(full.slice(2, 4), 16)
      const b = Number.parseInt(full.slice(4, 6), 16)
      return `rgba(${r}, ${g}, ${b}, ${alpha})`
    }
  }

  const channels = /^rgba?\(([^)]+)\)$/.exec(input)?.[1]
  if (channels) {
    const parts = channels.split(/[,/\s]+/).filter(Boolean)
    if (parts.length >= 3) {
      return `rgba(${parts.slice(0, 3).join(', ')}, ${alpha})`
    }
  }

  return input
}

/** 一次 getComputedStyle 读全部需要的 token */
function readPalette(): ChartPalette {
  const fallback: ChartPalette = {
    series: 'transparent',
    areaTop: 'transparent',
    areaBottom: 'transparent',
    grid: 'transparent',
    axis: 'transparent',
    dot: 'transparent',
    fontSize: '12px',
    font: '12px sans-serif',
  }
  if (typeof window === 'undefined') return fallback

  const style = getComputedStyle(document.documentElement)
  const read = (name: string): string => style.getPropertyValue(name).trim()

  // props.color 允许直接传 var(--x)：解析成实际色值再交给 canvas
  let series = props.color?.trim() ?? ''
  const varMatch = series.match(/^var\(\s*(--[^),\s]+)/)
  if (varMatch?.[1]) series = read(varMatch[1])
  if (!series) series = read('--color-chart-1')

  const fontSize = read('--text-xs') || '12px'
  const fontFamily = read('--font-sans') || 'sans-serif'

  return {
    series,
    areaTop: withAlpha(series, AREA_ALPHA_TOP),
    areaBottom: withAlpha(series, AREA_ALPHA_BOTTOM),
    grid: read('--color-chart-grid'),
    axis: read('--color-chart-axis'),
    dot: read('--color-surface'),
    fontSize,
    font: `${fontSize} ${fontFamily}`,
  }
}

/** 调色板缓存：只在主题 / color 变化时失效 */
let palette: ChartPalette | null = null

// ============================================
// 绘制几何
// ============================================

/** 绘制内边距（CSS px）：左侧留给 Y 轴标签，下侧留给 X 轴标签 */
const PADDING = { top: 20, right: 20, bottom: 30, left: 50 } as const

/** Y 轴分段数 */
const Y_LINES = 5

/** 数据点半径与线宽（canvas 内部几何，无法走 CSS token，集中在此处声明） */
const DOT_RADIUS = 4
const GRID_LINE_WIDTH = 1
const SERIES_LINE_WIDTH = 2

/** X 轴标签最小间距与单个标签的估算宽度 */
const LABEL_MIN_GAP = 20
const LABEL_SLOT_WIDTH = 80

/** 标签与坐标轴的间距 */
const LABEL_OFFSET = 8

/** 最近一次绘制的 CSS 像素尺寸：鼠标事件靠它换算，避免每次事件读布局 */
let geometry = { width: 0, height: 0 }

/** 最近一次绘制的数据点坐标：提示框锚定用 */
let drawnPoints: { x: number; y: number }[] = []

/** 当前命中的数据点索引 */
let hoverIndex = -1

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

/** 平滑曲线：把 points 依次连成三次贝塞尔 */
function strokeSmoothPath(
  ctx: CanvasRenderingContext2D,
  points: { x: number; y: number }[],
  minY: number,
  maxY: number
): void {
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
    cp1y = Math.max(minY, Math.min(maxY, cp1y))
    cp2y = Math.max(minY, Math.min(maxY, cp2y))

    // 进一步限制控制点：极值点或与相邻点同高时压平，避免出现波浪
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
}

/** 绘制 X 轴标签（首尾必显，中间按估算宽度抽稀） */
function drawXLabels(
  ctx: CanvasRenderingContext2D,
  labels: string[],
  xStep: number,
  chartWidth: number,
  height: number
): void {
  const maxLabels = Math.max(2, Math.floor(chartWidth / LABEL_SLOT_WIDTH))
  const xLabelStep = Math.max(1, Math.ceil(labels.length / maxLabels))
  const baseline = height - PADDING.bottom + LABEL_OFFSET

  let lastDrawnRight = -Infinity

  for (let i = 0; i < labels.length; i++) {
    const isFirst = i === 0
    const isLast = i === labels.length - 1
    if (!isFirst && !isLast && i % xLabelStep !== 0) continue

    const label = labels[i]!
    const xPos = PADDING.left + i * xStep
    const textWidth = ctx.measureText(label).width

    let align: CanvasTextAlign = 'center'
    let left = xPos - textWidth / 2
    let right = xPos + textWidth / 2

    if (isFirst) {
      align = 'left'
      left = xPos
      right = xPos + textWidth
    } else if (isLast) {
      align = 'right'
      left = xPos - textWidth
      right = xPos
    }

    if (left > lastDrawnRight + LABEL_MIN_GAP || isFirst) {
      // 非末位标签需要给末位让出位置，否则两者会叠在一起
      if (!isLast && labels.length > 1) {
        const lastLabel = labels[labels.length - 1]!
        const lastLeft =
          PADDING.left + (labels.length - 1) * xStep - ctx.measureText(lastLabel).width
        if (right > lastLeft - LABEL_MIN_GAP) continue
      }

      ctx.textAlign = align
      ctx.fillText(label, xPos, baseline)
      lastDrawnRight = right
    } else if (isLast) {
      ctx.clearRect(left - 5, height - PADDING.bottom, textWidth + 10, 20)
      ctx.textAlign = align
      ctx.fillText(label, xPos, baseline)
    }
  }
}

/** 绘制图表 */
function drawChart(): void {
  const canvas = canvasRef.value
  const container = containerRef.value
  if (!canvas || !container) return

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const rect = container.getBoundingClientRect()
  const width = rect.width
  const height = props.height
  if (width <= 0) return

  // 只在像素尺寸真的变了时才重设 backing store：赋值 canvas.width 会
  // 重新分配整块位图（1.28MB 量级）并清空状态，resize 期间每帧都做太贵。
  const dpr = window.devicePixelRatio || 1
  const pixelWidth = Math.round(width * dpr)
  const pixelHeight = Math.round(height * dpr)
  if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
    canvas.width = pixelWidth
    canvas.height = pixelHeight
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
  }

  // 用 setTransform 而不是 scale：scale 是叠乘的，一旦不再每次重设
  // canvas.width（那会顺带重置变换矩阵），scale 就会逐帧累积放大。
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, width, height)

  geometry = { width, height }

  const { x, values } = props.data
  if (x.length === 0 || values.length === 0) {
    drawnPoints = []
    return
  }

  const colors = (palette ??= readPalette())

  const chartWidth = width - PADDING.left - PADDING.right
  const chartHeight = height - PADDING.top - PADDING.bottom
  const xStep = chartWidth / (x.length - 1 || 1)
  const yScale = chartHeight / (yRange.value.max - yRange.value.min || 1)

  // 网格
  if (props.showGrid) {
    ctx.strokeStyle = colors.grid
    ctx.lineWidth = GRID_LINE_WIDTH
    for (let i = 0; i <= Y_LINES; i++) {
      const y = PADDING.top + (chartHeight / Y_LINES) * i
      ctx.beginPath()
      ctx.moveTo(PADDING.left, y)
      ctx.lineTo(width - PADDING.right, y)
      ctx.stroke()
    }
  }

  // Y 轴标签
  ctx.fillStyle = colors.axis
  // canvas 对非法的 font 简写是「静默忽略赋值」，会悄悄退回 10px sans-serif。
  // 赋值后回读校验一次，字体栈万一解析失败也至少保住字号。
  ctx.font = colors.font
  if (!ctx.font.startsWith(colors.fontSize)) {
    ctx.font = `${colors.fontSize} sans-serif`
  }
  ctx.textAlign = 'right'
  ctx.textBaseline = 'middle'
  for (let i = 0; i <= Y_LINES; i++) {
    const y = PADDING.top + (chartHeight / Y_LINES) * i
    const value = Math.round(
      yRange.value.max - ((yRange.value.max - yRange.value.min) / Y_LINES) * i
    )
    ctx.fillText(formatAxis(value), PADDING.left - LABEL_OFFSET, y)
  }

  // X 轴标签（日期简化：2026-03-01 -> 03-01）
  ctx.textBaseline = 'top'
  const displayLabels = x.map((label) =>
    /^\d{4}-\d{2}-\d{2}$/.test(label) ? label.slice(5) : label
  )
  drawXLabels(ctx, displayLabels, xStep, chartWidth, height)

  // 数据点坐标
  const points = values.map((value, i) => {
    let y = PADDING.top + chartHeight
    if (yRange.value.max > yRange.value.min) {
      y = PADDING.top + chartHeight - (value - yRange.value.min) * yScale
    }
    return { x: PADDING.left + i * xStep, y }
  })
  drawnPoints = points

  const firstPoint = points[0]
  if (!firstPoint) return

  const lastPoint = points[points.length - 1]!
  const isFlat = points.every((p) => Math.abs(p.y - firstPoint.y) < 0.1)
  const useSmooth = props.smooth && points.length > 2 && !isFlat
  const minY = PADDING.top
  const maxY = height - PADDING.bottom

  // 面积
  if (props.type === 'area') {
    const gradient = ctx.createLinearGradient(0, PADDING.top, 0, height - PADDING.bottom)
    gradient.addColorStop(0, colors.areaTop)
    gradient.addColorStop(1, colors.areaBottom)

    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.moveTo(firstPoint.x, height - PADDING.bottom)
    ctx.lineTo(firstPoint.x, firstPoint.y)
    if (useSmooth) {
      strokeSmoothPath(ctx, points, minY, maxY)
    } else {
      points.forEach((point) => ctx.lineTo(point.x, point.y))
    }
    ctx.lineTo(lastPoint.x, height - PADDING.bottom)
    ctx.closePath()
    ctx.fill()
  }

  // 折线
  ctx.strokeStyle = colors.series
  ctx.lineWidth = SERIES_LINE_WIDTH
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath()
  ctx.moveTo(firstPoint.x, firstPoint.y)
  if (useSmooth) {
    strokeSmoothPath(ctx, points, minY, maxY)
  } else {
    points.forEach((point) => ctx.lineTo(point.x, point.y))
  }
  ctx.stroke()

  // 数据点：内芯用表面色，不再是写死的白色
  if (props.showDots) {
    ctx.lineWidth = SERIES_LINE_WIDTH
    ctx.strokeStyle = colors.series
    ctx.fillStyle = colors.dot
    points.forEach((point) => {
      ctx.beginPath()
      ctx.arc(point.x, point.y, DOT_RADIUS, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
    })
  }
}

// ============================================
// 重绘调度
// ============================================

/** 待执行的 rAF 句柄，0 表示没有 */
let rafId = 0

/** 合并同一帧内的多次重绘请求 */
function scheduleDraw(): void {
  if (rafId !== 0) return
  rafId = requestAnimationFrame(() => {
    rafId = 0
    drawChart()
  })
}

/** 主题 / 颜色变化：调色板失效后重绘 */
function invalidateAndDraw(): void {
  palette = null
  scheduleDraw()
}

// 数据是整体替换的引用（上游 computed 每次产出新对象），无需 deep 遍历
watch(
  () => [
    props.data,
    props.type,
    props.height,
    props.showGrid,
    props.showDots,
    props.smooth,
    locale.value,
  ],
  scheduleDraw
)

watch([() => props.color, currentTheme], invalidateAndDraw)

let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  if (containerRef.value) {
    // 首绘完全交给 ResizeObserver：observe() 一定会投递一次初始回调。
    // 这里不能再额外 scheduleDraw —— RO 的回调在同一帧的 rAF 之后投递，
    // 两者都调用会变成「第 N 帧画一次、第 N+1 帧再画一次」。
    resizeObserver = new ResizeObserver(scheduleDraw)
    resizeObserver.observe(containerRef.value)
  } else {
    scheduleDraw()
  }
})

onUnmounted(() => {
  if (rafId !== 0) {
    cancelAnimationFrame(rafId)
    rafId = 0
  }
  resizeObserver?.disconnect()
  resizeObserver = null
  drawnPoints = []
})

// ============================================
// 交互
// ============================================

/**
 * 鼠标移动：只用 offsetX（相对事件目标的内容盒，无需读布局），
 * 命中索引不变就直接返回 —— 否则每秒 ~60 次事件都会触发一次组件重渲染。
 */
function handleMouseMove(e: MouseEvent): void {
  if (!props.showTooltip) return
  if (geometry.width <= 0 || drawnPoints.length === 0) return

  const labels = props.data.x
  const chartWidth = geometry.width - PADDING.left - PADDING.right
  const xStep = chartWidth / (labels.length - 1 || 1)
  const index = Math.round((e.offsetX - PADDING.left) / xStep)

  if (index < 0 || index >= labels.length) {
    if (hoverIndex !== -1) {
      hoverIndex = -1
      tooltip.value.show = false
    }
    return
  }

  if (index === hoverIndex) return

  const point = drawnPoints[index]
  const label = labels[index]
  const value = props.data.values[index]
  if (!point || label === undefined || value === undefined) return

  hoverIndex = index
  tooltip.value = {
    show: true,
    x: point.x,
    y: point.y,
    label,
    value,
    rate: props.data.rates?.[index] ?? 0,
  }
}

function handleMouseLeave(): void {
  hoverIndex = -1
  tooltip.value.show = false
}

/** 提示框锚点位移：走 transform，不碰 left / top，避免每次移动都触发重排 */
const anchorStyle = computed(() => ({
  transform: `translate3d(${tooltip.value.x}px, ${tooltip.value.y}px, 0)`,
}))

/** 提示框的摆放策略：智能避免左右及上下超出图表卡片边界 */
const tooltipPlacement = computed(() => {
  const x = tooltip.value.x
  const y = tooltip.value.y
  const w = geometry.width || 300

  let shiftX = '-50%'
  if (w > 0) {
    const ratioX = x / w
    if (ratioX > 0.75) {
      shiftX = '-100%'
    } else if (ratioX < 0.25) {
      shiftX = '0%'
    }
  }

  // Y 轴靠近顶部时（< 65px），提示框展示在点下方；否则展示在点上方
  const isBelow = y < 65

  return {
    shiftX,
    isBelow,
  }
})
</script>

<template>
  <section
    class="trend-chart"
    :style="{ '--trend-accent': color ?? 'var(--color-chart-1)' }"
    :aria-label="chartAriaLabel"
  >
    <header class="trend-chart__header">
      <div class="trend-chart__heading">
        <span class="trend-chart__signal" aria-hidden="true" />
        <div class="trend-chart__heading-copy">
          <h3 v-if="title" class="trend-chart__title">{{ title }}</h3>
          <span v-if="rangeText" class="trend-chart__range">{{ rangeText }}</span>
        </div>
      </div>
      <div class="trend-chart__latest">
        <strong class="trend-chart__latest-value">{{ latestValueText }}</strong>
        <span
          v-if="latestRate !== undefined"
          class="trend-chart__latest-rate"
          :class="latestRateClass"
        >
          {{ latestRateText }}
        </span>
      </div>
    </header>

    <n-spin :show="loading">
      <div
        ref="containerRef"
        class="trend-chart__container"
        :style="{ height: `${height}px` }"
        @mousemove="handleMouseMove"
        @mouseleave="handleMouseLeave"
      >
        <canvas
          ref="canvasRef"
          class="trend-chart__canvas"
          role="img"
          :aria-label="chartAriaLabel"
        />

        <!-- 无数据：避免有数据的页面里夹着一张空白画布 -->
        <div v-if="!hasPoints && emptyText && !loading" class="trend-chart__empty">
          {{ emptyText }}
        </div>

        <!-- 工具提示：锚点负责定位，内层负责进离场 -->
        <div class="trend-chart__anchor" :style="anchorStyle">
          <Transition name="tip">
            <div
              v-if="tooltip.show && showTooltip"
              class="trend-chart__tooltip"
              :class="{ 'is-below': tooltipPlacement.isBelow }"
              :style="{
                '--tip-shift-x': tooltipPlacement.shiftX,
                '--tip-shift-y': tooltipPlacement.isBelow
                  ? 'calc(-1 * var(--spacing-1))'
                  : 'var(--spacing-1)',
              }"
            >
              <div class="trend-chart__tooltip-label">{{ tooltip.label }}</div>
              <div class="trend-chart__tooltip-value">{{ tooltipValueText }}</div>
              <div v-if="tooltip.rate" class="trend-chart__tooltip-rate">
                <span :class="tooltip.rate >= 0 ? 'is-up' : 'is-down'">{{ tooltipRateText }}</span>
              </div>
            </div>
          </Transition>
        </div>
      </div>
    </n-spin>
  </section>
</template>

<style scoped lang="scss">
@use '@/styles/transitions/interaction' as ix;

.trend-chart {
  position: relative;
  height: 100%;
  overflow: hidden;
  background-color: color-mix(in srgb, var(--trend-accent) 2%, var(--color-surface));
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-elev-1);

  @include ix.feedback-transition;

  &:hover {
    border-color: color-mix(in srgb, var(--trend-accent) 24%, var(--color-border));
    box-shadow: var(--shadow-elev-2);
  }

  &::before {
    position: absolute;
    top: 0;
    left: var(--spacing-5);
    width: var(--spacing-12);
    height: 2px;
    content: '';
    background-color: var(--trend-accent);
    border-radius: 0 0 var(--radius-full) var(--radius-full);
  }

  &__header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--spacing-4);
    padding: var(--spacing-5) var(--spacing-5) var(--spacing-2);
  }

  &__heading {
    display: flex;
    align-items: flex-start;
    gap: var(--spacing-2);
    min-width: 0;
  }

  &__heading-copy {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-1);
    min-width: 0;
  }

  &__signal {
    flex-shrink: 0;
    width: var(--spacing-2);
    height: var(--spacing-2);
    margin-top: var(--spacing-1);
    background-color: var(--trend-accent);
    border-radius: var(--radius-full);
    box-shadow: 0 0 0 var(--spacing-1) color-mix(in srgb, var(--trend-accent) 14%, transparent);
  }

  &__title {
    margin: 0;
    font-size: var(--text-base);
    font-weight: var(--font-semibold);
    line-height: var(--leading-tight);
    color: var(--color-text);
  }

  &__range {
    overflow: hidden;
    font-size: var(--text-xs);
    color: var(--color-text-muted);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__latest {
    display: flex;
    flex-shrink: 0;
    align-items: baseline;
    gap: var(--spacing-2);
    font-variant-numeric: tabular-nums;
  }

  &__latest-value {
    font-size: var(--text-2xl);
    font-weight: var(--font-semibold);
    line-height: var(--leading-none);
    color: var(--color-text);
    letter-spacing: var(--tracking-tight);
  }

  &__latest-rate {
    font-size: var(--text-xs);
    font-weight: var(--font-medium);

    &.is-up {
      color: var(--color-success-text);
    }

    &.is-down {
      color: var(--color-danger-text);
    }

    &.is-flat {
      color: var(--color-text-muted);
    }
  }

  &__container {
    position: relative;
    width: 100%;
    padding: 0 var(--spacing-2) var(--spacing-3);
  }

  &__canvas {
    display: block;
    width: 100%;
  }

  &__empty {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: var(--text-sm);
    color: var(--color-text-muted);

    // 不参与命中测试，否则它会取代 canvas 成为 mousemove 的 target
    pointer-events: none;
  }

  // 零尺寸锚点：停在数据点上，提示框相对它排布，
  // 于是「定位 transform」与「进场 transform」不会互相覆盖。
  &__anchor {
    position: absolute;
    top: 0;
    left: 0;
    width: 0;
    height: 0;
    pointer-events: none;
  }

  &__tooltip {
    position: absolute;
    bottom: var(--spacing-3);
    left: 0;
    z-index: 10;
    padding: var(--spacing-2) var(--spacing-3);
    white-space: nowrap;
    background-color: var(--color-bg-elevated);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-tooltip);
    box-shadow: var(--shadow-elev-2);
    transform: translateX(var(--tip-shift-x, -50%));

    &.is-below {
      top: var(--spacing-3);
      bottom: auto;
    }
  }

  &__tooltip-label {
    margin-bottom: var(--spacing-1);
    font-size: var(--text-xs);
    color: var(--color-text-muted);
  }

  &__tooltip-value {
    font-size: var(--text-lg);
    font-weight: var(--font-semibold);
    color: var(--color-text);
    font-variant-numeric: tabular-nums;
  }

  &__tooltip-rate {
    margin-top: var(--spacing-1);
    font-size: var(--text-xs);
    font-variant-numeric: tabular-nums;

    .is-up {
      color: var(--color-success-text);
    }

    .is-down {
      color: var(--color-danger-text);
    }
  }
}

// 提示框进离场：基础态已带 translateX(var(--tip-shift-x, -50%))，进场态必须把它一起写上，
// 否则 transform 简写会把居中偏移吃掉、提示框跳到数据点右侧。
@include ix.enter-leave(
  'tip',
  translateX(var(--tip-shift-x, -50%)) translateY(var(--tip-shift-y, var(--spacing-1))),
  translateX(var(--tip-shift-x, -50%)) translateY(var(--tip-shift-y, var(--spacing-1)))
);

// 时长由 --motion-* token 统一压到 0，这里只把位移归零：
// 0ms 的过渡仍会让提示框在偏移位置闪现一帧。
@media (prefers-reduced-motion: reduce) {
  .tip-enter-from,
  .tip-leave-to {
    transform: translateX(var(--tip-shift-x, -50%));
  }
}
</style>
