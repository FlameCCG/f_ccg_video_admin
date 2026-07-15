<script setup lang="ts">
/**
 * 角色管理页
 * Role Management Page
 * Requirements: 16.1-16.5 - 角色管理
 */
import { ref, computed, h } from 'vue'
import { useI18n } from 'vue-i18n'
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { NCard, NSpace, NButton, NIcon, NTag, NText, useMessage, useDialog } from 'naive-ui'
import type { DataTableColumns, DataTableRowKey } from 'naive-ui'
import { getRoles, createRole, updateRole, deleteRole } from '@/api/rbac'
import type { Role, CreateRoleParams, UpdateRoleParams } from '@/api/types'
import { DataTable, TableActions } from '@/components/table'
import { RoleMenuDrawer, RolePermissionDrawer } from '@/components/rbac'
import RoleFormModal from './components/RoleFormModal.vue'
import RoleInheritDrawer from './components/RoleInheritDrawer.vue'
import RoleInheritTreeModal from './components/RoleInheritTreeModal.vue'

const { t } = useI18n()
const message = useMessage()
const dialog = useDialog()
const queryClient = useQueryClient()

/** 选中的行 */
const checkedRowKeys = ref<DataTableRowKey[]>([])

/** 分页参数 */
const pagination = ref({
  page: 1,
  pageSize: 10,
})

/** 表单弹窗状态 */
const formModalVisible = ref(false)
const editingRole = ref<Role | null>(null)

/** 继承抽屉状态 */
const inheritDrawerVisible = ref(false)
const inheritingRole = ref<Role | null>(null)

/** 继承树弹窗状态 */
const inheritTreeModalVisible = ref(false)
const highlightRoleId = ref<number | null>(null)
const viewTreeRoleId = ref<number | null>(null)

/** 菜单分配抽屉状态 */
const menuDrawerVisible = ref(false)
const menuAssigningRole = ref<Role | null>(null)

/** 权限分配抽屉状态 */
const permissionDrawerVisible = ref(false)
const permissionAssigningRole = ref<Role | null>(null)

/** 获取角色列表 */
const {
  data: roleList,
  isLoading,
  refetch,
} = useQuery({
  queryKey: ['roleList'],
  queryFn: getRoles,
  staleTime: 30 * 1000,
})

/** 创建角色 mutation */
const createMutation = useMutation({
  mutationFn: createRole,
  onSuccess: () => {
    message.success(t('rbac.role.createSuccess'))
    formModalVisible.value = false
    editingRole.value = null
    void queryClient.invalidateQueries({ queryKey: ['roleList'] })
  },
  onError: (error: Error) => {
    message.error(error.message || t('common.tips.operationFailed'))
  },
})

/** 更新角色 mutation */
const updateMutation = useMutation({
  mutationFn: updateRole,
  onSuccess: () => {
    message.success(t('rbac.role.updateSuccess'))
    formModalVisible.value = false
    editingRole.value = null
    void queryClient.invalidateQueries({ queryKey: ['roleList'] })
  },
  onError: (error: Error) => {
    message.error(error.message || t('common.tips.operationFailed'))
  },
})

/** 删除角色 mutation */
const deleteMutation = useMutation({
  mutationFn: deleteRole,
  onSuccess: () => {
    message.success(t('rbac.role.deleteSuccess'))
    checkedRowKeys.value = []
    void queryClient.invalidateQueries({ queryKey: ['roleList'] })
  },
  onError: (error: Error) => {
    message.error(error.message || t('common.tips.operationFailed'))
  },
})

/** 角色列表数据 */
const roles = computed(() => {
  const list = roleList.value ?? []
  return list as unknown as Record<string, unknown>[]
})

/** 总数 */
const total = computed(() => roleList.value?.length ?? 0)

/** 分页后的数据 */
const paginatedRoles = computed(() => {
  const start = (pagination.value.page - 1) * pagination.value.pageSize
  const end = start + pagination.value.pageSize
  return roles.value.slice(start, end)
})

/** 表格列配置 */
const columns = computed<DataTableColumns<Record<string, unknown>>>(() => [
  {
    title: 'ID',
    key: 'id',
    width: 80,
    align: 'center',
  },
  {
    title: t('rbac.role.name'),
    key: 'name',
    minWidth: 150,
    render: (row) => h(NTag, { type: 'info', size: 'small' }, () => row.name as string),
  },
  {
    title: t('rbac.role.description'),
    key: 'desc',
    minWidth: 200,
    ellipsis: { tooltip: true },
    render: (row) => {
      const desc = row.desc as string
      return desc ? h(NText, { depth: 2 }, () => desc) : h(NText, { depth: 3 }, () => '-')
    },
  },
  {
    title: t('common.table.operation'),
    key: 'actions',
    width: 320,
    fixed: 'right',
    render: (row) =>
      h(TableActions, {
        actions: [
          { key: 'edit', label: t('common.edit') },
          { key: 'menus', label: t('rbac.role.assignMenus') },
          { key: 'permissions', label: t('rbac.role.assignPermissions') },
          { key: 'inherit', label: t('rbac.role.inherit') },
          { key: 'viewTree', label: t('rbac.role.inheritTree.view') },
          { key: 'delete', label: t('common.delete'), type: 'error' },
        ],
        onAction: (key: string) => handleAction(key, row as unknown as Role),
      }),
  },
])

