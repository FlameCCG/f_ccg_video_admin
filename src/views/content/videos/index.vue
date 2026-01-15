<script setup lang="ts">
/**
 * 视频列表页
 * Video List Page
 * Requirements: 9.1, 9.2, 9.5 - 视频列表、筛选、删除
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
import { getVideoList, deleteVideo, getPartitions } from '@/api/video'
import type { AdminVideoItem, VideoStatus, VideoSortType } from '@/api/types'
import { DataTable, TableActions } from '@/components/table'
import { SearchForm, FilterSelect } from '@/components/form'
import { AppAvatar, AppStatusTag } from '@/components/common'
import VideoDetailDrawer from '../components/VideoDetailDrawer.vue'

const { t } = useI18n()
const message = useMessage()
const dialog = useDialog()
const queryClient = useQueryClient()

/** 搜索参数 */
const searchParams = ref({
  userId: null as number | null,
  keyword: '',
  status: null as VideoStatus | null,
  partitionId: null as number | null,
  sort: 'latest' as VideoSortType,
  page: 1,
  pageSize: 10,
})

/** 选中的行 */
const checkedRowKeys = ref<DataTableRowKey[]>([])

/** 详情抽屉状态 */
const detailDrawerVisible = ref(false)
const selectedVideoId = ref<number | null>(null)

/** 获取视频列表 */
const {
  data: videoData,
  isLoading,
  refetch,
} = useQuery({
  queryKey: ['videoList', searchParams],
  queryFn: () =>
    getVideoList({
      userId: searchParams.value.userId ?? undefined,
      keyword: searchParams.value.keyword || undefined,
      status: searchParams.value.status ?? undefined,
      partitionId: searchParams.value.partitionId ?? undefined,
      sort: searchParams.value.sort,
      page: searchParams.value.page,
      pageSize: searchParams.value.pageSize,
    }),
  staleTime: 30 * 1000,
})

/** 获取分区列表（用于筛选） */
const { data: partitionsData } = useQuery({
  queryKey: ['partitions'],
  queryFn: () => getPartitions({ page: 1, pageSize: 100 }),
  staleTime: 5 * 60 * 1000,
})

/** 删除视频 mutation */
const deleteMutation = useMutation({
  mutationFn: deleteVideo,
  onSuccess: () => {
    message.success(t('video.delete.deleteSuccess'))
    checkedRowKeys.value = []
    void queryClient.invalidateQueries({ queryKey: ['videoList'] })
  },
  onError: (error: Error) => {
    message.error(error.message || t('common.tips.operationFailed'))
  },
})

/** 视频列表数据 */
const videoList = computed(() => {
  const list = videoData.value?.list ?? []
  return list as unknown as Record<string, unknown>[]
})
const total = computed(() => videoData.value?.total ?? 0)

/** 分区选项 */
const partitionOptions = computed(() => {
  return (partitionsData.value?.list ?? []).map((p) => ({
    value: p.id,
    label: p.name,
  }))
})

/** 状态选项 */
const statusOptions = computed(() => [
  { value: 1, label: t('video.status.published') },
  { value: 2, label: t('video.status.private') },
  { value: 4, label: t('video.status.reviewing') },
])

/** 排序选项 */
const sortOptions = computed(() => [
  { value: 'latest', label: t('video.filter.sortOptions.newest') },
  { value: 'oldest', label: t('video.filter.sortOptions.oldest') },
  { value: 'views', label: t('video.filter.sortOptions.views') },
  { value: 'likes', label: t('video.filter.sortOptions.likes') },
])

/** 获取状态标签类型 */
function getStatusType(status: VideoStatus): 'success' | 'warning' | 'error' | 'processing' {
  const typeMap: Record<VideoStatus, 'success' | 'warning' | 'error' | 'processing'> = {
    1: 'success',
    2: 'warning',
    3: 'error',
    4: 'processing',
  }
  return typeMap[status]
}

/** 获取状态文本 */
function getStatusText(status: VideoStatus): string {
  const textMap: Record<VideoStatus, string> = {
    1: t('video.status.published'),
    2: t('video.status.private'),
    3: t('video.status.deleted'),
    4: t('video.status.reviewing'),
  }
  return textMap[status]
}

/** 格式化时长 */
function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

