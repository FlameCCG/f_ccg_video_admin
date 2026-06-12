<script setup lang="ts">
/**
 * 用户列表页
 * User List Page
 * Requirements: 8.1, 8.2, 8.3, 18.9, 18.10
 */
import { ref, computed, h } from 'vue'
import { useI18n } from 'vue-i18n'
import { useQuery } from '@tanstack/vue-query'
import { NCard, NSpace, NButton, NIcon, NGi, NFormItem, NInput, useMessage } from 'naive-ui'
import type { DataTableColumns, DataTableRowKey } from 'naive-ui'
import { getUserList } from '@/api/user'
import { getRoles } from '@/api/rbac'
import type { AdminUserListItem, UserStatus } from '@/api/types'
import { DataTable, TableActions } from '@/components/table'
import { SearchForm, FilterSelect } from '@/components/form'
import { AppAvatar, AppStatusTag } from '@/components/common'
import { UserRoleDrawer, UserPermissionDrawer } from '@/components/rbac'
import UserEditDrawer from './components/UserEditDrawer.vue'
import UserBanDialog from './components/UserBanDialog.vue'
import { formatDateTime } from '@/utils'

const { t } = useI18n()
const message = useMessage()

/** 搜索参数 */
const searchParams = ref({
  keyword: '',
  status: null as UserStatus | null,
  roleId: null as number | null,
  page: 1,
  pageSize: 10,
})

/** 选中的行 */
const checkedRowKeys = ref<DataTableRowKey[]>([])

/** 编辑抽屉状态 */
const editDrawerVisible = ref(false)
const editingUser = ref<AdminUserListItem | null>(null)

/** 封禁对话框状态 */
const banDialogVisible = ref(false)
const banningUser = ref<AdminUserListItem | null>(null)

/** 角色管理抽屉状态 */
const roleDrawerVisible = ref(false)
const roleManagingUser = ref<AdminUserListItem | null>(null)

/** 权限查看抽屉状态 */
const permissionDrawerVisible = ref(false)
const permissionViewingUser = ref<AdminUserListItem | null>(null)

/** 获取用户列表 */
const {
  data: userData,
  isLoading,
  refetch,
} = useQuery({
  queryKey: ['userList', searchParams],
  queryFn: () =>
    getUserList({
      keyword: searchParams.value.keyword || undefined,
      status: searchParams.value.status ?? undefined,
      roleId: searchParams.value.roleId ?? undefined,
      page: searchParams.value.page,
      pageSize: searchParams.value.pageSize,
    }),
  staleTime: 30 * 1000,
})

/** 获取角色列表（用于筛选） */
const { data: roles } = useQuery({
  queryKey: ['roles'],
  queryFn: getRoles,
  staleTime: 5 * 60 * 1000,
})

/** 用户列表数据 */
const userList = computed<AdminUserListItem[]>(() => {
  return userData.value?.list ?? []
})
const total = computed(() => userData.value?.total ?? 0)

