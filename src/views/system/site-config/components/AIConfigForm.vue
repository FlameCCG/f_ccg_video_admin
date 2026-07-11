<script setup lang="ts">
/**
 * AI 配置表单
 */
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { NForm, NFormItem, NInput, NInputNumber, NGrid, NGridItem, NText } from 'naive-ui'
import type { AIConfig } from '@/api/types'

const props = defineProps<{
  modelValue: AIConfig | null
  loading?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: AIConfig]
}>()

const { t } = useI18n()

const formData = computed({
  get: () => props.modelValue,
  set: (val) => {
    if (val) emit('update:modelValue', val)
  },
})

function updateField<K extends keyof AIConfig>(field: K, value: AIConfig[K]): void {
  if (!formData.value) return
  emit('update:modelValue', { ...formData.value, [field]: value })
}
</script>

<template>
  <n-form v-if="formData" label-placement="left" label-width="190" :disabled="loading">
    <n-grid :cols="2" :x-gap="24">
      <n-grid-item>
        <n-form-item :label="t('siteConfig.ai.chatModel')">
          <n-input :value="formData.chatModel" @update:value="(v) => updateField('chatModel', v)" />
        </n-form-item>
      </n-grid-item>

      <n-grid-item>
        <n-form-item :label="t('siteConfig.ai.chatModelBaseURL')">
          <n-input
            :value="formData.chatModelBaseURL"
            @update:value="(v) => updateField('chatModelBaseURL', v)"
          />
        </n-form-item>
      </n-grid-item>

      <n-grid-item :span="2">
        <n-form-item :label="t('siteConfig.ai.chatModelAPIKey')">
          <n-input
            :value="formData.chatModelAPIKey"
            type="password"
            show-password-on="click"
            @update:value="(v) => updateField('chatModelAPIKey', v)"
          />
        </n-form-item>
      </n-grid-item>

      <n-grid-item>
        <n-form-item :label="t('siteConfig.ai.embeddingModel')">
          <n-input
            :value="formData.embeddingModel"
            @update:value="(v) => updateField('embeddingModel', v)"
          />
        </n-form-item>
      </n-grid-item>

      <n-grid-item>
        <n-form-item :label="t('siteConfig.ai.embeddingDimensions')">
          <n-input-number
            :value="formData.embeddingDimensions"
            :min="1"
            :max="8192"
            @update:value="(v) => updateField('embeddingDimensions', v ?? 2048)"
          />
        </n-form-item>
      </n-grid-item>

      <n-grid-item :span="2">
        <n-form-item :label="t('siteConfig.ai.embeddingModelBaseURL')">
          <n-input
            :value="formData.embeddingModelBaseURL"
            @update:value="(v) => updateField('embeddingModelBaseURL', v)"
          />
        </n-form-item>
      </n-grid-item>

      <n-grid-item :span="2">
        <n-form-item :label="t('siteConfig.ai.doubaoModelAPIKey')">
          <n-input
            :value="formData.doubaoModelAPIKey"
            type="password"
            show-password-on="click"
            @update:value="(v) => updateField('doubaoModelAPIKey', v)"
          />
        </n-form-item>
      </n-grid-item>

      <n-grid-item>
        <n-form-item :label="t('siteConfig.ai.imageModel')">
          <n-input
            :value="formData.imageModel"
            @update:value="(v) => updateField('imageModel', v)"
          />
        </n-form-item>
      </n-grid-item>

      <n-grid-item>
        <n-form-item :label="t('siteConfig.ai.videoModel')">
          <n-input
            :value="formData.videoModel"
            @update:value="(v) => updateField('videoModel', v)"
          />
        </n-form-item>
      </n-grid-item>

      <n-grid-item>
        <n-form-item :label="t('siteConfig.ai.vectorIndex')">
          <n-input
            :value="formData.vectorIndex"
            @update:value="(v) => updateField('vectorIndex', v)"
          />
        </n-form-item>
      </n-grid-item>

      <n-grid-item>
        <n-form-item :label="t('siteConfig.ai.vectorTopK')">
          <n-input-number
            :value="formData.vectorTopK"
            :min="1"
            :max="64"
            @update:value="(v) => updateField('vectorTopK', v ?? 8)"
          />
        </n-form-item>
      </n-grid-item>

      <n-grid-item :span="2">
        <n-form-item :label="t('siteConfig.ai.systemPrompt')">
          <n-input
            :value="formData.systemPrompt"
            type="textarea"
            :autosize="{ minRows: 3, maxRows: 8 }"
            @update:value="(v) => updateField('systemPrompt', v)"
          />
        </n-form-item>
      </n-grid-item>

      <n-grid-item>
        <n-form-item :label="t('siteConfig.ai.maxInputWorks')">
          <n-input-number
            :value="formData.maxInputWorks"
            :min="1"
            :max="64"
            @update:value="(v) => updateField('maxInputWorks', v ?? 8)"
          />
        </n-form-item>
      </n-grid-item>

      <n-grid-item>
        <n-form-item :label="t('siteConfig.ai.timeoutSec')">
          <n-input-number
            :value="formData.timeoutSec"
            :min="1"
            :max="600"
            @update:value="(v) => updateField('timeoutSec', v ?? 60)"
          />
          <n-text class="ml-2" depth="3">{{ t('siteConfig.ai.secondsTip') }}</n-text>
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
