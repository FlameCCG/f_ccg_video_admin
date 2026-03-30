<script setup lang="ts">
/**
 * 主题切换器组件（布局头部使用）。
 * 封装 ThemeDropdown，通过 hover 展开。
 */
import ThemeDropdown from '@/components/common/ThemeDropdown.vue'

interface Props {
  /** 鏄惁鏄剧ず褰撳墠涓婚鍚嶇О */
  showLabel?: boolean
}

withDefaults(defineProps<Props>(), {
  showLabel: false,
})
</script>

<template>
  <ThemeDropdown :show-label="showLabel" size="medium" />
</template>
