<script setup lang="ts">
/**
 * 数据表格组件
 * 封装 Naive UI DataTable，提供统一的表格展示
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

/** 表格列配置（添加选择列） */
const tableColumns = computed(() => {
  if (!props.selectable) return props.columns
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

  // 获取选中的行数据
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
    <n-spin :show="loading">
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
        flex-height
        class="data-table__table"
        @update:checked-row-keys="handleCheckedRowKeysChange"
      >
        <template #empty>
          <slot name="empty">
            <div class="data-table__empty">
              {{ emptyDescription || t('common.tips.noData') }}
            </div>
          </slot>
        </template>
      </n-data-table>
    </n-spin>

    <!-- 分页 -->
    <div v-if="pagination && total > 0" class="data-table__pagination">
      <n-space justify="end" align="center">
        <span v-if="selectable && internalCheckedKeys.length > 0" class="data-table__selected">
          {{ t('common.table.selected', { count: internalCheckedKeys.length }) }}
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
        >
          <template #prefix>
            {{ t('common.table.total', { total }) }}
          </template>
        </n-pagination>
      </n-space>
    </div>
  </div>
</template>

<style scoped lang="scss">
.data-table {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);

  &__table {
    flex: 1;
    min-height: 200px;
  }

  &__empty {
    padding: var(--spacing-8);
    text-align: center;
    color: var(--color-text-muted);
  }

  &__pagination {
    padding-top: var(--spacing-4);
    border-top: 1px solid var(--color-border-light);
  }

  &__selected {
    color: var(--color-primary);
    font-size: var(--text-sm);
  }
}
</style>
