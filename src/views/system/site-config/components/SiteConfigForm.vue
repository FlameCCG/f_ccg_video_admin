<script setup lang="ts">
/**
 * 基础配置表单
 */
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  NForm,
  NFormItem,
  NSwitch,
  NInputNumber,
  NInput,
  NGrid,
  NGridItem,
  NDivider,
  NText,
} from 'naive-ui'
import type { SiteConfig } from '@/api/types'

const props = defineProps<{
  modelValue: SiteConfig | null
  loading?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: SiteConfig]
}>()

const { t } = useI18n()

const formData = computed({
  get: () => props.modelValue,
  set: (val) => {
    if (val) emit('update:modelValue', val)
  },
})

function updateField<K extends keyof SiteConfig>(
  section: K,
  field: keyof SiteConfig[K],
  value: SiteConfig[K][keyof SiteConfig[K]]
): void {
  if (!formData.value) return
  const updated = {
    ...formData.value,
    [section]: {
      ...formData.value[section],
      [field]: value,
    },
  }
  emit('update:modelValue', updated)
}

function updateStorageField(subSection: 'local' | 'minio', field: string, value: unknown): void {
  if (!formData.value) return
  const updated = {
    ...formData.value,
    storage: {
      ...formData.value.storage,
      [subSection]: {
        ...formData.value.storage[subSection],
        [field]: value,
      },
    },
  }
  emit('update:modelValue', updated)
}

function updateStorageRootField(field: keyof SiteConfig['storage'], value: unknown): void {
  if (!formData.value) return
  const updated = {
    ...formData.value,
    storage: {
      ...formData.value.storage,
      [field]: value,
    },
  }
  emit('update:modelValue', updated)
}

function handlePublicPrefixesChange(value: string): void {
  const prefixes = value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  updateStorageField('minio', 'publicPrefixes', prefixes)
}
</script>

