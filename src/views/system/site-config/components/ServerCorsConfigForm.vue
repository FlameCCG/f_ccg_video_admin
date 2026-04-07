<script setup lang="ts">
/**
 * CORS 跨域白名单配置（仅 corsOrigins）
 */
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { NForm, NFormItem, NDynamicTags, NText, NAlert } from 'naive-ui'
import type { ServerCorsConfig } from '@/api/types'

const props = defineProps<{
  modelValue: ServerCorsConfig | null
  loading?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: ServerCorsConfig]
}>()

const { t } = useI18n()

const formData = computed({
  get: () => props.modelValue,
  set: (val) => {
    if (val) emit('update:modelValue', val)
  },
})

function updateOrigins(value: string[]): void {
  if (!formData.value) return
  emit('update:modelValue', {
    ...formData.value,
    corsOrigins: value ?? [],
  })
}
</script>

<template>
  <n-form v-if="formData" label-placement="top" :disabled="loading">
    <n-alert type="info" :bordered="false" class="cors-alert">
      {{ t('siteConfig.server.tip') }}
    </n-alert>

    <n-form-item :label="t('siteConfig.server.corsOrigins')">
      <n-dynamic-tags
        :value="formData.corsOrigins"
        :input-props="{ placeholder: t('siteConfig.server.placeholder') }"
        @update:value="updateOrigins"
      />
    </n-form-item>

    <n-text depth="3" class="cors-hint">
      {{ t('siteConfig.server.hint') }}
    </n-text>
  </n-form>
</template>

<style scoped lang="scss">
.cors-alert {
  margin-bottom: 16px;
}

.cors-hint {
  display: block;
  margin-top: 8px;
  font-size: 12px;
  line-height: 1.6;
}
</style>
