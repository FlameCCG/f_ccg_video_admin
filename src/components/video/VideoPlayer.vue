<script setup lang="ts">
/**
 * 高级视频播放器组件
 * Advanced Video Player Component
 * 支持：分P切换、清晰度选择(DASH优先/MP4兜底)、全屏、音量控制、进度条、快捷键
 */
import { ref, computed, watch, onMounted, onUnmounted, nextTick, h } from 'vue'
import { useI18n } from 'vue-i18n'
import { NButton, NSlider, NDropdown, NIcon, NTooltip, NSpin, NTag } from 'naive-ui'
import type { DropdownOption } from 'naive-ui'
import {
  PlayCircle,
  PauseCircle,
  VolumeHigh,
  VolumeMute,
  Expand,
  Contract,
  Settings,
  List,
  ChevronForward,
  ChevronBack,
} from '@vicons/ionicons5'
import type { VideoResource, VideoPart } from '@/api/types'
// 只保留类型导入（编译期擦除）：dash.js 整包由 @/utils/dash 在真正要播 DASH 时动态加载，
// 这里一旦出现值导入（import * as dashjs）就会把 830KB 重新钉回视频列表的路由 chunk。
import type { MediaPlayerClass } from 'dashjs'
import {
  isDashResource,
  isDashSupported,
  attachDashToVideo,
  destroyDashPlayer,
  getDashRepresentations,
  setDashQuality,
  buildDashLabelMap,
  type DashQualityOption,
} from '@/utils/dash'

interface Props {
  resources: VideoResource[]
  parts?: VideoPart[]
  poster?: string
  autoplay?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  parts: () => [],
  poster: '',
  autoplay: false,
})

const emit = defineEmits<{
  partChange: [partIndex: number]
}>()

const { t } = useI18n()

const videoRef = ref<HTMLVideoElement | null>(null)
const playerRef = ref<HTMLDivElement | null>(null)

const isPlaying = ref(false)
const isLoading = ref(true)
const isBuffering = ref(false)
const currentTime = ref(0)
const duration = ref(0)
const buffered = ref(0)
const volume = ref(1)
const isMuted = ref(false)
const isFullscreen = ref(false)
const showControls = ref(true)
const playbackRate = ref(1)

const currentPartIndex = ref(0)
const currentQualityIndex = ref(0)

/** 播放中鼠标静止多久后自动隐藏控制条（ms） */
const CONTROLS_HIDE_DELAY = 3000

let controlsTimer: ReturnType<typeof setTimeout> | null = null

// ---- DASH 运行时状态 ----
let dashInstance: MediaPlayerClass | null = null
// 运行期是否禁用 DASH：致命错误后在「本视频内」降级到 MP4
let dashDisabled = false
// 跨「DASH→MP4 兜底」保留的续播位置
let pendingSeekTime: number | null = null
// 当前是否在使用 DASH 播放
const isDashActive = ref(false)
// DASH 清晰度菜单选项
const dashQualityOptions = ref<DashQualityOption[]>([])
// 当前是否为 DASH 自动 ABR 模式
const isDashAuto = ref(true)
// 当前 DASH 清晰度标签（用于按钮显示）
const currentDashLabel = ref('')
// DASH label map for matching
let dashLabelMap = new Map<number, string>()

// ---- 本轮播放初始化的生命周期 ----
// <video> 元素与组件同生共死，而「续播 / 自动起播」用的 canplay 监听器只在自己触发时
// 才解绑：一旦 canplay 迟迟不来（快速切分P、清单报错、抽屉中途关闭），监听器就会在同一个
// <video> 上不断堆积。这里用一个 AbortController 代表「当前这一轮初始化」：
// 下一轮开始或组件卸载时 abort，既回收残留监听器，也作废尚未 resolve 的异步回调。
let playbackAbort: AbortController | null = null
// DASH 致命错误后「脱离错误回调栈」重建播放的定时器句柄
let fallbackTimer: ReturnType<typeof window.setTimeout> | null = null

