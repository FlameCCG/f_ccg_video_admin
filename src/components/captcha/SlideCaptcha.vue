<script setup lang="ts">
/**
 * 滑块验证码组件
 * 获取验证码、拖动验证、验证结果回调
 * Requirements: 4.1
 */
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { NSpin, NButton, NIcon } from 'naive-ui'
import { RefreshOutline } from '@vicons/ionicons5'
import { getSlideCaptcha } from '@/api/auth'
import type { SlideCaptcha } from '@/api/types'

// ==================== Props & Emits ====================

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
}>()

// ==================== i18n ====================

const { t } = useI18n()

// ==================== 状态 ====================

/** 验证码数据 */
const captchaData = ref<SlideCaptcha | null>(null)

/** 是否正在加载 */
const loading = ref(false)

/** 是否正在拖动 */
const isDragging = ref(false)

/** 滑块当前 X 位置 */
const sliderX = ref(0)

/** 图片缩放比例 */
const scale = ref(1)

/** 拖动起始 X 位置 */
const startX = ref(0)

/** 验证状态: idle | success | fail */
const verifyStatus = ref<'idle' | 'success' | 'fail'>('idle')

/** 是否显示结果覆盖层 */
const showResult = ref(false)

/** 是否抖动 */
const isShaking = ref(false)

/** 容器宽度 */
const containerWidth = ref(280)

/** 滑块宽度 */
const sliderWidth = 44

/** 最大滑动距离 */
const maxSlideDistance = computed(() => containerWidth.value - sliderWidth)

// ==================== Refs ====================

const containerRef = ref<HTMLDivElement | null>(null)

// ==================== 方法 ====================

/**
 * 获取验证码
 */
async function fetchCaptcha(): Promise<void> {
  loading.value = true
  verifyStatus.value = 'idle'
  sliderX.value = 0

  try {
    captchaData.value = await getSlideCaptcha()
  } catch {
    // 错误已在 request 层处理
  } finally {
    loading.value = false
  }
}

/**
 * 刷新验证码
 */
function handleRefresh(): void {
  emit('refresh')
  void fetchCaptcha()
}

/**
 * 图片加载完成，计算缩放比例
 */
function onImageLoad(e: Event): void {
  const img = e.target as HTMLImageElement
  if (img && captchaData.value) {
    // 假设后端返回的图片原始宽度为 320 (通常是标准宽度，或者根据实际情况调整)
    // 如果后端没返回原始尺寸，这里可能需要约定或者从 masterImage 获取原始尺寸（如果 masterImage 是原图）
    // 这里我们假设容器宽度即为显示宽度，原始宽度需要根据实际图片 naturalWidth 计算
    // 但因为我们是 fit width，所以 scale = currentWidth / naturalWidth
    scale.value = img.width / img.naturalWidth
  }
}

/**
 * 开始拖动
 */
function handleDragStart(e: MouseEvent | TouchEvent): void {
  if (loading.value || verifyStatus.value === 'success') return

  isDragging.value = true
  startX.value = getClientX(e) - sliderX.value

  // 添加全局事件监听
  document.addEventListener('mousemove', handleDragMove)
  document.addEventListener('mouseup', handleDragEnd)
  document.addEventListener('touchmove', handleDragMove, { passive: false })
  document.addEventListener('touchend', handleDragEnd)
}

/**
 * 拖动中
 */
function handleDragMove(e: MouseEvent | TouchEvent): void {
  if (!isDragging.value) return

  e.preventDefault()

  const currentX = getClientX(e)
  let newX = currentX - startX.value

  // 限制范围
  newX = Math.max(0, Math.min(newX, maxSlideDistance.value))
  sliderX.value = newX
}

/**
 * 结束拖动
 */
function handleDragEnd(): void {
  if (!isDragging.value) return

  isDragging.value = false

  // 移除全局事件监听
  document.removeEventListener('mousemove', handleDragMove)
  document.removeEventListener('mouseup', handleDragEnd)
  document.removeEventListener('touchmove', handleDragMove)
  document.removeEventListener('touchend', handleDragEnd)

  // 验证
  verifySlider()
}

/**
 * 验证滑块位置
 */
function verifySlider(): void {
  if (!captchaData.value) return

  // 计算实际 X 坐标（相对于图片的位置）
  // 使用 scale 反向计算原始坐标
  const result: CaptchaResult = {
    token: captchaData.value.token,
    x: Math.round(sliderX.value / scale.value),
    y: captchaData.value.thumbY,
  }

  // 触发确认事件，由父组件调用后端验证
  emit('confirm', result)
}

