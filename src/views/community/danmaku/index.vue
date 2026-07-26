<script setup lang="ts">
import { formatDateTime } from '@/utils'
/**
 * 弹幕列表页
 * Danmaku List Page
 * Requirements: 弹幕列表 - 筛选、批量删除
 */
import { ref, computed, h } from 'vue'
import { useI18n } from 'vue-i18n'
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import {
  NCard,
  NButton,
  NIcon,
  NGi,
  NFormItem,
  NInput,
  NImage,
  NTag,
  NTooltip,
  useMessage,
  useDialog,
} from 'naive-ui'
import type { DataTableColumns, DataTableRowKey } from 'naive-ui'
import { getDanmuList, deleteDanmu } from '@/api/video'
import type { DanmuPosition } from '@/api/types'
import { DataTable, TableActions, BatchActions } from '@/components/table'
import { SearchForm } from '@/components/form'
import { AppAvatar } from '@/components/common'
import AppPageHeader from '@/components/layout/AppPageHeader.vue'
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
  page: 1,
  pageSize: 10,
})

/** 选中的行 */
const checkedRowKeys = ref<DataTableRowKey[]>([])
const { resolveTargetIds, createDialogContent } = useTableSelectionAction(checkedRowKeys)

/**
 * 获取弹幕列表
 * searchParams 就在 queryKey 里，改动筛选/分页即触发请求；
 * 因此各 handler 里不再额外调 refetch()（那会让同一次交互打两个请求，
 * 并且 refetch 无条件绕过 staleTime，等于让上面的 staleTime 彻底失效）。
 */
const {
  data: danmuData,
  isLoading,
  isFetching,
  isError,
  error: listError,
  refetch,
} = useQuery({
  queryKey: ['danmuList', searchParams],
  queryFn: () =>
    getDanmuList({
      userId: searchParams.value.userId ?? undefined,
      username: searchParams.value.username || undefined,
      keyword: searchParams.value.keyword || undefined,
      page: searchParams.value.page,
      pageSize: searchParams.value.pageSize,
    }),
  staleTime: 30 * 1000,
})

/** 删除弹幕 mutation */
const deleteMutation = useMutation({
  mutationFn: deleteDanmu,
  onSuccess: (data) => {
    message.success(t('community.danmaku.deleteSuccess', { count: data.deleted }))
    checkedRowKeys.value = []
    void queryClient.invalidateQueries({ queryKey: ['danmuList'] })
  },
  onError: (error: Error) => {
    message.error(error.message || t('common.tips.operationFailed'))
  },
})

/** 弹幕列表数据 */
const danmuList = computed(() => {
  const list = danmuData.value?.list ?? []
  return list as unknown as Record<string, unknown>[]
})
const total = computed(() => danmuData.value?.total ?? 0)

/** 加载失败描述：优先服务端 msg，缺失时由 DataTable 兜底通用文案 */
const loadErrorDescription = computed(() => listError.value?.message?.trim() || undefined)

