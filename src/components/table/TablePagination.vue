<script setup lang="ts">
/**
 * 表格分页组件
 * 独立的分页组件，可用于自定义布局
 * Requirements: 8.1, 9.1
 */
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { NPagination, NSpace } from 'naive-ui'

interface Props {
  /** 当前页码 */
  page: number
  /** 每页数量 */
  pageSize: number
  /** 总数 */
  total: number
  /** 每页数量选项 */
  pageSizes?: number[]
  /** 是否显示快速跳转 */
  showQuickJumper?: boolean
  /** 是否显示每页数量选择 */
  showSizePicker?: boolean
  /** 是否显示总数 */
  showTotal?: boolean
  /** 是否禁用 */
  disabled?: boolean
  /** 简洁模式 */
  simple?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  pageSizes: () => [10, 20, 50, 100],
  showQuickJumper: true,
  showSizePicker: true,
  showTotal: true,
  disabled: false,
  simple: false,
})

const emit = defineEmits<{
  'update:page': [page: number]
  'update:pageSize': [pageSize: number]
  change: [page: number, pageSize: number]
}>()

const { t } = useI18n()

/** 总页数 */
const pageCount = computed(() => Math.ceil(props.total / props.pageSize))

/** 处理页码变化 */
function handlePageChange(page: number): void {
  emit('update:page', page)
  emit('change', page, props.pageSize)
}

/** 处理每页数量变化 */
function handlePageSizeChange(pageSize: number): void {
  emit('update:pageSize', pageSize)
  // 重置到第一页
  emit('update:page', 1)
  emit('change', 1, pageSize)
}
</script>

<template>
  <div class="table-pagination">
    <n-space justify="space-between" align="center">
      <!-- 总数显示 -->
      <span v-if="showTotal" class="table-pagination__total">
        {{ t('common.table.total', { total }) }}
      </span>

      <!-- 分页器 -->
      <n-pagination
        :page="page"
        :page-size="pageSize"
        :item-count="total"
        :page-count="pageCount"
        :page-sizes="pageSizes"
        :show-quick-jumper="showQuickJumper && !simple"
        :show-size-picker="showSizePicker && !simple"
        :disabled="disabled"
        :simple="simple"
        @update:page="handlePageChange"
        @update:page-size="handlePageSizeChange"
      />
    </n-space>
  </div>
</template>

<style scoped lang="scss">
.table-pagination {
  padding: var(--spacing-3) 0;

  &__total {
    color: var(--color-text-secondary);
    font-size: var(--text-sm);
  }
}
</style>