/** 格式化数字 */
function formatNumber(num: number): string {
  if (num >= 10000) {
    return (num / 10000).toFixed(1) + 'w'
  }
  return num.toString()
}

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
    title: t('video.list.cover'),
    key: 'cover',
    width: 120,
    render: (row) =>
      h(NImage, {
        src: row.cover as string,
        width: 100,
        height: 56,
        objectFit: 'cover',
        lazy: true,
        previewDisabled: false,
        style: { borderRadius: '4px' },
      }),
  },
  {
    title: t('video.list.videoTitle'),
    key: 'title',
    minWidth: 200,
    ellipsis: { tooltip: true },
  },
  {
    title: t('video.list.author'),
    key: 'author',
    width: 150,
    render: (row) => {
      const author = row.author as { id: number; username: string; avatar: string }
      return h(NSpace, { align: 'center', size: 8 }, () => [
        h(AppAvatar, { src: author.avatar, text: author.username, size: 28 }),
        h('span', {}, author.username),
      ])
    },
  },
  {
    title: t('video.list.status'),
    key: 'status',
    width: 100,
    render: (row) =>
      h(AppStatusTag, {
        type: getStatusType(row.status as VideoStatus),
        text: getStatusText(row.status as VideoStatus),
        dot: true,
      }),
  },
  {
    title: t('video.list.partition'),
    key: 'partitionName',
    width: 100,
  },
  {
    title: t('video.list.duration'),
    key: 'duration',
    width: 80,
    align: 'center',
    render: (row) => formatDuration(row.duration as number),
  },
  {
    title: t('video.list.views'),
    key: 'views',
    width: 90,
    align: 'right',
    render: (row) => formatNumber(row.views as number),
  },
  {
    title: t('video.list.likes'),
    key: 'likes',
    width: 90,
    align: 'right',
    render: (row) => formatNumber(row.likes as number),
  },
  {
    title: t('video.list.isOriginal'),
    key: 'isOriginal',
    width: 80,
    align: 'center',
    render: (row) =>
      h(NTag, { type: (row.isOriginal as boolean) ? 'success' : 'default', size: 'small' }, () =>
        (row.isOriginal as boolean) ? t('common.yes') : t('common.no')
      ),
  },
  {
    title: t('video.list.createdAt'),
    key: 'createdAt',
    width: 160,
    render: (row) => formatDateTime(row.createdAt as string),
  },
  {
    title: t('common.table.operation'),
    key: 'actions',
    width: 150,
    fixed: 'right',
    render: (row) =>
      h(TableActions, {
        actions: [
          { key: 'view', label: t('common.view') },
          { key: 'delete', label: t('common.delete'), type: 'error' },
        ],
        onAction: (key: string) => handleAction(key, row as unknown as AdminVideoItem),
      }),
  },
])

/** 批量操作配置 */
const batchActions = computed(() => [
  { key: 'softDelete', label: t('video.delete.softDelete'), type: 'warning' as const },
  { key: 'hardDelete', label: t('video.delete.hardDelete'), type: 'error' as const },
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
    keyword: '',
    status: null,
    partitionId: null,
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
function handleAction(key: string, row: AdminVideoItem): void {
  if (key === 'view') {
    selectedVideoId.value = row.id
    detailDrawerVisible.value = true
  } else if (key === 'delete') {
    confirmDelete([row.id], false)
  }
}

/** 处理批量操作 */
function handleBatchAction(key: string): void {
  const ids = checkedRowKeys.value as number[]
  if (ids.length === 0) {
    message.warning(t('common.tips.selectAtLeastOne'))
    return
  }

  if (key === 'softDelete') {
    confirmDelete(ids, false)
  } else if (key === 'hardDelete') {
    confirmDelete(ids, true)
  }
}

/** 确认删除 */
function confirmDelete(videoIds: number[], hardDelete: boolean): void {
  const content = hardDelete
    ? t('video.delete.confirmHardDelete')
    : t('video.delete.confirmSoftDelete')

  dialog.warning({
    title: t('video.delete.title'),
    content,
    positiveText: t('common.confirm'),
    negativeText: t('common.cancel'),
    onPositiveClick: () => {
      deleteMutation.mutate({ videoIds, hardDelete })
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
          <n-form-item :label="t('video.filter.keyword')" path="keyword">
            <n-input
              v-model:value="searchParams.keyword"
              :placeholder="t('video.filter.keywordPlaceholder')"
              clearable
              @keyup.enter="handleSearch"
            />
          </n-form-item>
        </n-gi>
        <n-gi span="6 m:3 l:2">
          <n-form-item :label="t('video.filter.status')" path="status">
            <filter-select
              :value="searchParams.status"
              :options="statusOptions"
              :placeholder="t('video.filter.statusPlaceholder')"
              :width="'100%'"
              @change="(val) => (searchParams.status = val as VideoStatus | null)"
            />
          </n-form-item>
        </n-gi>
        <n-gi span="6 m:3 l:2">
          <n-form-item :label="t('video.filter.partition')" path="partitionId">
            <filter-select
              :value="searchParams.partitionId"
              :options="partitionOptions"
              :placeholder="t('video.filter.partitionPlaceholder')"
              :width="'100%'"
              @change="(val) => (searchParams.partitionId = val as number | null)"
            />
          </n-form-item>
        </n-gi>
        <n-gi span="6 m:3 l:2">
          <n-form-item :label="t('video.filter.sortBy')" path="sort">
            <filter-select
              :value="searchParams.sort"
              :options="sortOptions"
              :placeholder="t('video.filter.sortBy')"
              :width="'100%'"
              :clearable="false"
              @change="(val) => (searchParams.sort = (val as VideoSortType) || 'latest')"
            />
          </n-form-item>
        </n-gi>
      </search-form>
    </n-card>

    <!-- 数据表格 -->
    <n-card :bordered="false" class="page-list__table">
      <template #header>
        <n-space justify="space-between" align="center">
          <span class="page-list__title">{{ t('video.list.title') }}</span>
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
      <batch-actions
        v-if="checkedRowKeys.length > 0"
        :selected-count="checkedRowKeys.length"
        :actions="batchActions"
        @action="handleBatchAction"
        @clear="checkedRowKeys = []"
      />

      <data-table
        :columns="columns"
        :data="videoList"
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

    <!-- 视频详情抽屉 -->
    <video-detail-drawer v-model:visible="detailDrawerVisible" :video-id="selectedVideoId" />
  </div>
</template>

<style scoped lang="scss">
// 使用全局 page-list 样式
</style>
