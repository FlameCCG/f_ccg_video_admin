<script setup lang="ts">
/**
 * 空白布局
 * 用于登录页等不需要侧边栏和顶栏的页面
 * Requirements: 6.1
 */
</script>

<template>
  <div class="blank-layout">
    <router-view />
  </div>
</template>

<style scoped lang="scss">
.blank-layout {
  min-height: 100vh;
  background-color: var(--color-bg);
}
</style>
