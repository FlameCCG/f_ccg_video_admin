<script setup lang="ts">
/**
 * 高级视频播放器组件
 * Advanced Video Player Component
 * 支持：分P切换、清晰度选择、全屏、音量控制、进度条、快捷键
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

let controlsTimer: ReturnType<typeof setTimeout> | null = null

const isMultiPart = computed(() => props.parts.length > 1)

const currentPart = computed(() => {
  if (isMultiPart.value && props.parts[currentPartIndex.value]) {
    return props.parts[currentPartIndex.value]
  }
  return null
})

const availableResources = computed(() => {
  if (currentPart.value?.resources?.length) {
    return currentPart.value.resources
  }
  return props.resources
})

const currentResource = computed(() => {
  return availableResources.value[currentQualityIndex.value] || availableResources.value[0]
})

const videoUrl = computed(() => currentResource.value?.fileUrl || '')

const qualityOptions = computed(() => {
  return availableResources.value.map((res, index) => ({
    label: res.resolution + (res.isVip ? ' (VIP)' : ''),
    key: index,
  }))
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

function togglePlay(): void {
  if (!videoRef.value) return
  if (isPlaying.value) {
    videoRef.value.pause()
  } else {
    void videoRef.value.play()
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
  const savedTime = currentTime.value
  const wasPlaying = isPlaying.value
  currentQualityIndex.value = key

  void nextTick(() => {
    if (videoRef.value) {
      videoRef.value.currentTime = savedTime
      if (wasPlaying) {
        void videoRef.value.play()
      }
    }
  })
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

  currentPartIndex.value = index
  currentQualityIndex.value = findBestQuality()
  currentTime.value = 0
  duration.value = 0
  buffered.value = 0
  isLoading.value = true
  emit('partChange', index)

  void nextTick(() => {
    if (videoRef.value) {
      // 重置视频并加载新源
      videoRef.value.load()
      // 监听 canplay 事件后自动播放
      const onCanPlayOnce = (): void => {
        if (videoRef.value) {
          void videoRef.value.play()
          videoRef.value.removeEventListener('canplay', onCanPlayOnce)
        }
      }
      videoRef.value.addEventListener('canplay', onCanPlayOnce)
    }
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
    }, 3000)
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
})

onUnmounted(() => {
  if (controlsTimer) {
    clearTimeout(controlsTimer)
  }
  document.removeEventListener('fullscreenchange', onFullscreenChange)
})

watch(
  () => props.resources,
  () => {
    currentQualityIndex.value = findBestQuality()
  },
  { deep: true }
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
      :src="videoUrl"
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
          <div
            class="video-player__progress-buffered"
            :style="{ width: `${(buffered / duration) * 100}%` }"
          />
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

            <n-dropdown trigger="click" :options="qualityOptions" @select="handleQualityChange">
              <n-button quaternary size="small">
                <template #icon>
                  <n-icon :size="18"><Settings /></n-icon>
                </template>
                {{ currentResource?.resolution || t('video.player.quality') }}
              </n-button>
            </n-dropdown>

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
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  background-color: #000;
  border-radius: var(--radius-md);
  outline: none;

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
    background-color: rgb(0 0 0 / 50%);
  }

  &__play-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    background-color: rgb(0 0 0 / 30%);
  }

  &__play-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 80px;
    height: 80px;
    color: #fff;
    background-color: rgb(0 0 0 / 60%);
    border-radius: 50%;
    transition:
      transform 0.2s,
      background-color 0.2s;

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
    background: linear-gradient(transparent, rgb(0 0 0 / 80%));
  }

  &__progress {
    position: relative;
    height: 4px;
    margin-bottom: var(--spacing-2);
    background-color: rgb(255 255 255 / 30%);
    border-radius: 2px;

    &-buffered {
      position: absolute;
      top: 0;
      left: 0;
      height: 100%;
      background-color: rgb(255 255 255 / 40%);
      border-radius: 2px;
    }

    :deep(.n-slider) {
      --n-rail-height: 4px;
      --n-rail-color: transparent;
      --n-rail-color-hover: transparent;
      --n-fill-color: var(--color-primary);
      --n-fill-color-hover: var(--color-primary);
      --n-handle-size: 12px;

      .n-slider-handle {
        opacity: 0;
        transition: opacity 0.2s;
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
      transition: width 0.2s;

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
    color: #fff;
    font-size: var(--text-xs);
  }

  :deep(.n-button) {
    color: #fff;

    &:hover {
      color: var(--color-primary);
      background-color: rgb(255 255 255 / 10%);
    }
  }

  :deep(.n-tag) {
    --n-color: rgb(255 255 255 / 20%);
    --n-text-color: #fff;
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition:
    transform 0.3s,
    opacity 0.3s;
}

.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
  transform: translateY(100%);
}
</style>