const isMultiPart = computed(() => props.parts.length > 1)

const currentPart = computed(() => {
  if (isMultiPart.value && props.parts[currentPartIndex.value]) {
    return props.parts[currentPartIndex.value]
  }
  return null
})

const allResources = computed(() => {
  if (currentPart.value?.resources?.length) {
    return currentPart.value.resources
  }
  return props.resources
})

// DASH 清单条目：用 format 判断
const dashResource = computed(() => allResources.value.find(isDashResource))

// 各清晰度直链 MP4（排除 DASH）
const mp4Resources = computed(() => allResources.value.filter((r) => !isDashResource(r)))

// 本次是否走 DASH：有 DASH 清单 + 浏览器支持 + 未被运行期禁用
const shouldUseDash = (): boolean => !!dashResource.value && isDashSupported() && !dashDisabled

// MP4 模式使用的资源列表（排除 DASH）
const availableResources = computed(() => mp4Resources.value)

const currentResource = computed(() => {
  return availableResources.value[currentQualityIndex.value] || availableResources.value[0]
})

// 取「最佳」MP4：DASH 致命失败兜底用（优先源视频，否则最高码率）
const pickBestMp4 = (): VideoResource | undefined => {
  const list = mp4Resources.value
  if (!list.length) return undefined
  const source = list.find((r) => r.isSource)
  if (source) return source
  return [...list].sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0]
}

const videoUrl = computed(() => {
  // DASH 模式下 URL 由 dash.js 管理，不设 src
  if (isDashActive.value) return ''
  return currentResource.value?.fileUrl || ''
})

const qualityOptions = computed(() => {
  return availableResources.value.map((res, index) => ({
    label: res.resolution + (res.isVip ? ' (VIP)' : ''),
    key: index,
  }))
})

// DASH 模式下的清晰度下拉选项
const dashDropdownOptions = computed(() => {
  const autoOption = {
    label: currentDashLabel.value
      ? `${t('video.player.dashAuto')}(${currentDashLabel.value})`
      : t('video.player.dashAuto'),
    key: -1,
  }
  const qualityItems = dashQualityOptions.value.map((opt) => ({
    label: opt.label,
    key: opt.dashIndex,
  }))
  return [autoOption, ...qualityItems]
})

// 当前 DASH 清晰度按钮的显示文本
const dashQualityButtonLabel = computed(() => {
  if (isDashAuto.value) {
    return currentDashLabel.value
      ? `${t('video.player.dashAuto')}(${currentDashLabel.value})`
      : t('video.player.dashAuto')
  }
  return currentDashLabel.value || t('video.player.quality')
})

const rateOptions = [
  { label: '0.5x', key: 0.5 },
  { label: '0.75x', key: 0.75 },
  { label: '1.0x', key: 1 },
  { label: '1.25x', key: 1.25 },
  { label: '1.5x', key: 1.5 },
  { label: '2.0x', key: 2 },
]

const partOptions = computed<DropdownOption[]>(() => {
  return props.parts.map((p, i) => ({
    label: `P${i + 1} ${p.title}`,
    key: i,
  }))
})

/** 渲染分P下拉选项，高亮当前播放项 */
function renderPartLabel(option: DropdownOption) {
  const isActive = option.key === currentPartIndex.value
  return h(
    'span',
    {
      style: {
        color: isActive ? 'var(--color-primary)' : undefined,
        fontWeight: isActive ? '600' : undefined,
        maxWidth: '200px',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        display: 'block',
      },
      title: String(option.label),
    },
    String(option.label)
  )
}

function formatTime(seconds: number): string {
  if (!seconds || isNaN(seconds)) return '0:00'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }
  return `${m}:${s.toString().padStart(2, '0')}`
}

/**
 * 起播。自动播放被浏览器策略拒绝（未静音 / 无用户手势）是常态，
 * 不吞掉的话每次打开抽屉都会抛一个 unhandled rejection。
 */
