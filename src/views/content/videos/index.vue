<script setup lang="ts">
import { formatDateTime } from '@/utils'
/**
 * 视频列表页
 * Video List Page
 * Requirements: 9.1, 9.2, 9.5 - 视频列表、筛选、删除
 */
import { ref, computed, provide, h } from 'vue'
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
  useMessage,
  useDialog,
} from 'naive-ui'
import type { DataTableColumns, DataTableRowKey } from 'naive-ui'
import { getVideoList, deleteVideo, getPartitions } from '@/api/video'
import type { AdminVideoItem, VideoStatus, VideoSortType } from '@/api/types'
import { DataTable, TableActions, BatchActions } from '@/components/table'
import { SearchForm, FilterSelect } from '@/components/form'
import { AppAvatar, AppStatusTag } from '@/components/common'
import AppPageHeader from '@/components/layout/AppPageHeader.vue'
import TranscodeProgressCell from '@/components/video/TranscodeProgressCell.vue'
import {
  useTableSelectionAction,
  useTranscodeProgressSSE,
  transcodeProgressKey,
} from '@/composables'
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
const { resolveTargetIds, createDialogContent } = useTableSelectionAction(checkedRowKeys)

/** 详情抽屉状态 */
const detailDrawerVisible = ref(false)
const selectedVideoId = ref<number | null>(null)

/**
 * 获取视频列表
 * searchParams 就在 queryKey 里，改动筛选/分页即触发请求；
 * 因此各 handler 里不再额外调 refetch()（那会让同一次交互打两个请求，
 * 并且 refetch 无条件绕过 staleTime，等于让上面的 staleTime 彻底失效）。
 */
const {
  data: videoData,
  isLoading,
  isFetching,
  isError,
  error: listError,
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
    void queryClient.invalidateQueries({ queryKey: ['recycleVideoList'] })
  },
  onError: (err: Error) => {
    message.error(err.message || t('common.tips.operationFailed'))
  },
})

/** 视频列表数据 */
const videoList = computed(() => {
  const list = videoData.value?.list ?? []
  return list as unknown as Record<string, unknown>[]
})
const total = computed(() => videoData.value?.total ?? 0)

/**
 * 失败详情：优先服务端 msg，没有再兜一句通用说明。
 * 「只在没有任何可展示数据时才用失败态替换表格」的判断已由 DataTable 内部完成
 * （error && !loading && data.length === 0），这里不再重复一份。
 */
const loadErrorDetail = computed(() => {
  const msg = listError.value?.message?.trim()
  return msg ? msg : t('video.list.loadFailedHint')
})

/** 当前页视频 ID → 转码进度 SSE */
const pageVideoIds = computed(() =>
  (videoData.value?.list ?? [])
    .map((v) => v.id)
    .filter((id): id is number => typeof id === 'number' && id > 0)
)
const {
  progressMap,
  error: transcodeStreamError,
  reconnect: reconnectTranscodeStream,
} = useTranscodeProgressSSE(pageVideoIds)

/**
 * 进度表向下 provide，由每行的 TranscodeProgressCell 自行订阅。
 * 列的 render 函数一旦读了 progressMap，整个 tbody（Naive 用同一个渲染
 * effect 产出）就会跟着每秒数次的 SSE 推送一起重渲染。
 */
provide(transcodeProgressKey, progressMap)

/** 只有「已放弃重连」才提示用户：disconnected 期间 EventSource 仍在自动重试 */
const transcodeStreamAborted = computed(() => transcodeStreamError.value === 'aborted')

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

/**
 * 表格列配置
 * - 列宽合计约 1.4k：窄屏由 DataTable 的横向滚动承接，不再靠压缩列宽硬塞一屏
 * - 头像并入作者列
 * - 转码列只渲染 TranscodeProgressCell 并把 row.id 交给它：render 函数不碰
 *   progressMap，SSE 推送才不会把整个 tbody 拖着重渲染
 */
