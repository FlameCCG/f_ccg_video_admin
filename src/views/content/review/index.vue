<script setup lang="ts">
import { formatDateTime } from '@/utils'
/**
 * 稿件审核页
 * Submission Review Page
 * Requirements: 9.4 - 审核视频
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
import { getVideoList, reviewVideo, getPartitions } from '@/api/video'
import type { AdminVideoItem, ReviewStatus, VideoSortType } from '@/api/types'
import { DataTable, TableActions, BatchActions } from '@/components/table'
import { SearchForm, FilterSelect } from '@/components/form'
import { AppAvatar } from '@/components/common'
import AppPageHeader from '@/components/layout/AppPageHeader.vue'
import { useTableSelectionAction } from '@/composables'
import VideoDetailDrawer from '../components/VideoDetailDrawer.vue'

const { t } = useI18n()
const message = useMessage()
const dialog = useDialog()
const queryClient = useQueryClient()

/** 搜索参数 */
const searchParams = ref({
  keyword: '',
  partitionId: null as number | null,
  sort: 'latest' as VideoSortType,
  page: 1,
  pageSize: 10,
})

/** 选中的行 */
const checkedRowKeys = ref<DataTableRowKey[]>([])
const { resolveTargetIds, createDialogContent } = useTableSelectionAction(checkedRowKeys)

/** 详情抽屉状态 */
const detailDrawerVisible = ref(false)
const selectedVideoId = ref<number | null>(null)

/**
 * 获取审核中的视频列表 (status=4)
 * searchParams 就在 queryKey 里，改动筛选/分页即触发请求；
 * 因此各 handler 里不再额外调 refetch()（那会让同一次交互打两个请求，
 * 并且 refetch 无条件绕过 staleTime，等于让上面的 staleTime 彻底失效）。
 */
const {
  data: videoData,
  isLoading,
  isFetching,
  isError,
  refetch,
} = useQuery({
  queryKey: ['reviewVideoList', searchParams],
  queryFn: () =>
    getVideoList({
      status: 4, // 审核中
      keyword: searchParams.value.keyword || undefined,
      partitionId: searchParams.value.partitionId ?? undefined,
      page: searchParams.value.page,
      pageSize: searchParams.value.pageSize,
      sort: searchParams.value.sort,
    }),
  staleTime: 30 * 1000,
})

/** 获取分区列表（用于筛选） */
const {
  data: partitionsData,
  isFetching: isPartitionsFetching,
  isError: isPartitionsError,
} = useQuery({
  queryKey: ['partitions'],
  queryFn: () => getPartitions({ page: 1, pageSize: 100 }),
  staleTime: 5 * 60 * 1000,
})

/** 审核视频 mutation */
const reviewMutation = useMutation({
  mutationFn: reviewVideo,
  onSuccess: (_, variables) => {
    const successMap: Record<ReviewStatus, string> = {
      1: t('video.review.passSuccess'),
      2: t('video.review.toPrivateSuccess'),
      3: t('video.review.rejectSuccess'),
    }
    message.success(successMap[variables.status])
    checkedRowKeys.value = []
    void queryClient.invalidateQueries({ queryKey: ['reviewVideoList'] })
    void queryClient.invalidateQueries({ queryKey: ['videoList'] })
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

/**
 * 分区筛选的占位文案。
 * 分区列表是二级查询，失败时下拉框会变成一个「空得毫无理由」的筛选项；
 * 占位文案切成「加载失败」才能让用户知道不是没有分区，而是没取到。
 */
const partitionPlaceholder = computed(() =>
  isPartitionsError.value ? t('common.tips.loadFailed') : t('video.filter.partitionPlaceholder')
)

const sortOptions = computed(() => [
  { value: 'latest', label: t('video.filter.sortOptions.newest') },
  { value: 'duration', label: t('video.filter.sortOptions.duration') },
])

/** 格式化时长 */
function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
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
    width: 200,
    fixed: 'right',
    render: (row) =>
      h(TableActions, {
        actions: [
          { key: 'view', label: t('common.view') },
          { key: 'approve', label: t('video.review.pass'), type: 'success' },
          { key: 'reject', label: t('video.review.reject'), type: 'error' },
        ],
        onAction: (key: string) => handleAction(key, row as unknown as AdminVideoItem),
      }),
  },
])