<template>
  <n-form v-if="formData" label-placement="left" label-width="180" :disabled="loading">
    <!-- 内容审核 -->
    <n-divider title-placement="left">
      <n-text strong>{{ t('siteConfig.site.contentReview.title') }}</n-text>
    </n-divider>
    <n-form-item :label="t('siteConfig.site.contentReview.enable')">
      <n-switch
        :value="formData.contentReview.enable"
        @update:value="(v: boolean) => updateField('contentReview', 'enable', v)"
      />
      <n-text class="ml-3 text-muted" depth="3">
        {{ t('siteConfig.site.contentReview.enableTip') }}
      </n-text>
    </n-form-item>

    <!-- 登录设置 -->
    <n-divider title-placement="left">
      <n-text strong>{{ t('siteConfig.site.login.title') }}</n-text>
    </n-divider>
    <n-grid :cols="2" :x-gap="24">
      <n-grid-item>
        <n-form-item :label="t('siteConfig.site.login.qqLogin')">
          <n-switch
            :value="formData.login.qqLogin"
            @update:value="(v: boolean) => updateField('login', 'qqLogin', v)"
          />
        </n-form-item>
      </n-grid-item>
      <n-grid-item>
        <n-form-item :label="t('siteConfig.site.login.usernamePwdLogin')">
          <n-switch
            :value="formData.login.usernamePwdLogin"
            @update:value="(v: boolean) => updateField('login', 'usernamePwdLogin', v)"
          />
        </n-form-item>
      </n-grid-item>
      <n-grid-item>
        <n-form-item :label="t('siteConfig.site.login.textGraphicCaptcha')">
          <n-switch
            :value="formData.login.textGraphicCaptcha"
            @update:value="(v: boolean) => updateField('login', 'textGraphicCaptcha', v)"
          />
        </n-form-item>
      </n-grid-item>
      <n-grid-item>
        <n-form-item :label="t('siteConfig.site.login.textClickCaptcha')">
          <n-switch
            :value="formData.login.textClickCaptcha"
            @update:value="(v: boolean) => updateField('login', 'textClickCaptcha', v)"
          />
        </n-form-item>
      </n-grid-item>
      <n-grid-item>
        <n-form-item :label="t('siteConfig.site.login.textClickCaptchaTTL')">
          <n-input-number
            :value="formData.login.textClickCaptchaTTL"
            :min="60"
            :max="3600"
            @update:value="(v) => updateField('login', 'textClickCaptchaTTL', v ?? 300)"
          />
        </n-form-item>
      </n-grid-item>
      <n-grid-item>
        <n-form-item :label="t('siteConfig.site.login.textClickCaptchaPadding')">
          <n-input-number
            :value="formData.login.textClickCaptchaPadding"
            :min="0"
            :max="100"
            @update:value="(v) => updateField('login', 'textClickCaptchaPadding', v ?? 20)"
          />
        </n-form-item>
      </n-grid-item>
    </n-grid>

    <!-- 注册设置 -->
    <n-divider title-placement="left">
      <n-text strong>{{ t('siteConfig.site.register.title') }}</n-text>
    </n-divider>
    <n-grid :cols="2" :x-gap="24">
      <n-grid-item>
        <n-form-item :label="t('siteConfig.site.register.emailCaptcha')">
          <n-switch
            :value="formData.register.emailCaptcha"
            @update:value="(v: boolean) => updateField('register', 'emailCaptcha', v)"
          />
        </n-form-item>
      </n-grid-item>
      <n-grid-item>
        <n-form-item :label="t('siteConfig.site.register.textGraphicCaptcha')">
          <n-switch
            :value="formData.register.textGraphicCaptcha"
            @update:value="(v: boolean) => updateField('register', 'textGraphicCaptcha', v)"
          />
        </n-form-item>
      </n-grid-item>
      <n-grid-item>
        <n-form-item :label="t('siteConfig.site.register.slideCaptcha')">
          <n-switch
            :value="formData.register.slideCaptcha"
            @update:value="(v: boolean) => updateField('register', 'slideCaptcha', v)"
          />
        </n-form-item>
      </n-grid-item>
      <n-grid-item>
        <n-form-item :label="t('siteConfig.site.register.slideCaptchaTTL')">
          <n-input-number
            :value="formData.register.slideCaptchaTTL"
            :min="60"
            :max="3600"
            @update:value="(v) => updateField('register', 'slideCaptchaTTL', v ?? 300)"
          />
        </n-form-item>
      </n-grid-item>
      <n-grid-item>
        <n-form-item :label="t('siteConfig.site.register.slideCaptchaPadding')">
          <n-input-number
            :value="formData.register.slideCaptchaPadding"
            :min="0"
            :max="100"
            @update:value="(v) => updateField('register', 'slideCaptchaPadding', v ?? 10)"
          />
        </n-form-item>
      </n-grid-item>
    </n-grid>

    <!-- 存储设置 -->
    <n-divider title-placement="left">
      <n-text strong>{{ t('siteConfig.site.storage.title') }}</n-text>
    </n-divider>
    <n-grid :cols="2" :x-gap="24">
      <n-grid-item>
        <n-form-item :label="t('siteConfig.site.storage.maxChunkSize')">
          <n-input-number
            :value="formData.storage.maxChunkSize"
            :min="1"
            :max="100"
            @update:value="(v) => updateStorageRootField('maxChunkSize', v ?? 10)"
          >
            <template #suffix>MB</template>
          </n-input-number>
        </n-form-item>
      </n-grid-item>
      <n-grid-item>
        <n-form-item :label="t('siteConfig.site.storage.chunkSize')">
          <n-input-number
            :value="formData.storage.chunkSize"
            :min="1"
            :max="100"
            @update:value="(v) => updateStorageRootField('chunkSize', v ?? 10)"
          >
            <template #suffix>MB</template>
          </n-input-number>
        </n-form-item>
      </n-grid-item>
      <n-grid-item>
        <n-form-item :label="t('siteConfig.site.storage.maxFileSize')">
          <n-input-number
            :value="formData.storage.maxFileSize"
            :min="1"
            :max="10240"
            @update:value="(v) => updateStorageRootField('maxFileSize', v ?? 100)"
          >
            <template #suffix>MB</template>
          </n-input-number>
        </n-form-item>
      </n-grid-item>
      <n-grid-item>
        <n-form-item :label="t('siteConfig.site.storage.maxUploadNum')">
          <n-input-number
            :value="formData.storage.maxUploadNum"
            :min="1"
            :max="100"
            @update:value="(v) => updateStorageRootField('maxUploadNum', v ?? 10)"
          />
        </n-form-item>
      </n-grid-item>
      <n-grid-item :span="2">
        <n-form-item :label="t('siteConfig.site.storage.chunkDir')">
          <n-input
            :value="formData.storage.chunkDir"
            @update:value="(v) => updateStorageRootField('chunkDir', v)"
          />
        </n-form-item>
      </n-grid-item>
    </n-grid>

    <!-- 本地存储 -->
    <n-divider title-placement="left" dashed>
      <n-text>{{ t('siteConfig.site.storage.local.title') }}</n-text>
    </n-divider>
    <n-grid :cols="2" :x-gap="24">
      <n-grid-item>
        <n-form-item :label="t('siteConfig.site.storage.local.enable')">
          <n-switch
            :value="formData.storage.local.enable"
            @update:value="(v: boolean) => updateStorageField('local', 'enable', v)"
          />
        </n-form-item>
      </n-grid-item>
      <n-grid-item>
        <n-form-item :label="t('siteConfig.site.storage.local.path')">
          <n-input
            :value="formData.storage.local.path"
            @update:value="(v) => updateStorageField('local', 'path', v)"
          />
        </n-form-item>
      </n-grid-item>
    </n-grid>

    <!-- MinIO存储 -->
    <n-divider title-placement="left" dashed>
      <n-text>{{ t('siteConfig.site.storage.minio.title') }}</n-text>
    </n-divider>
    <n-grid :cols="2" :x-gap="24">
      <n-grid-item>
        <n-form-item :label="t('siteConfig.site.storage.minio.enable')">
          <n-switch
            :value="formData.storage.minio.enable"
            @update:value="(v: boolean) => updateStorageField('minio', 'enable', v)"
          />
        </n-form-item>
      </n-grid-item>
      <n-grid-item>
        <n-form-item :label="t('siteConfig.site.storage.minio.useSSL')">
          <n-switch
            :value="formData.storage.minio.useSSL"
            @update:value="(v: boolean) => updateStorageField('minio', 'useSSL', v)"
          />
        </n-form-item>
      </n-grid-item>
      <n-grid-item>
        <n-form-item :label="t('siteConfig.site.storage.minio.endpoint')">
          <n-input
            :value="formData.storage.minio.endpoint"
            @update:value="(v) => updateStorageField('minio', 'endpoint', v)"
          />
        </n-form-item>
      </n-grid-item>
      <n-grid-item>
        <n-form-item :label="t('siteConfig.site.storage.minio.bucket')">
          <n-input
            :value="formData.storage.minio.bucket"
            @update:value="(v) => updateStorageField('minio', 'bucket', v)"
          />
        </n-form-item>
      </n-grid-item>
      <n-grid-item>
        <n-form-item :label="t('siteConfig.site.storage.minio.accessKey')">
          <n-input
            :value="formData.storage.minio.accessKey"
            @update:value="(v) => updateStorageField('minio', 'accessKey', v)"
          />
        </n-form-item>
      </n-grid-item>
      <n-grid-item>
        <n-form-item :label="t('siteConfig.site.storage.minio.secretKey')">
          <n-input
            :value="formData.storage.minio.secretKey"
            type="password"
            show-password-on="click"
            @update:value="(v) => updateStorageField('minio', 'secretKey', v)"
          />
        </n-form-item>
      </n-grid-item>
      <n-grid-item>
        <n-form-item :label="t('siteConfig.site.storage.minio.userUploadPrefix')">
          <n-input
            :value="formData.storage.minio.userUploadPrefix"
            @update:value="(v) => updateStorageField('minio', 'userUploadPrefix', v)"
          />
        </n-form-item>
      </n-grid-item>
      <n-grid-item>
        <n-form-item :label="t('siteConfig.site.storage.minio.publicPrefixes')">
          <n-input
            :value="formData.storage.minio.publicPrefixes.join(', ')"
            :placeholder="t('siteConfig.site.storage.minio.publicPrefixesTip')"
            @update:value="handlePublicPrefixesChange"
          />
        </n-form-item>
      </n-grid-item>
    </n-grid>
  </n-form>
</template>

<style scoped lang="scss">
.ml-3 {
  margin-left: 12px;
}

.text-muted {
  font-size: 12px;
}
</style>
