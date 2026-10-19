<script setup lang="ts">
/**
 * 管理员登录滑块验证码
 * 负责验证码获取、拖拽与键盘交互，以及验证状态反馈
 */
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { NButton, NIcon, NSpin } from 'naive-ui'
import { RefreshOutline } from '@vicons/ionicons5'

import { getSlideCaptcha } from '@/api/auth'
import type { SlideCaptcha } from '@/api/types'

interface Props {
  /** 是否显示验证码 */
  visible?: boolean
}

interface CaptchaResult {
  /** 验证码 Token */
  token: string
  /** 滑块 X 坐标 */
  x: number
  /** 滑块 Y 坐标 */
  y: number
}

type VerifyStatus = 'idle' | 'verifying' | 'success' | 'fail'

const props = withDefaults(defineProps<Props>(), {
  visible: true,
})

const emit = defineEmits<{
  /** 验证成功 */
  success: [result: CaptchaResult]
  /** 确认验证（用户释放滑块） */
  confirm: [result: CaptchaResult]
  /** 验证失败 */
  fail: []
  /** 刷新验证码 */
  refresh: []
  /** 成功画面已完成，可以开始弹层离场 */
  settled: []
}>()

const { t } = useI18n()

const DEFAULT_SLIDER_WIDTH = 44
const FAILURE_RESET_DELAY = 1100
const RECOIL_DURATION = 200
const ARIA_SYNC_INTERVAL = 150

const captchaData = ref<SlideCaptcha | null>(null)
const loading = ref(false)
const isDragging = ref(false)
const isReturning = ref(false)
const imageHeight = ref(160)
const sliderX = ref(0)
const scale = ref(1)
const verifyStatus = ref<VerifyStatus>('idle')
const containerWidth = ref(280)
const sliderWidth = ref(DEFAULT_SLIDER_WIDTH)
const lastResult = ref<CaptchaResult | null>(null)

const containerRef = ref<HTMLDivElement | null>(null)
const sliderRef = ref<HTMLDivElement | null>(null)
const masterImageRef = ref<HTMLImageElement | null>(null)

let resizeObserver: ResizeObserver | undefined
let failureResetTimer: ReturnType<typeof setTimeout> | undefined
let returnTimer: ReturnType<typeof setTimeout> | undefined
let settleTimer: ReturnType<typeof setTimeout> | undefined
let settleArmed = false
let captchaRequestId = 0
let rawX = 0
let pointerOrigin = 0
let activePointerId: number | null = null
let dragFrame = 0
let lastAriaSync = 0

const maxSlideDistance = computed(() => Math.max(containerWidth.value - sliderWidth.value, 0))
const maxSlideDistanceRounded = computed(() => Math.round(maxSlideDistance.value))
const progressPercentage = computed(() => {
  if (maxSlideDistance.value <= 0) return 0
  return Math.round((sliderX.value / maxSlideDistance.value) * 100)
})
const showSuccessResult = computed(() => verifyStatus.value === 'success')
const isInteractive = computed(
  () =>
    props.visible && !loading.value && Boolean(captchaData.value) && verifyStatus.value === 'idle'
)
const canRefresh = computed(
  () => !loading.value && verifyStatus.value !== 'verifying' && verifyStatus.value !== 'success'
)
const tipText = computed(() => {
  switch (verifyStatus.value) {
    case 'verifying':
      return t('auth.captcha.verifying')
    case 'success':
      return t('auth.captcha.success')
    case 'fail':
      return t('auth.captcha.failed')
    default:
      return t('auth.captcha.tip')
  }
})
const tileStyle = computed(() => ({
  transform: `translate3d(var(--captcha-x, 0px), ${(captchaData.value?.thumbY ?? 0) * scale.value}px, 0) scale(${scale.value})`,
  transformOrigin: 'left top',
}))

function clearFailureTimers(): void {
  if (failureResetTimer) clearTimeout(failureResetTimer)
  if (returnTimer) clearTimeout(returnTimer)
  failureResetTimer = undefined
  returnTimer = undefined
}

function clearSettleTimer(): void {
  if (settleTimer) clearTimeout(settleTimer)
  settleTimer = undefined
  settleArmed = false
}

