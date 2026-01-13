<script setup lang="ts">
/**
 * 顶部栏组件
 * 包含面包屑、主题/语言切换、用户下拉菜单
 * Requirements: 6.2
 */
import { NFlex } from 'naive-ui'
import AppBreadcrumb from './AppBreadcrumb.vue'
import ThemeSwitcher from './ThemeSwitcher.vue'
import LangSwitcher from './LangSwitcher.vue'
import UserDropdown from './UserDropdown.vue'
</script>

<template>
  <div class="app-header">
    <!-- 左侧：面包屑 -->
    <div class="header-left">
      <AppBreadcrumb />
    </div>

    <!-- 右侧：工具栏 -->
    <div class="header-right">
      <NFlex align="center" :size="4">
        <ThemeSwitcher />
        <LangSwitcher />
        <UserDropdown />
      </NFlex>
    </div>
  </div>
</template>

<style scoped lang="scss">
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 100%;
  padding: 0 24px;
}

.header-left {
  display: flex;
  align-items: center;
}

.header-right {
  display: flex;
  align-items: center;
}
</style>