/** 角色选项 */
const roleOptions = computed(() => {
  return (roles.value ?? []).map((role) => ({
    value: role.id,
    label: role.name,
  }))
})

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
const columns = computed<DataTableColumns<AdminUserListItem>>(() => [
  {
    title: t('user.list.avatar'),
    key: 'avatar',
    width: 80,
    align: 'center',
    render: (row) => h(AppAvatar, { src: row.avatar, text: row.username, size: 40 }),
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
        type: getStatusType(row.status),
        text: getStatusText(row.status),
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
    title: t('user.list.coin'),
    key: 'coinCount',
    width: 100,
    align: 'right',
    render: (row) => {
      const count = Number(row.coinCount)
      return isNaN(count)
        ? '-'
        : count.toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
    },
  },
  {
    title: t('user.list.roles'),
    key: 'roleNames',
    width: 150,
    render: (row) => row.roleNames?.join(', ') || '-',
  },
  {
    title: t('user.list.registerSource'),
    key: 'registerSource',
    width: 100,
  },
  {
    title: t('user.list.registerTime'),
    key: 'createdAt',
    width: 180,
    render: (row) => formatDateTime(row.createdAt),
  },
  {
    title: t('common.table.operation'),
    key: 'actions',
    width: 220,
    fixed: 'right',
    render: (row) =>
      h(TableActions, {
        actions: [
          { key: 'edit', label: t('common.edit') },
          { key: 'roles', label: t('rbac.userRole.manage') },
          { key: 'permissions', label: t('rbac.userPermission.view') },
          {
            key: row.status === 1 ? 'ban' : 'unban',
            label: row.status === 1 ? t('user.ban.title') : t('user.ban.unbanTitle'),
            type: row.status === 1 ? 'warning' : 'success',
          },
        ],
        onAction: (key: string) => handleAction(key, row as unknown as AdminUserListItem),
      }),
  },
])

function onStatusChange(val: unknown): void {
  searchParams.value.status = val as UserStatus | null
}

function onRoleChange(val: unknown): void {
  searchParams.value.roleId = val as number | null
}

function onCheckedRowKeysChange(keys: DataTableRowKey[]): void {
  checkedRowKeys.value = keys
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
    roleId: null,
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
  if (key === 'edit') {
    editingUser.value = row
    editDrawerVisible.value = true
  } else if (key === 'ban' || key === 'unban') {
    banningUser.value = row
    banDialogVisible.value = true
  } else if (key === 'roles') {
    roleManagingUser.value = row
    roleDrawerVisible.value = true
  } else if (key === 'permissions') {
    permissionViewingUser.value = row
    permissionDrawerVisible.value = true
  }
}

/** 处理编辑成功 */
function handleEditSuccess(): void {
  editDrawerVisible.value = false
  editingUser.value = null
  message.success(t('common.tips.updateSuccess'))
  void refetch()
}

/** 处理封禁成功 */
function handleBanSuccess(): void {
  banDialogVisible.value = false
  banningUser.value = null
  void refetch()
}

/** 处理角色管理成功 */
function handleRoleSuccess(): void {
  roleDrawerVisible.value = false
  roleManagingUser.value = null
  void refetch()
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
              @change="onStatusChange"
            />
          </n-form-item>
        </n-gi>
        <n-gi span="6 m:3 l:2">
          <n-form-item :label="t('user.filter.role')" path="roleId">
            <filter-select
              :value="searchParams.roleId"
              :options="roleOptions"
              :placeholder="t('user.filter.rolePlaceholder')"
              :width="'100%'"
              @change="onRoleChange"
            />
          </n-form-item>
        </n-gi>
      </search-form>
    </n-card>

    <!-- 数据表格 -->
    <n-card :bordered="false" class="page-list__table">
      <template #header>
        <n-space justify="space-between" align="center">
          <span class="page-list__title">{{ t('user.list.title') }}</span>
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
        @update:checked-row-keys="onCheckedRowKeysChange"
      />
    </n-card>

    <!-- 编辑抽屉 -->
    <user-edit-drawer
      v-model:visible="editDrawerVisible"
      :user="editingUser"
      @success="handleEditSuccess"
    />

    <!-- 封禁对话框 -->
    <user-ban-dialog
      v-model:visible="banDialogVisible"
      :user="banningUser"
      @success="handleBanSuccess"
    />

    <!-- 角色管理抽屉 -->
    <user-role-drawer
      v-model:visible="roleDrawerVisible"
      :user="roleManagingUser"
      @success="handleRoleSuccess"
    />

    <!-- 权限查看抽屉 -->
    <user-permission-drawer
      v-model:visible="permissionDrawerVisible"
      :user="permissionViewingUser"
    />
  </div>
</template>

<style scoped lang="scss">
// 使用全局 page-list 样式，无需额外定义
</style>
