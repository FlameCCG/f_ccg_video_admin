<script setup lang="ts">
/**
 * AI 配置表单（与后端 conf.AI 对齐）
 * 默认模型/思考强度从对应白名单列表生成下拉，便于切换。
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
  NSwitch,
  NSelect,
} from 'naive-ui'
import type { SelectOption } from 'naive-ui'
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

type ModelListField = 'chatModels' | 'imageModels' | 'videoModels' | 'thinkingEfforts'

function updateModelList(field: ModelListField, value: unknown[]): void {
  const list = value.map((item) => {
    const row = item as Partial<AIModelOption>
    return {
      label: row.label ?? '',
      value: row.value ?? '',
    }
  })
  updateField(field, list)
}

/** 从白名单生成下拉；当前值不在列表中时补一项，避免空白 */
function toSelectOptions(
  list: AIModelOption[] | undefined | null,
  current?: string
): SelectOption[] {
  const seen = new Set<string>()
  const options: SelectOption[] = []

  for (const item of list ?? []) {
    const value = (item.value ?? '').trim()
    if (!value || seen.has(value)) continue
    seen.add(value)
    const label = (item.label ?? '').trim() || value
    options.push({ label, value })
  }

  const cur = (current ?? '').trim()
  if (cur && !seen.has(cur)) {
    options.unshift({ label: cur, value: cur })
  }

  return options
}

const chatModelSelectOptions = computed(() =>
  toSelectOptions(formData.value?.chatModels, formData.value?.chatModel)
)
const imageModelSelectOptions = computed(() =>
  toSelectOptions(formData.value?.imageModels, formData.value?.imageModel)
)
const videoModelSelectOptions = computed(() =>
  toSelectOptions(formData.value?.videoModels, formData.value?.videoModel)
)
const thinkingEffortSelectOptions = computed(() =>
  toSelectOptions(formData.value?.thinkingEfforts, formData.value?.thinkingEffort)
)
</script>

<template>
  <n-form v-if="formData" label-placement="left" label-width="190" :disabled="loading">
    <n-grid :cols="2" :x-gap="24">
      <n-grid-item>
        <n-form-item :label="t('siteConfig.ai.chatModel')">
          <n-select
            :value="formData.chatModel || null"
            :options="chatModelSelectOptions"
            filterable
            tag
            clearable
            :placeholder="t('siteConfig.ai.defaultModelSelectTip')"
            @update:value="(v) => updateField('chatModel', (v as string) ?? '')"
          />
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
        <n-form-item :label="t('siteConfig.ai.thinkingEnabled')">
          <n-space align="center">
            <n-switch
              :value="formData.thinkingEnabled"
              @update:value="(v) => updateField('thinkingEnabled', v)"
            />
            <n-text depth="3" style="font-size: 12px">
              {{ t('siteConfig.ai.thinkingEnabledTip') }}
            </n-text>
          </n-space>
        </n-form-item>
      </n-grid-item>
      <n-grid-item>
        <n-form-item :label="t('siteConfig.ai.thinkingEffort')">
          <n-select
            :value="formData.thinkingEffort || null"
            :options="thinkingEffortSelectOptions"
            :disabled="!formData.thinkingEnabled"
            filterable
            tag
            clearable
            :placeholder="t('siteConfig.ai.defaultModelSelectTip')"
            @update:value="(v) => updateField('thinkingEffort', (v as string) ?? '')"
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
          <n-select
            :value="formData.imageModel || null"
            :options="imageModelSelectOptions"
            filterable
            tag
            clearable
            :placeholder="t('siteConfig.ai.defaultModelSelectTip')"
            @update:value="(v) => updateField('imageModel', (v as string) ?? '')"
          />
        </n-form-item>
      </n-grid-item>
      <n-grid-item>
        <n-form-item :label="t('siteConfig.ai.videoModel')">
          <n-select
            :value="formData.videoModel || null"
            :options="videoModelSelectOptions"
            filterable
            tag
            clearable
            :placeholder="t('siteConfig.ai.defaultModelSelectTip')"
            @update:value="(v) => updateField('videoModel', (v as string) ?? '')"
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

    <!-- 聊天模型白名单 -->
    <n-divider title-placement="left">
      <n-text strong>{{ t('siteConfig.ai.chatModels') }}</n-text>
    </n-divider>
    <n-text depth="3" class="model-list-tip">{{ t('siteConfig.ai.modelListTip') }}</n-text>
    <n-dynamic-input
      class="model-list"
      :value="formData.chatModels ?? []"
      :on-create="createModelOption"
      @update:value="(v) => updateModelList('chatModels', v)"
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

    <!-- 思考强度白名单 -->
    <n-divider title-placement="left">
      <n-text strong>{{ t('siteConfig.ai.thinkingEfforts') }}</n-text>
    </n-divider>
    <n-text depth="3" class="model-list-tip">{{ t('siteConfig.ai.modelListTip') }}</n-text>
    <n-dynamic-input
      class="model-list"
      :value="formData.thinkingEfforts ?? []"
      :disabled="!formData.thinkingEnabled"
      :on-create="createModelOption"
      @update:value="(v) => updateModelList('thinkingEfforts', v)"
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
