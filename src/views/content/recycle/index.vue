<script setup lang="ts">
/**
 * 视频回收站页
 * Video Recycle Bin Page
 * Requirements: 9.6 - 视频回收站、恢复、物理删除
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
  useMessage,
  useDialog,
} from 'naive-ui'
import type { DataTableColumns, DataTableRowKey } from 'naive-ui'
import { getVideoList, deleteVideo, restoreVideo, getPartitions } from '@/api/video'
import type { AdminVideoItem } from '@/api/types'
import { DataTable, TableActions } from '@/components/table'
import { SearchForm, FilterSelect } from '@/components/form'
import { AppAvatar } from '@/components/common'
import VideoDetailDrawer from '../components/VideoDetailDrawer.vue'

const { t } = useI18n()
const message = useMessage()
const dialog = useDialog()
const queryClient = useQueryClient()

/** 搜索参数 */
const searchParams = ref({
  keyword: '',
  partitionId: null as number | null,
  page: 1,
  pageSize: 10,
})

/** 选中的行 */
const checkedRowKeys = ref<DataTableRowKey[]>([])

/** 详情抽屉状态 */
const detailDrawerVisible = ref(false)
const selectedVideoId = ref<number | null>(null)

/** 获取已删除的视频列表 (status=3) */
const {
  data: videoData,
  isLoading,
  refetch,
} = useQuery({
  queryKey: ['recycleVideoList', searchParams],
  queryFn: () =>
    getVideoList({
      status: 3, // 已删除
      keyword: searchParams.value.keyword || undefined,
      partitionId: searchParams.value.partitionId ?? undefined,
      page: searchParams.value.page,
      pageSize: searchParams.value.pageSize,
      sort: 'latest',
    }),
  staleTime: 30 * 1000,
})

/** 获取分区列表（用于筛选） */
const { data: partitionsData } = useQuery({
  queryKey: ['partitions'],
  queryFn: () => getPartitions({ page: 1, pageSize: 100 }),
  staleTime: 5 * 60 * 1000,
})

/** 恢复视频 mutation */
const restoreMutation = useMutation({
  mutationFn: restoreVideo,
  onSuccess: (data) => {
    message.success(t('video.restore.success', { count: data.restored }))
    checkedRowKeys.value = []
    void queryClient.invalidateQueries({ queryKey: ['recycleVideoList'] })
    void queryClient.invalidateQueries({ queryKey: ['videoList'] })
  },
  onError: (error: Error) => {
    message.error(error.message || t('common.tips.operationFailed'))
  },
})

/** 物理删除视频 mutation */
const deleteMutation = useMutation({
  mutationFn: deleteVideo,
  onSuccess: () => {
    message.success(t('video.delete.deleteSuccess'))
    checkedRowKeys.value = []
    void queryClient.invalidateQueries({ queryKey: ['recycleVideoList'] })
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
        style: { borderRadius: '4px', opacity: 0.6 },
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
    title: t('video.list.createdAt'),
    key: 'createdAt',
    width: 160,
    render: (row) => formatDateTime(row.createdAt as string),
  },
  {
    title: t('common.table.operation'),
    key: 'actions',
    width: 180,
    fixed: 'right',
    render: (row) =>
      h(TableActions, {
        actions: [
          { key: 'view', label: t('common.view') },
          { key: 'restore', label: t('video.restore.title'), type: 'success' },
          { key: 'delete', label: t('video.delete.hardDelete'), type: 'error' },
        ],
        onAction: (key: string) => handleAction(key, row as unknown as AdminVideoItem),
      }),
  },
])

/** 批量操作配置 */
const batchActions = computed(() => [
  { key: 'restore', label: t('video.restore.title'), type: 'success' as const },
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
    keyword: '',
    partitionId: null,
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
  } else if (key === 'restore') {
    confirmRestore([row.id])
  } else if (key === 'delete') {
    confirmHardDelete([row.id])
  }
}

/** 处理批量操作 */
function handleBatchAction(key: string): void {
  const ids = checkedRowKeys.value as number[]
  if (ids.length === 0) {
    message.warning(t('common.tips.selectAtLeastOne'))
    return
  }

  if (key === 'restore') {
    confirmRestore(ids)
  } else if (key === 'hardDelete') {
    confirmHardDelete(ids)
  }
}

/** 确认恢复 */
function confirmRestore(videoIds: number[]): void {
  dialog.info({
    title: t('video.restore.title'),
    content: t('video.restore.confirm'),
    positiveText: t('common.confirm'),
    negativeText: t('common.cancel'),
    onPositiveClick: () => {
      restoreMutation.mutate({ videoIds })
    },
  })
}

/** 确认物理删除 */
function confirmHardDelete(videoIds: number[]): void {
  dialog.error({
    title: t('video.delete.title'),
    content: t('video.delete.confirmHardDelete'),
    positiveText: t('common.confirm'),
    negativeText: t('common.cancel'),
    onPositiveClick: () => {
      deleteMutation.mutate({ videoIds, hardDelete: true })
    },
  })
}

/** 处理刷新 */
function handleRefresh(): void {
  void refetch()
}
</script>

<template>
  <div class="recycle-page">
    <!-- 搜索表单 -->
    <n-card :bordered="false" class="recycle-page__search">
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
      </search-form>
    </n-card>

    <!-- 数据表格 -->
    <n-card :bordered="false" class="recycle-page__table">
      <template #header>
        <n-space justify="space-between" align="center">
          <span class="recycle-page__title">{{ t('video.recycle.title') }}</span>
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
        :loading="isLoading || restoreMutation.isPending.value || deleteMutation.isPending.value"
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
.recycle-page {
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
