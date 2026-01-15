<script setup lang="ts">
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
import type { AdminVideoItem, ReviewStatus } from '@/api/types'
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

/** 获取审核中的视频列表 (status=4) */
const {
  data: videoData,
  isLoading,
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
      sort: 'oldest', // 按提交时间排序，先提交先审核
    }),
  staleTime: 30 * 1000,
})

/** 获取分区列表（用于筛选） */
const { data: partitionsData } = useQuery({
  queryKey: ['partitions'],
  queryFn: () => getPartitions({ page: 1, pageSize: 100 }),
  staleTime: 5 * 60 * 1000,
})

/** 审核视频 mutation */
const reviewMutation = useMutation({
  mutationFn: reviewVideo,
  onSuccess: () => {
    message.success(t('video.review.passSuccess'))
    checkedRowKeys.value = []
    void queryClient.invalidateQueries({ queryKey: ['reviewVideoList'] })
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
  } else if (key === 'approve') {
    confirmReview([row.id], 1)
  } else if (key === 'reject') {
    confirmReview([row.id], 3)
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
  const statusTextMap: Record<ReviewStatus, string> = {
    1: t('video.review.confirmPass'),
    2: t('video.review.confirmToPrivate'),
    3: t('video.review.confirmReject'),
  }

  dialog.warning({
    title: t('video.review.title'),
    content: statusTextMap[status],
    positiveText: t('common.confirm'),
    negativeText: t('common.cancel'),
    onPositiveClick: () => {
      reviewMutation.mutate({ videoIds, status })
    },
  })
}

/** 处理刷新 */
function handleRefresh(): void {
  void refetch()
}
</script>

<template>
  <div class="review-page">
    <!-- 搜索表单 -->
    <n-card :bordered="false" class="review-page__search">
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
    <n-card :bordered="false" class="review-page__table">
      <template #header>
        <n-space justify="space-between" align="center">
          <span class="review-page__title">{{ t('video.review.title') }}</span>
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
        :loading="isLoading || reviewMutation.isPending.value"
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
.review-page {
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
