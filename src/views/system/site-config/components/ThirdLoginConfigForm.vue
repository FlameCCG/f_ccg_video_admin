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

function updateOAuthField(
  provider: 'google' | 'github' | 'x',
  field: 'clientID' | 'clientSecret' | 'redirect',
  value: string
): void {
  if (!formData.value) return
  emit('update:modelValue', {
    ...formData.value,
    [provider]: {
      ...formData.value[provider],
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

    <!-- Google 登录 -->
    <n-divider title-placement="left">
      <n-text strong>{{ t('siteConfig.thirdLogin.google.title') }}</n-text>
    </n-divider>
    <n-grid :cols="2" :x-gap="24">
      <n-grid-item>
        <n-form-item :label="t('siteConfig.thirdLogin.google.clientID')">
          <n-input
            :value="formData.google.clientID"
            @update:value="(v) => updateOAuthField('google', 'clientID', v)"
          />
        </n-form-item>
      </n-grid-item>
      <n-grid-item>
        <n-form-item :label="t('siteConfig.thirdLogin.google.clientSecret')">
          <n-input
            :value="formData.google.clientSecret"
            type="password"
            show-password-on="click"
            @update:value="(v) => updateOAuthField('google', 'clientSecret', v)"
          />
        </n-form-item>
      </n-grid-item>
      <n-grid-item :span="2">
        <n-form-item :label="t('siteConfig.thirdLogin.google.redirect')">
          <n-input
            :value="formData.google.redirect"
            @update:value="(v) => updateOAuthField('google', 'redirect', v)"
          />
        </n-form-item>
      </n-grid-item>
    </n-grid>

    <!-- GitHub 登录 -->
    <n-divider title-placement="left">
      <n-text strong>{{ t('siteConfig.thirdLogin.github.title') }}</n-text>
    </n-divider>
    <n-grid :cols="2" :x-gap="24">
      <n-grid-item>
        <n-form-item :label="t('siteConfig.thirdLogin.github.clientID')">
          <n-input
            :value="formData.github.clientID"
            @update:value="(v) => updateOAuthField('github', 'clientID', v)"
          />
        </n-form-item>
      </n-grid-item>
      <n-grid-item>
        <n-form-item :label="t('siteConfig.thirdLogin.github.clientSecret')">
          <n-input
            :value="formData.github.clientSecret"
            type="password"
            show-password-on="click"
            @update:value="(v) => updateOAuthField('github', 'clientSecret', v)"
          />
        </n-form-item>
      </n-grid-item>
      <n-grid-item :span="2">
        <n-form-item :label="t('siteConfig.thirdLogin.github.redirect')">
          <n-input
            :value="formData.github.redirect"
            @update:value="(v) => updateOAuthField('github', 'redirect', v)"
          />
        </n-form-item>
      </n-grid-item>
    </n-grid>

    <!-- X 登录 -->
    <n-divider title-placement="left">
      <n-text strong>{{ t('siteConfig.thirdLogin.x.title') }}</n-text>
    </n-divider>
    <n-grid :cols="2" :x-gap="24">
      <n-grid-item>
        <n-form-item :label="t('siteConfig.thirdLogin.x.clientID')">
          <n-input
            :value="formData.x.clientID"
            @update:value="(v) => updateOAuthField('x', 'clientID', v)"
          />
        </n-form-item>
      </n-grid-item>
      <n-grid-item>
        <n-form-item :label="t('siteConfig.thirdLogin.x.clientSecret')">
          <n-input
            :value="formData.x.clientSecret"
            type="password"
            show-password-on="click"
            @update:value="(v) => updateOAuthField('x', 'clientSecret', v)"
          />
        </n-form-item>
      </n-grid-item>
      <n-grid-item :span="2">
        <n-form-item :label="t('siteConfig.thirdLogin.x.redirect')">
          <n-input
            :value="formData.x.redirect"
            @update:value="(v) => updateOAuthField('x', 'redirect', v)"
          />
        </n-form-item>
      </n-grid-item>
    </n-grid>
  </n-form>
</template>
