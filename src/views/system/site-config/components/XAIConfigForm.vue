<script setup lang="ts">
/**
 * xAI 配置表单
 */
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { NForm, NFormItem, NInput, NInputNumber, NGrid, NGridItem, NText } from 'naive-ui'
import type { XAIConfig } from '@/api/types'

const props = defineProps<{
  modelValue: XAIConfig | null
  loading?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: XAIConfig]
}>()

const { t } = useI18n()

const formData = computed({
  get: () => props.modelValue,
  set: (val) => {
    if (val) emit('update:modelValue', val)
  },
})

function updateField<K extends keyof XAIConfig>(field: K, value: XAIConfig[K]): void {
  if (!formData.value) return
  emit('update:modelValue', { ...formData.value, [field]: value })
}
</script>

<template>
  <n-form v-if="formData" label-placement="left" label-width="180" :disabled="loading">
    <n-grid :cols="2" :x-gap="24">
      <n-grid-item :span="2">
        <n-form-item :label="t('siteConfig.xai.baseURL')">
          <n-input :value="formData.baseURL" @update:value="(v) => updateField('baseURL', v)" />
        </n-form-item>
      </n-grid-item>

      <n-grid-item :span="2">
        <n-form-item :label="t('siteConfig.xai.apiKey')">
          <n-input
            :value="formData.apiKey"
            type="password"
            show-password-on="click"
            @update:value="(v) => updateField('apiKey', v)"
          />
        </n-form-item>
      </n-grid-item>

      <n-grid-item :span="2">
        <n-form-item :label="t('siteConfig.xai.systemPrompt')">
          <n-input
            :value="formData.systemPrompt"
            type="textarea"
            :autosize="{ minRows: 3, maxRows: 8 }"
            @update:value="(v) => updateField('systemPrompt', v)"
          />
        </n-form-item>
      </n-grid-item>

      <n-grid-item>
        <n-form-item :label="t('siteConfig.xai.textModel')">
          <n-input :value="formData.textModel" @update:value="(v) => updateField('textModel', v)" />
        </n-form-item>
      </n-grid-item>

      <n-grid-item>
        <n-form-item :label="t('siteConfig.xai.imageModel')">
          <n-input
            :value="formData.imageModel"
            @update:value="(v) => updateField('imageModel', v)"
          />
        </n-form-item>
      </n-grid-item>

      <n-grid-item>
        <n-form-item :label="t('siteConfig.xai.videoModel')">
          <n-input
            :value="formData.videoModel"
            @update:value="(v) => updateField('videoModel', v)"
          />
        </n-form-item>
      </n-grid-item>

      <n-grid-item>
        <n-form-item :label="t('siteConfig.xai.timeoutSec')">
          <n-input-number
            :value="formData.timeoutSec"
            :min="1"
            :max="600"
            @update:value="(v) => updateField('timeoutSec', v ?? 60)"
          />
          <n-text class="ml-2" depth="3">{{ t('siteConfig.xai.secondsTip') }}</n-text>
        </n-form-item>
      </n-grid-item>
    </n-grid>
  </n-form>
</template>

<style scoped lang="scss">
.ml-2 {
  margin-left: 8px;
  font-size: 12px;
}
</style>
