<script setup lang="ts">
/**
 * 加载状态组件
 * 用于异步操作时的加载提示
 * Requirements: 20.4, 20.5
 */
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { NSpin } from 'naive-ui'

interface Props {
  /** 是否显示加载状态 */
  loading?: boolean
  /** 加载提示文字 */
  tip?: string
  /** 加载图标大小 */
  size?: 'small' | 'medium' | 'large'
  /** 是否全屏显示 */
  fullscreen?: boolean
  /** 是否显示遮罩 */
  mask?: boolean
  /** 最小高度 */
  minHeight?: string | number
}

const props = withDefaults(defineProps<Props>(), {
  loading: true,
  tip: undefined,
  size: 'medium',
  fullscreen: false,
  mask: true,
  minHeight: 200,
})

const { t } = useI18n()

/** 显示的提示文字 */
const displayTip = computed(() => {
  return props.tip ?? t('common.loading')
})

/** 最小高度样式 */
const minHeightStyle = computed(() => {
  if (typeof props.minHeight === 'number') {
    return `${props.minHeight}px`
  }
  return props.minHeight
})

/** Spin 尺寸映射 */
const spinSize = computed(() => {
  const sizes = {
    small: 'small',
    medium: 'medium',
    large: 'large',
  } as const
  return sizes[props.size]
})
</script>

<template>
  <div
    v-if="loading"
    class="app-loading"
    :class="{
      'app-loading--fullscreen': fullscreen,
      'app-loading--mask': mask,
    }"
    :style="{ minHeight: fullscreen ? undefined : minHeightStyle }"
  >
    <n-spin :size="spinSize" :description="displayTip" />
  </div>
  <slot v-else />
</template>

<style scoped lang="scss">
.app-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;

  &--fullscreen {
    position: fixed;
    inset: 0;
    z-index: 9999;
  }

  &--mask {
    background-color: var(--color-overlay);
  }
}
</style>
