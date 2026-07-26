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

/**
 * Naive UI Tag 类型映射
 *
 * 色板的角色分离由 useNaiveTheme.ts 的 themeOverrides.Tag 统一落地：
 * color* = --color-<sem>-subtle、textColor* = --color-<sem>-text、
 * border* = --color-<sem>-border。因此这里只需选对 Naive 的 type，
 * 不必（也不该）在组件内二次覆盖底色/文字色 —— 那会绕过唯一事实来源。
 */
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
      <span
        class="app-status-tag__dot"
        :class="`app-status-tag__dot--${type}`"
        aria-hidden="true"
      />
    </template>
    <slot>{{ text }}</slot>
  </n-tag>
</template>

<style scoped lang="scss">
@use '@/styles/transitions/interaction' as ix;

.app-status-tag {
  // 圆点直径：4px 基准的 1.5 倍。不写死 6px，改基准单位时跟着走。
  --status-dot-size: calc(var(--spacing-1) * 1.5);

  // 「处理中」呼吸周期：必须明显慢于交互反馈，否则会被读成「出错在闪」。
  // 走 --duration-slowest（减少动效下被 tokens 压到 0），不写死 1.5s。
  --status-pulse-cycle: calc(var(--duration-slowest) * 3);

  &__dot {
    display: inline-block;
    width: var(--status-dot-size);
    height: var(--status-dot-size);
    margin-right: var(--spacing-1);
    border-radius: var(--radius-full);

    // 圆点落在 --color-<sem>-subtle 的胶囊底色上，所以取 -text 角色：
    // 该配对由 tokens/contrast.test.ts 断言 >= 4.5:1（四套主题全覆盖）。
    // 直接用 --color-<sem>（实心填充角色）在浅色主题上最低只有 2.01:1。
    &--default {
      background-color: var(--color-text-muted);
    }

    &--success {
      background-color: var(--color-success-text);
    }

    &--warning {
      background-color: var(--color-warning-text);
    }

    &--error {
      background-color: var(--color-danger-text);
    }

    &--info {
      background-color: var(--color-info-text);
    }

    &--processing {
      background-color: var(--color-primary-text);
    }
  }

  // 呼吸动画只声明一次：原来 &__dot--processing 与 &--processing &__dot
  // 各写一遍同一条 animation（两者恒同时命中），改一处就会漏另一处。
  &__dot--processing {
    animation: status-pulse var(--status-pulse-cycle) var(--easing-ease-in-out) infinite;
  }

  // 可关闭标签的关闭按钮是本组件唯一的可交互元素：
  // 补上全项目统一的焦点环与按压反馈（改造前全仓 0 个 :focus-visible）。
  // offset 传 1px：标签本身很小，2px 外扩会顶到相邻单元格。
  :deep(.n-base-close) {
    @include ix.feedback-transition;
    @include ix.focus-ring(1px);
    @include ix.pressable(0.88, 0);
  }
}

@keyframes status-pulse {
  0%,
  100% {
    opacity: 1;
  }

  50% {
    opacity: 0.4;
  }
}

// infinite 动画必须显式兜底：时长虽已被 tokens 压到 0，
// base/_accessibility.scss 也把非豁免元素的迭代次数压到 1，
// 但「处理中」的语义由标签文字承担，运动本身是纯装饰，直接停掉最稳。
// 选择器必须与上面那条同样具体（媒体查询不增加特异度），否则压不住。
@media (prefers-reduced-motion: reduce) {
  .app-status-tag .app-status-tag__dot--processing {
    animation: none;
  }
}
</style>
