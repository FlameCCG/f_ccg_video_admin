<script setup lang="ts">
/**
 * 表格操作列组件
 * 用于表格行的操作按钮
 * Requirements: 8.1, 9.1
 */
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { NSpace, NButton, NDropdown, NIcon, NTooltip } from 'naive-ui'
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
  return moreActions.value.map((action) => ({
    key: action.key,
    label: action.label || t(`common.${action.key}`),
    disabled: action.disabled,
  }))
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
  <div class="table-actions">
    <n-space :size="divider ? 0 : 8" align="center">
      <!-- 主要操作按钮 -->
      <template v-for="(action, index) in mainActions" :key="action.key">
        <n-tooltip v-if="action.icon" trigger="hover">
          <template #trigger>
            <n-button
              text
              :type="action.type || 'primary'"
              :size="size"
              :disabled="action.disabled"
              @click="handleAction(action.key)"
            >
              {{ getActionLabel(action) }}
            </n-button>
          </template>
          {{ getActionLabel(action) }}
        </n-tooltip>
        <n-button
          v-else
          text
          :type="action.type || 'primary'"
          :size="size"
          :disabled="action.disabled"
          @click="handleAction(action.key)"
        >
          {{ getActionLabel(action) }}
        </n-button>

        <!-- 分隔符 -->
        <span v-if="divider && index < mainActions.length - 1" class="table-actions__divider" />
      </template>

      <!-- 更多操作 -->
      <template v-if="moreActions.length > 0">
        <span v-if="divider && mainActions.length > 0" class="table-actions__divider" />
        <n-dropdown :options="moreOptions" trigger="hover" @select="handleMoreSelect">
          <n-button text :size="size" type="primary">
            {{ t('common.more') }}
            <template #icon>
              <n-icon>
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
    </n-space>
  </div>
</template>

<style scoped lang="scss">
.table-actions {
  display: inline-flex;
  align-items: center;

  &__divider {
    display: inline-block;
    width: 1px;
    height: 14px;
    margin: 0 var(--spacing-2);
    background-color: var(--color-border);
  }
}
</style>