function safePlay(video: HTMLVideoElement): void {
  void video.play().catch(() => {
    // 保持暂停态，等用户点击播放
  })
}

function togglePlay(): void {
  if (!videoRef.value) return
  if (isPlaying.value) {
    videoRef.value.pause()
  } else {
    safePlay(videoRef.value)
  }
}

function toggleMute(): void {
  if (!videoRef.value) return
  isMuted.value = !isMuted.value
  videoRef.value.muted = isMuted.value
}

function handleVolumeChange(val: number): void {
  if (!videoRef.value) return
  volume.value = val
  videoRef.value.volume = val
  isMuted.value = val === 0
}

function handleProgressChange(val: number): void {
  if (!videoRef.value) return
  videoRef.value.currentTime = val
  currentTime.value = val
}

async function toggleFullscreen(): Promise<void> {
  if (!playerRef.value) return
  try {
    if (!document.fullscreenElement) {
      await playerRef.value.requestFullscreen()
      isFullscreen.value = true
    } else {
      await document.exitFullscreen()
      isFullscreen.value = false
    }
  } catch {
    // ignore
  }
}

function handleQualityChange(key: number): void {
  // DASH 模式下走 DASH 清晰度切换
  if (isDashActive.value) return

  const savedTime = currentTime.value
  const wasPlaying = isPlaying.value
  currentQualityIndex.value = key

  void nextTick(() => {
    if (videoRef.value) {
      videoRef.value.currentTime = savedTime
      if (wasPlaying) {
        safePlay(videoRef.value)
      }
    }
  })
}

function handleDashQualityChange(key: number): void {
  if (!dashInstance) return
  setDashQuality(dashInstance, key)
  isDashAuto.value = key < 0
  if (key >= 0) {
    const opt = dashQualityOptions.value.find((o) => o.dashIndex === key)
    currentDashLabel.value = opt?.label || ''
  }
}

function handleRateChange(key: number): void {
  if (!videoRef.value) return
  playbackRate.value = key
  videoRef.value.playbackRate = key
}

function switchPart(index: number): void {
  if (index < 0 || index >= props.parts.length) return
  if (index === currentPartIndex.value) return // 已经是当前分P，不重复切换

  // 先暂停当前视频
  if (videoRef.value) {
    videoRef.value.pause()
  }

  // 中断上一轮初始化 + 销毁旧 DASH 实例
  abortPendingPlayback()
  cleanupDash()

  // 分P切换允许重新尝试 DASH
  dashDisabled = false
  pendingSeekTime = null

  currentPartIndex.value = index
  currentQualityIndex.value = findBestQuality()
  currentTime.value = 0
  duration.value = 0
  buffered.value = 0
  isLoading.value = true
  emit('partChange', index)

  void nextTick(() => {
    initPlayback()
  })
}

function prevPart(): void {
  if (currentPartIndex.value > 0) {
    switchPart(currentPartIndex.value - 1)
  }
}

function nextPart(): void {
  if (currentPartIndex.value < props.parts.length - 1) {
    switchPart(currentPartIndex.value + 1)
  }
}

function findBestQuality(): number {
  const resources = availableResources.value
  const idx1080 = resources.findIndex((r) => r.resolution.includes('1080p') && !r.isVip)
  if (idx1080 !== -1) return idx1080
  const idxFree = resources.findIndex((r) => !r.isVip)
  if (idxFree !== -1) return idxFree
  return 0
}

// ---- DASH 挂载 / 销毁 / 降级 ----

function cleanupDash(): void {
  if (dashInstance) {
    destroyDashPlayer(dashInstance)
    dashInstance = null
  }
  isDashActive.value = false
}

/**
 * 中断上一轮初始化：
 * 解绑其挂在 <video> 上的一次性监听器、作废其异步回调、清掉待执行的兜底重建。
 */