function handleSettled(): void {
  if (!settleArmed || verifyStatus.value !== 'success' || !props.visible) return
  clearSettleTimer()
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  settleTimer = setTimeout(
    () => {
      settleTimer = undefined
      if (props.visible && verifyStatus.value === 'success') emit('settled')
    },
    reducedMotion ? 0 : 100
  )
}

function flushPosition(): void {
  dragFrame = 0
  const root = containerRef.value
  if (!root) return
  root.style.setProperty('--captcha-x', `${rawX}px`)
  root.style.setProperty(
    '--captcha-fill',
    String(Math.min((rawX + sliderWidth.value) / (containerWidth.value || 1), 1))
  )
}

function cancelFrame(): void {
  if (dragFrame) cancelAnimationFrame(dragFrame)
  dragFrame = 0
}

function stopDragging(): void {
  const pointerId = activePointerId
  activePointerId = null
  isDragging.value = false
  cancelFrame()
  if (pointerId !== null && sliderRef.value?.hasPointerCapture?.(pointerId)) {
    sliderRef.value.releasePointerCapture(pointerId)
  }
}

function measureCaptcha(): void {
  if (containerRef.value) {
    containerWidth.value = containerRef.value.getBoundingClientRect().width || containerWidth.value
  }
  if (sliderRef.value) {
    sliderWidth.value = sliderRef.value.getBoundingClientRect().width || DEFAULT_SLIDER_WIDTH
  }
  if (masterImageRef.value?.naturalWidth) {
    const rect = masterImageRef.value.getBoundingClientRect()
    if (rect.width > 0) scale.value = rect.width / masterImageRef.value.naturalWidth
    if (rect.height > 0) imageHeight.value = rect.height
  }
  moveSliderTo(rawX)
}

async function fetchCaptcha(): Promise<void> {
  if (!props.visible) return
  const requestId = ++captchaRequestId
  clearFailureTimers()
  clearSettleTimer()
  stopDragging()
  loading.value = true
  verifyStatus.value = 'idle'
  isReturning.value = false
  moveSliderTo(0)
  lastResult.value = null

  try {
    const data = await getSlideCaptcha()
    if (requestId !== captchaRequestId) return
    captchaData.value = data
    await nextTick()
    measureCaptcha()
  } catch {
    if (requestId === captchaRequestId) captchaData.value = null
    // 错误已在 request 层归一化处理
  } finally {
    if (requestId === captchaRequestId) loading.value = false
  }
}

function handleRefresh(): void {
  if (!canRefresh.value) return
  emit('refresh')
  void fetchCaptcha()
}

function onImageLoad(event: Event): void {
  const image = event.target as HTMLImageElement
  if (!image.naturalWidth) return
  scale.value = image.getBoundingClientRect().width / image.naturalWidth
  measureCaptcha()
}

function moveSliderTo(position: number): void {
  cancelFrame()
  rawX = Math.max(0, Math.min(position, maxSlideDistance.value))
  sliderX.value = rawX
  flushPosition()
}

function handlePointerDown(event: PointerEvent): void {
  if (!isInteractive.value || isDragging.value || event.button !== 0 || event.isPrimary === false)
    return

  activePointerId = event.pointerId
  isDragging.value = true
  pointerOrigin = event.clientX - rawX
  lastAriaSync = 0
  if (event.currentTarget instanceof HTMLElement) {
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }
  event.preventDefault()
}

function handlePointerMove(event: PointerEvent): void {
  if (!isDragging.value || event.pointerId !== activePointerId) return
  rawX = Math.max(0, Math.min(event.clientX - pointerOrigin, maxSlideDistance.value))
  if (!dragFrame) dragFrame = requestAnimationFrame(flushPosition)
  if (event.timeStamp - lastAriaSync >= ARIA_SYNC_INTERVAL) {
    lastAriaSync = event.timeStamp
    sliderX.value = rawX
  }
  event.preventDefault()
}

function handlePointerUp(event: PointerEvent): void {
  if (!isDragging.value || event.pointerId !== activePointerId) return
  moveSliderTo(event.clientX - pointerOrigin)
  stopDragging()
  verifySlider()
}

function handlePointerCancel(event: PointerEvent): void {
  if (!isDragging.value || event.pointerId !== activePointerId) return
  stopDragging()
  moveSliderTo(rawX)
}

