import type {
  ErrorEvent,
  MediaPlayerClass,
  MediaPlayerEvents,
  MediaPlayerSettingClass,
} from 'dashjs'

/**
 * dash.js v5 的 d.ts 把 `abr.throughput` 内的 `sampleSettings` / `ewma` 误标为必填，
 * 但 `updateSettings()` 在运行时是深合并语义，只传增量即可。
 * 这里仅为这一个子对象放开类型，避免为了过类型检查而硬编码 dash.js 的默认值。
 */
type AbrThroughputSettings = NonNullable<
  NonNullable<MediaPlayerSettingClass['streaming']>['abr']
>['throughput']

// ============================================================================
// MPEG-DASH 接入辅助（dash.js + 原生 <video>）
//
// 后端「混合模式」：resources 中同时存在 DASH 清单与各清晰度直链 MP4。
// 这里只负责「识别 DASH / 能力探测 / 按需加载并把 dash.js 挂到 <video>」三件事，
// 选流策略与降级仍由播放器组件决定，保持 MP4 既有能力不受影响。
//
// dash.js 只在「真的要播 DASH」时才加载：整包约 830KB，静态 import 会被打进
// 视频列表/审核/回收站三个路由 chunk（它们静态引用了 VideoDetailDrawer → VideoPlayer），
// 也就是仅打开列表页就要下载 + 解析整包。注意 dash.js 是单文件预压缩产物且导出表扁平，
// 改成 named import 一个字节也省不下来 —— 唯一有效的手段就是延迟加载。
// ============================================================================

import type { VideoResource } from '@/api/types'

/** 后端用 format === 'dash' 标记 DASH 清单条目（务必用 format 判断，不靠顺序）。 */
export const DASH_FORMAT = 'dash'

/**
 * 后端 DASH 封装使用的 MSE 编解码探测串（H.264 baseline + AAC-LC）。
 * 与契约一致：avc1.42E01E + mp4a.40.2。
 */
const DASH_CODEC_PROBE = 'video/mp4; codecs="avc1.42E01E,mp4a.40.2"'

/** 仅当后端把条目标记为 format === 'dash' 时才视为 DASH 流。 */
export const isDashResource = (resource?: Pick<VideoResource, 'format'> | null): boolean =>
  (resource?.format ?? '').toLowerCase() === DASH_FORMAT

/** 当前浏览器是否支持通过 MSE 播放后端 DASH 流。 */
export const isDashSupported = (): boolean => {
  if (typeof window === 'undefined') return false
  const mse = window.MediaSource
  return !!mse && typeof mse.isTypeSupported === 'function' && mse.isTypeSupported(DASH_CODEC_PROBE)
}

/**
 * 从 dash.js v5 的多种 ErrorEvent 子类型中尽可能提取人类可读的诊断信息。
 */
const formatDashError = (event: ErrorEvent): string => {
  const parts: string[] = [String(event.type)]

  const e = event as { error?: unknown; event?: unknown }

  if (typeof e.error === 'string') {
    parts.push(`kind=${e.error}`)
    const evt = e.event as { url?: unknown; message?: unknown; id?: unknown } | undefined
    if (evt) {
      if (typeof evt.url === 'string') parts.push(`url=${evt.url}`)
      if (typeof evt.message === 'string') parts.push(`msg=${evt.message}`)
      if (typeof evt.id === 'string') parts.push(`id=${evt.id}`)
    }
  } else if (e.error && typeof e.error === 'object') {
    const err = e.error as { code?: unknown; message?: unknown }
    parts.push(`code=${typeof err.code === 'number' ? err.code : '?'}`)
    if (typeof err.message === 'string') parts.push(`msg=${err.message}`)
  }

  return parts.join(' | ')
}

/** dash.js 的事件名常量表（宿主注册事件时用，避免宿主再次静态引入 dashjs）。 */
export type DashEvents = MediaPlayerEvents

/** 记忆化的 dash.js 动态 import：同一会话内最多加载一次。 */
let dashjsPromise: Promise<typeof import('dashjs')> | null = null

/**
 * 按需加载 dash.js。
 * 失败不缓存失败态，允许后续（切分P / 重开抽屉）重试。
 */
export const loadDashjs = (): Promise<typeof import('dashjs')> => {
  if (!dashjsPromise) {
    const pending = import('dashjs')
    void pending.catch(() => {
      if (dashjsPromise === pending) dashjsPromise = null
    })
    dashjsPromise = pending
  }
  return dashjsPromise
}

export interface DashPlayerOptions {
  /**
   * 本轮挂载的取消信号。
   * dash.js 加载完成时若宿主已放弃（卸载 / 换源），就不再创建实例、不再请求清单。
   */
  signal?: AbortSignal
  /** dash.js 发生致命错误（尚未起播）时回调，宿主据此降级到 MP4 直链。 */
  onFatalError?: () => void
  /**
   * dash.js 实例创建完成后回调。
   * 一并把事件名常量表传出去：宿主不必自己引入 dashjs，否则按需加载就白做了。
   */
  onDashCreated?: (dash: MediaPlayerClass, events: DashEvents) => void
}

