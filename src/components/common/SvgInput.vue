<script setup lang="ts">
/**
 * SVG 输入组件
 * 支持输入 SVG 字符串并实时预览
 */
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { NInput, NSpace, NText, NCard } from 'naive-ui'
import SvgIcon from './SvgIcon.vue'

interface Props {
  /** SVG 字符串 */
  value?: string
  /** 占位符 */
  placeholder?: string
  /** 是否禁用 */
  disabled?: boolean
  /** 预览大小 */
  previewSize?: number
}

const props = withDefaults(defineProps<Props>(), {
  value: '',
  placeholder: '',
  disabled: false,
  previewSize: 32,
})

const emit = defineEmits<{
  'update:value': [value: string]
}>()

const { t } = useI18n()

/** 内部值 */
const internalValue = ref(props.value)

/** 是否有效的 SVG */
const isValidSvg = computed(() => {
  const svg = internalValue.value.trim()
  return svg.startsWith('<svg') && svg.includes('</svg>')
})

/** 监听外部值变化 */
watch(
  () => props.value,
  (newValue) => {
    internalValue.value = newValue
  }
)

/** 处理输入变化 */
function handleInput(value: string): void {
  internalValue.value = value
  emit('update:value', value)
}
</script>

<template>
  <div class="svg-input">
    <n-space vertical :size="8">
      <!-- 输入框 -->
      <n-input
        type="textarea"
        :value="internalValue"
        :placeholder="placeholder || t('common.form.svgPlaceholder')"
        :disabled="disabled"
        :rows="3"
        @update:value="handleInput"
      />

      <!-- 预览区域 -->
      <n-card
        v-if="internalValue"
        size="small"
        :bordered="true"
        class="svg-input__preview"
        content-style="padding: 12px;"
      >
        <n-space align="center" :size="12">
          <n-text depth="3" class="svg-input__preview-label">
            {{ t('common.form.preview') }}:
          </n-text>
          <div class="svg-input__preview-box">
            <svg-icon v-if="isValidSvg" :svg="internalValue" :size="previewSize" />
            <n-text v-else depth="3" class="svg-input__preview-error">
              {{ t('common.form.invalidSvg') }}
            </n-text>
          </div>
        </n-space>
      </n-card>
    </n-space>
  </div>
</template>

<style scoped lang="scss">
.svg-input {
  width: 100%;

  &__preview {
    background: var(--color-bg-soft);
  }

  &__preview-label {
    font-size: var(--text-sm);
  }

  &__preview-box {
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 48px;
    min-height: 48px;
    padding: 8px;
    background: var(--color-bg);
    border-radius: var(--radius-sm);
    border: 1px dashed var(--color-border);
  }

  &__preview-error {
    font-size: var(--text-xs);
    color: var(--color-danger);
  }
}
</style>
