<script setup lang="ts">
/**
 * 确认对话框组件
 * 用于危险操作的二次确认
 * Requirements: 20.4, 20.5
 */
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { NModal, NButton, NIcon, NSpace } from 'naive-ui'

type ConfirmType = 'info' | 'success' | 'warning' | 'error'

interface Props {
  /** 是否显示 */
  show: boolean
  /** 对话框类型 */
  type?: ConfirmType
  /** 标题 */
  title?: string
  /** 内容 */
  content?: string
  /** 确认按钮文字 */
  confirmText?: string
  /** 取消按钮文字 */
  cancelText?: string
  /** 确认按钮加载状态 */
  loading?: boolean
  /** 是否显示取消按钮 */
  showCancel?: boolean
  /** 是否显示关闭图标 */
  closable?: boolean
  /** 点击遮罩是否关闭 */
  maskClosable?: boolean
  /** 宽度 */
  width?: string | number
}

const props = withDefaults(defineProps<Props>(), {
  type: 'warning',
  title: undefined,
  content: undefined,
  confirmText: undefined,
  cancelText: undefined,
  loading: false,
  showCancel: true,
  closable: true,
  maskClosable: false,
  width: 420,
})

const emit = defineEmits<{
  'update:show': [value: boolean]
  confirm: []
  cancel: []
}>()

const { t } = useI18n()

/** 显示的标题 */
const displayTitle = computed(() => {
  if (props.title) return props.title
  const titleMap: Record<ConfirmType, string> = {
    info: t('common.dialog.title'),
    success: t('common.dialog.success'),
    warning: t('common.dialog.warningTitle'),
    error: t('common.dialog.dangerTitle'),
  }
  return titleMap[props.type]
})

/** 确认按钮文字 */
const displayConfirmText = computed(() => {
  return props.confirmText ?? t('common.confirm')
})

/** 取消按钮文字 */
const displayCancelText = computed(() => {
  return props.cancelText ?? t('common.cancel')
})

/** 确认按钮类型 */
const confirmButtonType = computed(() => {
  const typeMap: Record<ConfirmType, 'default' | 'primary' | 'success' | 'warning' | 'error'> = {
    info: 'primary',
    success: 'success',
    warning: 'warning',
    error: 'error',
  }
  return typeMap[props.type]
})

/** 图标颜色 */
const iconColor = computed(() => {
  const colorMap: Record<ConfirmType, string> = {
    info: 'var(--color-info)',
    success: 'var(--color-success)',
    warning: 'var(--color-warning)',
    error: 'var(--color-danger)',
  }
  return colorMap[props.type]
})

function handleClose(): void {
  emit('update:show', false)
}

function handleConfirm(): void {
  emit('confirm')
}

function handleCancel(): void {
  emit('cancel')
  handleClose()
}
</script>

<template>
  <n-modal
    :show="show"
    preset="dialog"
    :title="displayTitle"
    :closable="closable"
    :mask-closable="maskClosable"
    :style="{ width: typeof width === 'number' ? `${width}px` : width }"
    @update:show="handleClose"
  >
    <template #icon>
      <n-icon :color="iconColor" size="24">
        <!-- Info Icon -->
        <svg
          v-if="type === 'info'"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
        <!-- Success Icon -->
        <svg
          v-else-if="type === 'success'"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
        <!-- Warning Icon -->
        <svg
          v-else-if="type === 'warning'"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path
            d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
          />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
        <!-- Error Icon -->
        <svg
          v-else-if="type === 'error'"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="15" y1="9" x2="9" y2="15" />
          <line x1="9" y1="9" x2="15" y2="15" />
        </svg>
      </n-icon>
    </template>

    <div class="app-confirm__content">
      {{ content }}
    </div>

    <template #action>
      <n-space justify="end">
        <n-button v-if="showCancel" @click="handleCancel">
          {{ displayCancelText }}
        </n-button>
        <n-button :type="confirmButtonType" :loading="loading" @click="handleConfirm">
          {{ displayConfirmText }}
        </n-button>
      </n-space>
    </template>
  </n-modal>
</template>

<style scoped lang="scss">
.app-confirm__content {
  color: var(--color-text-secondary);
  line-height: 1.6;
}
</style>