/**
 * 将 dash.js 挂载到指定 <video> 元素上播放 MPD 清单。
 * 首次调用会动态加载 dash.js，故返回 Promise；结果为 dash.js 实例，供外部销毁。
 *
 * - 返回 null 表示「本次没挂上 DASH」（MSE 不可用 / dash.js 加载失败 / initialize 抛错 /
 *   options.signal 已取消），由宿主自行降级；此路径不触发 onFatalError，
 *   避免宿主两条兜底路径同时跑
 * - 剔除 URL 中的 response-content-type，避免 dash.js 透传给 m4s/mp4 分片导致 MSE 失败
 * - 初始 autoplay=false，由组件控制起播
 * - 「尚未起播」时的错误视为致命并回调 onFatalError，播放中途的瞬时错误由 dash.js 自行恢复
 *
 * 注意：await 期间宿主可能已卸载或换了片源，调用方必须自行判断结果是否过期，
 * 过期时对返回实例调用 destroyDashPlayer。
 */
export const attachDashToVideo = async (
  video: HTMLVideoElement,
  url: string,
  options: DashPlayerOptions = {}
): Promise<MediaPlayerClass | null> => {
  if (!window.MediaSource) return null

  let dashjs: typeof import('dashjs')
  try {
    dashjs = await loadDashjs()
  } catch (error) {
    console.error('[dash] dash.js 按需加载失败', error)
    return null
  }

  // 加载期间宿主已放弃本轮：连实例都不用建
  if (options.signal?.aborted) return null

  // 剔除 URL 中的 response-content-type
  const cleanUrl = new URL(url)
  cleanUrl.searchParams.delete('response-content-type')

  const dash = dashjs.MediaPlayer().create()
  // 与客户端一致：优先稳缓冲，避免 4K 顶档 ABR 乱切 / flush 造成卡顿
  try {
    dash.updateSettings({
      streaming: {
        buffer: {
          // dash.js v5 将 stableBufferTime 更名为 bufferTimeDefault
          bufferTimeDefault: 25,
          bufferTimeAtTopQuality: 40,
          bufferTimeAtTopQualityLongForm: 60,
          longFormContentDurationThreshold: 300,
          fastSwitchEnabled: false,
          flushBufferAtTrackSwitch: false,
          bufferToKeep: 20,
          bufferPruningInterval: 12,
        },
        abr: {
          autoSwitchBitrate: { video: true },
          limitBitrateByPortal: false,
          usePixelRatioInLimitBitrateByPortal: false,
          // dash.js v5 将 bandwidthSafetyFactor 移入 abr.throughput
          throughput: { bandwidthSafetyFactor: 0.85 } as AbrThroughputSettings,
        },
      },
    })
  } catch (error) {
    console.warn('[dash] updateSettings failed', error)
  }
  try {
    dash.initialize(video, cleanUrl.toString(), false)
  } catch (error) {
    // initialize 同步抛错（能力探测失败 / 非法清单地址）时必须销毁刚创建的实例，
    // 否则 dash.js 内部的定时器与事件总线会一直挂着；返回 null 让宿主走 MP4 兜底。
    console.error('[dash] initialize failed', error)
    destroyDashPlayer(dash)
    return null
  }

  let started = false
  dash.on(dashjs.MediaPlayer.events.PLAYBACK_STARTED, () => {
    started = true
  })

  dash.on(dashjs.MediaPlayer.events.ERROR, (event) => {
    const detail = formatDashError(event)
    console.error('[dash] error', detail, event)
    // 仅在「尚未起播」时硬降级（清单/编解码/MSE 等开播前致命错误）。
    // 播放中途的瞬时错误由 dash.js 自行恢复。
    if (started) return
    destroyDashPlayer(dash)
    options.onFatalError?.()
  })

  options.onDashCreated?.(dash, dashjs.MediaPlayer.events)
  return dash
}

/** 安全销毁 dash.js 实例（幂等）。 */
export const destroyDashPlayer = (dash: MediaPlayerClass | null): void => {
  if (!dash) return
  try {
    dash.destroy()
  } catch (error) {
    console.error('[dash] destroy failed', error)
  }
}

// ============================================================================
// DASH 清晰度切换辅助（供 Admin VideoPlayer 使用）
// ============================================================================

import type { Representation } from 'dashjs'

/** DASH 清晰度选项 */
export interface DashQualityOption {
  /** dash.js representation index（-1 = 自动 ABR） */
  dashIndex: number
  /** 显示标签（如 "1080p 高码率"、"自动"） */
  label: string
  /** 该 representation 的高度（px），用于排序 */
  height: number
  /** 该 representation 的带宽（bps），用于排序 */
  bandwidth: number
}