function handleSliderKeydown(event: KeyboardEvent): void {
  if (!isInteractive.value || isDragging.value) return

  const step = event.shiftKey ? 1 : Math.max(Math.round(maxSlideDistance.value / 20), 1)
  let handled = true

  switch (event.key) {
    case 'ArrowRight':
    case 'ArrowUp':
      moveSliderTo(sliderX.value + step)
      break
    case 'ArrowLeft':
    case 'ArrowDown':
      moveSliderTo(sliderX.value - step)
      break
    case 'Home':
      moveSliderTo(0)
      break
    case 'End':
      moveSliderTo(maxSlideDistance.value)
      break
    case 'Enter':
    case ' ':
      if (sliderX.value > 0) verifySlider()
      break
    default:
      handled = false
  }

  if (handled) event.preventDefault()
}

function verifySlider(): void {
  if (!captchaData.value || !isInteractive.value || rawX <= 0) return

  const result: CaptchaResult = {
    token: captchaData.value.token,
    x: Math.round(sliderX.value / scale.value),
    y: captchaData.value.thumbY,
  }

  lastResult.value = result
  verifyStatus.value = 'verifying'
  emit('confirm', result)
}

function reset(): void {
  void fetchCaptcha()
}

onMounted(() => {
  measureCaptcha()

  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(measureCaptcha)
    if (containerRef.value) resizeObserver.observe(containerRef.value)
    if (sliderRef.value) resizeObserver.observe(sliderRef.value)
  }

  if (props.visible) void fetchCaptcha()
})

onBeforeUnmount(() => {
  captchaRequestId += 1
  stopDragging()
  resizeObserver?.disconnect()
  clearFailureTimers()
  clearSettleTimer()
})

watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      void fetchCaptcha()
      return
    }
    captchaRequestId += 1
    stopDragging()
    clearFailureTimers()
    clearSettleTimer()
  }
)

defineExpose({
  reset,
  refresh: handleRefresh,
  success: () => {
    if (!props.visible) return
    clearFailureTimers()
    clearSettleTimer()
    stopDragging()
    verifyStatus.value = 'success'
    settleArmed = true
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    // animationend 正常收尾，减动效或动画被打断时由定时器兜底。
    settleTimer = setTimeout(handleSettled, reducedMotion ? 160 : 900)
    if (lastResult.value) emit('success', lastResult.value)
  },
  fail: () => {
    if (!props.visible) return
    clearFailureTimers()
    clearSettleTimer()
    verifyStatus.value = 'fail'
    stopDragging()
    emit('fail')

    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reducedMotion) {
      moveSliderTo(0)
    } else {
      returnTimer = setTimeout(() => {
        isReturning.value = true
        void nextTick(() => {
          if (verifyStatus.value === 'fail') moveSliderTo(0)
        })
      }, RECOIL_DURATION)
    }

    failureResetTimer = setTimeout(() => {
      void fetchCaptcha()
    }, FAILURE_RESET_DELAY)
  },
})
</script>

