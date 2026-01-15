<script setup lang="ts">
/**
 * 封禁管理页
 * Ban Management Page
 * Requirements: 8.4
 */
import { ref, computed, h } from 'vue'
import { useI18n } from 'vue-i18n'
import { useQuery } from '@tanstack/vue-query'
import { NCard, NSpace, NButton, NIcon, NGi, NFormItem, NInput } from 'naive-ui'
import type { DataTableColumns, DataTableRowKey } from 'naive-ui'
import { getUserList } from '@/api/user'
import type { AdminUserListItem, UserStatus } from '@/api/types'
import { DataTable, TableActions } from '@/components/table'
import { SearchForm, FilterSelect } from '@/components/form'
import { AppAvatar, AppStatusTag } from '@/components/common'
import UserBanDialog from '../list/components/UserBanDialog.vue'

const { t } = useI18n()

/** 搜索参数 - 默认显示封禁中的用户 */
const searchParams = ref({
  keyword: '',
  status: null as UserStatus | null,
  page: 1,
  pageSize: 10,
})

/** 选中的行 */
const checkedRowKeys = ref<DataTableRowKey[]>([])

/** 封禁对话框状态 */
const banDialogVisible = ref(false)
const banningUser = ref<AdminUserListItem | null>(null)

/** 获取用户列表 */
const {
  data: userData,
  isLoading,
  refetch,
} = useQuery({
  queryKey: ['userBanList', searchParams],
  queryFn: () =>
    getUserList({
      keyword: searchParams.value.keyword || undefined,
      status: searchParams.value.status ?? undefined,
      page: searchParams.value.page,
      pageSize: searchParams.value.pageSize,
    }),
  staleTime: 30 * 1000,
})

/** 用户列表数据 */
const userList = computed(() => {
  const list = userData.value?.list ?? []
  return list as unknown as Record<string, unknown>[]
})
const total = computed(() => userData.value?.total ?? 0)

/** 状态选项 - 只显示封禁相关状态 */
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
const columns = computed<DataTableColumns<Record<string, unknown>>>(() => [
  {
    title: t('user.list.avatar'),
    key: 'avatar',
    width: 80,
    align: 'center',
    render: (row) =>
      h(AppAvatar, { src: row.avatar as string, text: row.username as string, size: 40 }),
  },
  {
    title: t('user.list.username'),
    key: 'username',
    width: 150,
    ellipsis: { tooltip: true },
  },
  {
    title: t('user.list.email'),
    key: 'email',
    width: 200,
    ellipsis: { tooltip: true },
  },
  {
    title: t('user.list.status'),
    key: 'status',
    width: 120,
    render: (row) =>
      h(AppStatusTag, {
        type: getStatusType(row.status as UserStatus),
        text: getStatusText(row.status as UserStatus),
        dot: true,
      }),
  },
  {
    title: t('user.list.level'),
    key: 'level',
    width: 80,
    align: 'center',
  },
  {
    title: t('user.list.roles'),
    key: 'roleNames',
    width: 150,
    render: (row) => (row.roleNames as string[])?.join(', ') || '-',
  },
  {
    title: t('user.list.registerTime'),
    key: 'createdAt',
    width: 180,
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
          {
            key: (row.status as UserStatus) === 1 ? 'ban' : 'unban',
            label:
              (row.status as UserStatus) === 1 ? t('user.ban.title') : t('user.ban.unbanTitle'),
            type: (row.status as UserStatus) === 1 ? 'warning' : 'success',
          },
        ],
        onAction: (key: string) => handleAction(key, row as unknown as AdminUserListItem),
      }),
  },
])

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

/** 处理搜索 */
function handleSearch(): void {
  searchParams.value.page = 1
  void refetch()
}

/** 处理重置 */
function handleReset(): void {
  searchParams.value = {
    keyword: '',
    status: null,
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
function handleAction(key: string, row: AdminUserListItem): void {
  if (key === 'ban' || key === 'unban') {
    banningUser.value = row
    banDialogVisible.value = true
  }
}

/** 处理封禁成功 */
function handleBanSuccess(): void {
  banDialogVisible.value = false
  banningUser.value = null
  void refetch()
}

/** 处理刷新 */
function handleRefresh(): void {
  void refetch()
}
</script>

<template>
  <div class="ban-management-page">
    <!-- 搜索表单 -->
    <n-card :bordered="false" class="ban-management-page__search">
      <search-form :loading="isLoading" @search="handleSearch" @reset="handleReset">
        <n-gi span="6 m:3 l:2">
          <n-form-item :label="t('user.filter.keyword')" path="keyword">
            <n-input
              v-model:value="searchParams.keyword"
              :placeholder="t('user.filter.keywordPlaceholder')"
              clearable
              @keyup.enter="handleSearch"
            />
          </n-form-item>
        </n-gi>
        <n-gi span="6 m:3 l:2">
          <n-form-item :label="t('user.filter.status')" path="status">
            <filter-select
              :value="searchParams.status"
              :options="statusOptions"
              :placeholder="t('user.filter.statusPlaceholder')"
              :width="'100%'"
              @change="(val) => (searchParams.status = val as UserStatus | null)"
            />
          </n-form-item>
        </n-gi>
      </search-form>
    </n-card>

    <!-- 数据表格 -->
    <n-card :bordered="false" class="ban-management-page__table">
      <template #header>
        <n-space justify="space-between" align="center">
          <span class="ban-management-page__title">{{ t('user.ban.title') }}</span>
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

      <data-table
        :columns="columns"
        :data="userList"
        :loading="isLoading"
        :selectable="false"
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

    <!-- 封禁对话框 -->
    <user-ban-dialog
      v-model:visible="banDialogVisible"
      :user="banningUser"
      @success="handleBanSuccess"
    />
  </div>
</template>

<style scoped lang="scss">
.ban-management-page {
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