function abortPendingPlayback(): void {
  playbackAbort?.abort()
  playbackAbort = null
  if (fallbackTimer !== null) {
    window.clearTimeout(fallbackTimer)
    fallbackTimer = null
  }
}

/**
 * DASH 致命失败兜底：切到最佳 MP4 直链，保留播放进度。
 */
function handleDashFatal(): void {
  const best = pickBestMp4()
  if (!best) {
    console.error('[VideoPlayer] DASH 播放失败，且没有可用的 MP4 备用源')
    return
  }
  pendingSeekTime = currentTime.value
  dashDisabled = true
  cleanupDash()

  // 找到最佳 MP4 在 availableResources 中的索引
  const idx = availableResources.value.findIndex((r) => r.id === best.id)
  currentQualityIndex.value = idx >= 0 ? idx : 0

  // 脱离错误回调栈再重建（句柄留存：卸载 / 下一轮初始化时清掉）
  fallbackTimer = window.setTimeout(() => {
    fallbackTimer = null
    initPlayback()
  }, 0)
}

/**
 * 启动 DASH 播放：按需加载 dash.js → 挂载到 <video> → 续播 / 起播。
 * dash.js 是动态加载的，await 期间组件可能已卸载或已换源，一律以 signal 判定本轮是否作废。
 */
async function startDashPlayback(
  video: HTMLVideoElement,
  url: string,
  signal: AbortSignal
): Promise<void> {
  const dash = await attachDashToVideo(video, url, {
    signal,
    onFatalError: () => {
      // 本轮已作废就不要再触发兜底（否则会和新一轮初始化互相踩）
      if (signal.aborted) return
      handleDashFatal()
    },
    onDashCreated: (dash, events) => {
      // 等 dash.js 解析完清单后构建清晰度菜单
      const buildMenu = (): void => {
        if (signal.aborted) return
        const mp4Labels = mp4Resources.value.map((r) => ({
          resolution: r.resolution,
          bitrate: r.bitrate,
        }))
        const options = getDashRepresentations(dash, mp4Labels)
        dashQualityOptions.value = options
        // 构建 label map 以追踪 ABR 自动切换时的当前清晰度
        try {
          const reps = dash.getRepresentationsByType('video')
          dashLabelMap = buildDashLabelMap(reps, mp4Labels)
        } catch {
          // ignore
        }
        // 初始化时获取当前渲染清晰度
        try {
          const activeRep = dash.getCurrentRepresentationForType('video')
          if (activeRep) {
            currentDashLabel.value =
              dashLabelMap.get(activeRep.index) ?? (activeRep.height ? `${activeRep.height}P` : '')
          }
        } catch {
          // ignore
        }
      }
      dash.on(events.STREAM_INITIALIZED, buildMenu)
      if (dash.isReady()) buildMenu()

      // 监听 ABR 自动切换，更新当前清晰度标签
      dash.on(
        events.QUALITY_CHANGE_RENDERED,
        (e: { mediaType: string; newRepresentation?: { index: number; height?: number } }) => {
          if (signal.aborted) return
          if (e.mediaType !== 'video' || !e.newRepresentation) return
          const rep = e.newRepresentation
          const label = dashLabelMap.get(rep.index) ?? (rep.height ? `${rep.height}P` : '')
          if (isDashAuto.value) {
            currentDashLabel.value = label
          }
        }
      )
    },
  })

  if (signal.aborted || dashDisabled) {
    // 本轮已作废：组件卸载 / 切分P / 换源（signal），
    // 或 dash.js 在 initialize 阶段就同步抛出致命错误并已走过兜底（dashDisabled）。
    // 直接销毁刚创建的实例，不回写任何状态。
    destroyDashPlayer(dash)
    return
  }

  dashInstance = dash

  if (!dash) {
    // 返回 null 说明 MSE 不可用或 dash.js 加载失败，立即降级
    isDashActive.value = false
    dashDisabled = true
    fallbackToMp4(video, signal)
    return
  }

  // 续播
  const seekTo = pendingSeekTime
  pendingSeekTime = null
  if (seekTo && seekTo > 0) {
    video.addEventListener(
      'canplay',
      () => {
        video.currentTime = seekTo
      },
      { once: true, signal }
    )
  }

  // DASH 自动 ABR，自动播放
  video.addEventListener(
    'canplay',
    () => {
      safePlay(video)
    },
    { once: true, signal }
  )
}