/**
 * 将 DASH representation 列表与后端 MP4 资源的中文标签匹配。
 * 按「高度 + 同高度内码率排名」匹配。
 */
export const buildDashLabelMap = (
  reps: Representation[],
  mp4Labels: { resolution: string; bitrate: number }[]
): Map<number, string> => {
  const result = new Map<number, string>()

  const parseHeight = (s: string): number => {
    const m = s.match(/^(\d+)[pP]/)
    return m ? Number(m[1]) : 0
  }

  // 按高度分组 MP4，组内按码率降序
  const mp4ByHeight = new Map<number, { resolution: string; bitrate: number }[]>()
  for (const l of mp4Labels) {
    const h = parseHeight(l.resolution)
    if (!mp4ByHeight.has(h)) mp4ByHeight.set(h, [])
    mp4ByHeight.get(h)!.push(l)
  }
  for (const [, items] of mp4ByHeight) items.sort((a, b) => b.bitrate - a.bitrate)

  // 按高度分组 DASH，组内按带宽降序
  const dashByHeight = new Map<number, Representation[]>()
  for (const r of reps) {
    const h = r.height || 0
    if (!dashByHeight.has(h)) dashByHeight.set(h, [])
    dashByHeight.get(h)!.push(r)
  }
  for (const [, items] of dashByHeight)
    items.sort((a, b) => (b.bandwidth || 0) - (a.bandwidth || 0))

  // 同高度内按排名一一匹配
  for (const [h, dashReps] of dashByHeight) {
    const labels = mp4ByHeight.get(h) ?? []
    for (let i = 0; i < dashReps.length; i++) {
      const rep = dashReps[i]!
      const matched = labels[i]
      const label = matched
        ? matched.resolution
        : rep.height
          ? `${rep.height}P`
          : `${Math.round((rep.bandwidth || 0) / 1000)} kbps`
      result.set(rep.index, label)
    }
  }

  return result
}

/**
 * 从 dash.js 实例获取视频清晰度列表。
 * 返回高画质在前的排序列表。
 */
export const getDashRepresentations = (
  dash: MediaPlayerClass,
  mp4Labels?: { resolution: string; bitrate: number }[]
): DashQualityOption[] => {
  let reps: Representation[]
  try {
    reps = dash.getRepresentationsByType('video')
  } catch {
    return []
  }
  if (reps.length <= 1) return []

  const labelMap = buildDashLabelMap(reps, mp4Labels ?? [])

  // 高画质在前
  const sorted = [...reps].sort(
    (a, b) => (b.height || 0) - (a.height || 0) || (b.bandwidth || 0) - (a.bandwidth || 0)
  )

  return sorted.map((rep) => ({
    dashIndex: rep.index,
    label:
      labelMap.get(rep.index) ??
      (rep.height ? `${rep.height}P` : `${Math.round((rep.bandwidth || 0) / 1000)} kbps`),
    height: rep.height || 0,
    bandwidth: rep.bandwidth || 0,
  }))
}

/**
 * 切换 DASH 到指定清晰度。
 * dashIndex = -1 表示切回自动 ABR 模式。
 */
export const setDashQuality = (dash: MediaPlayerClass, dashIndex: number): void => {
  if (dashIndex < 0) {
    // 切回自动 ABR
    dash.updateSettings({
      streaming: {
        abr: { autoSwitchBitrate: { video: true } },
        buffer: { fastSwitchEnabled: false, flushBufferAtTrackSwitch: false },
      },
    })
  } else {
    // 关闭 ABR，锁定到指定清晰度
    dash.updateSettings({
      streaming: {
        abr: { autoSwitchBitrate: { video: false } },
        buffer: { fastSwitchEnabled: false, flushBufferAtTrackSwitch: false },
      },
    })
    // 兼容 dash.js v4/v5 API
    const dashAny = dash as unknown as Record<string, unknown>
    if (typeof dashAny.setQualityFor === 'function') {
      ;(dashAny.setQualityFor as (type: string, index: number, replace: boolean) => void)(
        'video',
        dashIndex,
        true
      )
    } else {
      dash.setRepresentationForTypeByIndex('video', dashIndex, true)
    }
  }
}

/**
 * 获取当前 DASH 正在渲染的 representation 的标签。
 */
export const getCurrentDashLabel = (
  dash: MediaPlayerClass,
  labelMap: Map<number, string>
): string | null => {
  try {
    const activeRep = dash.getCurrentRepresentationForType('video')
    if (!activeRep) return null
    return labelMap.get(activeRep.index) ?? (activeRep.height ? `${activeRep.height}P` : null)
  } catch {
    return null
  }
}
