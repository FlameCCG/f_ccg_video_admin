<script setup lang="ts">
/**
 * 数据表格组件
 * 封装 Naive UI DataTable，提供统一的表格展示
 * 滚动条始终在内部，不影响外部布局
 * Requirements: 8.1, 9.1
 */
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { NDataTable, NPagination, NSpace, NSpin } from 'naive-ui'
import type { DataTableColumns, DataTableRowKey } from 'naive-ui'

/** 表格行数据类型 */
type RowData = Record<string, unknown>

interface Props {
  /** 表格列配置 */
  columns: DataTableColumns<RowData>
  /** 表格数据 */
  data: RowData[]
  /** 是否加载中 */
  loading?: boolean
  /** 行 key 字段 */
  rowKey?: string | ((row: unknown) => DataTableRowKey)
  /** 是否可选择 */
  selectable?: boolean
  /** 已选择的行 keys */
  checkedRowKeys?: DataTableRowKey[]
  /** 是否显示分页 */
  pagination?: boolean
  /** 当前页码 */
  page?: number
  /** 每页数量 */
  pageSize?: number
  /** 总数 */
  total?: number
  /** 每页数量选项 */
  pageSizes?: number[]
  /** 是否显示快速跳转 */
  showQuickJumper?: boolean
  /** 是否显示每页数量选择 */
  showSizePicker?: boolean
  /** 表格最大高度 */
  maxHeight?: string | number
  /** 是否显示边框 */
  bordered?: boolean
  /** 是否单行显示 */
  singleLine?: boolean
  /** 是否条纹 */
  striped?: boolean
  /** 表格大小 */
  size?: 'small' | 'medium' | 'large'
  /** 是否虚拟滚动 */
  virtualScroll?: boolean
  /** 空状态描述 */
  emptyDescription?: string
  /** 子节点字段名（树形表格） */
  childrenKey?: string
  /** 默认展开的行 keys（树形表格） */
  defaultExpandedRowKeys?: DataTableRowKey[]
  /** 是否默认展开所有行（树形表格） */
  defaultExpandAll?: boolean
  /** 缩进宽度（树形表格） */
  indent?: number
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  rowKey: 'id',
  selectable: false,
  checkedRowKeys: () => [],
  pagination: true,
  page: 1,
  pageSize: 10,
  total: 0,
  pageSizes: () => [10, 20, 50, 100],
  showQuickJumper: true,
  showSizePicker: true,
  maxHeight: undefined,
  bordered: false,
  singleLine: true,
  striped: false,
  size: 'medium',
  virtualScroll: false,
  emptyDescription: undefined,
  childrenKey: 'children',
  defaultExpandedRowKeys: () => [],
  defaultExpandAll: false,
  indent: 24,
})

const emit = defineEmits<{
  'update:page': [page: number]
  'update:pageSize': [pageSize: number]
  'update:checkedRowKeys': [keys: DataTableRowKey[]]
  pageChange: [page: number]
  pageSizeChange: [pageSize: number]
  selectionChange: [keys: DataTableRowKey[], rows: unknown[]]
}>()

const { t } = useI18n()

/** 内部选中状态 */
const internalCheckedKeys = ref<DataTableRowKey[]>([...props.checkedRowKeys])

/** 同步外部选中状态 */
watch(
  () => props.checkedRowKeys,
  (newKeys) => {
    internalCheckedKeys.value = [...newKeys]
  }
)

/** 表格列配置（添加选择列，避免重复） */
const tableColumns = computed(() => {
  // 检查是否已有选择列
  const hasSelectionColumn = props.columns.some((col) => 'type' in col && col.type === 'selection')
  if (!props.selectable || hasSelectionColumn) return props.columns
  return [
    {
      type: 'selection' as const,
      fixed: 'left' as const,
    },
    ...props.columns,
  ]
})

/** 行 key 函数 */
const rowKeyFn = computed(() => {
  if (typeof props.rowKey === 'function') {
    return props.rowKey
  }
  return (row: unknown) =>
    (row as Record<string, unknown>)[props.rowKey as string] as DataTableRowKey
})

