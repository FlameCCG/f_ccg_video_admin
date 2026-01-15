<script setup lang="ts">
/**
 * 邮件配置表单
 */
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { NForm, NFormItem, NSwitch, NInputNumber, NInput, NGrid, NGridItem, NText } from 'naive-ui'
import type { EmailConfig } from '@/api/types'

const props = defineProps<{
  modelValue: EmailConfig | null
  loading?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: EmailConfig]
}>()

const { t } = useI18n()

const formData = computed({
  get: () => props.modelValue,
  set: (val) => {
    if (val) emit('update:modelValue', val)
  },
})

function updateField<K extends keyof EmailConfig>(field: K, value: EmailConfig[K]): void {
  if (!formData.value) return
  emit('update:modelValue', { ...formData.value, [field]: value })
}
</script>

<template>
  <n-form v-if="formData" label-placement="left" label-width="180" :disabled="loading">
    <n-grid :cols="2" :x-gap="24">
      <n-grid-item>
        <n-form-item :label="t('siteConfig.email.domain')">
          <n-input :value="formData.domain" @update:value="(v) => updateField('domain', v)" />
        </n-form-item>
      </n-grid-item>
      <n-grid-item>
        <n-form-item :label="t('siteConfig.email.port')">
          <n-input-number
            :value="formData.port"
            :min="1"
            :max="65535"
            @update:value="(v) => updateField('port', v ?? 587)"
          />
        </n-form-item>
      </n-grid-item>
      <n-grid-item>
        <n-form-item :label="t('siteConfig.email.sendEmail')">
          <n-input :value="formData.sendEmail" @update:value="(v) => updateField('sendEmail', v)" />
        </n-form-item>
      </n-grid-item>
      <n-grid-item>
        <n-form-item :label="t('siteConfig.email.authCode')">
          <n-input
            :value="formData.authCode"
            type="password"
            show-password-on="click"
            @update:value="(v) => updateField('authCode', v)"
          />
        </n-form-item>
      </n-grid-item>
      <n-grid-item :span="2">
        <n-form-item :label="t('siteConfig.email.sendNickName')">
          <n-input
            :value="formData.sendNickName"
            @update:value="(v) => updateField('sendNickName', v)"
          />
        </n-form-item>
      </n-grid-item>
      <n-grid-item>
        <n-form-item :label="t('siteConfig.email.ssl')">
          <n-switch :value="formData.ssl" @update:value="(v: boolean) => updateField('ssl', v)" />
        </n-form-item>
      </n-grid-item>
      <n-grid-item>
        <n-form-item :label="t('siteConfig.email.tls')">
          <n-switch :value="formData.tls" @update:value="(v: boolean) => updateField('tls', v)" />
        </n-form-item>
      </n-grid-item>
      <n-grid-item>
        <n-form-item :label="t('siteConfig.email.isExpire')">
          <n-input-number
            :value="formData.isExpire"
            :min="1"
            :max="60"
            @update:value="(v) => updateField('isExpire', v ?? 10)"
          />
          <n-text class="ml-2" depth="3">{{ t('siteConfig.email.expireTip') }}</n-text>
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
