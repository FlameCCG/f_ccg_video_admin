<script setup lang="ts">
/**
 * 语言切换器组件（布局头部使用）
 * 封装 LanguageDropdown，使用 hover 展开
 * Requirements: 3.4
 */
import LanguageDropdown from '@/components/common/LanguageDropdown.vue'

interface Props {
  /** 是否显示当前语言名称 */
  showLabel?: boolean
}

withDefaults(defineProps<Props>(), {
  showLabel: false,
})
</script>

<template>
  <LanguageDropdown :show-label="showLabel" size="medium" />
</template>
