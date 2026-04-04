<script setup lang="ts">
import { NConfigProvider, NMessageProvider, NDialogProvider, NNotificationProvider } from 'naive-ui'
import { useNaiveTheme, useLocale } from '@/composables'
import { useAppStore } from '@/stores/app'

// 初始化应用
const appStore = useAppStore()
appStore.initApp()

// Naive UI 主题配置
const { naiveTheme, naiveThemeOverrides } = useNaiveTheme()

// Naive UI 国际化配置
const { naiveLocale, naiveDateLocale } = useLocale()
</script>

<template>
  <NConfigProvider
    :theme="naiveTheme"
    :theme-overrides="naiveThemeOverrides"
    :locale="naiveLocale"
    :date-locale="naiveDateLocale"
  >
    <NMessageProvider>
      <NDialogProvider>
        <NNotificationProvider>
          <router-view />
        </NNotificationProvider>
      </NDialogProvider>
    </NMessageProvider>
  </NConfigProvider>
</template>

<style scoped>
/* App 根组件样式 */
</style>
