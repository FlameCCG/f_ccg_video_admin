<script setup lang="ts">
/**
 * 空状态组件
 * 用于列表、搜索结果等无数据时的展示；type="error" 时作为「加载失败 + 重试」的一等形态
 * Requirements: 20.4, 20.5
 */
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { NEmpty, NButton, NIcon } from 'naive-ui'

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
  /** 标题（可选，用于「失败原因在 description、结论在 title」的错误态） */
  title?: string
  /** 操作按钮加载态（重试进行中） */
  actionLoading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  type: 'default',
  description: undefined,
  size: 'medium',
  showAction: false,
  actionText: undefined,
  title: undefined,
  actionLoading: false,
})

const emit = defineEmits<{
  action: []
}>()

const { t } = useI18n()

/**
 * 各形态的默认描述 key。
 *
 * 注意：三份语言包里都没有 `common.empty.error`（只有 default/search/list/
 * notification/message），原实现按 `common.empty.${type}` 拼 key，错误态会把
 * key 名本身当文案渲染给用户。这里改为显式映射，error 复用已存在的
 * `common.tips.loadFailed`，不引入新 key。
 */
const DESCRIPTION_KEY: Record<EmptyType, string> = {
  default: 'common.empty.default',
  search: 'common.empty.search',
  list: 'common.empty.list',
  notification: 'common.empty.notification',
  message: 'common.empty.message',
  error: 'common.tips.loadFailed',
}

/** 是否错误态 */
const isError = computed(() => props.type === 'error')

/** 描述文字 */
const displayDescription = computed(() => {
  if (props.description) return props.description
  return t(DESCRIPTION_KEY[props.type])
})

/** 操作按钮文字 */
const displayActionText = computed(() => {
  if (props.actionText) return props.actionText
  if (isError.value) return t('common.error.retry')
  return t('common.refresh')
})

/**
 * 错误态用 role="alert" 播报：一次失败的加载必须被读屏用户感知到，
 * 否则 500 和「没有数据」在无障碍层面完全一样。空态无需播报。
 */
const ariaRole = computed<'alert' | undefined>(() => (isError.value ? 'alert' : undefined))

function handleAction(): void {
  emit('action')
}
</script>

<template>
  <div
    class="app-empty"
    :class="[`app-empty--${size}`, { 'app-empty--error': isError }]"
    :role="ariaRole"
  >
    <n-empty :description="displayDescription" :size="size">
      <template #icon>
        <div class="app-empty__icon">
          <slot name="icon">
            <!-- 默认空状态图标 -->
            <svg
              v-if="type === 'default' || type === 'list'"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
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
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
              <line x1="8" y1="11" x2="14" y2="11" />
            </svg>
            <!-- 通知空状态图标 -->
            <svg
              v-else-if="type === 'notification'"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            <!-- 消息空状态图标 -->
            <svg
              v-else-if="type === 'message'"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <!-- 错误状态图标 -->
            <svg
              v-else-if="type === 'error'"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path
                d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
              />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </slot>
        </div>
      </template>

      <!--
        文案区自绘：title 放「加载失败」这类结论，description 放服务端 msg。
        n-empty 的 default 插槽会整体替换 description 区域，所以 :description
        仅作为插槽未生效时的兜底。
      -->
      <template #default>
        <span v-if="title" class="app-empty__title">{{ title }}</span>
        <span class="app-empty__description">{{ displayDescription }}</span>
      </template>

      <!-- showAction 走内置重试按钮；需要自定义出口（如「返回首页」）时用 #action 插槽 -->
      <template v-if="showAction || $slots.action" #extra>
        <div class="app-empty__actions">
          <slot name="action">
            <n-button
              class="app-empty__action"
              size="small"
              :type="isError ? 'primary' : 'default'"
              :loading="actionLoading"
              @click="handleAction"
            >
              <template v-if="isError" #icon>
                <n-icon aria-hidden="true">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <polyline points="23 4 23 10 17 10" />
                    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                  </svg>
                </n-icon>
              </template>
              {{ displayActionText }}
            </n-button>
          </slot>
        </div>
      </template>
    </n-empty>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/transitions/interaction' as ix;

.app-empty {
  // 图标尺寸由 token 推导（原来是 TS 里的 80 / 120 / 160 三个魔法数）：
  // --spacing-20 = 80px，medium = 1.5 倍，large = 2 倍。
  --empty-icon-size: calc(var(--spacing-20) * 1.5);

  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-8) var(--spacing-4);

  &--small {
    --empty-icon-size: var(--spacing-20);

    padding: var(--spacing-4) var(--spacing-2);
  }

  &--large {
    --empty-icon-size: calc(var(--spacing-20) * 2);

    padding: var(--spacing-12) var(--spacing-6);
  }

  // n-empty 的图标槽被写死成 --n-icon-size（medium 只有 40px），而本组件塞进去的
  // 是 80~160px 的插画：改造前图标会溢出这个 40px 的盒子、压到下方描述文字上
  // （盒子没有 overflow: hidden，所以是可见的重叠）。把槽位尺寸对齐真实图标尺寸
  // 即可修好，类选择器 + scoped 属性的特异度已经够，不需要 !important。
  :deep(.n-empty__icon) {
    width: var(--empty-icon-size);
    height: var(--empty-icon-size);
  }

  &__icon {
    display: flex;
    width: 100%;
    height: 100%;

    // 空态图标是「无内容」的装饰，用禁用态墨色即可（与 themeOverrides.Empty
    // 的 iconColor 同一角色），不再靠 opacity 兑出灰度。
    color: var(--color-text-disabled);

    > svg {
      width: 100%;
      height: 100%;
    }
  }

  // 错误态：图标切到 danger 语义。用 -text 角色而不是实心填充角色
  // --color-danger，后者作为浅色主题上的前景色不满足对比度要求。
  &--error &__icon {
    color: var(--color-danger-text);
  }

  &__title {
    display: block;
    font-size: var(--text-lg);
    font-weight: var(--font-semibold);
    color: var(--color-text);
  }

  // 不覆盖颜色：沿用 n-empty__description 的墨色（themeOverrides.Empty
  // 已指向 --color-text-muted），无 title 时与改造前完全一致。
  &__description {
    display: block;
  }

  &__title + &__description {
    margin-top: var(--spacing-1);
  }

  &__actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-2);
    align-items: center;
    justify-content: center;
  }

  // 重试是错误态里唯一的出口，必须键盘可达且有按压反馈。
  // $lift 传 0：空态区域上下留白已经很大，再抬升会显得漂浮。
  :deep(.n-button) {
    @include ix.feedback-transition;
    @include ix.focus-ring;
    @include ix.pressable(0.97, 0);
  }
}
</style>