/**
 * 初始化播放：优先 DASH，不可用时 MP4。
 * 同时处理续播位置。
 */
function initPlayback(): void {
  // 先中断上一轮：避免一次性监听器堆积、也避免旧的异步回调回写状态
  abortPendingPlayback()
  if (!videoRef.value) return

  const video = videoRef.value
  const abort = new AbortController()
  playbackAbort = abort
  const { signal } = abort

  if (shouldUseDash() && dashResource.value) {
    isDashActive.value = true
    isDashAuto.value = true
    currentDashLabel.value = ''
    dashQualityOptions.value = []
    dashLabelMap = new Map<number, string>()

    void startDashPlayback(video, dashResource.value.fileUrl, signal).catch((error: unknown) => {
      console.error('[VideoPlayer] DASH 初始化异常', error)
      if (signal.aborted) return
      isDashActive.value = false
      dashDisabled = true
      fallbackToMp4(video, signal)
    })
  } else {
    fallbackToMp4(video, signal)
  }
}

/** 降级到 MP4 直链播放（signal 用于把一次性监听器绑定到本轮初始化）。 */
function fallbackToMp4(video: HTMLVideoElement, signal: AbortSignal): void {
  isDashActive.value = false

  // 续播
  const seekTo = pendingSeekTime
  pendingSeekTime = null

  video.load()

  video.addEventListener(
    'canplay',
    () => {
      if (seekTo && seekTo > 0) {
        video.currentTime = seekTo
      }
      safePlay(video)
    },
    { once: true, signal }
  )
}

function showControlsBar(): void {
  showControls.value = true
  resetControlsTimer()
}

function resetControlsTimer(): void {
  if (controlsTimer) {
    clearTimeout(controlsTimer)
  }
  if (isPlaying.value) {
    controlsTimer = setTimeout(() => {
      showControls.value = false
    }, CONTROLS_HIDE_DELAY)
  }
}

function onPlay(): void {
  isPlaying.value = true
  resetControlsTimer()
}

function onPause(): void {
  isPlaying.value = false
  showControls.value = true
}

function onTimeUpdate(): void {
  if (!videoRef.value) return
  currentTime.value = videoRef.value.currentTime
}

function onDurationChange(): void {
  if (!videoRef.value) return
  duration.value = videoRef.value.duration
}

function onProgress(): void {
  if (!videoRef.value) return
  const buf = videoRef.value.buffered
  if (buf.length > 0) {
    buffered.value = buf.end(buf.length - 1)
  }
}

function onLoadStart(): void {
  isLoading.value = true
}

function onCanPlay(): void {
  isLoading.value = false
}

function onWaiting(): void {
  isBuffering.value = true
}

function onPlaying(): void {
  isBuffering.value = false
}

function onEnded(): void {
  isPlaying.value = false
  if (isMultiPart.value && currentPartIndex.value < props.parts.length - 1) {
    nextPart()
  }
}

function handleKeydown(e: KeyboardEvent): void {
  if (!videoRef.value) return
  switch (e.code) {
    case 'Space':
      e.preventDefault()
      togglePlay()
      break
    case 'ArrowLeft':
      e.preventDefault()
      videoRef.value.currentTime = Math.max(0, currentTime.value - 5)
      break
    case 'ArrowRight':
      e.preventDefault()
      videoRef.value.currentTime = Math.min(duration.value, currentTime.value + 5)
      break
    case 'ArrowUp':
      e.preventDefault()
      handleVolumeChange(Math.min(1, volume.value + 0.1))
      break
    case 'ArrowDown':
      e.preventDefault()
      handleVolumeChange(Math.max(0, volume.value - 0.1))
      break
    case 'KeyF':
      e.preventDefault()
      void toggleFullscreen()
      break
    case 'KeyM':
      e.preventDefault()
      toggleMute()
      break
  }
}

