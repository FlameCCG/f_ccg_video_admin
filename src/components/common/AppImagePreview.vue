<script setup lang="ts">
/**
 * 图片预览组件
 * 支持单图和多图预览、缩放、旋转
 * Requirements: 20.4, 20.5
 */
import { ref, computed, watch } from 'vue'
import { NImage, NImageGroup, NSpace } from 'naive-ui'

interface Props {
  /** 图片地址（单图） */
  src?: string
  /** 图片地址列表（多图） */
  srcList?: string[]
  /** 图片宽度 */
  width?: string | number
  /** 图片高度 */
  height?: string | number
  /** 图片适应方式 */
  objectFit?: 'fill' | 'contain' | 'cover' | 'none' | 'scale-down'
  /** 是否懒加载 */
  lazy?: boolean
  /** 预览时是否显示工具栏 */
  showToolbar?: boolean
  /** 预览时是否显示工具栏提示 */
  showToolbarTooltip?: boolean
  /** 图片圆角 */
  radius?: string | number
  /** 图片间距（多图时） */
  gap?: number
  /** 占位图 */
  fallbackSrc?: string
  /** 图片 alt 文字 */
  alt?: string
}

const props = withDefaults(defineProps<Props>(), {
  src: undefined,
  srcList: undefined,
  width: undefined,
  height: undefined,
  objectFit: 'cover',
  lazy: true,
  showToolbar: true,
  showToolbarTooltip: true,
  radius: undefined,
  gap: 8,
  fallbackSrc: undefined,
  alt: '',
})

/** 是否多图模式 */
const isMultiple = computed(() => Array.isArray(props.srcList) && props.srcList.length > 0)

/** 图片列表 */
const images = computed(() => {
  if (isMultiple.value) {
    return props.srcList ?? []
  }
  return props.src ? [props.src] : []
})

/** 宽度样式 */
const widthStyle = computed(() => {
  if (!props.width) return undefined
  return typeof props.width === 'number' ? `${props.width}px` : props.width
})

/** 高度样式 */
const heightStyle = computed(() => {
  if (!props.height) return undefined
  return typeof props.height === 'number' ? `${props.height}px` : props.height
})

/** 圆角样式 */
const radiusStyle = computed(() => {
  if (!props.radius) return 'var(--radius-md)'
  return typeof props.radius === 'number' ? `${props.radius}px` : props.radius
})

/** 图片样式 */
const imageStyle = computed(() => ({
  width: widthStyle.value,
  height: heightStyle.value,
  objectFit: props.objectFit,
  borderRadius: radiusStyle.value,
}))

/** 加载错误状态 */
const errorMap = ref<Record<string, boolean>>({})

/** 处理加载错误 */
function handleError(src: string): void {
  errorMap.value[src] = true
}

/** 重置错误状态 */
watch(
  () => props.src,
  () => {
    errorMap.value = {}
  }
)
</script>

<template>
  <div class="app-image-preview">
    <!-- 多图模式 -->
    <n-image-group
      v-if="isMultiple"
      :show-toolbar="showToolbar"
      :show-toolbar-tooltip="showToolbarTooltip"
    >
      <n-space :size="gap">
        <n-image
          v-for="(imgSrc, index) in images"
          :key="index"
          :src="imgSrc"
          :alt="alt || `Image ${index + 1}`"
          :lazy="lazy"
          :fallback-src="fallbackSrc"
          :img-props="{ style: imageStyle }"
          :preview-src="imgSrc"
          class="app-image-preview__image"
          @error="handleError(imgSrc)"
        />
      </n-space>
    </n-image-group>

    <!-- 单图模式 -->
    <n-image
      v-else-if="src"
      :src="src"
      :alt="alt"
      :lazy="lazy"
      :fallback-src="fallbackSrc"
      :show-toolbar="showToolbar"
      :show-toolbar-tooltip="showToolbarTooltip"
      :img-props="{ style: imageStyle }"
      :preview-src="src"
      class="app-image-preview__image"
      @error="handleError(src)"
    />

    <!-- 无图片占位 -->
    <div
      v-else
      class="app-image-preview__placeholder"
      :style="{ width: widthStyle, height: heightStyle, borderRadius: radiusStyle }"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="32"
        height="32"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
      </svg>
    </div>
  </div>
</template>

<style scoped lang="scss">
.app-image-preview {
  display: inline-block;

  &__image {
    cursor: pointer;
    transition: transform var(--duration-fast) var(--easing-standard);

    &:hover {
      transform: scale(1.02);
    }
  }

  &__placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: var(--color-surface-alt);
    color: var(--color-text-muted);
    min-width: 80px;
    min-height: 80px;
  }
}
</style>
