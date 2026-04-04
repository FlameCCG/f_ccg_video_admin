<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { NButton, NCard, NSpace, NSelect, NH1, NText, NDivider } from 'naive-ui'
import { useTheme, themeConfigs, type ThemeName } from '@/composables'

const { t } = useI18n()
const { currentTheme, setTheme, toggleDark, isDark } = useTheme()

const themeOptions = computed(() => {
  return themeConfigs.map((tConf) => {
    let localizedLabel = tConf.label
    try {
      localizedLabel = t(`layout.theme.${tConf.name}`)
    } catch {
      // Fallback to default label if translation fails
    }
    return {
      label: `${localizedLabel} (${tConf.label})`,
      value: tConf.name,
    }
  })
})

const handleThemeChange = (value: ThemeName) => {
  setTheme(value)
}
</script>

<template>
  <div class="home-view">
    <NCard class="demo-card">
      <NH1>{{ t('common.home.themeDemo') }}</NH1>
      <NText depth="3">
        {{
          t('common.home.currentTheme', {
            theme: `${currentTheme} (${isDark ? t('common.home.dark') : t('common.home.light')})`,
          })
        }}
      </NText>

      <NDivider />

      <NSpace vertical size="large">
        <NSpace align="center">
          <NText>{{ t('common.home.selectTheme') }}</NText>
          <NSelect
            :value="currentTheme"
            :options="themeOptions"
            style="width: 200px"
            @update:value="handleThemeChange"
          />
          <NButton @click="toggleDark">{{ t('common.home.toggleTheme') }}</NButton>
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
