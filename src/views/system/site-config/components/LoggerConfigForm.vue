<script setup lang="ts">
/**
 * 日志配置表单
 */
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { NForm, NFormItem, NSwitch, NInputNumber, NInput, NGrid, NGridItem, NText } from 'naive-ui'
import type { LoggerConfig } from '@/api/types'

const props = defineProps<{
  modelValue: LoggerConfig | null
  loading?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: LoggerConfig]
}>()

const { t } = useI18n()

const formData = computed({
  get: () => props.modelValue,
  set: (val) => {
    if (val) emit('update:modelValue', val)
  },
})

function updateField<K extends keyof LoggerConfig>(field: K, value: LoggerConfig[K]): void {
  if (!formData.value) return
  emit('update:modelValue', { ...formData.value, [field]: value })
}
</script>

<template>
  <n-form v-if="formData" label-placement="left" label-width="180" :disabled="loading">
    <n-grid :cols="2" :x-gap="24">
      <n-grid-item :span="2">
        <n-form-item :label="t('siteConfig.logger.debugFileName')">
          <n-input
            :value="formData.debugFileName"
            @update:value="(v) => updateField('debugFileName', v)"
          />
        </n-form-item>
      </n-grid-item>
      <n-grid-item :span="2">
        <n-form-item :label="t('siteConfig.logger.infoFileName')">
          <n-input
            :value="formData.infoFileName"
            @update:value="(v) => updateField('infoFileName', v)"
          />
        </n-form-item>
      </n-grid-item>
      <n-grid-item :span="2">
        <n-form-item :label="t('siteConfig.logger.warnFileName')">
          <n-input
            :value="formData.warnFileName"
            @update:value="(v) => updateField('warnFileName', v)"
          />
        </n-form-item>
      </n-grid-item>
      <n-grid-item :span="2">
        <n-form-item :label="t('siteConfig.logger.errorFileName')">
          <n-input
            :value="formData.errorFileName"
            @update:value="(v) => updateField('errorFileName', v)"
          />
        </n-form-item>
      </n-grid-item>
      <n-grid-item>
        <n-form-item :label="t('siteConfig.logger.enableConsole')">
          <n-switch
            :value="formData.enableConsole"
            @update:value="(v: boolean) => updateField('enableConsole', v)"
          />
        </n-form-item>
      </n-grid-item>
      <n-grid-item>
        <n-form-item :label="t('siteConfig.logger.development')">
          <n-switch
            :value="formData.development"
            @update:value="(v: boolean) => updateField('development', v)"
          />
        </n-form-item>
      </n-grid-item>
      <n-grid-item>
        <n-form-item :label="t('siteConfig.logger.maxSize')">
          <n-input-number
            :value="formData.maxSize"
            :min="1"
            :max="10240"
            @update:value="(v) => updateField('maxSize', v ?? 500)"
          >
            <template #suffix>MB</template>
          </n-input-number>
          <n-text class="ml-2" depth="3">{{ t('siteConfig.logger.sizeTip') }}</n-text>
        </n-form-item>
      </n-grid-item>
      <n-grid-item>
        <n-form-item :label="t('siteConfig.logger.maxAge')">
          <n-input-number
            :value="formData.maxAge"
            :min="1"
            :max="365"
            @update:value="(v) => updateField('maxAge', v ?? 28)"
          />
          <n-text class="ml-2" depth="3">{{ t('siteConfig.logger.daysTip') }}</n-text>
        </n-form-item>
      </n-grid-item>
      <n-grid-item>
        <n-form-item :label="t('siteConfig.logger.maxBackups')">
          <n-input-number
            :value="formData.maxBackups"
            :min="1"
            :max="100"
            @update:value="(v) => updateField('maxBackups', v ?? 3)"
          />
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
