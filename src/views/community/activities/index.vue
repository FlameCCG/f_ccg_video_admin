<script setup lang="ts">
/**
 * 动态管理页
 * Activity Management Page
 * Requirements: 13.1-13.3 - 动态列表、筛选、删除
 */
import { ref, computed, h } from 'vue'
import { useI18n } from 'vue-i18n'
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import {
  NCard,
  NSpace,
  NButton,
  NIcon,
  NGi,
  NFormItem,
  NInput,
  NImage,
  NTag,
  useMessage,
  useDialog,
} from 'naive-ui'
import type { DataTableColumns, DataTableRowKey } from 'naive-ui'
import { getDynamicList, deleteDynamic } from '@/api/dynamic'
import { DataTable, TableActions, BatchActions } from '@/components/table'
import { SearchForm } from '@/components/form'

const { t } = useI18n()
const message = useMessage()
const dialog = useDialog()
const queryClient = useQueryClient()

/** 搜索参数 */
const searchParams = ref({
  userId: null as number | null,
  username: '',
  keyword: '',
  page: 1,
  pageSize: 10,
})

/** 选中的行 */
const checkedRowKeys = ref<DataTableRowKey[]>([])

/** 获取动态列表 */
const {
  data: dynamicData,
  isLoading,
  refetch,
} = useQuery({
  queryKey: ['dynamicList', searchParams],
  queryFn: () =>
    getDynamicList({
      userId: searchParams.value.userId ?? undefined,
      username: searchParams.value.username || undefined,
      keyword: searchParams.value.keyword || undefined,
      page: searchParams.value.page,
      pageSize: searchParams.value.pageSize,
    }),
  staleTime: 30 * 1000,
})

/** 删除动态 mutation */
const deleteMutation = useMutation({
  mutationFn: deleteDynamic,
  onSuccess: (data) => {
    message.success(t('community.dynamic.deleteSuccess', { count: data.deleted }))
    checkedRowKeys.value = []
    void queryClient.invalidateQueries({ queryKey: ['dynamicList'] })
  },
  onError: (error: Error) => {
    message.error(error.message || t('common.tips.operationFailed'))
  },
})

/** 动态列表数据 */
const dynamicList = computed(() => {
  const list = dynamicData.value?.list ?? []
  return list as unknown as Record<string, unknown>[]
})
const total = computed(() => dynamicData.value?.total ?? 0)