<template>
  <div
    ref="containerRef"
    class="slide-captcha"
    :class="{ 'slide-captcha--returning': isReturning }"
    :style="{ '--captcha-image-height': `${imageHeight}px` }"
    :aria-busy="loading || verifyStatus === 'verifying'"
  >
    <div
      class="slide-captcha__image-wrapper"
      :class="{
        'slide-captcha__image-wrapper--dragging': isDragging,
      }"
    >
      <n-spin :show="loading">
        <div class="slide-captcha__image-container">
          <img
            v-if="captchaData?.masterImage"
            ref="masterImageRef"
            :src="captchaData.masterImage"
            class="slide-captcha__master-image"
            :alt="t('auth.captcha.title')"
            draggable="false"
            @load="onImageLoad"
          />

          <img
            v-if="captchaData?.tileImage"
            :src="captchaData.tileImage"
            class="slide-captcha__tile-image"
            :class="{ 'slide-captcha__tile-image--dragging': isDragging }"
            :style="tileStyle"
            alt=""
            draggable="false"
          />

          <div v-if="!captchaData && !loading" class="slide-captcha__placeholder">
            <n-button :disabled="!canRefresh" @click="handleRefresh">
              {{ t('auth.captcha.refresh') }}
            </n-button>
          </div>

          <Transition name="captcha-result">
            <div v-if="verifyStatus === 'verifying'" class="slide-captcha__scan" aria-hidden="true">
              <div class="slide-captcha__result-scan" />
            </div>
          </Transition>

          <Transition name="captcha-result">
            <div
              v-if="showSuccessResult"
              class="slide-captcha__result slide-captcha__result--success"
              role="status"
              aria-live="polite"
            >
              <svg class="slide-captcha__result-mark" viewBox="0 0 64 64" aria-hidden="true">
                <circle class="slide-captcha__result-ring" cx="32" cy="32" r="25" />
                <path
                  class="slide-captcha__result-symbol slide-captcha__result-symbol--check"
                  d="M20 33.5 28.5 42 45 23.5"
                />
              </svg>
              <span class="slide-captcha__result-text" @animationend.self="handleSettled">
                {{ tipText }}
              </span>
            </div>
          </Transition>
        </div>
      </n-spin>

      <n-button
        class="slide-captcha__refresh-btn"
        quaternary
        circle
        size="small"
        :disabled="!canRefresh"
        @click="handleRefresh"
      >
        <template #icon>
          <n-icon>
            <RefreshOutline />
          </n-icon>
        </template>
        <span class="sr-only">{{ t('auth.captcha.refresh') }}</span>
      </n-button>
    </div>

    <div
      class="slide-captcha__track"
      :class="{
        'slide-captcha__track--dragging': isDragging,
        'slide-captcha__track--verifying': verifyStatus === 'verifying',
        'slide-captcha__track--success': verifyStatus === 'success',
        'slide-captcha__track--fail': verifyStatus === 'fail',
      }"
    >
      <div class="slide-captcha__track-fill" />

      <Transition name="captcha-tip" mode="out-in">
        <span
          :key="verifyStatus"
          class="slide-captcha__tip"
          :class="`slide-captcha__tip--${verifyStatus}`"
          :role="verifyStatus === 'fail' ? 'alert' : undefined"
          :aria-live="verifyStatus === 'fail' ? 'assertive' : undefined"
        >
          {{ tipText }}
        </span>
      </Transition>

      <div
        ref="sliderRef"
        class="slide-captcha__slider"
        :class="{
          'slide-captcha__slider--dragging': isDragging,
          'slide-captcha__slider--verifying': verifyStatus === 'verifying',
          'slide-captcha__slider--success': verifyStatus === 'success',
          'slide-captcha__slider--fail': verifyStatus === 'fail',
        }"
        role="slider"
        :tabindex="isInteractive ? 0 : -1"
        :aria-label="t('auth.captcha.tip')"
        aria-valuemin="0"
        :aria-valuemax="maxSlideDistanceRounded"
        :aria-valuenow="Math.round(sliderX)"
        :aria-valuetext="`${progressPercentage}% · ${tipText}`"
        :aria-disabled="!isInteractive"
        @pointerdown="handlePointerDown"
        @pointermove="handlePointerMove"
        @pointerup="handlePointerUp"
        @pointercancel="handlePointerCancel"
        @lostpointercapture="handlePointerCancel"
        @keydown="handleSliderKeydown"
      >
        <svg class="slide-captcha__slider-icon" viewBox="0 0 24 24" aria-hidden="true">
          <circle
            v-if="verifyStatus === 'verifying'"
            class="slide-captcha__slider-spinner"
            cx="12"
            cy="12"
            r="8"
          />
          <path
            v-else-if="verifyStatus === 'success'"
            class="slide-captcha__slider-check"
            d="m7 12.5 3.25 3.25L17.5 8.5"
          />
          <path v-else class="slide-captcha__slider-arrow" d="M6.5 12h11m-4-4 4 4-4 4" />
        </svg>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.slide-captcha {
  --captcha-slider-size: calc(var(--spacing-10) + var(--spacing-1));

  width: 100%;
  max-width: 20rem;
  user-select: none;

  &__image-wrapper {
    position: relative;
    margin-bottom: var(--spacing-3);
    animation: captcha-stage-enter var(--duration-slower) var(--easing-out-expo) both;
  }

  &__image-container {
    position: relative;
    width: 100%;
    min-height: var(--captcha-image-height);
    overflow: hidden;
    isolation: isolate;
    background-color: var(--color-surface-hover);
    border: 1px solid var(--color-border-light);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-elev-1);
    transform: translateZ(0);
    transition:
      border-color var(--duration-normal) var(--easing-out-quart),
      box-shadow var(--duration-normal) var(--easing-out-quart),
      transform var(--duration-normal) var(--easing-out-quart);
  }

  &__image-wrapper--dragging &__image-container {
    border-color: color-mix(in srgb, var(--color-primary) 62%, var(--color-border));
    box-shadow: var(--shadow-elev-2);
    transform: translateZ(0) scale(1.004);
  }

  &__master-image {
    display: block;
    width: 100%;
    height: auto;
    animation: captcha-image-reveal var(--duration-slow) var(--easing-out-quart) both;
  }

  &__tile-image {
    position: absolute;
    top: 0;
    left: 0;
    z-index: 2;
    object-fit: contain;
    pointer-events: none;
    filter: drop-shadow(
      0 var(--spacing-1) var(--spacing-2) color-mix(in srgb, var(--color-text) 28%, transparent)
    );
    transition: transform var(--duration-fast) var(--easing-out-expo);

    &--dragging {
      will-change: transform;
      transition: none;
    }
  }

  &__placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    min-height: calc(var(--spacing-20) * 2);
    color: var(--color-text-muted);
    font-size: var(--text-sm);
  }

  &__refresh-btn {
    position: absolute;
    top: var(--spacing-2);
    right: var(--spacing-2);
    z-index: 12;
    color: var(--color-surface);
    background-color: color-mix(in srgb, var(--color-text) 52%, transparent);
    box-shadow: var(--shadow-elev-1);
    transition:
      background-color var(--duration-fast) var(--easing-out-quart),
      opacity var(--duration-fast) var(--easing-out-quart),
      transform var(--duration-fast) var(--easing-out-quart);

    &:hover:not(:disabled) {
      background-color: color-mix(in srgb, var(--color-text) 72%, transparent);
      transform: rotate(18deg) scale(1.04);
    }

    &:active:not(:disabled) {
      transform: rotate(18deg) scale(0.94);
    }
  }

  &__track {
    position: relative;
    height: var(--captcha-slider-size);
    overflow: hidden;
    background-color: var(--color-surface-hover);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    box-shadow: inset 0 1px 0 color-mix(in srgb, var(--color-surface) 55%, transparent);
    animation: captcha-stage-enter var(--duration-slower) var(--duration-fast)
      var(--easing-out-expo) both;
    transition:
      background-color var(--duration-normal) var(--easing-out-quart),
      border-color var(--duration-normal) var(--easing-out-quart),
      box-shadow var(--duration-normal) var(--easing-out-quart);

    &--dragging,
    &--verifying {
      border-color: color-mix(in srgb, var(--color-primary) 68%, var(--color-border));
      box-shadow:
        inset 0 1px 0 color-mix(in srgb, var(--color-surface) 55%, transparent),
        0 0 0 3px color-mix(in srgb, var(--color-primary) 10%, transparent);
    }

    &--success {
      background-color: color-mix(in srgb, var(--color-success-light) 68%, var(--color-surface));
      border-color: var(--color-success);
    }

    &--fail {
      background-color: color-mix(in srgb, var(--color-danger-light) 68%, var(--color-surface));
      border-color: var(--color-danger);
      animation: captcha-error-recoil var(--duration-normal) var(--easing-out-quart);
    }
  }

  &__track-fill {
    position: absolute;
    inset: 0;
    background: linear-gradient(
      90deg,
      color-mix(in srgb, var(--color-primary) 10%, transparent),
      color-mix(in srgb, var(--color-primary) 22%, transparent)
    );
    pointer-events: none;
    transform: scaleX(var(--captcha-fill, 0));
    transform-origin: left center;
    transition:
      background-color var(--duration-normal) var(--easing-out-quart),
      transform var(--duration-fast) var(--easing-out-expo);
  }

  &__track--dragging &__track-fill {
    will-change: transform;
    transition: none;
  }

  &__track--success &__track-fill {
    background: color-mix(in srgb, var(--color-success) 16%, transparent);
  }

  &__track--fail &__track-fill {
    background: color-mix(in srgb, var(--color-danger) 14%, transparent);
  }

  &__tip {
    position: absolute;
    top: 50%;
    left: 50%;
    max-width: calc(100% - var(--spacing-16));
    overflow: hidden;
    color: var(--color-text-muted);
    font-size: var(--text-sm);
    line-height: var(--leading-tight);
    text-overflow: ellipsis;
    white-space: nowrap;
    pointer-events: none;
    transform: translate(-50%, -50%);
    transition:
      color var(--duration-normal) var(--easing-out-quart),
      opacity var(--duration-fast) var(--easing-out-quart);

    &--verifying {
      color: var(--color-primary);
    }

    &--success {
      color: var(--color-success);
      font-weight: var(--font-semibold);
    }

    &--fail {
      color: var(--color-danger);
    }
  }

  &__track--dragging &__tip {
    opacity: 0.42;
  }

  &__slider {
    position: absolute;
    top: -1px;
    left: -1px;
    z-index: 3;
    display: flex;
    align-items: center;
    justify-content: center;
    width: var(--captcha-slider-size);
    height: var(--captcha-slider-size);
    color: var(--color-primary);
    touch-action: none;
    cursor: grab;
    background-color: var(--color-surface);
    border: 1px solid var(--color-border-strong);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-elev-1);
    transform: translate3d(var(--captcha-x, 0), 0, 0);
    transition:
      color var(--duration-fast) var(--easing-out-quart),
      background-color var(--duration-fast) var(--easing-out-quart),
      border-color var(--duration-fast) var(--easing-out-quart),
      box-shadow var(--duration-fast) var(--easing-out-quart),
      transform var(--duration-fast) var(--easing-out-expo);

    &:hover:not([aria-disabled='true']) {
      color: var(--color-surface);
      background-color: var(--color-primary);
      border-color: var(--color-primary);
      box-shadow: var(--shadow-elev-2);
    }

    &:active:not([aria-disabled='true']) {
      box-shadow: var(--shadow-elev-1);
    }

    &:focus-visible {
      outline: 2px solid var(--color-primary);
      outline-offset: -3px;
    }

    &--dragging {
      color: var(--color-surface);
      cursor: grabbing;
      background-color: var(--color-primary);
      border-color: var(--color-primary);
      box-shadow: var(--shadow-elev-2);
      will-change: transform;
      transition:
        color var(--duration-fast) var(--easing-out-quart),
        background-color var(--duration-fast) var(--easing-out-quart),
        border-color var(--duration-fast) var(--easing-out-quart),
        box-shadow var(--duration-fast) var(--easing-out-quart);
    }

    &--verifying {
      color: var(--color-surface);
      cursor: wait;
      background-color: var(--color-primary);
      border-color: var(--color-primary);
    }

    &--success {
      color: var(--color-surface);
      cursor: default;
      background-color: var(--color-success);
      border-color: var(--color-success);
      box-shadow: 0 0 0 4px color-mix(in srgb, var(--color-success) 14%, transparent);
    }

    &--fail {
      color: var(--color-surface);
      cursor: default;
      background-color: var(--color-danger);
      border-color: var(--color-danger);
    }
  }

  &__slider-icon {
    width: var(--spacing-6);
    height: var(--spacing-6);
    overflow: visible;
    fill: none;
    stroke: currentcolor;
    stroke-linecap: round;
    stroke-linejoin: round;
    stroke-width: 1.8;
  }

  &--returning &__slider,
  &--returning &__tile-image,
  &--returning &__track-fill {
    transition: transform var(--duration-slower) var(--easing-out-quint);
  }

  &__slider-arrow,
  &__slider-check {
    transition:
      opacity var(--duration-fast) var(--easing-out-quart),
      transform var(--duration-fast) var(--easing-out-quart);
  }

  &__slider-check {
    stroke-dasharray: 18;
    stroke-dashoffset: 18;
    animation: captcha-draw-symbol var(--duration-slow) var(--easing-out-quart) forwards;
  }

  &__slider-spinner {
    stroke-dasharray: 34 18;
    transform-origin: center;
    animation: captcha-spin var(--duration-slowest) linear infinite;
  }

  &__result {
    position: absolute;
    right: var(--spacing-2);
    bottom: var(--spacing-2);
    z-index: 10;
    display: flex;
    gap: var(--spacing-2);
    align-items: center;
    justify-content: center;
    overflow: hidden;
    padding: var(--spacing-2) var(--spacing-3);
    background-color: color-mix(in srgb, var(--color-surface) 91%, transparent);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-elev-1);
    pointer-events: none;

    &--success {
      color: var(--color-success);
    }
  }

  &__scan {
    position: absolute;
    inset: 0;
    z-index: 3;
    overflow: hidden;
    color: var(--color-primary);
    pointer-events: none;
  }

  &__result-scan {
    position: absolute;
    inset: 0 auto 0 0;
    width: 28%;
    pointer-events: none;
    opacity: 0;
    background: linear-gradient(
      90deg,
      transparent,
      color-mix(in srgb, currentcolor 22%, transparent),
      transparent
    );
  }

  &__scan &__result-scan {
    animation: captcha-security-scan calc(var(--duration-slowest) * 2) var(--easing-out-quart)
      infinite;
  }

  &__result-mark {
    width: var(--spacing-6);
    height: var(--spacing-6);
    overflow: visible;
    fill: none;
    stroke: currentcolor;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  &__result-ring {
    opacity: 0.34;
    stroke-width: 1.5;
    stroke-dasharray: 158;
    stroke-dashoffset: 158;
    transform: rotate(-90deg);
    transform-origin: center;
    animation: captcha-draw-ring var(--duration-slower) var(--easing-out-quint) forwards;
  }

  &__result-symbol {
    stroke-width: 3;
    stroke-dasharray: 42;
    stroke-dashoffset: 42;
    animation: captcha-draw-symbol var(--duration-slow) var(--duration-normal)
      var(--easing-out-quart) forwards;
  }

  &__result-text {
    font-size: var(--text-sm);
    font-weight: var(--font-semibold);
    letter-spacing: var(--tracking-wide);
    opacity: 0;
    transform: translateY(var(--spacing-1));
    animation: captcha-result-copy var(--duration-slow) var(--duration-normal)
      var(--easing-out-quart) forwards;
  }
}

