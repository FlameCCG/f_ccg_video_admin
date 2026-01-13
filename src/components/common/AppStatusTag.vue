<script setup lang="ts">
/**
 * 状态标签组件
 * 用于展示各种状态的标签
 * Requirements: 20.4, 20.5
 */
import { computed } from 'vue'
import { NTag } from 'naive-ui'

type StatusType = 'default' | 'success' | 'warning' | 'error' | 'info' | 'processing'

interface Props {
  /** 状态类型 */
  type?: StatusType
  /** 标签文字 */
  text?: string
  /** 是否显示圆点 */
  dot?: boolean
  /** 是否可关闭 */
  closable?: boolean
  /** 是否圆角 */
  round?: boolean
  /** 尺寸 */
  size?: 'small' | 'medium' | 'large'
  /** 是否有边框 */
  bordered?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  type: 'default',
  text: undefined,
  dot: false,
  closable: false,
  round: false,
  size: 'medium',
  bordered: true,
})

const emit = defineEmits<{
  close: []
}>()

/** Naive UI Tag 类型映射 */
const tagType = computed(() => {
  const typeMap: Record<
    StatusType,
    'default' | 'success' | 'warning' | 'error' | 'info' | 'primary'
  > = {
    default: 'default',
    success: 'success',
    warning: 'warning',
    error: 'error',
    info: 'info',
    processing: 'primary',
  }
  return typeMap[props.type]
})

/** 是否显示处理中动画 */
const isProcessing = computed(() => props.type === 'processing')

function handleClose(): void {
  emit('close')
}
</script>

<template>
  <n-tag
    :type="tagType"
    :closable="closable"
    :round="round"
    :size="size"
    :bordered="bordered"
    class="app-status-tag"
    :class="{ 'app-status-tag--processing': isProcessing }"
    @close="handleClose"
  >
    <template v-if="dot" #icon>
      <span class="app-status-tag__dot" :class="`app-status-tag__dot--${type}`" />
    </template>
    <slot>{{ text }}</slot>
  </n-tag>
</template>

<style scoped lang="scss">
.app-status-tag {
  &__dot {
    display: inline-block;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    margin-right: var(--spacing-1);

    &--default {
      background-color: var(--color-text-muted);
    }

    &--success {
      background-color: var(--color-success);
    }

    &--warning {
      background-color: var(--color-warning);
    }

    &--error {
      background-color: var(--color-danger);
    }

    &--info {
      background-color: var(--color-info);
    }

    &--processing {
      background-color: var(--color-primary);
      animation: pulse 1.5s ease-in-out infinite;
    }
  }

  &--processing {
    .app-status-tag__dot {
      animation: pulse 1.5s ease-in-out infinite;
    }
  }
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }

  50% {
    opacity: 0.4;
  }
}
</style>