/** 批量操作配置 */
const batchActions = computed(() => [
  { key: 'approve', label: t('video.review.pass'), type: 'success' as const },
  { key: 'toPrivate', label: t('video.review.toPrivate'), type: 'warning' as const },
  { key: 'reject', label: t('video.review.reject'), type: 'error' as const },
])

/** 处理搜索 */
function handleSearch(): void {
  searchParams.value.page = 1
}

/** 处理重置 */
function handleReset(): void {
  searchParams.value = {
    keyword: '',
    partitionId: null,
    sort: 'latest',
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

/** 分区筛选变化 */
function handlePartitionChange(value: string | number | null): void {
  searchParams.value.partitionId = typeof value === 'number' ? value : null
}

/** 排序变化 */
function handleSortChange(value: string | number | null): void {
  searchParams.value.sort = typeof value === 'string' ? (value as VideoSortType) : 'latest'
}

/** 选中行变化 */
function handleCheckedRowKeysChange(keys: DataTableRowKey[]): void {
  checkedRowKeys.value = keys
}

/** 清空选中 */
function handleClearSelection(): void {
  checkedRowKeys.value = []
}

/** 处理操作 */
function handleAction(key: string, row: AdminVideoItem): void {
  if (key === 'view') {
    selectedVideoId.value = row.id
    detailDrawerVisible.value = true
  } else if (key === 'approve') {
    confirmReview(resolveTargetIds(row.id), 1)
  } else if (key === 'reject') {
    confirmReview(resolveTargetIds(row.id), 3)
  }
}

/** 处理批量操作 */
function handleBatchAction(key: string): void {
  const ids = checkedRowKeys.value as number[]
  if (ids.length === 0) {
    message.warning(t('common.tips.selectAtLeastOne'))
    return
  }

  if (key === 'approve') {
    confirmReview(ids, 1)
  } else if (key === 'toPrivate') {
    confirmReview(ids, 2)
  } else if (key === 'reject') {
    confirmReview(ids, 3)
  }
}

/** 确认审核 */
function confirmReview(videoIds: number[], status: ReviewStatus): void {
  const actionLabelMap: Record<ReviewStatus, string> = {
    1: t('video.review.pass'),
    2: t('video.review.toPrivate'),
    3: t('video.review.reject'),
  }
  const detailMap: Record<ReviewStatus, string> = {
    1: t('video.review.confirmPass'),
    2: t('video.review.confirmToPrivate'),
    3: t('video.review.confirmReject'),
  }

  dialog.warning({
    title: t('video.review.title'),
    content: createDialogContent(actionLabelMap[status], videoIds.length, detailMap[status]),
    positiveText: t('common.confirm'),
    negativeText: t('common.cancel'),
    onPositiveClick: () => {
      reviewMutation.mutate({ videoIds, status })
    },
  })
}

/** 处理刷新：用户主动发起，是 refetch 的正当用法（同时用作失败重试） */
function handleRefresh(): void {
  void refetch()
}
</script>

<template>
  <div class="page-list">
    <app-page-header class="page-list__header" :title="t('video.review.title')">
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
              :placeholder="partitionPlaceholder"
              :loading="isPartitionsFetching"
              :width="'100%'"
              @change="handlePartitionChange"
            />
          </n-form-item>
        </n-gi>
        <n-gi span="6 m:3 l:2">
          <n-form-item :label="t('video.filter.sortBy')" path="sort">
            <filter-select
              :value="searchParams.sort"
              :options="sortOptions"
              :placeholder="t('video.filter.sortBy')"
              :clearable="false"
              :width="'100%'"
              @change="handleSortChange"
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
        :data="videoList"
        :loading="isFetching || reviewMutation.isPending.value"
        :error="isError"
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

    <!-- 视频详情抽屉 -->
    <video-detail-drawer v-model:visible="detailDrawerVisible" :video-id="selectedVideoId" />
  </div>
</template>

<style scoped lang="scss">
// 使用全局 page-list 样式：原来这里是一份 .review-page 克隆块，
// 它自带 padding 会与 .content-wrapper 的页面内缩叠成两倍内缩，
// 且缺 height: 100% / min-height: 0，表格区撑不满剩余高度。
</style>
