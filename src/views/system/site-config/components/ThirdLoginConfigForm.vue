<script setup lang="ts">
/**
 * 第三方登录配置表单
 */
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { NForm, NFormItem, NInput, NGrid, NGridItem, NDivider, NText } from 'naive-ui'
import type { ThirdLoginConfig } from '@/api/types'

const props = defineProps<{
  modelValue: ThirdLoginConfig | null
  loading?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: ThirdLoginConfig]
}>()

const { t } = useI18n()

const formData = computed({
  get: () => props.modelValue,
  set: (val) => {
    if (val) emit('update:modelValue', val)
  },
})

function updateQQField(field: 'appID' | 'appKey' | 'redirect', value: string): void {
  if (!formData.value) return
  emit('update:modelValue', {
    ...formData.value,
    qq: {
      ...formData.value.qq,
      [field]: value,
    },
  })
}
</script>

<template>
  <n-form v-if="formData" label-placement="left" label-width="180" :disabled="loading">
    <!-- QQ 登录 -->
    <n-divider title-placement="left">
      <n-text strong>{{ t('siteConfig.thirdLogin.qq.title') }}</n-text>
    </n-divider>
    <n-grid :cols="2" :x-gap="24">
      <n-grid-item>
        <n-form-item :label="t('siteConfig.thirdLogin.qq.appID')">
          <n-input :value="formData.qq.appID" @update:value="(v) => updateQQField('appID', v)" />
        </n-form-item>
      </n-grid-item>
      <n-grid-item>
        <n-form-item :label="t('siteConfig.thirdLogin.qq.appKey')">
          <n-input
            :value="formData.qq.appKey"
            type="password"
            show-password-on="click"
            @update:value="(v) => updateQQField('appKey', v)"
          />
        </n-form-item>
      </n-grid-item>
      <n-grid-item :span="2">
        <n-form-item :label="t('siteConfig.thirdLogin.qq.redirect')">
          <n-input
            :value="formData.qq.redirect"
            @update:value="(v) => updateQQField('redirect', v)"
          />
        </n-form-item>
      </n-grid-item>
    </n-grid>
  </n-form>
</template>