/** 处理选择变化 */
function handleCheckedRowKeysChange(keys: DataTableRowKey[]): void {
  internalCheckedKeys.value = keys
  emit('update:checkedRowKeys', keys)

  const selectedRows = props.data.filter((row) => {
    const key = rowKeyFn.value(row)
    return keys.includes(key)
  })
  emit('selectionChange', keys, selectedRows)
}

/** 处理页码变化 */
function handlePageChange(page: number): void {
  emit('update:page', page)
  emit('pageChange', page)
}

/** 处理每页数量变化 */
function handlePageSizeChange(pageSize: number): void {
  emit('update:pageSize', pageSize)
  emit('pageSizeChange', pageSize)
}
</script>

<template>
  <div class="data-table">
    <!-- 表格容器 - 滚动区域 -->
    <div class="data-table__body">
      <n-spin :show="loading" class="data-table__spin">
        <n-data-table
          :columns="tableColumns"
          :data="data"
          :row-key="rowKeyFn"
          :checked-row-keys="selectable ? internalCheckedKeys : undefined"
          :max-height="maxHeight"
          :bordered="bordered"
          :single-line="singleLine"
          :striped="striped"
          :size="size"
          :virtual-scroll="virtualScroll"
          :pagination="false"
          :children-key="childrenKey"
          :default-expanded-row-keys="defaultExpandAll ? undefined : defaultExpandedRowKeys"
          :default-expand-all="defaultExpandAll"
          :indent="indent"
          class="data-table__table"
          @update:checked-row-keys="handleCheckedRowKeysChange"
        >
          <template #empty>
            <slot name="empty">
              <div class="data-table__empty">
                <div class="data-table__empty-icon">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="48"
                    height="48"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
                    <polyline points="13 2 13 9 20 9" />
                    <line x1="9" y1="13" x2="15" y2="13" />
                    <line x1="9" y1="17" x2="15" y2="17" />
                  </svg>
                </div>
                <span class="data-table__empty-text">
                  {{ emptyDescription || t('common.tips.noData') }}
                </span>
              </div>
            </slot>
          </template>
        </n-data-table>
      </n-spin>
    </div>

    <!-- 分页 - 固定在底部 -->
    <div v-if="pagination && total > 0" class="data-table__footer">
      <n-space justify="space-between" align="center" class="data-table__pagination">
        <span v-if="selectable && internalCheckedKeys.length > 0" class="data-table__selected">
          <span class="data-table__selected-badge">{{ internalCheckedKeys.length }}</span>
          {{ t('common.table.selected', { count: internalCheckedKeys.length }) }}
        </span>
        <span v-else class="data-table__total">
          {{ t('common.table.total', { total }) }}
        </span>
        <n-pagination
          :page="page"
          :page-size="pageSize"
          :item-count="total"
          :page-sizes="pageSizes"
          :show-quick-jumper="showQuickJumper"
          :show-size-picker="showSizePicker"
          @update:page="handlePageChange"
          @update:page-size="handlePageSizeChange"
        />
      </n-space>
    </div>
  </div>
</template>

