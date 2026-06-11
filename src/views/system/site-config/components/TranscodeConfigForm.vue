<script setup lang="ts">
/**
 * 转码配置表单
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
  NText,
  NDivider,
  NCheckboxGroup,
  NCheckbox,
  NSpace,
} from 'naive-ui'
import type { TranscodeConfig } from '@/api/types'

const props = defineProps<{
  modelValue: TranscodeConfig | null
  loading?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: TranscodeConfig]
}>()

const { t } = useI18n()

const formData = computed({
  get: () => props.modelValue,
  set: (val) => {
    if (val) emit('update:modelValue', val)
  },
})

const resolutionOptions = [
  { label: '360p', value: 360 },
  { label: '720p', value: 720 },
  { label: '1080p', value: 1080 },
  { label: '2160p (4K)', value: 2160 },
]

function updateField<K extends keyof TranscodeConfig>(field: K, value: TranscodeConfig[K]): void {
  if (!formData.value) return
  emit('update:modelValue', { ...formData.value, [field]: value })
}

function handleResolutionsChange(values: (string | number)[]): void {
  updateField(
    'transcodeResolutions',
    values.filter((v): v is number => typeof v === 'number')
  )
}
</script>

<template>
  <n-form v-if="formData" label-placement="left" label-width="200" :disabled="loading">
    <!-- 基础设置 -->
    <n-grid :cols="2" :x-gap="24">
      <n-grid-item>
        <n-form-item :label="t('siteConfig.transcode.maxWorkers')">
          <n-input-number
            :value="formData.maxWorkers"
            :min="1"
            :max="32"
            @update:value="(v) => updateField('maxWorkers', v ?? 2)"
          />
        </n-form-item>
      </n-grid-item>
      <n-grid-item>
        <n-form-item :label="t('siteConfig.transcode.threads')">
          <n-input-number
            :value="formData.threads"
            :min="1"
            :max="64"
            @update:value="(v) => updateField('threads', v ?? 8)"
          />
        </n-form-item>
      </n-grid-item>
      <n-grid-item :span="2">
        <n-form-item :label="t('siteConfig.transcode.transcodeResolutions')">
          <n-checkbox-group
            :value="formData.transcodeResolutions"
            @update:value="handleResolutionsChange"
          >
            <n-space>
              <n-checkbox
                v-for="opt in resolutionOptions"
                :key="opt.value"
                :value="opt.value"
                :label="opt.label"
              />
            </n-space>
          </n-checkbox-group>
        </n-form-item>
      </n-grid-item>
    </n-grid>

    <!-- 码率设置 -->
    <n-divider title-placement="left">
      <n-text>{{ t('siteConfig.transcode.highBitrateThreshold') }}</n-text>
    </n-divider>
    <n-grid :cols="2" :x-gap="24">
      <n-grid-item>
        <n-form-item :label="t('siteConfig.transcode.highBitrateThreshold')">
          <n-input-number
            :value="formData.highBitrateThreshold"
            :min="1000"
            :max="50000"
            @update:value="(v) => updateField('highBitrateThreshold', v ?? 4000)"
          >
            <template #suffix>Kbps</template>
          </n-input-number>
        </n-form-item>
      </n-grid-item>
      <n-grid-item>
        <n-form-item :label="t('siteConfig.transcode.bitrate2160KbpsReduceRatio')">
          <n-input-number
            :value="formData.bitrate2160KbpsReduceRatio"
            :min="0"
            :max="100"
            @update:value="(v) => updateField('bitrate2160KbpsReduceRatio', v ?? 20)"
          >
            <template #suffix>%</template>
          </n-input-number>
        </n-form-item>
      </n-grid-item>
      <n-grid-item>
        <n-form-item :label="t('siteConfig.transcode.bitrate1080KbpsReduceRatio')">
          <n-input-number
            :value="formData.bitrate1080KbpsReduceRatio"
            :min="0"
            :max="100"
            @update:value="(v) => updateField('bitrate1080KbpsReduceRatio', v ?? 30)"
          >
            <template #suffix>%</template>
          </n-input-number>
        </n-form-item>
      </n-grid-item>
      <n-grid-item>
        <n-form-item :label="t('siteConfig.transcode.bitrate720KbpsReduceRatio')">
          <n-input-number
            :value="formData.bitrate720KbpsReduceRatio"
            :min="0"
            :max="100"
            @update:value="(v) => updateField('bitrate720KbpsReduceRatio', v ?? 50)"
          >
            <template #suffix>%</template>
          </n-input-number>
        </n-form-item>
      </n-grid-item>
      <n-grid-item>
        <n-form-item :label="t('siteConfig.transcode.bitrate360KbpsReduceRatio')">
          <n-input-number
            :value="formData.bitrate360KbpsReduceRatio"
            :min="0"
            :max="100"
            @update:value="(v) => updateField('bitrate360KbpsReduceRatio', v ?? 90)"
          >
            <template #suffix>%</template>
          </n-input-number>
        </n-form-item>
      </n-grid-item>
    </n-grid>

    <!-- CPU 模式 -->
    <n-divider title-placement="left">
      <n-text>CPU {{ t('siteConfig.transcode.cpuMode') }}</n-text>
    </n-divider>
    <n-grid :cols="2" :x-gap="24">
      <n-grid-item>
        <n-form-item :label="t('siteConfig.transcode.cpuMode')">
          <n-switch
            :value="formData.cpuMode"
            @update:value="(v: boolean) => updateField('cpuMode', v)"
          />
        </n-form-item>
      </n-grid-item>
      <n-grid-item>
        <n-form-item :label="t('siteConfig.transcode.cpuPreset')">
          <n-input :value="formData.cpuPreset" @update:value="(v) => updateField('cpuPreset', v)" />
        </n-form-item>
      </n-grid-item>
      <n-grid-item>
        <n-form-item :label="t('siteConfig.transcode.crfHigh')">
          <n-input-number
            :value="formData.crfHigh"
            :min="0"
            :max="51"
            @update:value="(v) => updateField('crfHigh', v ?? 18)"
          />
        </n-form-item>
      </n-grid-item>
      <n-grid-item>
        <n-form-item :label="t('siteConfig.transcode.crfMedium')">
          <n-input-number
            :value="formData.crfMedium"
            :min="0"
            :max="51"
            @update:value="(v) => updateField('crfMedium', v ?? 23)"
          />
        </n-form-item>
      </n-grid-item>
      <n-grid-item>
        <n-form-item :label="t('siteConfig.transcode.crf720')">
          <n-input-number
            :value="formData.crf720"
            :min="0"
            :max="51"
            @update:value="(v) => updateField('crf720', v ?? 24)"
          />
        </n-form-item>
      </n-grid-item>
      <n-grid-item>
        <n-form-item :label="t('siteConfig.transcode.crf360')">
          <n-input-number
            :value="formData.crf360"
            :min="0"
            :max="51"
            @update:value="(v) => updateField('crf360', v ?? 28)"
          />
        </n-form-item>
      </n-grid-item>
    </n-grid>

    <!-- GPU 模式 -->
    <n-divider title-placement="left">
      <n-text>GPU {{ t('siteConfig.transcode.gpuMode') }}</n-text>
    </n-divider>
    <n-grid :cols="2" :x-gap="24">
      <n-grid-item>
        <n-form-item :label="t('siteConfig.transcode.gpuMode')">
          <n-switch
            :value="formData.gpuMode"
            @update:value="(v: boolean) => updateField('gpuMode', v)"
          />
        </n-form-item>
      </n-grid-item>
      <n-grid-item>
        <n-form-item :label="t('siteConfig.transcode.hardwareScale')">
          <n-switch
            :value="formData.hardwareScale"
            @update:value="(v: boolean) => updateField('hardwareScale', v)"
          />
        </n-form-item>
      </n-grid-item>
      <n-grid-item>
        <n-form-item :label="t('siteConfig.transcode.gpuPreset')">
          <n-input :value="formData.gpuPreset" @update:value="(v) => updateField('gpuPreset', v)" />
        </n-form-item>
      </n-grid-item>
      <n-grid-item>
        <n-form-item :label="t('siteConfig.transcode.gpuCQPHigh')">
          <n-input-number
            :value="formData.gpuCQPHigh"
            :min="0"
            :max="51"
            @update:value="(v) => updateField('gpuCQPHigh', v ?? 18)"
          />
        </n-form-item>
      </n-grid-item>
      <n-grid-item>
        <n-form-item :label="t('siteConfig.transcode.gpuCQPMedium')">
          <n-input-number
            :value="formData.gpuCQPMedium"
            :min="0"
            :max="51"
            @update:value="(v) => updateField('gpuCQPMedium', v ?? 22)"
          />
        </n-form-item>
      </n-grid-item>
      <n-grid-item>
        <n-form-item :label="t('siteConfig.transcode.gpuCQP720')">
          <n-input-number
            :value="formData.gpuCQP720"
            :min="0"
            :max="51"
            @update:value="(v) => updateField('gpuCQP720', v ?? 24)"
          />
        </n-form-item>
      </n-grid-item>
      <n-grid-item>
        <n-form-item :label="t('siteConfig.transcode.gpuCQP360')">
          <n-input-number
            :value="formData.gpuCQP360"
            :min="0"
            :max="51"
            @update:value="(v) => updateField('gpuCQP360', v ?? 28)"
          />
        </n-form-item>
      </n-grid-item>
    </n-grid>

    <!-- DASH 设置 -->
    <n-divider title-placement="left">
      <n-text>{{ t('siteConfig.transcode.dashTitle') }}</n-text>
    </n-divider>
    <n-grid :cols="2" :x-gap="24">
      <n-grid-item>
        <n-form-item :label="t('siteConfig.transcode.dashEnable')">
          <n-switch
            :value="formData.dashEnable"
            @update:value="(v: boolean) => updateField('dashEnable', v)"
          />
        </n-form-item>
      </n-grid-item>
      <n-grid-item>
        <n-form-item :label="t('siteConfig.transcode.dashSegDuration')">
          <n-input-number
            :value="formData.dashSegDuration"
            :min="1"
            :max="30"
            @update:value="(v) => updateField('dashSegDuration', v ?? 4)"
          >
            <template #suffix>秒</template>
          </n-input-number>
        </n-form-item>
      </n-grid-item>
    </n-grid>
  </n-form>
</template>
