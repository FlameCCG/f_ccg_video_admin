<script setup lang="ts">
/**
 * 头像组件
 * 支持图片、文字、图标三种模式
 * Requirements: 20.4, 20.5
 */
import { computed } from 'vue'
import { NAvatar } from 'naive-ui'
import { normalizeResourceUrl } from '@/utils'

interface Props {
  /** 头像图片地址 */
  src?: string
  /** 头像大小 */
  size?: 'small' | 'medium' | 'large' | number
  /** 头像形状 */
  round?: boolean
  /** 显示文字（无图片时） */
  text?: string
  /** 背景色 */
  color?: string
  /** 是否显示边框 */
  bordered?: boolean
  /** 回退图标（加载失败时） */
  fallbackIcon?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  src: undefined,
  size: 'medium',
  round: true,
  text: undefined,
  color: undefined,
  bordered: false,
  fallbackIcon: true,
})

/** 显示的文字（取首字符） */
const displayText = computed(() => {
  if (!props.text) return ''
  return props.text.charAt(0).toUpperCase()
})

/** 规范化后的头像地址 */
const normalizedSrc = computed(() => normalizeResourceUrl(props.src))

/** 是否显示文字模式 */
const showText = computed(() => !normalizedSrc.value && props.text)

/** 是否显示默认图标 */
const showFallback = computed(() => !normalizedSrc.value && !props.text && props.fallbackIcon)
</script>

<template>
  <n-avatar
    :src="normalizedSrc"
    :size="size"
    :round="round"
    :bordered="bordered"
    :color="color"
    class="app-avatar"
    :class="{ 'app-avatar--bordered': bordered }"
  >
    <template v-if="showText">
      {{ displayText }}
    </template>
    <template v-else-if="showFallback">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="60%"
        height="60%"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    </template>
  </n-avatar>
</template>

<style scoped lang="scss">
.app-avatar {
  flex-shrink: 0;
  transition: transform var(--duration-fast) var(--easing-standard);

  &--bordered {
    border: 2px solid var(--color-border);
  }

  &:hover {
    transform: scale(1.05);
  }
}
</style>