.captcha-result-enter-active {
  transition:
    opacity var(--duration-normal) var(--easing-out-quart),
    transform var(--duration-normal) var(--easing-out-quart);
}

.captcha-result-leave-active {
  transition: opacity var(--duration-fast) var(--easing-ease-in);
}

.captcha-result-enter-from {
  opacity: 0;
  transform: scale(0.985);
}

.captcha-result-leave-to {
  opacity: 0;
}

.captcha-tip-enter-active,
.captcha-tip-leave-active {
  transition:
    opacity var(--duration-fast) var(--easing-out-quart),
    transform var(--duration-fast) var(--easing-out-quart);
}

.captcha-tip-enter-from {
  opacity: 0;
  transform: translate(-50%, calc(-50% + var(--spacing-1)));
}

.captcha-tip-leave-to {
  opacity: 0;
  transform: translate(-50%, calc(-50% - var(--spacing-1)));
}

@keyframes captcha-stage-enter {
  from {
    opacity: 0;
    transform: translateY(var(--spacing-3));
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes captcha-image-reveal {
  from {
    opacity: 0;
    transform: scale(1.015);
  }

  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes captcha-security-scan {
  0% {
    opacity: 0;
    transform: translateX(-100%);
  }

  24% {
    opacity: 1;
  }

  100% {
    opacity: 0;
    transform: translateX(460%);
  }
}

@keyframes captcha-draw-ring {
  to {
    stroke-dashoffset: 0;
  }
}

@keyframes captcha-draw-symbol {
  to {
    stroke-dashoffset: 0;
  }
}

@keyframes captcha-result-copy {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes captcha-spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes captcha-error-recoil {
  0%,
  100% {
    transform: translateX(0);
  }

  36% {
    transform: translateX(calc(var(--spacing-1) * -0.75));
  }

  72% {
    transform: translateX(calc(var(--spacing-1) * 0.4));
  }
}

@media (prefers-reduced-motion: reduce) {
  .slide-captcha {
    &__image-wrapper,
    &__master-image,
    &__track,
    &__slider-check,
    &__slider-spinner,
    &__result-ring,
    &__result-symbol,
    &__result-text {
      animation: none;
    }

    &__track--fail {
      animation: none;
    }

    &__tile-image,
    &__slider,
    &__track-fill,
    &__result,
    &__tip {
      transition: none;
    }

    &__result-scan {
      display: none;
    }

    &__result-ring,
    &__result-symbol,
    &__slider-check {
      stroke-dashoffset: 0;
    }

    &--returning &__slider,
    &--returning &__tile-image,
    &--returning &__track-fill {
      transition: none;
    }

    &__result-text {
      opacity: 1;
      transform: none;
    }
  }
}
</style>
