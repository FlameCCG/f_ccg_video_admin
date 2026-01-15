<script setup lang="ts">
/**
 * 轮播图管理页
 * Banner Management Page
 * Requirements: 14.1-14.5 - 轮播图管理
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
  NImage,
  NTag,
  useMessage,
  useDialog,
} from 'naive-ui'
import type { DataTableColumns, DataTableRowKey } from 'naive-ui'
import { getBannerList, createBanner, updateBanner, deleteBanner } from '@/api/banner'
import type { BannerItem, BannerType } from '@/api/types'
import { DataTable, TableActions, BatchActions } from '@/components/table'
import { SearchForm, FilterSelect } from '@/components/form'
import { AppStatusTag } from '@/components/common'
import BannerFormModal from './components/BannerFormModal.vue'

const { t } = useI18n()
const message = useMessage()
const dialog = useDialog()
const queryClient = useQueryClient()

/** 搜索参数 */
const searchParams = ref({
  type: null as BannerType | null,
  show: null as number | null,
  page: 1,
  pageSize: 10,
})

/** 选中的行 */
const checkedRowKeys = ref<DataTableRowKey[]>([])

/** 表单弹窗状态 */
const formModalVisible = ref(false)
const editingBanner = ref<BannerItem | null>(null)

/** 获取轮播图列表 */
const {
  data: bannerData,
  isLoading,
  refetch,
} = useQuery({
  queryKey: ['bannerList', searchParams],
  queryFn: () =>
    getBannerList({
      type: searchParams.value.type ?? undefined,
      show: searchParams.value.show === null ? undefined : searchParams.value.show === 1,
      page: searchParams.value.page,
      pageSize: searchParams.value.pageSize,
    }),
  staleTime: 30 * 1000,
})

/** 创建轮播图 mutation */
const createMutation = useMutation({
  mutationFn: createBanner,
  onSuccess: () => {
    message.success(t('banner.tips.createSuccess'))
    formModalVisible.value = false
    editingBanner.value = null
    void queryClient.invalidateQueries({ queryKey: ['bannerList'] })
  },
  onError: (error: Error) => {
    message.error(error.message || t('common.tips.operationFailed'))
  },
})

/** 更新轮播图 mutation */
const updateMutation = useMutation({
  mutationFn: updateBanner,
  onSuccess: () => {
    message.success(t('banner.tips.updateSuccess'))
    formModalVisible.value = false
    editingBanner.value = null
    void queryClient.invalidateQueries({ queryKey: ['bannerList'] })
  },
  onError: (error: Error) => {
    message.error(error.message || t('common.tips.operationFailed'))
  },
})

/** 删除轮播图 mutation */
const deleteMutation = useMutation({
  mutationFn: deleteBanner,
  onSuccess: () => {
    message.success(t('banner.tips.deleteSuccess'))
    checkedRowKeys.value = []
    void queryClient.invalidateQueries({ queryKey: ['bannerList'] })
  },
  onError: (error: Error) => {
    message.error(error.message || t('common.tips.operationFailed'))
  },
})

/** 轮播图列表数据 */
const bannerList = computed(() => {
  const list = bannerData.value?.list ?? []
  return list as unknown as Record<string, unknown>[]
})
const total = computed(() => bannerData.value?.total ?? 0)

/** 类型选项 */
const typeOptions = computed(() => [
  { value: 1, label: t('banner.type.carousel') },
  { value: 2, label: t('banner.type.header') },
])

/** 显示状态选项 */
const showOptions = computed(() => [
  { value: 1, label: t('banner.status.show') },
  { value: 0, label: t('banner.status.hide') },
])

/** 获取类型文本 */
function getTypeText(type: BannerType): string {
  const textMap: Record<BannerType, string> = {
    1: t('banner.type.carousel'),
    2: t('banner.type.header'),
  }
  return textMap[type]
}

/** 获取类型标签类型 */
function getTypeTagType(type: BannerType): 'info' | 'warning' {
  return type === 1 ? 'info' : 'warning'
}

