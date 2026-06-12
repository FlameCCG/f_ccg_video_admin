<script setup lang="ts">
import { formatDateTime } from '@/utils'
/**
 * 举报处理页
 * Report Handling Page
 * Requirements: 11.1-11.3 - 举报列表、筛选、处理
 */
import { ref, computed, h } from 'vue'
import { useI18n } from 'vue-i18n'
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import {
  NAlert,
  NCard,
  NSpace,
  NButton,
  NIcon,
  NGi,
  NFormItem,
  NImage,
  NModal,
  NForm,
  NInput,
  NRadioGroup,
  NRadio,
  useMessage,
} from 'naive-ui'
import type { DataTableColumns, DataTableRowKey } from 'naive-ui'
import { getReportList, handleReport } from '@/api/video'
import type { ReportType, ReportStatus } from '@/api/types'
import { DataTable, TableActions, BatchActions } from '@/components/table'
import { SearchForm, FilterSelect } from '@/components/form'
import { AppStatusTag } from '@/components/common'
import { useTableSelectionAction } from '@/composables'

const { t } = useI18n()
const message = useMessage()
const queryClient = useQueryClient()

/** 搜索参数 */
const searchParams = ref({
  type: 'video' as ReportType,
  status: null as ReportStatus | null,
  page: 1,
  pageSize: 10,
})

/** 选中的行 */
const checkedRowKeys = ref<DataTableRowKey[]>([])
const { resolveTargetIds } = useTableSelectionAction(checkedRowKeys)

/** 处理弹窗状态 */
const handleModalVisible = ref(false)
const handleForm = ref({
  status: 2 as 2 | 3,
  handleNote: '',
})
const handleReportIds = ref<number[]>([])

/** 获取举报列表 */
const {
  data: reportData,
  isLoading,
  refetch,
} = useQuery({
  queryKey: ['reportList', searchParams],
  queryFn: () =>
    getReportList({
      type: searchParams.value.type,
      status: searchParams.value.status ?? undefined,
      page: searchParams.value.page,
      pageSize: searchParams.value.pageSize,
    }),
  staleTime: 30 * 1000,
})

/** 处理举报 mutation */
const handleMutation = useMutation({
  mutationFn: handleReport,
  onSuccess: (data) => {
    message.success(t('community.report.handleSuccess', { count: data.handled }))
    checkedRowKeys.value = []
    handleModalVisible.value = false
    handleForm.value = { status: 2, handleNote: '' }
    handleReportIds.value = []
    void queryClient.invalidateQueries({ queryKey: ['reportList'] })
  },
  onError: (error: Error) => {
    message.error(error.message || t('common.tips.operationFailed'))
  },
})

/** 举报列表数据 */
const reportList = computed(() => {
  const list = reportData.value?.list ?? []
  return list as unknown as Record<string, unknown>[]
})
const total = computed(() => reportData.value?.total ?? 0)

/** 举报类型选项 */
const typeOptions = computed(() => [
  { value: 'video', label: t('community.report.typeOptions.video') },
  { value: 'danmu', label: t('community.report.typeOptions.danmu') },
])

/** 状态选项 */
const statusOptions = computed(() => [
  { value: 1, label: t('community.report.statusOptions.pending') },
  { value: 2, label: t('community.report.statusOptions.processed') },
  { value: 3, label: t('community.report.statusOptions.rejected') },
])

/** 获取状态标签类型 */
function getStatusType(status: ReportStatus): 'success' | 'warning' | 'error' | 'processing' {
  const typeMap: Record<ReportStatus, 'success' | 'warning' | 'error' | 'processing'> = {
    1: 'processing',
    2: 'success',
    3: 'error',
  }
  return typeMap[status]
}

/** 获取状态文本 */
function getStatusText(status: ReportStatus): string {
  const textMap: Record<ReportStatus, string> = {
    1: t('community.report.statusOptions.pending'),
    2: t('community.report.statusOptions.processed'),
    3: t('community.report.statusOptions.rejected'),
  }
  return textMap[status]
}