const columns = computed<DataTableColumns<Record<string, unknown>>>(() => [
  {
    type: 'selection',
    width: 40,
  },
  {
    title: t('video.list.cover'),
    key: 'cover',
    width: 88,
    render: (row) =>
      h(NImage, {
        src: row.cover as string,
        width: 72,
        height: 40,
        objectFit: 'cover',
        lazy: true,
        previewDisabled: false,
        style: { borderRadius: 'var(--radius-sm)' },
      }),
  },
  {
    title: t('video.list.videoTitle'),
    key: 'title',
    minWidth: 140,
    ellipsis: { tooltip: true },
  },
  {
    title: t('video.list.author'),
    key: 'author',
    width: 132,
    ellipsis: { tooltip: true },
    render: (row) => {
      const author = row.author as { id: number; username: string; avatar: string }
      return h(
        'div',
        {
          style: {
            display: 'inline-flex',
            alignItems: 'center',
            gap: 'var(--spacing-2)',
            maxWidth: '100%',
            minWidth: 0,
          },
        },
        [
          h(AppAvatar, { src: author.avatar, text: author.username, size: 28 }),
          h(
            'span',
            {
              style: {
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              },
            },
            author.username
          ),
        ]
      )
    },
  },
  {
    title: t('video.list.status'),
    key: 'status',
    width: 96,
    align: 'center',
    render: (row) =>
      h(AppStatusTag, {
        type: getStatusType(row.status as VideoStatus),
        text: getStatusText(row.status as VideoStatus),
        dot: true,
      }),
  },
  {
    title: t('video.list.transcode'),
    key: 'transcode',
    minWidth: 200,
    width: 260,
    render: (row) => h(TranscodeProgressCell, { videoId: row.id as number }),
  },
  {
    title: t('video.list.partition'),
    key: 'partitionName',
    width: 96,
    ellipsis: { tooltip: true },
  },
  {
    title: t('video.list.duration'),
    key: 'duration',
    width: 72,
    align: 'center',
    render: (row) => formatDuration(row.duration as number),
  },
  {
    title: t('video.list.views'),
    key: 'views',
    width: 80,
    align: 'center',
    ellipsis: { tooltip: true },
    render: (row) => formatNumber(row.views as number),
  },
  {
    title: t('video.list.likes'),
    key: 'likes',
    width: 80,
    align: 'center',
    ellipsis: { tooltip: true },
    render: (row) => formatNumber(row.likes as number),
  },
  {
    title: t('video.list.isOriginal'),
    key: 'isOriginal',
    width: 72,
    align: 'center',
    render: (row) =>
      h(NTag, { type: (row.isOriginal as boolean) ? 'success' : 'default', size: 'small' }, () =>
        (row.isOriginal as boolean) ? t('common.yes') : t('common.no')
      ),
  },
  {
    title: t('video.list.createdAt'),
    key: 'createdAt',
    width: 148,
    ellipsis: { tooltip: true },
    render: (row) => formatDateTime(row.createdAt as string),
  },
  {
    title: t('common.table.operation'),
    key: 'actions',
    width: 120,
    align: 'center',
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

/**
 * 批量操作配置。
 * 刻意不叫 batchActions：模板里的 <batch-actions> 会被按 camelize / PascalCase
 * 两种写法去 setup 绑定里找组件，同名变量会让人（和 lint）分不清指的是哪一个。
 */
const batchActionOptions = computed(() => [
  { key: 'softDelete', label: t('video.delete.softDelete'), type: 'warning' as const },
  { key: 'hardDelete', label: t('video.delete.hardDelete'), type: 'error' as const },
])

/** 处理搜索 */
function handleSearch(): void {
  searchParams.value.page = 1
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

/** 状态筛选变化 */
function handleStatusChange(value: string | number | null): void {
  searchParams.value.status = typeof value === 'number' ? (value as VideoStatus) : null
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
  } else if (key === 'delete') {
    confirmDelete(resolveTargetIds(row.id), false)
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
  const detail = hardDelete
    ? t('video.delete.confirmHardDelete')
    : t('video.delete.confirmSoftDelete')
  const actionLabel = hardDelete ? t('video.delete.hardDelete') : t('video.delete.softDelete')

  dialog.warning({
    title: t('video.delete.title'),
    content: createDialogContent(actionLabel, videoIds.length, detail),
    positiveText: t('common.confirm'),
    negativeText: t('common.cancel'),
    onPositiveClick: () => {
      deleteMutation.mutate({ videoIds, hardDelete })
    },
  })
}

/** 处理刷新：用户主动发起，是 refetch 的正当用法（同时用作失败重试） */
function handleRefresh(): void {
  void refetch()
}

/** 转码进度流已放弃重连时的手动重连 */
function handleReconnectStream(): void {
  reconnectTranscodeStream()
}
</script>

<template>
  <div class="page-list">
    <app-page-header class="page-list__header" :title="t('video.list.title')">
      <template #actions>
        <n-button
          v-if="transcodeStreamAborted"
          size="small"
          quaternary
          type="warning"
          @click="handleReconnectStream"
        >
          {{ t('video.transcode.streamOffline') }}
        </n-button>
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
          <n-form-item :label="t('video.filter.status')" path="status">
            <filter-select
              :value="searchParams.status"
              :options="statusOptions"
              :placeholder="t('video.filter.statusPlaceholder')"
              :width="'100%'"
              @change="handleStatusChange"
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
              :width="'100%'"
              :clearable="false"
              @change="handleSortChange"
            />
          </n-form-item>
        </n-gi>
      </search-form>
    </n-card>

    <!-- 数据表格 -->
    <n-card :bordered="false" class="page-list__table">
      <!-- 批量操作栏 -->
      <batch-actions
        v-if="checkedRowKeys.length > 0"
        :selected-count="checkedRowKeys.length"
        :actions="batchActionOptions"
        @action="handleBatchAction"
        @clear="handleClearSelection"
      />

      <!-- 加载失败：500 与「无数据」必须长得不一样，且要给出重试出口。
           交给 DataTable 统一渲染（与其余 15 个列表页同一套契约），
           这样失败态出现在表格框架内部，表头与分页栏不会整块塌陷。 -->
      <data-table
        :columns="columns"
        :data="videoList"
        :loading="isLoading || deleteMutation.isPending.value"
        :error="isError"
        :error-description="loadErrorDetail"
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
// 失败态已由 DataTable 在表格框架内渲染，此处无需额外布局
</style>