/** 表格列配置 */
const columns = computed<DataTableColumns<Record<string, unknown>>>(() => [
  {
    type: 'selection',
    fixed: 'left',
  },
  {
    title: t('banner.list.cover'),
    key: 'cover',
    width: 100,
    render: (row) =>
      h(NImage, {
        src: row.cover as string,
        objectFit: 'cover',
        lazy: true,
        previewDisabled: false,
        imgProps: {
          style: {
            width: '64px',
            height: '36px',
            borderRadius: '4px',
            objectFit: 'cover',
          },
        },
      }),
  },
  {
    title: t('banner.list.href'),
    key: 'href',
    minWidth: 200,
    ellipsis: { tooltip: true },
    render: (row) => {
      const href = row.href as string
      if (!href) return '-'
      return h(
        'a',
        {
          href,
          target: '_blank',
          rel: 'noopener noreferrer',
          class: 'banner-link',
        },
        href
      )
    },
  },
  {
    title: t('banner.list.type'),
    key: 'type',
    width: 120,
    align: 'center',
    render: (row) =>
      h(NTag, { type: getTypeTagType(row.type as BannerType), size: 'small' }, () =>
        getTypeText(row.type as BannerType)
      ),
  },
  {
    title: t('banner.list.showStatus'),
    key: 'show',
    width: 100,
    align: 'center',
    render: (row) =>
      h(AppStatusTag, {
        type: (row.show as boolean) ? 'success' : 'error',
        text: (row.show as boolean) ? t('banner.status.show') : t('banner.status.hide'),
        dot: true,
      }),
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
        onAction: (key: string) => handleAction(key, row as unknown as BannerItem),
      }),
  },
])

/** 批量操作配置 */
const batchActions = computed(() => [
  { key: 'delete', label: t('common.delete'), type: 'error' as const, icon: 'delete' as const },
])

/** 处理搜索 */
function handleSearch(): void {
  searchParams.value.page = 1
  void refetch()
}

/** 处理重置 */
function handleReset(): void {
  searchParams.value = {
    type: null,
    show: null,
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

/** 处理创建 */
function handleCreate(): void {
  editingBanner.value = null
  formModalVisible.value = true
}

/** 处理操作 */
function handleAction(key: string, row: BannerItem): void {
  if (key === 'edit') {
    editingBanner.value = row
    formModalVisible.value = true
  } else if (key === 'delete') {
    confirmDelete([row.id])
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
function confirmDelete(bannerIds: number[]): void {
  dialog.warning({
    title: t('banner.delete.title'),
    content: t('banner.delete.confirm', { count: bannerIds.length }),
    positiveText: t('common.confirm'),
    negativeText: t('common.cancel'),
    onPositiveClick: () => {
      deleteMutation.mutate({ bannerIds })
    },
  })
}

/** 处理表单提交 */
function handleFormSubmit(data: {
  cover: string
  href?: string
  show?: boolean
  type?: BannerType
}): void {
  if (editingBanner.value) {
    // 更新
    updateMutation.mutate({
      id: editingBanner.value.id,
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
    <!-- 搜索表单 -->
    <n-card :bordered="false" class="page-list__search">
      <search-form :loading="isLoading" @search="handleSearch" @reset="handleReset">
        <n-gi span="6 m:3 l:2">
          <n-form-item :label="t('banner.filter.type')" path="type">
            <filter-select
              :value="searchParams.type"
              :options="typeOptions"
              :placeholder="t('banner.filter.typePlaceholder')"
              :width="'100%'"
              @change="(val) => (searchParams.type = val as BannerType | null)"
            />
          </n-form-item>
        </n-gi>
        <n-gi span="6 m:3 l:2">
          <n-form-item :label="t('banner.filter.showStatus')" path="show">
            <filter-select
              :value="searchParams.show"
              :options="showOptions"
              :placeholder="t('banner.filter.showStatusPlaceholder')"
              :width="'100%'"
              @change="(val) => (searchParams.show = val as number | null)"
            />
          </n-form-item>
        </n-gi>
      </search-form>
    </n-card>

    <!-- 数据表格 -->
    <n-card :bordered="false" class="page-list__table">
      <template #header>
        <n-space justify="space-between" align="center">
          <span class="page-list__title">{{ t('banner.list.title') }}</span>
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
              {{ t('banner.actions.create') }}
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
        :data="bannerList"
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

    <!-- 轮播图表单弹窗 -->
    <banner-form-modal
      v-model:visible="formModalVisible"
      :banner="editingBanner"
      :loading="createMutation.isPending.value || updateMutation.isPending.value"
      @submit="handleFormSubmit"
    />
  </div>
</template>

<style scoped lang="scss">
// 使用全局 page-list 样式

:deep(.banner-link) {
  color: var(--color-primary);
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
}
</style>
