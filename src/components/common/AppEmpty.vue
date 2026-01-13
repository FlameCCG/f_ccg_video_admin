<script setup lang="ts">
/**
 * 空状态组件
 * 用于列表、搜索结果等无数据时的展示
 * Requirements: 20.4, 20.5
 */
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { NEmpty, NButton } from 'naive-ui'

type EmptyType = 'default' | 'search' | 'list' | 'notification' | 'message' | 'error'

interface Props {
  /** 空状态类型 */
  type?: EmptyType
  /** 自定义描述文字 */
  description?: string
  /** 图片大小 */
  size?: 'small' | 'medium' | 'large'
  /** 是否显示操作按钮 */
  showAction?: boolean
  /** 操作按钮文字 */
  actionText?: string
}

const props = withDefaults(defineProps<Props>(), {
  type: 'default',
  description: undefined,
  size: 'medium',
  showAction: false,
  actionText: undefined,
})

const emit = defineEmits<{
  action: []
}>()

const { t } = useI18n()

/** 描述文字 */
const displayDescription = computed(() => {
  if (props.description) return props.description
  return t(`common.empty.${props.type}`)
})

/** 图片尺寸 */
const imageSize = computed(() => {
  const sizes = {
    small: 80,
    medium: 120,
    large: 160,
  }
  return sizes[props.size]
})

/** 操作按钮文字 */
const displayActionText = computed(() => {
  if (props.actionText) return props.actionText
  if (props.type === 'error') return t('common.error.retry')
  return t('common.refresh')
})

function handleAction(): void {
  emit('action')
}
</script>

<template>
  <div class="app-empty" :class="`app-empty--${size}`">
    <n-empty :description="displayDescription" :size="size">
      <template #icon>
        <div class="app-empty__icon">
          <!-- 默认空状态图标 -->
          <svg
            v-if="type === 'default' || type === 'list'"
            xmlns="http://www.w3.org/2000/svg"
            :width="imageSize"
            :height="imageSize"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path
              d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"
            />
            <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
            <line x1="12" y1="22.08" x2="12" y2="12" />
          </svg>
          <!-- 搜索无结果图标 -->
          <svg
            v-else-if="type === 'search'"
            xmlns="http://www.w3.org/2000/svg"
            :width="imageSize"
            :height="imageSize"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
            <line x1="8" y1="11" x2="14" y2="11" />
          </svg>
          <!-- 通知空状态图标 -->
          <svg
            v-else-if="type === 'notification'"
            xmlns="http://www.w3.org/2000/svg"
            :width="imageSize"
            :height="imageSize"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          <!-- 消息空状态图标 -->
          <svg
            v-else-if="type === 'message'"
            xmlns="http://www.w3.org/2000/svg"
            :width="imageSize"
            :height="imageSize"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <!-- 错误状态图标 -->
          <svg
            v-else-if="type === 'error'"
            xmlns="http://www.w3.org/2000/svg"
            :width="imageSize"
            :height="imageSize"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
      </template>
      <template v-if="showAction" #extra>
        <n-button size="small" @click="handleAction">
          {{ displayActionText }}
        </n-button>
      </template>
    </n-empty>
  </div>
</template>

<style scoped lang="scss">
.app-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-8) var(--spacing-4);

  &--small {
    padding: var(--spacing-4) var(--spacing-2);
  }

  &--large {
    padding: var(--spacing-12) var(--spacing-6);
  }

  &__icon {
    color: var(--color-text-muted);
    opacity: 0.6;
  }
}
</style>
