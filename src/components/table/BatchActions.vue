<script setup lang="ts">
/**
 * 批量操作栏组件
 * 用于表格批量选择后的操作
 * Requirements: 8.1, 9.1
 */
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { NSpace, NButton, NIcon, NAlert } from 'naive-ui'

interface BatchAction {
  /** 操作标识 */
  key: string
  /** 操作文字 */
  label?: string
  /** 按钮类型 */
  type?: 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info'
  /** 是否禁用 */
  disabled?: boolean
  /** 是否显示 */
  show?: boolean
  /** 加载状态 */
  loading?: boolean
  /** 图标 */
  icon?: 'delete' | 'export' | 'edit' | 'custom'
}

interface Props {
  /** 选中数量 */
  selectedCount: number
  /** 批量操作列表 */
  actions?: BatchAction[]
  /** 是否显示清除按钮 */
  showClear?: boolean
  /** 是否显示选中数量 */
  showCount?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  actions: () => [],
  showClear: true,
  showCount: true,
})

const emit = defineEmits<{
  action: [key: string]
  clear: []
}>()

const { t } = useI18n()

/** 是否显示批量操作栏 */
const visible = computed(() => props.selectedCount > 0)

/** 可见的操作项 */
const visibleActions = computed(() => {
  return props.actions.filter((action) => action.show !== false)
})

/** 处理操作点击 */
function handleAction(key: string): void {
  emit('action', key)
}

/** 处理清除选择 */
function handleClear(): void {
  emit('clear')
}

/** 获取操作文字 */
function getActionLabel(action: BatchAction): string {
  return action.label || t(`common.${action.key}`)
}
</script>

<template>
  <Transition name="slide-up">
    <div v-if="visible" class="batch-actions">
      <n-alert type="info" :show-icon="false" class="batch-actions__alert">
        <n-space align="center" justify="space-between" class="batch-actions__content">
          <!-- 左侧：选中信息 -->
          <n-space align="center" :size="16">
            <span v-if="showCount" class="batch-actions__count">
              {{ t('common.table.selected', { count: selectedCount }) }}
            </span>

            <!-- 批量操作按钮 -->
            <n-space :size="8">
              <n-button
                v-for="action in visibleActions"
                :key="action.key"
                :type="action.type || 'default'"
                :disabled="action.disabled"
                :loading="action.loading"
                size="small"
                @click="handleAction(action.key)"
              >
                <template v-if="action.icon" #icon>
                  <n-icon>
                    <!-- Delete Icon -->
                    <svg
                      v-if="action.icon === 'delete'"
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <polyline points="3 6 5 6 21 6" />
                      <path
                        d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
                      />
                    </svg>
                    <!-- Export Icon -->
                    <svg
                      v-else-if="action.icon === 'export'"
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    <!-- Edit Icon -->
                    <svg
                      v-else-if="action.icon === 'edit'"
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </n-icon>
                </template>
                {{ getActionLabel(action) }}
              </n-button>
            </n-space>
          </n-space>

          <!-- 右侧：清除按钮 -->
          <n-button v-if="showClear" text size="small" @click="handleClear">
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
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </n-icon>
            </template>
            {{ t('common.unselectAll') }}
          </n-button>
        </n-space>
      </n-alert>
    </div>
  </Transition>
</template>

<style scoped lang="scss">
.batch-actions {
  margin-bottom: var(--spacing-3);

  &__alert {
    border-radius: var(--radius-md);
  }

  &__content {
    width: 100%;
  }

  &__count {
    font-weight: 500;
    color: var(--color-primary);
  }
}

/* 过渡动画 */
.slide-up-enter-active,
.slide-up-leave-active {
  transition:
    opacity var(--duration-normal) var(--easing-standard),
    transform var(--duration-normal) var(--easing-standard);
}

.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
