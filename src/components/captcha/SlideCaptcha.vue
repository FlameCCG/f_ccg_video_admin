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

/** 拖动起始 X 位置 */
const startX = ref(0)

/** 验证状态: idle | success | fail */
const verifyStatus = ref<'idle' | 'success' | 'fail'>('idle')

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
  // 这里简化处理，实际项目中可能需要根据后端返回的数据进行计算
  const result: CaptchaResult = {
    token: captchaData.value.token,
    x: Math.round(sliderX.value),
    y: captchaData.value.thumbY,
  }

  // 这里我们假设验证成功（实际验证由后端在登录时完成）
  // 前端只负责收集滑块位置数据
  verifyStatus.value = 'success'
  emit('success', result)
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
})
</script>

<template>
  <div v-if="visible" ref="containerRef" class="slide-captcha">
    <!-- 验证码图片区域 -->
    <div class="slide-captcha__image-wrapper">
      <n-spin :show="loading">
        <div class="slide-captcha__image-container">
          <!-- 主图片 -->
          <img
            v-if="captchaData?.masterImage"
            :src="captchaData.masterImage"
            class="slide-captcha__master-image"
            alt="captcha"
            draggable="false"
          />

          <!-- 滑块图片 -->
          <img
            v-if="captchaData?.tileImage"
            :src="captchaData.tileImage"
            class="slide-captcha__tile-image"
            :style="{
              left: `${sliderX}px`,
              top: `${captchaData.thumbY}px`,
            }"
            alt="slider"
            draggable="false"
          />

          <!-- 加载占位 -->
          <div v-if="!captchaData && !loading" class="slide-captcha__placeholder">
            {{ t('auth.captcha.loading') }}
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
    height: 160px;
    overflow: hidden;
    background-color: var(--color-surface-alt);
    border-radius: var(--radius-md);
  }

  &__master-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  &__tile-image {
    position: absolute;
    height: 40px;
    width: 40px;
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
}
</style>
