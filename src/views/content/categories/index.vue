<script setup lang="ts">
/**
 * 分区配置页
 * Category Config Page
 * Requirements: 10.1-10.4 - 分区管理 CRUD
 */
import { ref, computed, h } from 'vue'
import { useI18n } from 'vue-i18n'
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { NCard, NButton, NIcon, NTag, NText, useMessage, useDialog } from 'naive-ui'
import type { DataTableColumns } from 'naive-ui'
import { getPartitions, createPartition, updatePartition, deletePartition } from '@/api/video'
import type { Partition, CreatePartitionParams, UpdatePartitionParams } from '@/api/types'
import { DataTable, TableActions } from '@/components/table'
import { SvgIcon } from '@/components/common'
import AppPageHeader from '@/components/layout/AppPageHeader.vue'
import { usePageTitle } from '@/composables/usePageTitle'
import PartitionFormModal from '../components/PartitionFormModal.vue'

const { t } = useI18n()
const { pageTitle } = usePageTitle()
const message = useMessage()
const dialog = useDialog()
const queryClient = useQueryClient()

/** 分页参数 */
const pagination = ref({
  page: 1,
  pageSize: 20,
})

/** 表单弹窗状态 */
const formModalVisible = ref(false)
const editingPartition = ref<Partition | null>(null)

/**
 * 获取分区列表
 * pagination 就在 queryKey 里，翻页即触发请求；
 * 因此各 handler 里不再额外调 refetch()（那会让同一次交互打两个请求，
 * 并且 refetch 无条件绕过 staleTime，等于让上面的 staleTime 彻底失效）。
 */
const {
  data: partitionsData,
  isFetching,
  isError,
  refetch,
} = useQuery({
  queryKey: ['partitionsList', pagination],
  queryFn: () =>
    getPartitions({
      page: pagination.value.page,
      pageSize: pagination.value.pageSize,
    }),
  staleTime: 30 * 1000,
})

/** 创建分区 mutation */
const createMutation = useMutation({
  mutationFn: createPartition,
  onSuccess: () => {
    message.success(t('common.tips.createSuccess'))
    formModalVisible.value = false
    editingPartition.value = null
    void queryClient.invalidateQueries({ queryKey: ['partitionsList'] })
    void queryClient.invalidateQueries({ queryKey: ['partitions'] })
  },
  onError: (error: Error) => {
    message.error(error.message || t('common.tips.createFailed'))
  },
})

/** 更新分区 mutation */
const updateMutation = useMutation({
  mutationFn: updatePartition,
  onSuccess: () => {
    message.success(t('common.tips.updateSuccess'))
    formModalVisible.value = false
    editingPartition.value = null
    void queryClient.invalidateQueries({ queryKey: ['partitionsList'] })
    void queryClient.invalidateQueries({ queryKey: ['partitions'] })
  },
  onError: (error: Error) => {
    message.error(error.message || t('common.tips.updateFailed'))
  },
})

/** 删除分区 mutation */
const deleteMutation = useMutation({
  mutationFn: deletePartition,
  onSuccess: () => {
    message.success(t('common.tips.deleteSuccess'))
    void queryClient.invalidateQueries({ queryKey: ['partitionsList'] })
    void queryClient.invalidateQueries({ queryKey: ['partitions'] })
  },
  onError: (error: Error) => {
    message.error(error.message || t('common.tips.deleteFailed'))
  },
})

/** 分区列表数据 */
const partitionList = computed(() => {
  const list = partitionsData.value?.list ?? []
  return list as unknown as Record<string, unknown>[]
})
const total = computed(() => partitionsData.value?.total ?? 0)

/** 页面标题：优先后端菜单标题，菜单未命中时回落到模块内文案 */
const headerTitle = computed(() => pageTitle.value || t('video.partition.title'))