<style scoped lang="scss">
.data-table {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  overflow: hidden;

  &__body {
    flex: 1;
    min-height: 0;
    overflow: hidden;
    position: relative;
  }

  &__spin {
    height: 100%;

    :deep(.n-spin-container) {
      height: 100%;
    }

    :deep(.n-spin-content) {
      height: 100%;
    }
  }

  &__table {
    height: 100%;

    // 表格内部滚动
    :deep(.n-data-table-wrapper) {
      flex: 1;
      min-height: 0;
    }

    :deep(.n-data-table-base-table) {
      display: flex;
      flex-direction: column;
      height: 100%;
    }

    :deep(.n-data-table-base-table-body) {
      flex: 1;
      min-height: 0;
      overflow: auto;

      // 精致滚动条
      &::-webkit-scrollbar {
        width: 6px;
        height: 6px;
      }

      &::-webkit-scrollbar-track {
        background: transparent;
        border-radius: 3px;
      }

      &::-webkit-scrollbar-thumb {
        background: var(--color-border);
        border-radius: 3px;
        transition: background 200ms;

        &:hover {
          background: var(--color-text-muted);
        }
      }

      &::-webkit-scrollbar-corner {
        background: transparent;
      }
    }

    // 表头样式优化
    :deep(.n-data-table-th) {
      background: color-mix(in srgb, var(--color-surface) 95%, var(--color-primary) 5%);
      font-weight: 600;
      color: var(--color-text);
      border-bottom: 1px solid var(--color-border-light);
      transition: background 200ms;
    }

    // 行样式优化
    :deep(.n-data-table-tr) {
      transition: background 150ms;

      &:hover {
        background: color-mix(in srgb, var(--color-surface) 97%, var(--color-primary) 3%);
      }
    }

    :deep(.n-data-table-td) {
      border-bottom: 1px solid var(--color-border-light);
      color: var(--color-text-secondary);
    }

    // 选中行样式
    :deep(.n-data-table-tr--selected) {
      background: color-mix(in srgb, var(--color-surface) 92%, var(--color-primary) 8%);

      &:hover {
        background: color-mix(in srgb, var(--color-surface) 88%, var(--color-primary) 12%);
      }
    }

    // 树形表格展开图标样式
    :deep(.n-data-table-expand-trigger) {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 22px;
      margin-right: 6px;
      border-radius: var(--radius-sm);
      color: var(--color-text-muted);
      cursor: pointer;
      transition:
        background 150ms,
        color 150ms,
        transform 200ms;

      &:hover {
        background: color-mix(in srgb, var(--color-primary) 12%, transparent);
        color: var(--color-primary);
      }

      svg {
        width: 14px;
        height: 14px;
      }
    }

    :deep(.n-data-table-expand-trigger--expanded) {
      color: var(--color-primary);
    }

    // 树形缩进优化 - 确保子级有明显缩进
    :deep(.n-data-table-indent) {
      display: inline-block;
      height: 1px;
      flex-shrink: 0;
    }

    // 树形表格行层级样式
    :deep(.n-data-table-td__indent) {
      display: inline-flex;
      align-items: center;
    }

    // 子级行添加视觉连接线
    :deep(.n-data-table-tr[data-level]:not([data-level='0'])) {
      .n-data-table-td:first-child {
        position: relative;

        &::before {
          content: '';
          position: absolute;
          left: 16px;
          top: 0;
          bottom: 0;
          width: 1px;
          background: var(--color-border-light);
        }
      }
    }
  }

  &__empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--spacing-12) var(--spacing-8);
    gap: var(--spacing-4);
  }

  &__empty-icon {
    color: var(--color-text-muted);
    opacity: 0.5;
  }

  &__empty-text {
    color: var(--color-text-muted);
    font-size: var(--text-sm);
  }

  &__footer {
    flex-shrink: 0;
    padding: var(--spacing-4) var(--spacing-5);
    background: linear-gradient(
      180deg,
      color-mix(in srgb, var(--color-surface) 98%, var(--color-primary) 2%) 0%,
      var(--color-surface) 100%
    );
    border-top: 1px solid var(--color-border-light);
  }

  &__pagination {
    width: 100%;
  }

  &__total {
    color: var(--color-text-muted);
    font-size: var(--text-sm);
  }

  &__selected {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
    color: var(--color-primary);
    font-size: var(--text-sm);
    font-weight: 500;
  }

  &__selected-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 20px;
    height: 20px;
    padding: 0 6px;
    background: var(--color-primary);
    color: white;
    font-size: 11px;
    font-weight: 600;
    border-radius: 10px;
  }
}

// Reduced motion
@media (prefers-reduced-motion: reduce) {
  .data-table {
    :deep(.n-data-table-tr),
    :deep(.n-data-table-th) {
      transition: none;
    }
  }
}
</style>