/** 处理创建 */
function handleCreate(): void {
  editingRole.value = null
  formModalVisible.value = true
}

/** 处理操作 */
function handleAction(key: string, row: Role): void {
  if (key === 'edit') {
    editingRole.value = row
    formModalVisible.value = true
  } else if (key === 'menus') {
    menuAssigningRole.value = row
    menuDrawerVisible.value = true
  } else if (key === 'permissions') {
    permissionAssigningRole.value = row
    permissionDrawerVisible.value = true
  } else if (key === 'inherit') {
    inheritingRole.value = row
    inheritDrawerVisible.value = true
  } else if (key === 'viewTree') {
    // 统一走系统继承树 + 高亮当前角色（避免 by-id 接口单独鉴权失败）
    viewTreeRoleId.value = row.id
    highlightRoleId.value = row.id
    inheritTreeModalVisible.value = true
  } else if (key === 'delete') {
    confirmDelete(row)
  }
}

/** 确认删除 */
function confirmDelete(role: Role): void {
  dialog.warning({
    title: t('rbac.role.delete'),
    content: t('rbac.role.confirmDelete'),
    positiveText: t('common.confirm'),
    negativeText: t('common.cancel'),
    onPositiveClick: () => {
      deleteMutation.mutate(role.id)
    },
  })
}

/** 处理表单提交 */
function handleFormSubmit(data: CreateRoleParams | UpdateRoleParams): void {
  if (editingRole.value) {
    // 更新
    updateMutation.mutate({
      roleId: editingRole.value.id,
      ...data,
    } as UpdateRoleParams)
  } else {
    // 创建
    createMutation.mutate(data as CreateRoleParams)
  }
}

/** 处理刷新 */
function handleRefresh(): void {
  void refetch()
}

/** 处理查看继承树 */
function handleViewInheritTree(): void {
  viewTreeRoleId.value = null
  highlightRoleId.value = null
  inheritTreeModalVisible.value = true
}

/** 处理页码变化 */
function handlePageChange(page: number): void {
  pagination.value.page = page
}

/** 处理每页数量变化 */
function handlePageSizeChange(pageSize: number): void {
  pagination.value.pageSize = pageSize
  pagination.value.page = 1
}
</script>

<template>
  <div class="page-list">
    <!-- 数据表格 -->
    <n-card :bordered="false" class="page-list__table">
      <template #header>
        <n-space justify="space-between" align="center">
          <span class="page-list__title">{{ t('rbac.role.title') }}</span>
          <n-space :size="8">
            <n-button type="primary" size="small" @click="handleCreate">
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
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </n-icon>
              </template>
              {{ t('rbac.role.create') }}
            </n-button>
            <n-button size="small" secondary @click="handleViewInheritTree">
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
                    <path d="M12 3v18" />
                    <path d="M18 9H6" />
                    <path d="M18 15H6" />
                    <circle cx="12" cy="3" r="1" />
                    <circle cx="6" cy="9" r="1" />
                    <circle cx="18" cy="9" r="1" />
                    <circle cx="6" cy="15" r="1" />
                    <circle cx="18" cy="15" r="1" />
                    <circle cx="12" cy="21" r="1" />
                  </svg>
                </n-icon>
              </template>
              {{ t('rbac.role.inheritTree.viewSystem') }}
            </n-button>
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
                    <path
                      d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"
                    />
                  </svg>
                </n-icon>
              </template>
              {{ t('common.refresh') }}
            </n-button>
          </n-space>
        </n-space>
      </template>

      <data-table
        :columns="columns"
        :data="paginatedRoles"
        :loading="isLoading || deleteMutation.isPending.value"
        :selectable="false"
        :page="pagination.page"
        :page-size="pagination.pageSize"
        :total="total"
        row-key="id"
        @update:page="handlePageChange"
        @update:page-size="handlePageSizeChange"
      />
    </n-card>

    <!-- 角色表单弹窗 -->
    <role-form-modal
      v-model:visible="formModalVisible"
      :role="editingRole"
      :roles="(roleList ?? []) as Role[]"
      :loading="createMutation.isPending.value || updateMutation.isPending.value"
      @submit="handleFormSubmit"
    />

    <!-- 角色继承抽屉 -->
    <role-inherit-drawer v-model:visible="inheritDrawerVisible" :role="inheritingRole" />

    <!-- 菜单分配抽屉 -->
    <role-menu-drawer v-model:visible="menuDrawerVisible" :role="menuAssigningRole" />

    <!-- 权限分配抽屉 -->
    <role-permission-drawer
      v-model:visible="permissionDrawerVisible"
      :role="permissionAssigningRole"
    />

    <!-- 角色继承树弹窗 -->
    <role-inherit-tree-modal
      v-model:visible="inheritTreeModalVisible"
      :highlight-role-id="highlightRoleId"
      :role-id="viewTreeRoleId"
    />
  </div>
</template>

<style scoped lang="scss">
// 使用全局 page-list 样式
</style>
