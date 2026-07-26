<script setup lang="ts">
/**
 * 封禁记录页
 * Ban Records Page
 * Requirements: 8.5
 */
import { ref, computed, h } from 'vue'
import { useI18n } from 'vue-i18n'
import { useQuery } from '@tanstack/vue-query'
import { NCard, NButton, NIcon, NGi, NFormItem, NInputNumber } from 'naive-ui'
import type { DataTableColumns } from 'naive-ui'
import { getBanRecords } from '@/api/user'
import type { UserStatus, BanRecordItem } from '@/api/types'
import { DataTable } from '@/components/table'
import { SearchForm, FilterSelect } from '@/components/form'
import { AppStatusTag } from '@/components/common'
import AppPageHeader from '@/components/layout/AppPageHeader.vue'
import { formatDateTime } from '@/utils'

const { t } = useI18n()

/** 搜索参数 */
const searchParams = ref({
  userId: null as number | null,
  status: null as UserStatus | null,
  page: 1,
  pageSize: 10,
})

/**
 * 获取封禁记录列表
 * searchParams 就在 queryKey 里，改动筛选/分页即触发请求；
 * 因此各 handler 里不再额外调 refetch()（那会让同一次交互打两个请求，
 * 并且 refetch 无条件绕过 staleTime，等于让上面的 staleTime 彻底失效）。
 */
const {
  data: recordData,
  isLoading,
  isFetching,
  isError,
  refetch,
} = useQuery({
  queryKey: ['banRecords', searchParams],
  queryFn: () =>
    getBanRecords({
      userId: searchParams.value.userId ?? undefined,
      status: searchParams.value.status ?? undefined,
      page: searchParams.value.page,
      pageSize: searchParams.value.pageSize,
    }),
  staleTime: 30 * 1000,
})

/** 封禁记录列表数据 */
const recordList = computed<BanRecordItem[]>(() => {
  return recordData.value?.list ?? []
})
const total = computed(() => recordData.value?.total ?? 0)

/** 状态选项 */
const statusOptions = computed(() => [
  { value: 1, label: t('user.status.normal') },
  { value: 2, label: t('user.status.banned') },
  { value: 3, label: t('user.status.permanentBan') },
])

/** 获取状态标签类型 */
function getStatusType(status: UserStatus): 'success' | 'warning' | 'error' {
  const typeMap: Record<UserStatus, 'success' | 'warning' | 'error'> = {
    1: 'success',
    2: 'warning',
    3: 'error',
  }
  return typeMap[status]
}

/** 获取状态文本 */
function getStatusText(status: UserStatus): string {
  const textMap: Record<UserStatus, string> = {
    1: t('user.status.normal'),
    2: t('user.status.banned'),
    3: t('user.status.permanentBan'),
  }
  return textMap[status]
}

/** 表格列配置 */
const columns = computed<DataTableColumns<BanRecordItem>>(() => [
  {
    title: 'ID',
    key: 'id',
    width: 80,
    align: 'center',
  },
  {
    title: t('user.banRecord.userId'),
    key: 'userId',
    width: 100,
    align: 'center',
  },
  {
    title: t('user.banRecord.username'),
    key: 'username',
    width: 150,
    ellipsis: { tooltip: true },
  },
  {
    title: t('user.banRecord.status'),
    key: 'status',
    width: 120,
    render: (row) =>
      h(AppStatusTag, {
        type: getStatusType(row.status),
        text: getStatusText(row.status),
        dot: true,
      }),
  },
  {
    title: t('user.banRecord.duration'),
    key: 'days',
    width: 100,
    align: 'center',
    render: (row) => {
      if (row.status === 3) return t('user.ban.permanent')
      if (row.days === 0) return '-'
      return `${String(row.days)} ${t('user.ban.durationUnit')}`
    },
  },
  {
    title: t('user.banRecord.reason'),
    key: 'reason',
    width: 200,
    ellipsis: { tooltip: true },
    render: (row) => row.reason || '-',
  },
  {
    title: t('user.banRecord.operator'),
    key: 'operatorUsername',
    width: 120,
    ellipsis: { tooltip: true },
  },
  {
    title: t('user.banRecord.banTime'),
    key: 'startAt',
    width: 180,
    render: (row) => formatDateTime(row.startAt),
  },
  {
    title: t('user.banRecord.expireTime'),
    key: 'endAt',
    width: 180,
    render: (row) => {
      if (row.status === 3) return t('user.ban.permanent')
      return formatDateTime(row.endAt)
    },
  },
  {
    title: t('common.table.createdAt'),
    key: 'createdAt',
    width: 180,
    render: (row) => formatDateTime(row.createdAt),
  },
])

function onStatusChange(val: unknown): void {
  searchParams.value.status = val as UserStatus | null
}

/** 处理搜索 */
function handleSearch(): void {
  searchParams.value.page = 1
}

/** 处理重置 */
function handleReset(): void {
  searchParams.value = {
    userId: null,
    status: null,
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

/** 处理刷新：用户主动发起，是 refetch 的正当用法（同时用作失败重试） */
function handleRefresh(): void {
  void refetch()
}
</script>

<template>
  <div class="page-list">
    <app-page-header class="page-list__header" :title="t('user.banRecord.title')">
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
          <n-form-item :label="t('user.banRecord.userId')" path="userId">
            <n-input-number
              v-model:value="searchParams.userId"
              :placeholder="t('common.form.pleaseInput')"
              :min="1"
              clearable
              style="width: 100%"
            />
          </n-form-item>
        </n-gi>
        <n-gi span="6 m:3 l:2">
          <n-form-item :label="t('user.banRecord.status')" path="status">
            <filter-select
              :value="searchParams.status"
              :options="statusOptions"
              :placeholder="t('user.filter.statusPlaceholder')"
              :width="'100%'"
              @change="onStatusChange"
            />
          </n-form-item>
        </n-gi>
      </search-form>
    </n-card>

    <!-- 数据表格 -->
    <n-card :bordered="false" class="page-list__table">
      <data-table
        :columns="columns"
        :data="recordList"
        :loading="isFetching"
        :error="isError"
        :selectable="false"
        :page="searchParams.page"
        :page-size="searchParams.pageSize"
        :total="total"
        row-key="id"
        @update:page="handlePageChange"
        @update:page-size="handlePageSizeChange"
        @retry="handleRefresh"
      />
    </n-card>
  </div>
</template>

<style scoped lang="scss">
// 使用全局 page-list 样式
</style>