/**
 * 获取鼠标/触摸的 X 坐标
 */
function getClientX(e: MouseEvent | TouchEvent): number {
  if ('touches' in e) {
    return e.touches[0]?.clientX ?? 0
  }
  return e.clientX
}

/**
 * 重置验证码
 */
function reset(): void {
  verifyStatus.value = 'idle'
  sliderX.value = 0
  void fetchCaptcha()
}

// ==================== 生命周期 ====================

onMounted(() => {
  if (props.visible) {
    void fetchCaptcha()
  }

  // 获取容器宽度
  if (containerRef.value) {
    containerWidth.value = containerRef.value.offsetWidth
  }
})

// 监听 visible 变化
watch(
  () => props.visible,
  (newVisible) => {
    if (newVisible && !captchaData.value) {
      void fetchCaptcha()
    }
  }
)

// ==================== 暴露方法 ====================

defineExpose({
  reset,
  refresh: handleRefresh,
  success: () => {
    verifyStatus.value = 'success'
    showResult.value = true
    emit('success', {
      token: captchaData.value?.token || '',
      x: 0,
      y: 0,
    })
  },
  fail: () => {
    verifyStatus.value = 'fail'
    showResult.value = true
    isShaking.value = true
    // 0.5s 后移除抖动
    setTimeout(() => {
      isShaking.value = false
    }, 500)

    // 1.5s 后自动重置，允许重试
    setTimeout(() => {
      verifyStatus.value = 'idle'
      showResult.value = false
      sliderX.value = 0
    }, 1500)
  },
})
</script>