/** 表格列配置 */
const columns = computed<DataTableColumns<Record<string, unknown>>>(() => [
  {
    title: 'ID',
    key: 'id',
    width: 80,
    align: 'center',
  },
  {
    title: t('video.partition.icon'),
    key: 'icon',
    width: 80,
    align: 'center',
    render: (row) => {
      const icon = row.icon as string
      if (!icon) return h(NText, { depth: 3 }, () => '-')
      // 如果是 SVG 字符串，渲染图标
      if (icon.trim().startsWith('<svg')) {
        return h(SvgIcon, { svg: icon, size: 24 })
      }
      return h(NText, { depth: 3 }, () => '-')
    },
  },
  {
    title: t('video.partition.name'),
    key: 'name',
    minWidth: 150,
  },
  {
    title: t('video.partition.sortOrder'),
    key: 'sortOrder',
    width: 100,
    align: 'center',
  },
  {
    title: t('video.partition.isActive'),
    key: 'isActive',
    width: 100,
    align: 'center',
    render: (row) =>
      h(NTag, { type: (row.isActive as boolean) ? 'success' : 'default', size: 'small' }, () =>
        (row.isActive as boolean) ? t('common.enabled') : t('common.disabled')
      ),
  },
  {
    title: t('video.partition.isSubmittable'),
    key: 'isSubmittable',
    width: 100,
    align: 'center',
    render: (row) =>
      h(
        NTag,
        { type: (row.isSubmittable as boolean) ? 'success' : 'default', size: 'small' },
        () => ((row.isSubmittable as boolean) ? t('common.yes') : t('common.no'))
      ),
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
        onAction: (key: string) => handleAction(key, row as unknown as Partition),
      }),
  },
])

/** 处理页码变化 */
function handlePageChange(page: number): void {
  pagination.value.page = page
}

/** 处理每页数量变化 */
function handlePageSizeChange(pageSize: number): void {
  pagination.value.pageSize = pageSize
  pagination.value.page = 1
}

/** 处理操作 */
function handleAction(key: string, row: Partition): void {
  if (key === 'edit') {
    editingPartition.value = row
    formModalVisible.value = true
  } else if (key === 'delete') {
    confirmDelete(row)
  }
}

/** 打开创建弹窗 */
function handleCreate(): void {
  editingPartition.value = null
  formModalVisible.value = true
}

/** 确认删除 */
function confirmDelete(partition: Partition): void {
  dialog.warning({
    title: t('video.partition.delete'),
    content: t('video.partition.confirmDelete'),
    positiveText: t('common.confirm'),
    negativeText: t('common.cancel'),
    onPositiveClick: () => {
      deleteMutation.mutate({ id: partition.id })
    },
  })
}

/** 处理表单提交 */
function handleFormSubmit(data: CreatePartitionParams | UpdatePartitionParams): void {
  if (editingPartition.value) {
    // 更新
    updateMutation.mutate({
      id: editingPartition.value.id,
      ...data,
    } as UpdatePartitionParams)
  } else {
    // 创建
    createMutation.mutate(data as CreatePartitionParams)
  }
}

/** 处理刷新：用户主动发起，是 refetch 的正当用法（同时用作失败重试） */
function handleRefresh(): void {
  void refetch()
}
</script>

<template>
  <div class="page-list">
    <app-page-header class="page-list__header" :title="headerTitle">
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
          {{ t('video.partition.create') }}
        </n-button>
      </template>
    </app-page-header>

    <!-- 数据表格 -->
    <n-card :bordered="false" class="page-list__table">
      <data-table
        :columns="columns"
        :data="partitionList"
        :loading="
          isFetching ||
          createMutation.isPending.value ||
          updateMutation.isPending.value ||
          deleteMutation.isPending.value
        "
        :error="isError"
        :selectable="false"
        :page="pagination.page"
        :page-size="pagination.pageSize"
        :total="total"
        row-key="id"
        @update:page="handlePageChange"
        @update:page-size="handlePageSizeChange"
        @retry="handleRefresh"
      />
    </n-card>

    <!-- 分区表单弹窗 -->
    <partition-form-modal
      v-model:visible="formModalVisible"
      :partition="editingPartition"
      :loading="createMutation.isPending.value || updateMutation.isPending.value"
      @submit="handleFormSubmit"
    />
  </div>
</template>

<style scoped lang="scss">
// 使用全局 page-list 样式：原来这里是一份 .categories-page 克隆块，
// 它自带 padding 会与 .content-wrapper 的页面内缩叠成两倍内缩，
// 且缺 height: 100% / min-height: 0，表格区撑不满剩余高度。
</style>