function onFullscreenChange(): void {
  isFullscreen.value = !!document.fullscreenElement
}

onMounted(() => {
  currentQualityIndex.value = findBestQuality()
  document.addEventListener('fullscreenchange', onFullscreenChange)

  // 初始化播放（DASH 优先，MP4 兜底）
  void nextTick(() => {
    initPlayback()
  })
})

onUnmounted(() => {
  // 一次性监听器 / 待执行的兜底重建 / dash.js 实例 / 控制条定时器 / 全屏监听：全部释放
  abortPendingPlayback()
  cleanupDash()
  if (controlsTimer) {
    clearTimeout(controlsTimer)
    controlsTimer = null
  }
  document.removeEventListener('fullscreenchange', onFullscreenChange)
})

watch(
  // 新数组必然改变引用，无需 deep（深比较在多分P长列表上纯属浪费）
  () => props.resources,
  () => {
    // 资源变化时重新初始化（允许重新尝试 DASH）
    abortPendingPlayback()
    cleanupDash()
    dashDisabled = false
    pendingSeekTime = null
    currentQualityIndex.value = findBestQuality()
    void nextTick(() => {
      initPlayback()
    })
  }
)

// 暴露方法给父组件
defineExpose({
  switchPart,
})
</script>

<template>
  <div
    ref="playerRef"
    class="video-player"
    :class="{ 'video-player--fullscreen': isFullscreen }"
    tabindex="0"
    @mousemove="showControlsBar"
    @mouseleave="resetControlsTimer"
    @keydown="handleKeydown"
  >
    <video
      ref="videoRef"
      class="video-player__video"
      :src="isDashActive ? undefined : videoUrl"
      :poster="poster"
      :autoplay="autoplay"
      preload="metadata"
      @play="onPlay"
      @pause="onPause"
      @timeupdate="onTimeUpdate"
      @durationchange="onDurationChange"
      @progress="onProgress"
      @loadstart="onLoadStart"
      @canplay="onCanPlay"
      @waiting="onWaiting"
      @playing="onPlaying"
      @ended="onEnded"
      @click="togglePlay"
    />

    <Transition name="fade">
      <div v-if="isLoading || isBuffering" class="video-player__loading">
        <n-spin size="large" />
      </div>
    </Transition>

    <Transition name="fade">
      <div v-if="!isPlaying && !isLoading" class="video-player__play-overlay" @click="togglePlay">
        <div class="video-player__play-btn">
          <n-icon :size="64">
            <PlayCircle />
          </n-icon>
        </div>
      </div>
    </Transition>

    <Transition name="slide-up">
      <div v-show="showControls" class="video-player__controls">
        <div class="video-player__progress">
          <n-slider
            :value="currentTime"
            :max="duration || 100"
            :step="0.1"
            :tooltip="false"
            @update:value="handleProgressChange"
          />
        </div>

        <div class="video-player__controls-bar">
          <div class="video-player__controls-left">
            <n-tooltip>
              <template #trigger>
                <n-button quaternary circle size="small" @click="togglePlay">
                  <template #icon>
                    <n-icon :size="24">
                      <PauseCircle v-if="isPlaying" />
                      <PlayCircle v-else />
                    </n-icon>
                  </template>
                </n-button>
              </template>
              {{ isPlaying ? t('video.player.pause') : t('video.player.play') }}
            </n-tooltip>

            <template v-if="isMultiPart">
              <n-tooltip>
                <template #trigger>
                  <n-button
                    quaternary
                    circle
                    size="small"
                    :disabled="currentPartIndex === 0"
                    @click="prevPart"
                  >
                    <template #icon>
                      <n-icon :size="20"><ChevronBack /></n-icon>
                    </template>
                  </n-button>
                </template>
                {{ t('video.player.prevPart') }}
              </n-tooltip>
              <n-tooltip>
                <template #trigger>
                  <n-button
                    quaternary
                    circle
                    size="small"
                    :disabled="currentPartIndex === parts.length - 1"
                    @click="nextPart"
                  >
                    <template #icon>
                      <n-icon :size="20"><ChevronForward /></n-icon>
                    </template>
                  </n-button>
                </template>
                {{ t('video.player.nextPart') }}
              </n-tooltip>
            </template>

            <div class="video-player__volume">
              <n-button quaternary circle size="small" @click="toggleMute">
                <template #icon>
                  <n-icon :size="20">
                    <VolumeMute v-if="isMuted || volume === 0" />
                    <VolumeHigh v-else />
                  </n-icon>
                </template>
              </n-button>
              <div class="video-player__volume-slider">
                <n-slider
                  :value="isMuted ? 0 : volume"
                  :max="1"
                  :step="0.01"
                  :tooltip="false"
                  @update:value="handleVolumeChange"
                />
              </div>
            </div>

            <span class="video-player__time">
              {{ formatTime(currentTime) }} / {{ formatTime(duration) }}
            </span>
          </div>

          <div class="video-player__controls-right">
            <n-tag v-if="currentPart" size="small" type="info"> P{{ currentPartIndex + 1 }} </n-tag>

            <n-dropdown
              v-if="isMultiPart"
              trigger="click"
              :options="partOptions"
              :render-label="renderPartLabel"
              @select="switchPart"
            >
              <n-button quaternary size="small">
                <template #icon>
                  <n-icon :size="18"><List /></n-icon>
                </template>
                {{ t('video.player.partList') }}
              </n-button>
            </n-dropdown>

            <n-dropdown trigger="click" :options="rateOptions" @select="handleRateChange">
              <n-button quaternary size="small"> {{ playbackRate }}x </n-button>
            </n-dropdown>

            <n-dropdown
              v-if="!isDashActive"
              trigger="click"
              :options="qualityOptions"
              @select="handleQualityChange"
            >
              <n-button quaternary size="small">
                <template #icon>
                  <n-icon :size="18"><Settings /></n-icon>
                </template>
                {{ currentResource?.resolution || t('video.player.quality') }}
              </n-button>
            </n-dropdown>
            <n-dropdown
              v-else-if="dashQualityOptions.length > 0"
              trigger="click"
              :options="dashDropdownOptions"
              @select="handleDashQualityChange"
            >
              <n-button quaternary size="small">
                <template #icon>
                  <n-icon :size="18"><Settings /></n-icon>
                </template>
                {{ dashQualityButtonLabel }}
              </n-button>
            </n-dropdown>
            <n-button v-else quaternary size="small" :disabled="true">
              <template #icon>
                <n-icon :size="18"><Settings /></n-icon>
              </template>
              {{ t('video.player.dashAuto') }}
            </n-button>

            <n-tooltip>
              <template #trigger>
                <n-button quaternary circle size="small" @click="toggleFullscreen">
                  <template #icon>
                    <n-icon :size="20">
                      <Contract v-if="isFullscreen" />
                      <Expand v-else />
                    </n-icon>
                  </template>
                </n-button>
              </template>
              {{ isFullscreen ? t('video.player.exitFullscreen') : t('video.player.fullscreen') }}
            </n-tooltip>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped lang="scss">