/** 格式化日期时间 */
function formatDateTime(dateStr: string): string {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

/** 表格列配置 */
const columns = computed<DataTableColumns<Record<string, unknown>>>(() => [
  {
    type: 'selection',
    fixed: 'left',
  },
  {
    title: t('community.dynamic.userId'),
    key: 'userId',
    width: 100,
  },
  {
    title: t('community.dynamic.content'),
    key: 'content',
    minWidth: 300,
    ellipsis: { tooltip: true },
  },
  {
    title: t('community.dynamic.image'),
    key: 'imageUrl',
    width: 120,
    render: (row) => {
      const imageUrl = row.imageUrl as string
      if (!imageUrl) return h('span', { class: 'text-muted' }, '-')
      return h(NImage, {
        src: imageUrl,
        width: 80,
        height: 80,
        objectFit: 'cover',
        lazy: true,
        previewDisabled: false,
        style: { borderRadius: '4px' },
      })
    },
  },
  {
    title: t('community.dynamic.isPinned'),
    key: 'isPinned',
    width: 80,
    align: 'center',
    render: (row) =>
      h(NTag, { type: (row.isPinned as boolean) ? 'success' : 'default', size: 'small' }, () =>
        (row.isPinned as boolean) ? t('common.yes') : t('common.no')
      ),
  },
  {
    title: t('community.dynamic.createdAt'),
    key: 'createdAt',
    width: 160,
    render: (row) => formatDateTime(row.createdAt as string),
  },
  {
    title: t('common.table.operation'),
    key: 'actions',
    width: 100,
    fixed: 'right',
    render: (row) =>
      h(TableActions, {
        actions: [{ key: 'delete', label: t('common.delete'), type: 'error' }],
        onAction: (key: string) => handleAction(key, row),
      }),
  },
])

/** 批量操作配置 */
const batchActions = computed(() => [
  { key: 'delete', label: t('common.delete'), type: 'error' as const, icon: 'delete' as const },
])

/** 处理搜索 */
function handleSearch(): void {
  searchParams.value.page = 1
  void refetch()
}

/** 处理重置 */
function handleReset(): void {
  searchParams.value = {
    userId: null,
    username: '',
    keyword: '',
    page: 1,
    pageSize: 10,
  }
  void refetch()
}

/** 处理页码变化 */
function handlePageChange(page: number): void {
  searchParams.value.page = page
  void refetch()
}

/** 处理每页数量变化 */
function handlePageSizeChange(pageSize: number): void {
  searchParams.value.pageSize = pageSize
  searchParams.value.page = 1
  void refetch()
}

/** 处理操作 */
function handleAction(key: string, row: Record<string, unknown>): void {
  if (key === 'delete') {
    confirmDelete([row.id as number])
  }
}

/** 处理批量操作 */
function handleBatchAction(key: string): void {
  const ids = checkedRowKeys.value as number[]
  if (ids.length === 0) {
    message.warning(t('common.tips.selectAtLeastOne'))
    return
  }

  if (key === 'delete') {
    confirmDelete(ids)
  }
}

/** 确认删除 */
function confirmDelete(dynamicIds: number[]): void {
  dialog.warning({
    title: t('community.dynamic.deleteTitle'),
    content: t('community.dynamic.confirmDelete', { count: dynamicIds.length }),
    positiveText: t('common.confirm'),
    negativeText: t('common.cancel'),
    onPositiveClick: () => {
      deleteMutation.mutate({ dynamicIds })
    },
  })
}

/** 处理刷新 */
function handleRefresh(): void {
  void refetch()
}
</script>

<template>
  <div class="dynamic-page">
    <!-- 搜索表单 -->
    <n-card :bordered="false" class="dynamic-page__search">
      <search-form :loading="isLoading" @search="handleSearch" @reset="handleReset">
        <n-gi span="6 m:3 l:2">
          <n-form-item :label="t('community.dynamic.keyword')" path="keyword">
            <n-input
              v-model:value="searchParams.keyword"
              :placeholder="t('community.dynamic.keywordPlaceholder')"
              clearable
              @keyup.enter="handleSearch"
            />
          </n-form-item>
        </n-gi>
        <n-gi span="6 m:3 l:2">
          <n-form-item :label="t('community.dynamic.username')" path="username">
            <n-input
              v-model:value="searchParams.username"
              :placeholder="t('community.dynamic.usernamePlaceholder')"
              clearable
              @keyup.enter="handleSearch"
            />
          </n-form-item>
        </n-gi>
        <n-gi span="6 m:3 l:2">
          <n-form-item :label="t('community.dynamic.userId')" path="userId">
            <n-input
              :value="searchParams.userId?.toString() || ''"
              :placeholder="t('community.dynamic.userIdPlaceholder')"
              clearable
              @update:value="(val) => (searchParams.userId = val ? Number(val) : null)"
              @keyup.enter="handleSearch"
            />
          </n-form-item>
        </n-gi>
      </search-form>
    </n-card>

    <!-- 数据表格 -->
    <n-card :bordered="false" class="dynamic-page__table">
      <template #header>
        <n-space justify="space-between" align="center">
          <span class="dynamic-page__title">{{ t('community.dynamic.title') }}</span>
          <n-button size="small" secondary @click="handleRefresh">
            <template #icon>
              <n-icon>
                <svg
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
                  <polyline points="23 4 23 10 17 10" />
                  <polyline points="1 20 1 14 7 14" />
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                </svg>
              </n-icon>
            </template>
            {{ t('common.refresh') }}
          </n-button>
        </n-space>
      </template>

      <!-- 批量操作栏 -->
      <BatchActions
        v-if="checkedRowKeys.length > 0"
        :selected-count="checkedRowKeys.length"
        :actions="batchActions"
        @action="handleBatchAction"
        @clear="checkedRowKeys = []"
      />

      <data-table
        :columns="columns"
        :data="dynamicList"
        :loading="isLoading || deleteMutation.isPending.value"
        :selectable="true"
        :checked-row-keys="checkedRowKeys"
        :page="searchParams.page"
        :page-size="searchParams.pageSize"
        :total="total"
        row-key="id"
        @update:page="handlePageChange"
        @update:page-size="handlePageSizeChange"
        @update:checked-row-keys="(keys) => (checkedRowKeys = keys)"
      />
    </n-card>
  </div>
</template>

<style scoped lang="scss">
.dynamic-page {
  padding: var(--spacing-4);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);

  &__search {
    flex-shrink: 0;
  }

  &__table {
    flex: 1;
    min-height: 0;
  }

  &__title {
    font-size: var(--text-lg);
    font-weight: 500;
    color: var(--color-text);
  }
}
</style>
