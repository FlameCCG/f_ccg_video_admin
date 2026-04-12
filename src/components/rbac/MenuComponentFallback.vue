<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { NCard, NCode, NResult, NText } from 'naive-ui'

interface Props {
  menuTitle: string
  componentPath?: string
  reason: 'missing-path' | 'not-found' | 'render-error'
}

const props = defineProps<Props>()
const { t } = useI18n()

const title = computed(() =>
  props.reason === 'missing-path'
    ? t('error.menuComponent.missingPathTitle', { title: props.menuTitle })
    : t('error.menuComponent.unavailableTitle', { title: props.menuTitle })
)

const description = computed(() =>
  props.reason === 'render-error'
    ? t('error.menuComponent.renderError')
    : props.reason === 'not-found'
      ? t('error.menuComponent.fileNotFound')
      : t('error.menuComponent.missingPath')
)
</script>

<template>
  <n-card :bordered="false" class="menu-component-fallback">
    <n-result status="warning" :title="title" :description="description">
      <template v-if="componentPath" #footer>
        <div class="menu-component-fallback__path">
          <n-text depth="3">{{ t('error.menuComponent.componentPath') }}</n-text>
          <n-code :code="componentPath" language="text" word-wrap />
        </div>
      </template>
    </n-result>
  </n-card>
</template>

<style scoped lang="scss">
.menu-component-fallback {
  min-height: 50vh;
  display: grid;
  place-items: center;

  &__path {
    display: grid;
    gap: var(--spacing-2);
    min-width: min(32rem, 70vw);
    text-align: left;
  }
}
</style>
