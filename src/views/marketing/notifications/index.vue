<script setup lang="ts">
/**
 * 全站通知管理页
 * Site Notifications Management Page
 * Requirements: 15.1-15.4 - 通知管理
 */
import { ref, computed, h } from 'vue'
import { useI18n } from 'vue-i18n'
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { NCard, NSpace, NButton, NIcon, NTag, NEllipsis, useMessage, useDialog } from 'naive-ui'
import type { DataTableColumns, DataTableRowKey } from 'naive-ui'
import {
  getNotificationList,
  createNotification,
  updateNotification,
  deleteNotification,
} from '@/api/notification'
import type { NotificationItem } from '@/api/types'
import { DataTable, TableActions, BatchActions } from '@/components/table'
import { AppAvatar } from '@/components/common'
import { useTableSelectionAction } from '@/composables'
import NotificationFormModal from './components/NotificationFormModal.vue'

const { t } = useI18n()
const message = useMessage()
const dialog = useDialog()
const queryClient = useQueryClient()

/** 搜索参数 */
const searchParams = ref({
  page: 1,
  pageSize: 10,
})

/** 选中的行 */
const checkedRowKeys = ref<DataTableRowKey[]>([])
const { resolveTargetIds, createDialogContent } = useTableSelectionAction(checkedRowKeys)

/** 表单弹窗状态 */
const formModalVisible = ref(false)
const editingNotification = ref<NotificationItem | null>(null)

/** 获取通知列表 */
const {
  data: notificationData,
  isLoading,
  refetch,
} = useQuery({
  queryKey: ['notificationList', searchParams],
  queryFn: () =>
    getNotificationList({
      page: searchParams.value.page,
      pageSize: searchParams.value.pageSize,
    }),
  staleTime: 30 * 1000,
})

/** 创建通知 mutation */
const createMutation = useMutation({
  mutationFn: createNotification,
  onSuccess: () => {
    message.success(t('notification.tips.createSuccess'))
    formModalVisible.value = false
    editingNotification.value = null
    void queryClient.invalidateQueries({ queryKey: ['notificationList'] })
  },
  onError: (error: Error) => {
    message.error(error.message || t('common.tips.operationFailed'))
  },
})

/** 更新通知 mutation */
const updateMutation = useMutation({
  mutationFn: updateNotification,
  onSuccess: () => {
    message.success(t('notification.tips.updateSuccess'))
    formModalVisible.value = false
    editingNotification.value = null
    void queryClient.invalidateQueries({ queryKey: ['notificationList'] })
  },
  onError: (error: Error) => {
    message.error(error.message || t('common.tips.operationFailed'))
  },
})

/** 删除通知 mutation */
const deleteMutation = useMutation({
  mutationFn: deleteNotification,
  onSuccess: () => {
    message.success(t('notification.tips.deleteSuccess'))
    checkedRowKeys.value = []
    void queryClient.invalidateQueries({ queryKey: ['notificationList'] })
  },
  onError: (error: Error) => {
    message.error(error.message || t('common.tips.operationFailed'))
  },
})

/** 通知列表数据 */
const notificationList = computed(() => {
  const list = notificationData.value?.list ?? []
  return list as unknown as Record<string, unknown>[]
})
const total = computed(() => notificationData.value?.total ?? 0)

/** 格式化接收者 */
function formatReceiver(receiverId: number): string {
  return receiverId === -1 ? t('notification.receiver.all') : `ID: ${receiverId}`
}