<template>
  <div v-if="visible" ref="containerRef" class="slide-captcha">
    <!-- 验证码图片区域 -->
    <div class="slide-captcha__image-wrapper" :class="{ 'slide-captcha--shake': isShaking }">
      <n-spin :show="loading">
        <div class="slide-captcha__image-container">
          <!-- 主图片 -->
          <img
            v-if="captchaData?.masterImage"
            :src="captchaData.masterImage"
            class="slide-captcha__master-image"
            alt="captcha"
            draggable="false"
            @load="onImageLoad"
          />

          <!-- 滑块图片 -->
          <img
            v-if="captchaData?.tileImage"
            :src="captchaData.tileImage"
            class="slide-captcha__tile-image"
            :style="{
              left: `${sliderX}px`,
              top: `${(captchaData.thumbY || 0) * scale}px`,
              transform: `scale(${scale})`,
              transformOrigin: 'left top',
            }"
            alt="slider"
            draggable="false"
          />

          <!-- 加载占位 -->
          <div v-if="!captchaData && !loading" class="slide-captcha__placeholder">
            {{ t('auth.captcha.loading') }}
          </div>
          <!-- 结果覆盖层 -->
          <div
            v-if="showResult"
            class="slide-captcha__result"
            :class="{
              'slide-captcha__result--success': verifyStatus === 'success',
              'slide-captcha__result--fail': verifyStatus === 'fail',
            }"
          >
            <div class="slide-captcha__result-icon">
              <n-icon size="40">
                <svg v-if="verifyStatus === 'success'" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                </svg>
                <svg v-else viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
                  />
                </svg>
              </n-icon>
            </div>
            <div class="slide-captcha__result-text">
              {{
                verifyStatus === 'success' ? t('auth.captcha.success') : t('auth.captcha.failed')
              }}
            </div>
          </div>
        </div>
      </n-spin>

      <!-- 刷新按钮 -->
      <n-button
        class="slide-captcha__refresh-btn"
        quaternary
        circle
        size="small"
        :disabled="loading"
        @click="handleRefresh"
      >
        <template #icon>
          <n-icon>
            <RefreshOutline />
          </n-icon>
        </template>
      </n-button>
    </div>

    <!-- 滑块轨道 -->
    <div
      class="slide-captcha__track"
      :class="{
        'slide-captcha__track--success': verifyStatus === 'success',
        'slide-captcha__track--fail': verifyStatus === 'fail',
      }"
    >
      <!-- 已滑动区域 -->
      <div class="slide-captcha__track-fill" :style="{ width: `${sliderX + sliderWidth}px` }" />

      <!-- 提示文字 -->
      <span v-if="verifyStatus === 'idle'" class="slide-captcha__tip">
        {{ t('auth.captcha.tip') }}
      </span>
      <span
        v-else-if="verifyStatus === 'success'"
        class="slide-captcha__tip slide-captcha__tip--success"
      >
        {{ t('auth.captcha.success') }}
      </span>
      <span v-else-if="verifyStatus === 'fail'" class="slide-captcha__tip slide-captcha__tip--fail">
        {{ t('auth.captcha.failed') }}
      </span>

      <!-- 滑块 -->
      <div
        class="slide-captcha__slider"
        :class="{
          'slide-captcha__slider--dragging': isDragging,
          'slide-captcha__slider--success': verifyStatus === 'success',
          'slide-captcha__slider--fail': verifyStatus === 'fail',
        }"
        :style="{ left: `${sliderX}px` }"
        @mousedown="handleDragStart"
        @touchstart="handleDragStart"
      >
        <span class="slide-captcha__slider-icon">→</span>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.slide-captcha {
  width: 100%;
  max-width: 320px;
  user-select: none;

  &__image-wrapper {
    position: relative;
    margin-bottom: var(--spacing-3);
  }

  &__image-container {
    position: relative;
    width: 100%;
    overflow: hidden;
    background-color: var(--color-surface-alt);
    border-radius: var(--radius-md);
  }

  &__master-image {
    width: 100%;
    height: auto;
    display: block;
  }

  &__tile-image {
    position: absolute;
    object-fit: contain;
    pointer-events: none;
    filter: drop-shadow(2px 2px 4px rgba(0, 0, 0, 0.3));
  }

  &__placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    color: var(--color-text-muted);
    font-size: var(--text-sm);
  }

  &__refresh-btn {
    position: absolute;
    top: var(--spacing-2);
    right: var(--spacing-2);
    background-color: rgba(0, 0, 0, 0.3);
    color: #fff;

    &:hover {
      background-color: rgba(0, 0, 0, 0.5);
    }
  }

  &__track {
    position: relative;
    height: 44px;
    background-color: var(--color-surface-alt);
    border-radius: var(--radius-md);
    border: 1px solid var(--color-border);
    overflow: hidden;
    transition: border-color var(--duration-fast) var(--easing-ease-out);

    &--success {
      border-color: var(--color-success);
    }

    &--fail {
      border-color: var(--color-danger);
    }
  }

  &__track-fill {
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    background-color: var(--color-primary);
    opacity: 0.1;
    transition: width 0s;
  }

  &__tip {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    color: var(--color-text-muted);
    font-size: var(--text-sm);
    white-space: nowrap;
    pointer-events: none;

    &--success {
      color: var(--color-success);
    }

    &--fail {
      color: var(--color-danger);
    }
  }

  &__slider {
    position: absolute;
    top: 0;
    left: 0;
    width: 44px;
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: var(--color-surface);
    border-radius: var(--radius-md);
    border: 1px solid var(--color-border);
    cursor: grab;
    transition:
      background-color var(--duration-fast) var(--easing-ease-out),
      border-color var(--duration-fast) var(--easing-ease-out),
      box-shadow var(--duration-fast) var(--easing-ease-out);

    &:hover {
      background-color: var(--color-primary);
      border-color: var(--color-primary);
      color: #fff;
    }

    &--dragging {
      cursor: grabbing;
      background-color: var(--color-primary);
      border-color: var(--color-primary);
      color: #fff;
      box-shadow: var(--shadow-elev-2);
    }

    &--success {
      background-color: var(--color-success);
      border-color: var(--color-success);
      color: #fff;
      cursor: default;
    }

    &--fail {
      background-color: var(--color-danger);
      border-color: var(--color-danger);
      color: #fff;
    }
  }

  &__slider-icon {
    font-size: 18px;
    font-weight: bold;
  }

  &__result {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.9);
    z-index: 10;
    opacity: 0;
    animation: fade-in 0.2s forwards;

    &--success {
      color: var(--color-success);
    }

    &--fail {
      color: var(--color-danger);
    }
  }

  &__result-text {
    margin-top: var(--spacing-2);
    font-weight: bold;
    font-size: var(--text-lg);
  }

  &--shake {
    animation: shake 0.5s;
  }
}

@keyframes shake {
  0%,
  100% {
    transform: translateX(0);
  }

  25% {
    transform: translateX(-5px);
  }

  75% {
    transform: translateX(5px);
  }
}

@keyframes fade-in {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}
</style>