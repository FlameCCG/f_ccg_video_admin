<script setup lang="ts">
/**
 * JWT 配置表单
 */
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { NForm, NFormItem, NInputNumber, NInput, NGrid, NGridItem, NText } from 'naive-ui'
import type { JwtConfig } from '@/api/types'

const props = defineProps<{
  modelValue: JwtConfig | null
  loading?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: JwtConfig]
}>()

const { t } = useI18n()

const formData = computed({
  get: () => props.modelValue,
  set: (val) => {
    if (val) emit('update:modelValue', val)
  },
})

function updateField<K extends keyof JwtConfig>(field: K, value: JwtConfig[K]): void {
  if (!formData.value) return
  emit('update:modelValue', { ...formData.value, [field]: value })
}
</script>

<template>
  <n-form v-if="formData" label-placement="left" label-width="200" :disabled="loading">
    <n-grid :cols="2" :x-gap="24">
      <n-grid-item>
        <n-form-item :label="t('siteConfig.jwt.accessExp')">
          <n-input-number
            :value="formData.accessExp"
            :min="1"
            :max="365"
            @update:value="(v) => updateField('accessExp', v ?? 7)"
          />
          <n-text class="ml-2" depth="3">{{ t('siteConfig.jwt.daysTip') }}</n-text>
        </n-form-item>
      </n-grid-item>
      <n-grid-item>
        <n-form-item :label="t('siteConfig.jwt.refreshExp')">
          <n-input-number
            :value="formData.refreshExp"
            :min="1"
            :max="365"
            @update:value="(v) => updateField('refreshExp', v ?? 30)"
          />
          <n-text class="ml-2" depth="3">{{ t('siteConfig.jwt.daysTip') }}</n-text>
        </n-form-item>
      </n-grid-item>
      <n-grid-item>
        <n-form-item :label="t('siteConfig.jwt.accessSecret')">
          <n-input
            :value="formData.accessSecret"
            type="password"
            show-password-on="click"
            :input-props="{ autocomplete: 'new-password' }"
            @update:value="(v) => updateField('accessSecret', v)"
          />
        </n-form-item>
      </n-grid-item>
      <n-grid-item>
        <n-form-item :label="t('siteConfig.jwt.refreshSecret')">
          <n-input
            :value="formData.refreshSecret"
            type="password"
            show-password-on="click"
            :input-props="{ autocomplete: 'new-password' }"
            @update:value="(v) => updateField('refreshSecret', v)"
          />
        </n-form-item>
      </n-grid-item>
    </n-grid>
    <n-text depth="3" class="secret-tip">
      {{ t('siteConfig.jwt.secretTip') }}
    </n-text>
  </n-form>
</template>

<style scoped lang="scss">
.ml-2 {
  margin-left: 8px;
  font-size: 12px;
}

.secret-tip {
  display: block;
  margin-top: 16px;
  font-size: 12px;
}
</style>
