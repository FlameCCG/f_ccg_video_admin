<script setup lang="ts">
/**
 * 表格操作列组件
 * 用于表格行的操作按钮
 * Requirements: 8.1, 9.1
 */
import { computed, h } from 'vue'
import { useI18n } from 'vue-i18n'
import { NButton, NDropdown, NIcon, NTooltip } from 'naive-ui'
import type { DropdownOption } from 'naive-ui'

interface ActionItem {
  /** 操作标识 */
  key: string
  /** 操作文字 */
  label?: string
  /** 图标 */
  icon?: string
  /** 按钮类型 */
  type?: 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info'
  /** 是否禁用 */
  disabled?: boolean
  /** 是否显示 */
  show?: boolean
  /** 是否需要确认 */
  confirm?: boolean
  /** 确认文字 */
  confirmText?: string
  /** 权限标识 */
  permission?: string
}

interface Props {
  /** 操作项列表 */
  actions?: ActionItem[]
  /** 最大显示数量（超出显示更多） */
  max?: number
  /** 按钮大小 */
  size?: 'tiny' | 'small' | 'medium'
  /** 是否显示分隔符 */
  divider?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  actions: () => [],
  max: 3,
  size: 'small',
  divider: false,
})

const emit = defineEmits<{
  action: [key: string]
}>()

const { t } = useI18n()

/**
 * 溢出菜单里破坏性操作的文字色。
 *
 * 下拉层被 teleport 到 body，scoped 样式够不到；而 Naive 把选项文字色写在
 * .n-dropdown-option-body__label 上，给选项根节点加行内色也覆盖不到。
 * 所以用 render 函数把 danger 语义色写进 label 自身 —— 值仍是 token，
 * 不是硬编码颜色。
 */
const DANGER_LABEL_STYLE = { color: 'var(--color-danger-text)' } as const

/** 可见的操作项 */
const visibleActions = computed(() => {
  return props.actions.filter((action) => action.show !== false)
})

/** 主要显示的操作项 */
const mainActions = computed(() => {
  return visibleActions.value.slice(0, props.max)
})

/** 更多操作项 */
const moreActions = computed(() => {
  return visibleActions.value.slice(props.max)
})

/** 更多操作下拉选项 */
const moreOptions = computed<DropdownOption[]>(() => {
  return moreActions.value.map((action) => {
    const label = getActionLabel(action)
    return {
      key: action.key,
      // 破坏性操作在溢出菜单里也必须读作破坏性，不能因为收进「更多」就退化成普通项
      label:
        action.type === 'error' ? () => h('span', { style: DANGER_LABEL_STYLE }, label) : label,
      disabled: action.disabled,
    }
  })
})

/** 处理操作点击 */
function handleAction(key: string): void {
  emit('action', key)
}

/** 处理更多操作选择 */
function handleMoreSelect(key: string): void {
  emit('action', key)
}

/** 获取操作文字 */
function getActionLabel(action: ActionItem): string {
  return action.label || t(`common.${action.key}`)
}
</script>

<template>
  <div class="table-actions" :class="{ 'table-actions--divided': divider }">
    <!-- 主要操作按钮 -->
    <template v-for="(action, index) in mainActions" :key="action.key">
      <n-tooltip v-if="action.icon" trigger="hover">
        <template #trigger>
          <n-button
            class="table-actions__button"
            text
            :type="action.type || 'primary'"
            :size="size"
            :disabled="action.disabled"
            :aria-label="getActionLabel(action)"
            @click="handleAction(action.key)"
          >
            {{ getActionLabel(action) }}
          </n-button>
        </template>
        {{ getActionLabel(action) }}
      </n-tooltip>
      <n-button
        v-else
        class="table-actions__button"
        text
        :type="action.type || 'primary'"
        :size="size"
        :disabled="action.disabled"
        :aria-label="getActionLabel(action)"
        @click="handleAction(action.key)"
      >
        {{ getActionLabel(action) }}
      </n-button>

      <!-- 分隔符（纯装饰，对读屏隐藏） -->
      <span
        v-if="divider && index < mainActions.length - 1"
        class="table-actions__divider"
        aria-hidden="true"
      />
    </template>

    <!-- 更多操作 -->
    <template v-if="moreActions.length > 0">
      <span
        v-if="divider && mainActions.length > 0"
        class="table-actions__divider"
        aria-hidden="true"
      />
      <!--
        trigger 必须是 click 而不是 hover：hover 触发的下拉键盘完全打不开，
        对只用键盘的用户等于「更多操作不存在」。
      -->
      <n-dropdown :options="moreOptions" trigger="click" @select="handleMoreSelect">
        <n-button
          class="table-actions__button"
          text
          :size="size"
          type="primary"
          aria-haspopup="menu"
          :aria-label="t('common.more')"
        >
          {{ t('common.more') }}
          <template #icon>
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
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </n-icon>
          </template>
        </n-button>
      </n-dropdown>
    </template>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/transitions/interaction' as ix;

// 原来靠 n-space + :size="divider ? 0 : 8" 排版，8 是魔法数，
// 还要用 :deep(.n-space) 反过来改它的 justify/wrap。直接 flex + gap token 更短。
.table-actions {
  display: inline-flex;
  flex-wrap: nowrap;
  gap: var(--spacing-2);
  align-items: center;
  justify-content: center;
  width: 100%;

  // 有分隔符时不再需要额外间距，分隔符自带左右外边距
  &--divided {
    gap: 0;
  }

  &__divider {
    display: inline-block;
    width: 1px;
    height: var(--text-base);
    margin: 0 var(--spacing-2);
    background-color: var(--color-border);
  }

  // 行内文字按钮：焦点环 + 按压反馈。
  // $lift 传 0：表格行高很紧，1px 上抬会让整行看起来在抖。
  // 按钮类型（primary / warning / error…）的文字色由 themeOverrides.Button 的
  // textColorText* 提供，已经是 --color-<sem>-text 角色，破坏性操作天然读作破坏性。
  :deep(.table-actions__button) {
    padding: 0 var(--spacing-1);
    white-space: nowrap;

    @include ix.feedback-transition;
    @include ix.focus-ring;
    @include ix.pressable(0.94, 0);
  }

  // 禁用态必须「看起来就按不动」：Naive 已给透明度，这里补光标与去掉悬浮反馈
  :deep(.table-actions__button.n-button--disabled) {
    cursor: not-allowed;
  }
}
</style>
