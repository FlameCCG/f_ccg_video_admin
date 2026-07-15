<script setup lang="ts">
/**
 * AI 配置表单（与后端 conf.AI 对齐）
 */
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  NForm,
  NFormItem,
  NInput,
  NInputNumber,
  NGrid,
  NGridItem,
  NText,
  NDivider,
  NDynamicInput,
  NSpace,
} from 'naive-ui'
import type { AIConfig, AIModelOption } from '@/api/types'

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

function createModelOption(): AIModelOption {
  return { label: '', value: '' }
}

function updateModelList(field: 'imageModels' | 'videoModels', value: unknown[]): void {
  const list = value.map((item) => {
    const row = item as Partial<AIModelOption>
    return {
      label: row.label ?? '',
      value: row.value ?? '',
    }
  })
  updateField(field, list)
}
</script>

<template>
  <n-form v-if="formData" label-placement="left" label-width="190" :disabled="loading">
    <n-grid :cols="2" :x-gap="24">
      <!-- 可选兼容字段 -->
      <n-grid-item>
        <n-form-item :label="t('siteConfig.ai.baseURL')">
          <n-input
            :value="formData.baseURL ?? ''"
            :placeholder="t('siteConfig.ai.optionalTip')"
            @update:value="(v) => updateField('baseURL', v)"
          />
        </n-form-item>
      </n-grid-item>
      <n-grid-item>
        <n-form-item :label="t('siteConfig.ai.apiKey')">
          <n-input
            :value="formData.apiKey ?? ''"
            type="password"
            show-password-on="click"
            :placeholder="t('siteConfig.ai.optionalTip')"
            @update:value="(v) => updateField('apiKey', v)"
          />
        </n-form-item>
      </n-grid-item>

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
        <n-form-item :label="t('siteConfig.ai.textModel')">
          <n-input
            :value="formData.textModel ?? ''"
            :placeholder="t('siteConfig.ai.optionalTip')"
            @update:value="(v) => updateField('textModel', v)"
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
      <n-grid-item>
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

    <!-- 图片模型白名单 -->
    <n-divider title-placement="left">
      <n-text strong>{{ t('siteConfig.ai.imageModels') }}</n-text>
    </n-divider>
    <n-text depth="3" class="model-list-tip">{{ t('siteConfig.ai.modelListTip') }}</n-text>
    <n-dynamic-input
      class="model-list"
      :value="formData.imageModels ?? []"
      :on-create="createModelOption"
      @update:value="(v) => updateModelList('imageModels', v)"
    >
      <template #default="{ value }">
        <n-space class="model-row" :wrap="false" style="width: 100%">
          <n-input
            v-model:value="value.label"
            :placeholder="t('siteConfig.ai.modelLabel')"
            style="flex: 1"
          />
          <n-input
            v-model:value="value.value"
            :placeholder="t('siteConfig.ai.modelValue')"
            style="flex: 1"
          />
        </n-space>
      </template>
    </n-dynamic-input>

    <!-- 视频模型白名单 -->
    <n-divider title-placement="left">
      <n-text strong>{{ t('siteConfig.ai.videoModels') }}</n-text>
    </n-divider>
    <n-text depth="3" class="model-list-tip">{{ t('siteConfig.ai.modelListTip') }}</n-text>
    <n-dynamic-input
      class="model-list"
      :value="formData.videoModels ?? []"
      :on-create="createModelOption"
      @update:value="(v) => updateModelList('videoModels', v)"
    >
      <template #default="{ value }">
        <n-space class="model-row" :wrap="false" style="width: 100%">
          <n-input
            v-model:value="value.label"
            :placeholder="t('siteConfig.ai.modelLabel')"
            style="flex: 1"
          />
          <n-input
            v-model:value="value.value"
            :placeholder="t('siteConfig.ai.modelValue')"
            style="flex: 1"
          />
        </n-space>
      </template>
    </n-dynamic-input>
  </n-form>
</template>

<style scoped lang="scss">
.ml-2 {
  margin-left: 8px;
  font-size: 12px;
}

.model-list-tip {
  display: block;
  margin-bottom: 12px;
  font-size: 12px;
}

.model-list {
  margin-bottom: 8px;
}

.model-row {
  width: 100%;
}
</style>