/** 表格列配置 */
const columns = computed<DataTableColumns<Record<string, unknown>>>(() => [
  {
    type: 'selection',
    fixed: 'left',
  },
  {
    title: t('notification.list.title'),
    key: 'title',
    width: 200,
    ellipsis: { tooltip: true },
  },
  {
    title: t('notification.list.content'),
    key: 'content',
    minWidth: 250,
    render: (row) => h(NEllipsis, { lineClamp: 2, tooltip: true }, () => row.content as string),
  },
  {
    title: t('notification.list.receiver'),
    key: 'receiverID',
    width: 120,
    align: 'center',
    render: (row) => {
      const receiverId = row.receiverID as number
      return h(NTag, { type: receiverId === -1 ? 'success' : 'default', size: 'small' }, () =>
        formatReceiver(receiverId)
      )
    },
  },
  {
    title: t('notification.list.senderAvatar'),
    key: 'actionUserAvatar',
    width: 80,
    align: 'center',
    render: (row) => {
      const avatar = row.actionUserAvatar as string
      const name = row.actionUserName as string
      if (!name) return '-'
      return h(AppAvatar, { src: avatar, text: name, size: 32 })
    },
  },
  {
    title: t('notification.list.sender'),
    key: 'actionUserName',
    width: 120,
    ellipsis: { tooltip: true },
    render: (row) => {
      const name = row.actionUserName as string
      return name || '-'
    },
  },
  {
    title: t('notification.list.link'),
    key: 'link',
    width: 150,
    ellipsis: { tooltip: true },
    render: (row) => {
      const link = row.link as string
      if (!link) return '-'
      return h(
        'a',
        {
          href: link,
          target: '_blank',
          rel: 'noopener noreferrer',
          class: 'notification-link',
        },
        link
      )
    },
  },
  {
    title: t('common.table.operation'),
    key: 'actions',
    width: 150,
    fixed: 'right',
    render: (row) =>
      h(TableActions, {
        actions: [
          { key: 'edit', label: t('common.edit') },
          { key: 'delete', label: t('common.delete'), type: 'error' },
        ],
        onAction: (key: string) => handleAction(key, row as unknown as NotificationItem),
      }),
  },
])

/** 批量操作配置 */
const batchActions = computed(() => [
  { key: 'delete', label: t('common.delete'), type: 'error' as const, icon: 'delete' as const },
])

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

/** 处理创建 */
function handleCreate(): void {
  editingNotification.value = null
  formModalVisible.value = true
}

/** 处理操作 */
function handleAction(key: string, row: NotificationItem): void {
  if (key === 'edit') {
    editingNotification.value = row
    formModalVisible.value = true
  } else if (key === 'delete') {
    confirmDelete(resolveTargetIds(row.id))
  }
}

/** 处理批量操作 */
function handleBatchAction(key: string): void {
  const ids = checkedRowKeys.value as number[]
  if (ids.length === 0) {
    message.warning(t('common.tips.selectAtLeastOne'))
    return
  }

  if (key === 'delete') {
    confirmDelete(ids)
  }
}

/** 确认删除 */
function confirmDelete(ids: number[]): void {
  dialog.warning({
    title: t('notification.delete.title'),
    content: createDialogContent(
      t('notification.delete.title'),
      ids.length,
      t('notification.delete.confirm', { count: ids.length })
    ),
    positiveText: t('common.confirm'),
    negativeText: t('common.cancel'),
    onPositiveClick: () => {
      deleteMutation.mutate({ ids })
    },
  })
}

/** 处理表单提交 */
function handleFormSubmit(data: {
  title: string
  content: string
  receiverId: number
  videoId?: number
  videoTitle?: string
  link?: string
}): void {
  if (editingNotification.value) {
    // 更新
    updateMutation.mutate({
      id: editingNotification.value.id,
      ...data,
    })
  } else {
    // 创建
    createMutation.mutate(data)
  }
}

/** 处理刷新 */
function handleRefresh(): void {
  void refetch()
}
</script>

<template>
  <div class="page-list">
    <!-- 数据表格 -->
    <n-card :bordered="false" class="page-list__table">
      <template #header>
        <n-space justify="space-between" align="center">
          <span class="page-list__title">{{ t('notification.list.pageTitle') }}</span>
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
              {{ t('notification.actions.create') }}
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
        :data="notificationList"
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

    <!-- 通知表单弹窗 -->
    <notification-form-modal
      v-model:visible="formModalVisible"
      :notification="editingNotification"
      :loading="createMutation.isPending.value || updateMutation.isPending.value"
      @submit="handleFormSubmit"
    />
  </div>
</template>

<style scoped lang="scss">
// 使用全局 page-list 样式

:deep(.notification-link) {
  color: var(--color-primary);
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
}
</style>