.video-player {
  // ── 媒体 chrome 的局部 token ──
  // 播放器 UI 永远叠在「视频画面」之上，而画面亮度与主题无关：
  // 这里刻意不用会随主题反转的 ink token（obsidian / cyberpunk 下
  // --color-text-inverse 是深色，糊在黑底画面上直接不可读）。
  // 全组件仅在此处出现两个通道基色，其余颜色一律由它们派生。
  --player-ink-rgb: 255 255 255;
  --player-stage-rgb: 0 0 0;

  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  background-color: rgb(var(--player-stage-rgb));
  border-radius: var(--radius-md);
  outline: none;

  // tabindex="0" 的容器必须有可见焦点环；内描边以免被媒体框裁掉
  &:focus-visible {
    outline: 2px solid var(--color-focus);
    outline-offset: -2px;
  }

  &--fullscreen {
    border-radius: 0;
  }

  &__video {
    width: 100%;
    height: 100%;
    object-fit: contain;
    cursor: pointer;
  }

  &__loading {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: rgb(var(--player-stage-rgb) / 50%);
  }

  &__play-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    background-color: rgb(var(--player-stage-rgb) / 30%);
  }

  &__play-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 80px;
    height: 80px;
    color: rgb(var(--player-ink-rgb));
    background-color: rgb(var(--player-stage-rgb) / 60%);
    border-radius: var(--radius-full);
    transition:
      transform var(--motion-hover-duration) var(--motion-hover-easing),
      background-color var(--motion-hover-duration) var(--motion-hover-easing);

    &:hover {
      background-color: var(--color-primary);
      transform: scale(1.1);
    }
  }

  &__controls {
    position: absolute;
    right: 0;
    bottom: 0;
    left: 0;
    padding: var(--spacing-2) var(--spacing-3);
    background: linear-gradient(transparent, rgb(var(--player-stage-rgb) / 80%));
  }

  &__progress {
    position: relative;
    height: 4px;
    margin-bottom: var(--spacing-2);
    border-radius: var(--radius-full);

    :deep(.n-slider) {
      --n-rail-height: 4px;
      --n-rail-color: rgb(var(--player-ink-rgb) / 30%);
      --n-rail-color-hover: rgb(var(--player-ink-rgb) / 40%);
      --n-fill-color: var(--color-primary);
      --n-fill-color-hover: var(--color-primary);
      --n-handle-size: 12px;

      .n-slider-handle {
        opacity: 0;
        transition: opacity var(--motion-hover-duration) var(--motion-hover-easing);
      }
    }

    &:hover :deep(.n-slider .n-slider-handle) {
      opacity: 1;
    }
  }

  &__controls-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  &__controls-left,
  &__controls-right {
    display: flex;
    gap: var(--spacing-1);
    align-items: center;
  }

  &__volume {
    display: flex;
    align-items: center;

    &-slider {
      width: 0;
      overflow: hidden;
      transition: width var(--motion-expand-duration) var(--motion-expand-easing);

      :deep(.n-slider) {
        --n-rail-height: 3px;
        --n-handle-size: 10px;

        width: 60px;
      }
    }

    &:hover &-slider {
      width: 70px;
      margin-left: var(--spacing-1);
    }
  }

  &__time {
    margin-left: var(--spacing-2);
    color: rgb(var(--player-ink-rgb));
    font-size: var(--text-xs);
  }

  :deep(.n-button) {
    color: rgb(var(--player-ink-rgb));

    &:hover {
      color: var(--color-primary);
      background-color: rgb(var(--player-ink-rgb) / 10%);
    }
  }

  :deep(.n-tag) {
    --n-color: rgb(var(--player-ink-rgb) / 20%);
    --n-text-color: rgb(var(--player-ink-rgb));
  }
}

// fade / slide-up 两组过渡由全局 transitions/_page-transitions.scss 提供（已 token 化，
// 且在那里统一处理了 reduced-motion）。此前这里有一份 scoped 副本，靠 scoped 属性
// 的额外特异性遮蔽全局定义、时长还是写死的 0.3s —— 直接删掉，不再重复定义。

// 尊重「减少动效」：所有 duration token 在 reduce 下已被 themes.scss 清零，
// 这里只需去掉纯装饰的缩放 —— 0ms 的 scale 依旧是「瞬间跳一下」。
@media (prefers-reduced-motion: reduce) {
  .video-player__play-btn:hover {
    transform: none;
  }
}
</style>