/** 表格列配置 - 视频举报 */
const videoColumns = computed<DataTableColumns<Record<string, unknown>>>(() => [
  {
    type: 'selection',
    fixed: 'left',
  },
  {
    title: t('community.report.reporter'),
    key: 'reporterUsername',
    width: 120,
  },
  {
    title: t('community.report.videoTitle'),
    key: 'videoTitle',
    minWidth: 200,
    ellipsis: { tooltip: true },
  },
  {
    title: t('community.report.videoCover'),
    key: 'videoCover',
    width: 120,
    render: (row) =>
      h(NImage, {
        src: row.videoCover as string,
        width: 100,
        height: 56,
        objectFit: 'cover',
        lazy: true,
        previewDisabled: false,
        style: { borderRadius: '4px' },
      }),
  },
  {
    title: t('community.report.reason'),
    key: 'reason',
    width: 150,
    ellipsis: { tooltip: true },
  },
  {
    title: t('community.report.detail'),
    key: 'detail',
    width: 200,
    ellipsis: { tooltip: true },
  },
  {
    title: t('community.report.status'),
    key: 'status',
    width: 100,
    render: (row) =>
      h(AppStatusTag, {
        type: getStatusType(row.status as ReportStatus),
        text: getStatusText(row.status as ReportStatus),
        dot: true,
      }),
  },
  {
    title: t('community.report.createdAt'),
    key: 'createdAt',
    width: 160,
    render: (row) => formatDateTime(row.createdAt as string),
  },
  {
    title: t('common.table.operation'),
    key: 'actions',
    width: 120,
    fixed: 'right',
    render: (row) => {
      const isPending = (row.status as ReportStatus) === 1
      return h(TableActions, {
        actions: [{ key: 'handle', label: t('community.report.handle'), disabled: !isPending }],
        onAction: (key: string) => handleAction(key, row),
      })
    },
  },
])

/** 表格列配置 - 弹幕举报 */
const danmuColumns = computed<DataTableColumns<Record<string, unknown>>>(() => [
  {
    type: 'selection',
    fixed: 'left',
  },
  {
    title: t('community.report.reporter'),
    key: 'reporterUsername',
    width: 120,
  },
  {
    title: t('community.report.danmuContent'),
    key: 'danmuContent',
    minWidth: 200,
    ellipsis: { tooltip: true },
  },
  {
    title: t('community.report.videoTitle'),
    key: 'videoTitle',
    width: 200,
    ellipsis: { tooltip: true },
  },
  {
    title: t('community.report.reason'),
    key: 'reason',
    width: 150,
    ellipsis: { tooltip: true },
  },
  {
    title: t('community.report.detail'),
    key: 'detail',
    width: 200,
    ellipsis: { tooltip: true },
  },
  {
    title: t('community.report.status'),
    key: 'status',
    width: 100,
    render: (row) =>
      h(AppStatusTag, {
        type: getStatusType(row.status as ReportStatus),
        text: getStatusText(row.status as ReportStatus),
        dot: true,
      }),
  },
  {
    title: t('community.report.createdAt'),
    key: 'createdAt',
    width: 160,
    render: (row) => formatDateTime(row.createdAt as string),
  },
  {
    title: t('common.table.operation'),
    key: 'actions',
    width: 120,
    fixed: 'right',
    render: (row) => {
      const isPending = (row.status as ReportStatus) === 1
      return h(TableActions, {
        actions: [{ key: 'handle', label: t('community.report.handle'), disabled: !isPending }],
        onAction: (key: string) => handleAction(key, row),
      })
    },
  },
])

/** 当前表格列配置 */
const columns = computed(() => {
  return searchParams.value.type === 'video' ? videoColumns.value : danmuColumns.value
})

/** 批量操作配置 */
const batchActions = computed(() => [
  { key: 'process', label: t('community.report.process'), type: 'success' as const },
  { key: 'reject', label: t('community.report.reject'), type: 'error' as const },
])

const handleActionSummary = computed(() => {
  if (handleReportIds.value.length <= 1) {
    return ''
  }

  const actionLabel =
    handleForm.value.status === 2 ? t('community.report.process') : t('community.report.reject')

  return t('common.tips.selectedActionSummary', {
    count: handleReportIds.value.length,
    action: actionLabel,
  })
})

