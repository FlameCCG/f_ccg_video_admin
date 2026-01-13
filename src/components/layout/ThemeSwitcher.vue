<script setup lang="ts">
/**
 * 涓婚鍒囨崲鍣ㄧ粍浠讹紙甯冨眬澶撮儴浣跨敤锛? * 灏佽 ThemeDropdown锛屼娇鐢?hover 灞曞紑
 * Requirements: 2.4
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
