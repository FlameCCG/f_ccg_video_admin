<script setup lang="ts">
import { formatDateTime } from '@/utils'
/**
 * 评论管控页
 * Comment Moderation Page
 * Requirements: 12.1-12.3 - 评论列表、筛选、删除
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
  NTag,
  useMessage,
  useDialog,
} from 'naive-ui'
import type { DataTableColumns, DataTableRowKey } from 'naive-ui'
import { getCommentList, deleteComment } from '@/api/comment'
import type { CommentSortType } from '@/api/types'
import { DataTable, TableActions, BatchActions } from '@/components/table'
import { SearchForm, FilterSelect } from '@/components/form'
import { AppAvatar } from '@/components/common'
import { useTableSelectionAction } from '@/composables'

const { t } = useI18n()
const message = useMessage()
const dialog = useDialog()
const queryClient = useQueryClient()

/** 搜索参数 */
const searchParams = ref({
  userId: null as number | null,
  username: '',
  keyword: '',
  sort: 'latest' as CommentSortType,
  page: 1,
  pageSize: 10,
})

/** 选中的行 */
const checkedRowKeys = ref<DataTableRowKey[]>([])
const { resolveTargetIds, createDialogContent } = useTableSelectionAction(checkedRowKeys)

/** 获取评论列表 */
const {
  data: commentData,
  isLoading,
  refetch,
} = useQuery({
  queryKey: ['commentList', searchParams],
  queryFn: () =>
    getCommentList({
      userId: searchParams.value.userId ?? undefined,
      username: searchParams.value.username || undefined,
      keyword: searchParams.value.keyword || undefined,
      sort: searchParams.value.sort,
      page: searchParams.value.page,
      pageSize: searchParams.value.pageSize,
    }),
  staleTime: 30 * 1000,
})

/** 删除评论 mutation */
const deleteMutation = useMutation({
  mutationFn: deleteComment,
  onSuccess: (data) => {
    message.success(t('community.comment.deleteSuccess', { count: data.deleted }))
    checkedRowKeys.value = []
    void queryClient.invalidateQueries({ queryKey: ['commentList'] })
  },
  onError: (error: Error) => {
    message.error(error.message || t('common.tips.operationFailed'))
  },
})

/** 评论列表数据 */
const commentList = computed(() => {
  const list = commentData.value?.list ?? []
  return list as unknown as Record<string, unknown>[]
})
const total = computed(() => commentData.value?.total ?? 0)

/** 排序选项 */
const sortOptions = computed(() => [
  { value: 'latest', label: t('community.comment.sortOptions.latest') },
  { value: 'oldest', label: t('community.comment.sortOptions.oldest') },
  { value: 'likes', label: t('community.comment.sortOptions.likes') },
  { value: 'replies', label: t('community.comment.sortOptions.replies') },
])

/** 格式化数字 */
function formatNumber(num: number | undefined | null): string {
  if (num == null) return '0'
  if (num >= 10000) {
    return (num / 10000).toFixed(1) + 'w'
  }
  return num.toString()
}

/** 表格列配置 */
const columns = computed<DataTableColumns<Record<string, unknown>>>(() => [
  {
    type: 'selection',
    fixed: 'left',
  },
  {
    title: t('community.comment.avatar'),
    key: 'avatar',
    width: 80,
    align: 'center',
    render: (row) => {
      return h(AppAvatar, { src: row.avatar as string, text: row.username as string, size: 32 })
    },
  },
  {
    title: t('community.comment.username'),
    key: 'username',
    width: 120,
    ellipsis: { tooltip: true },
  },
  {
    title: t('community.comment.content'),
    key: 'content',
    minWidth: 300,
    ellipsis: { tooltip: true },
  },
  {
    title: t('community.comment.likes'),
    key: 'likeCount',
    width: 100,
    align: 'right',
    render: (row) => formatNumber(row.likeCount as number),
  },
  {
    title: t('community.comment.replies'),
    key: 'replyCount',
    width: 100,
    align: 'right',
    render: (row) => formatNumber(row.replyCount as number),
  },
  {
    title: t('community.comment.isPinned'),
    key: 'isPinned',
    width: 80,
    align: 'center',
    render: (row) =>
      h(NTag, { type: (row.isPinned as boolean) ? 'success' : 'default', size: 'small' }, () =>
        (row.isPinned as boolean) ? t('common.yes') : t('common.no')
      ),
  },
  {
    title: t('community.comment.createdAt'),
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
    sort: 'latest',
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
    confirmDelete(resolveTargetIds(row.id as number))
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
function confirmDelete(commentIds: number[]): void {
  dialog.warning({
    title: t('community.comment.deleteTitle'),
    content: createDialogContent(
      t('community.comment.deleteTitle'),
      commentIds.length,
      t('community.comment.confirmDelete', { count: commentIds.length })
    ),
    positiveText: t('common.confirm'),
    negativeText: t('common.cancel'),
    onPositiveClick: () => {
      deleteMutation.mutate({ commentIds })
    },
  })
}

/** 处理刷新 */
function handleRefresh(): void {
  void refetch()
}
</script>

<template>
  <div class="page-list">
    <!-- 搜索表单 -->
    <n-card :bordered="false" class="page-list__search">
      <search-form :loading="isLoading" @search="handleSearch" @reset="handleReset">
        <n-gi span="6 m:3 l:2">
          <n-form-item :label="t('community.comment.keyword')" path="keyword">
            <n-input
              v-model:value="searchParams.keyword"
              :placeholder="t('community.comment.keywordPlaceholder')"
              clearable
              @keyup.enter="handleSearch"
            />
          </n-form-item>
        </n-gi>
        <n-gi span="6 m:3 l:2">
          <n-form-item :label="t('community.comment.username')" path="username">
            <n-input
              v-model:value="searchParams.username"
              :placeholder="t('community.comment.usernamePlaceholder')"
              clearable
              @keyup.enter="handleSearch"
            />
          </n-form-item>
        </n-gi>
        <n-gi span="6 m:3 l:2">
          <n-form-item :label="t('community.comment.userId')" path="userId">
            <n-input
              :value="searchParams.userId?.toString() || ''"
              :placeholder="t('community.comment.userIdPlaceholder')"
              clearable
              @update:value="(val) => (searchParams.userId = val ? Number(val) : null)"
              @keyup.enter="handleSearch"
            />
          </n-form-item>
        </n-gi>
        <n-gi span="6 m:3 l:2">
          <n-form-item :label="t('community.comment.sortBy')" path="sort">
            <filter-select
              :value="searchParams.sort"
              :options="sortOptions"
              :placeholder="t('community.comment.sortBy')"
              :width="'100%'"
              :clearable="false"
              @change="(val) => (searchParams.sort = (val as CommentSortType) || 'latest')"
            />
          </n-form-item>
        </n-gi>
      </search-form>
    </n-card>

    <!-- 数据表格 -->
    <n-card :bordered="false" class="page-list__table">
      <template #header>
        <n-space justify="space-between" align="center">
          <span class="page-list__title">{{ t('community.comment.title') }}</span>
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
        :data="commentList"
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
// 使用全局 page-list 样式
</style>
