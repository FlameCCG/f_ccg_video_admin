<script setup lang="ts">
import { NButton, NCard, NSpace, NSelect, NH1, NText, NDivider } from 'naive-ui'
import { useTheme, themeConfigs, type ThemeName } from '@/composables'

const { currentTheme, setTheme, toggleDark, isDark } = useTheme()

const themeOptions = themeConfigs.map((t) => ({
  label: `${t.labelZh} (${t.label})`,
  value: t.name,
}))

const handleThemeChange = (value: ThemeName) => {
  setTheme(value)
}
</script>

<template>
  <div class="home-view">
    <NCard class="demo-card">
      <NH1>Design Tokens 与主题系统演示</NH1>
      <NText depth="3">当前主题: {{ currentTheme }} ({{ isDark ? '深色' : '浅色' }})</NText>

      <NDivider />

      <NSpace vertical size="large">
        <NSpace align="center">
          <NText>选择主题:</NText>
          <NSelect
            :value="currentTheme"
            :options="themeOptions"
            style="width: 200px"
            @update:value="handleThemeChange"
          />
          <NButton @click="toggleDark">切换深色/浅色</NButton>
        </NSpace>

        <NDivider />

        <NSpace>
          <NButton type="primary">Primary</NButton>
          <NButton type="info">Info</NButton>
          <NButton type="success">Success</NButton>
          <NButton type="warning">Warning</NButton>
          <NButton type="error">Error</NButton>
          <NButton>Default</NButton>
        </NSpace>

        <NSpace>
          <NButton type="primary" secondary>Primary</NButton>
          <NButton type="info" secondary>Info</NButton>
          <NButton type="success" secondary>Success</NButton>
          <NButton type="warning" secondary>Warning</NButton>
          <NButton type="error" secondary>Error</NButton>
        </NSpace>

        <NSpace>
          <NButton type="primary" tertiary>Primary</NButton>
          <NButton type="info" tertiary>Info</NButton>
          <NButton type="success" tertiary>Success</NButton>
          <NButton type="warning" tertiary>Warning</NButton>
          <NButton type="error" tertiary>Error</NButton>
        </NSpace>
      </NSpace>
    </NCard>
  </div>
</template>

<style scoped lang="scss">
.home-view {
  min-height: 100vh;
  padding: var(--spacing-6);
  background-color: var(--color-bg);
}

.demo-card {
  max-width: 800px;
  margin: 0 auto;
}
</style>