/** 格式化时间偏移 */
function formatTimeOffset(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

/** 格式化数字 */
function formatNumber(num: number | undefined | null): string {
  if (num == null) return '0'
  if (num >= 10000) {
    return (num / 10000).toFixed(1) + 'w'
  }
  return num.toString()
}

/** 获取位置标签 */
function getPositionLabel(position: DanmuPosition): string {
  const labels: Record<DanmuPosition, string> = {
    0: t('community.danmaku.positionOptions.scroll'),
    1: t('community.danmaku.positionOptions.top'),
    2: t('community.danmaku.positionOptions.bottom'),
  }
  return labels[position] || '-'
}

/** 表格列配置 */
const columns = computed<DataTableColumns<Record<string, unknown>>>(() => [
  {
    type: 'selection',
    fixed: 'left',
  },
  {
    title: t('community.danmaku.avatar'),
    key: 'avatar',
    width: 80,
    align: 'center',
    render: (row) => {
      return h(AppAvatar, { src: row.avatar as string, text: row.username as string, size: 32 })
    },
  },
  {
    title: t('community.danmaku.username'),
    key: 'username',
    width: 120,
    ellipsis: { tooltip: true },
  },
  {
    title: t('community.danmaku.content'),
    key: 'content',
    minWidth: 200,
    render: (row) => {
      const color = row.color as string
      return h(
        NTooltip,
        { trigger: 'hover' },
        {
          trigger: () =>
            h(
              'span',
              {
                class: 'danmu-content',
                style: { color: color || 'inherit' },
              },
              row.content as string
            ),
          default: () => row.content as string,
        }
      )
    },
  },
  {
    title: t('community.danmaku.videoCover'),
    key: 'videoCover',
    width: 100,
    render: (row) => {
      return h(NImage, {
        src: row.videoCover as string,
        width: 80,
        height: 48,
        objectFit: 'cover',
        lazy: true,
        previewDisabled: false,
        style: { borderRadius: '4px' },
      })
    },
  },
  {
    title: t('community.danmaku.videoTitle'),
    key: 'videoTitle',
    width: 180,
    ellipsis: { tooltip: true },
  },
  {
    title: t('community.danmaku.timeOffset'),
    key: 'timeOffset',
    width: 80,
    align: 'center',
    render: (row) => formatTimeOffset(row.timeOffset as number),
  },
  {
    title: t('community.danmaku.position'),
    key: 'position',
    width: 80,
    align: 'center',
    render: (row) => {
      const position = row.position as DanmuPosition
      const typeMap: Record<DanmuPosition, 'default' | 'info' | 'warning'> = {
        0: 'default',
        1: 'info',
        2: 'warning',
      }
      return h(NTag, { type: typeMap[position], size: 'small' }, () => getPositionLabel(position))
    },
  },
  {
    title: t('community.danmaku.likes'),
    key: 'likeCount',
    width: 80,
    align: 'right',
    render: (row) => formatNumber(row.likeCount as number),
  },
  {
    title: t('community.danmaku.createdAt'),
    key: 'createdAt',
    width: 150,
    render: (row) => formatDateTime(row.createdAt as string),
  },
  {
    title: t('common.table.operation'),
    key: 'actions',
    width: 80,
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
}

/** 处理页码变化 */
function handlePageChange(page: number): void {
  searchParams.value.page = page
}

/** 处理每页数量变化 */
function handlePageSizeChange(pageSize: number): void {
  searchParams.value.pageSize = pageSize
  searchParams.value.page = 1
}

/** 处理用户 ID 输入（模板里不写带参箭头函数） */
function handleUserIdInput(value: string): void {
  searchParams.value.userId = value ? Number(value) : null
}

/** 处理选中行变化 */
function handleCheckedRowKeysChange(keys: DataTableRowKey[]): void {
  checkedRowKeys.value = keys
}

/** 清空选中 */
function handleClearSelection(): void {
  checkedRowKeys.value = []
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
function confirmDelete(danmuIds: number[]): void {
  dialog.warning({
    title: t('community.danmaku.deleteTitle'),
    content: createDialogContent(
      t('community.danmaku.deleteTitle'),
      danmuIds.length,
      t('community.danmaku.confirmDelete', { count: danmuIds.length })
    ),
    positiveText: t('common.confirm'),
    negativeText: t('common.cancel'),
    onPositiveClick: () => {
      deleteMutation.mutate({ danmuIds })
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
    <app-page-header class="page-list__header" :title="t('community.danmaku.title')">
      <template #actions>
        <n-button size="small" secondary :loading="isFetching" @click="handleRefresh">
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
      </template>
    </app-page-header>

    <!-- 搜索表单 -->
    <n-card :bordered="false" class="page-list__search">
      <search-form :loading="isLoading" @search="handleSearch" @reset="handleReset">
        <n-gi span="6 m:3 l:2">
          <n-form-item :label="t('community.danmaku.keyword')" path="keyword">
            <n-input
              v-model:value="searchParams.keyword"
              :placeholder="t('community.danmaku.keywordPlaceholder')"
              clearable
              @keyup.enter="handleSearch"
            />
          </n-form-item>
        </n-gi>
        <n-gi span="6 m:3 l:2">
          <n-form-item :label="t('community.danmaku.username')" path="username">
            <n-input
              v-model:value="searchParams.username"
              :placeholder="t('community.danmaku.usernamePlaceholder')"
              clearable
              @keyup.enter="handleSearch"
            />
          </n-form-item>
        </n-gi>
        <n-gi span="6 m:3 l:2">
          <n-form-item :label="t('community.danmaku.userId')" path="userId">
            <n-input
              :value="searchParams.userId?.toString() || ''"
              :placeholder="t('community.danmaku.userIdPlaceholder')"
              clearable
              @update:value="handleUserIdInput"
              @keyup.enter="handleSearch"
            />
          </n-form-item>
        </n-gi>
      </search-form>
    </n-card>

    <!-- 数据表格 -->
    <n-card :bordered="false" class="page-list__table">
      <!-- 批量操作栏 -->
      <BatchActions
        v-if="checkedRowKeys.length > 0"
        :selected-count="checkedRowKeys.length"
        :actions="batchActions"
        @action="handleBatchAction"
        @clear="handleClearSelection"
      />

      <data-table
        :columns="columns"
        :data="danmuList"
        :loading="isFetching || deleteMutation.isPending.value"
        :error="isError"
        :error-description="loadErrorDescription"
        :selectable="true"
        :checked-row-keys="checkedRowKeys"
        :page="searchParams.page"
        :page-size="searchParams.pageSize"
        :total="total"
        row-key="id"
        @update:page="handlePageChange"
        @update:page-size="handlePageSizeChange"
        @update:checked-row-keys="handleCheckedRowKeysChange"
        @retry="handleRefresh"
      />
    </n-card>
  </div>
</template>

<style scoped lang="scss">
.danmu-content {
  display: inline-block;
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