/** 处理搜索 */
function handleSearch(): void {
  searchParams.value.page = 1
  void refetch()
}

/** 处理重置 */
function handleReset(): void {
  searchParams.value = {
    type: 'video',
    status: null,
    page: 1,
    pageSize: 10,
  }
  void refetch()
}

/** 处理类型切换 */
function handleTypeChange(type: ReportType): void {
  searchParams.value.type = type
  searchParams.value.page = 1
  checkedRowKeys.value = []
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
  if (key === 'handle') {
    openHandleModal(resolveTargetIds(row.id as number), 2)
  }
}

/** 处理批量操作 */
function handleBatchAction(key: string): void {
  const ids = checkedRowKeys.value as number[]
  if (ids.length === 0) {
    message.warning(t('common.tips.selectAtLeastOne'))
    return
  }

  if (key === 'process') {
    openHandleModal(ids, 2)
  } else if (key === 'reject') {
    openHandleModal(ids, 3)
  }
}

function openHandleModal(reportIds: number[], status: 2 | 3): void {
  handleReportIds.value = reportIds
  handleForm.value = {
    status,
    handleNote: '',
  }
  handleModalVisible.value = true
}

/** 提交处理 */
function submitHandle(): boolean {
  handleMutation.mutate({
    type: searchParams.value.type,
    reportIds: handleReportIds.value,
    status: handleForm.value.status,
    handleNote: handleForm.value.handleNote || undefined,
  })
  return false
}

/** 处理刷新 */
function handleRefresh(): void {
  void refetch()
}
</script>

<template>
  <div class="report-page">
    <!-- 搜索表单 -->
    <n-card :bordered="false" class="report-page__search">
      <search-form :loading="isLoading" @search="handleSearch" @reset="handleReset">
        <n-gi span="6 m:3 l:2">
          <n-form-item :label="t('community.report.type')" path="type">
            <filter-select
              :value="searchParams.type"
              :options="typeOptions"
              :placeholder="t('community.report.typePlaceholder')"
              :width="'100%'"
              :clearable="false"
              @change="(val) => handleTypeChange(val as ReportType)"
            />
          </n-form-item>
        </n-gi>
        <n-gi span="6 m:3 l:2">
          <n-form-item :label="t('community.report.status')" path="status">
            <filter-select
              :value="searchParams.status"
              :options="statusOptions"
              :placeholder="t('community.report.statusPlaceholder')"
              :width="'100%'"
              @change="(val) => (searchParams.status = val as ReportStatus | null)"
            />
          </n-form-item>
        </n-gi>
      </search-form>
    </n-card>

    <!-- 数据表格 -->
    <n-card :bordered="false" class="report-page__table">
      <template #header>
        <n-space justify="space-between" align="center">
          <span class="report-page__title">{{ t('community.report.title') }}</span>
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
        :data="reportList"
        :loading="isLoading || handleMutation.isPending.value"
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

    <!-- 处理举报弹窗 -->
    <n-modal
      v-model:show="handleModalVisible"
      preset="dialog"
      :title="t('community.report.handle')"
      :positive-text="t('common.confirm')"
      :negative-text="t('common.cancel')"
      :loading="handleMutation.isPending.value"
      @positive-click="submitHandle"
    >
      <n-alert v-if="handleActionSummary" type="info" :show-icon="false">
        {{ handleActionSummary }}
      </n-alert>

      <n-form label-placement="left" label-width="80">
        <n-form-item :label="t('community.report.handleStatus')">
          <n-radio-group v-model:value="handleForm.status">
            <n-space>
              <n-radio :value="2">{{ t('community.report.process') }}</n-radio>
              <n-radio :value="3">{{ t('community.report.reject') }}</n-radio>
            </n-space>
          </n-radio-group>
        </n-form-item>
        <n-form-item :label="t('community.report.handleNote')">
          <n-input
            v-model:value="handleForm.handleNote"
            type="textarea"
            :placeholder="t('community.report.handleNotePlaceholder')"
            :rows="3"
          />
        </n-form-item>
      </n-form>
    </n-modal>
  </div>
</template>

<style scoped lang="scss">
.report-page {
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
