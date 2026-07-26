<script setup lang="ts">
/**
 * 批量操作栏组件
 * 用于表格批量选择后的操作
 * Requirements: 8.1, 9.1
 *
 * 为什么不再用 n-alert 承载：NAlert 无条件渲染 role="alert"（它把 attrs 合并在
 * 自己的 role 之前，外部覆盖不掉），于是每次勾选变化都会以「断言级」打断读屏 ——
 * 消息横幅的语义不适合一条随勾选出现的操作条。现在是自绘工具条：
 * - 容器 role="group" + aria-label（不占用 landmark；role="toolbar" 需要配套的
 *   方向键漫游，没实现就不用，避免给出假的键盘承诺）
 * - 计数走 aria-live="polite"，选中数变化只被礼貌播报
 * - 底色/描边/文字取 primary 的 subtle / border / text 三个角色，而不是 info 消息色
 */
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { NButton, NIcon } from 'naive-ui'

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
    <div v-if="visible" class="batch-actions" role="group" :aria-label="t('common.batchOperation')">
      <span v-if="showCount" class="batch-actions__count" aria-live="polite">
        {{ t('common.table.selected', { count: selectedCount }) }}
      </span>

      <!-- 批量操作按钮 -->
      <div class="batch-actions__group">
        <n-button
          v-for="action in visibleActions"
          :key="action.key"
          :type="action.type || 'default'"
          :disabled="action.disabled"
          :loading="action.loading"
          :aria-label="getActionLabel(action)"
          size="small"
          @click="handleAction(action.key)"
        >
          <template v-if="action.icon" #icon>
            <n-icon aria-hidden="true">
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
      </div>

      <!-- 右侧：清除按钮 -->
      <n-button
        v-if="showClear"
        class="batch-actions__clear"
        text
        size="small"
        :aria-label="t('common.unselectAll')"
        @click="handleClear"
      >
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
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </n-icon>
        </template>
        {{ t('common.unselectAll') }}
      </n-button>
    </div>
  </Transition>
</template>

<style scoped lang="scss">
@use '@/styles/transitions/interaction' as ix;

// 选择态是「主色语义」而不是「info 消息」：底色/描边直接取 primary 的
// subtle / border 角色，文字取 primary-text（tokens/contrast.test.ts 断言
// -text 在同色 -subtle 上 >= 4.5:1，四套主题全覆盖）。
.batch-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-3);
  align-items: center;
  margin-bottom: var(--spacing-3);
  padding: var(--spacing-2) var(--spacing-3);
  background-color: var(--color-primary-subtle);
  border: 1px solid var(--color-primary-border);
  border-radius: var(--radius-lg);

  &__count {
    font-size: var(--text-sm);
    font-weight: var(--font-semibold);
    color: var(--color-primary-text);
  }

  &__group {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-2);
    align-items: center;
  }

  // 清除按钮推到最右：不用 justify-content: space-between，
  // 这样在窄屏换行后按钮组仍然紧跟计数文字。
  &__clear {
    margin-left: auto;
  }

  // 密集控件簇：每个按钮都要有焦点环与按压反馈。
  // $lift 传 0：条内只有 8px 上下留白，抬升会顶到描边。
  :deep(.n-button) {
    @include ix.feedback-transition;
    @include ix.focus-ring;
    @include ix.pressable(0.97, 0);
  }

  // 禁用态要「看起来就按不动」：Naive 给了透明度，这里补光标
  :deep(.n-button--disabled) {
    cursor: not-allowed;
  }
}

// 过渡类由 transitions/_page-transitions.scss 全局提供（slide-up）。
// 原来这里有一份 scoped 副本，硬编码 -10px 位移与 --duration-normal，
// scoped 选择器还会遮蔽全局版本 —— 删掉即回归统一的 enter/leave 语义时长。
</style>
