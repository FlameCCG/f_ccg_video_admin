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
import {
  getBannerList,
  createBanner,
  updateBanner,
  deleteBanner,
  setRegisterDefaultBanner,
  updateDefaultUserBannerList,
} from '@/api/banner'
import { getSiteConfig } from '@/api/site'
import { getCommonPartitions } from '@/api/video'
import type {
  BannerItem,
  BannerType,
  SiteConfig,
  UpdateDefaultUserBannerListAction,
} from '@/api/types'
import { useTableSelectionAction } from '@/composables'
import { DataTable, TableActions, BatchActions } from '@/components/table'
import { SearchForm, FilterSelect } from '@/components/form'
import { AppStatusTag } from '@/components/common'
import BannerFormModal from './components/BannerFormModal.vue'
import UserBannerDefaultsDialog from './components/UserBannerDefaultsDialog.vue'

const { t } = useI18n()
const message = useMessage()
const dialog = useDialog()
const queryClient = useQueryClient()

/** 搜索参数 */
const searchParams = ref({
  type: null as BannerType | null,
  show: null as number | null,
  partitionId: null as number | null,
  page: 1,
  pageSize: 10,
})

/** 选中的行 */
const checkedRowKeys = ref<DataTableRowKey[]>([])
const { resolveTargetIds, createDialogContent } = useTableSelectionAction(checkedRowKeys)

/** 表单弹窗状态 */
const formModalVisible = ref(false)
const editingBanner = ref<BannerItem | null>(null)
const defaultBannerDialogVisible = ref(false)
const selectedDefaultBannerIds = ref<number[]>([])

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
      partitionId: searchParams.value.partitionId ?? undefined,
      page: searchParams.value.page,
      pageSize: searchParams.value.pageSize,
    }),
  staleTime: 30 * 1000,
})

/** 获取站点配置中的默认用户主页横幅信息 */
const { data: siteConfigData } = useQuery({
  queryKey: ['siteConfig', 'site', 'banner-defaults'],
  queryFn: () => getSiteConfig('site'),
  staleTime: 30 * 1000,
  retry: false,
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

/** 设置注册时主页默认横幅 mutation */
const setRegisterDefaultBannerMutation = useMutation({
  mutationFn: setRegisterDefaultBanner,
  onSuccess: () => {
    message.success(t('banner.tips.setRegisterDefaultBannerSuccess'))
    void queryClient.invalidateQueries({ queryKey: ['siteConfig', 'site', 'banner-defaults'] })
  },
  onError: (error: Error) => {
    message.error(error.message || t('common.tips.operationFailed'))
  },
})

/** 维护系统默认用户主页横幅列表 mutation */
const updateDefaultUserBannerListMutation = useMutation({
  mutationFn: updateDefaultUserBannerList,
  onSuccess: (_, variables) => {
    message.success(
      variables.action === 1
        ? t('banner.tips.addDefaultUserBannerSuccess')
        : t('banner.tips.removeDefaultUserBannerSuccess')
    )
    defaultBannerDialogVisible.value = false
    selectedDefaultBannerIds.value = []
    checkedRowKeys.value = []
    void queryClient.invalidateQueries({ queryKey: ['siteConfig', 'site', 'banner-defaults'] })
  },
  onError: (error: Error) => {
    message.error(error.message || t('common.tips.operationFailed'))
  },
})

/** 轮播图列表数据 */
const bannerItems = computed(() => bannerData.value?.list ?? [])
const bannerList = computed(() => bannerItems.value as unknown as Record<string, unknown>[])
const total = computed(() => bannerData.value?.total ?? 0)
const currentSiteConfig = computed<SiteConfig | null>(() => siteConfigData.value ?? null)
const registerDefaultBannerId = computed(() => currentSiteConfig.value?.defaultUserBannerID ?? null)
const defaultUserBannerIds = computed(() => currentSiteConfig.value?.defaultUserBannerIDs ?? [])
const checkedBannerIds = computed(() => checkedRowKeys.value.map((key) => Number(key)))

/** 获取分区列表 */
const { data: partitionData } = useQuery({
  queryKey: ['commonPartitionList'],
  queryFn: () => getCommonPartitions(),
  staleTime: 5 * 60 * 1000,
})

/** 分区选项 */
const partitionOptions = computed(() => {
  const options = [{ value: 0, label: t('layout.breadcrumb.home') }]
  if (partitionData.value) {
    options.push(
      ...partitionData.value.map((p) => ({
        value: p.id,
        label: p.name,
      }))
    )
  }
  return options
})

/** 获取分区名称 */
function getPartitionName(partitionId: number | undefined): string {
  if (partitionId === undefined) return '-'
  if (partitionId === 0) return t('layout.breadcrumb.home')
  const partition = partitionData.value?.find((p) => p.id === partitionId)
  return partition ? partition.name : String(partitionId)
}

/** 类型选项 */
const typeOptions = computed(() => [
  { value: 1, label: t('banner.type.carousel') },
  { value: 2, label: t('banner.type.header') },
  { value: 3, label: t('banner.type.profile') },
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
    3: t('banner.type.profile'),
  }
  return textMap[type]
}

/** 获取类型标签类型 */
function getTypeTagType(type: BannerType): 'info' | 'warning' | 'success' {
  if (type === 1) return 'info'
  if (type === 2) return 'warning'
  return 'success'
}

function isDefaultUserBanner(row: BannerItem): boolean {
  return row.type === 3 && defaultUserBannerIds.value.includes(row.id)
}

function isRegisterDefaultBanner(row: BannerItem): boolean {
  return row.type === 3 && registerDefaultBannerId.value === row.id
}

/** 表格列配置 */
const columns = computed<DataTableColumns<Record<string, unknown>>>(() => [
  {
    type: 'selection',
    fixed: 'left',
  },
  {
    title: 'ID',
    key: 'id',
    width: 90,
    align: 'center',
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
    width: 220,
    align: 'center',
    render: (row) => {
      const banner = row as unknown as BannerItem
      const tags = [
        h(NTag, { type: getTypeTagType(banner.type), size: 'small' }, () =>
          getTypeText(banner.type)
        ),
      ]

      if (isDefaultUserBanner(banner)) {
        tags.push(
          h(NTag, { type: 'warning', size: 'small', bordered: false }, () =>
            t('banner.statusBadge.defaultUserBanner')
          )
        )
      }

      if (isRegisterDefaultBanner(banner)) {
        tags.push(
          h(NTag, { type: 'error', size: 'small', bordered: false }, () =>
            t('banner.statusBadge.registerDefaultBanner')
          )
        )
      }

      return h(
        NSpace,
        {
          size: 6,
          justify: 'center',
          wrapItem: true,
        },
        () => tags
      )
    },
  },
  {
    title: t('banner.list.partition'),
    key: 'partitionId',
    width: 120,
    align: 'center',
    render: (row) => {
      if (row.type !== 1) return '-'
      return getPartitionName(row.partitionId as number)
    },
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
    width: 300,
    fixed: 'right',
    render: (row) => {
      const banner = row as unknown as BannerItem
      return h(TableActions, {
        max: 3,
        actions: [
          {
            key: 'setRegisterDefaultBanner',
            label: t('banner.actions.setRegisterDefaultBanner'),
            type: 'success',
            show: banner.type === 3,
            disabled: !banner.show,
          },
          { key: 'edit', label: t('common.edit') },
          { key: 'delete', label: t('common.delete'), type: 'error' },
          {
            key: 'manageDefaultUserBanners',
            label: t('banner.actions.manageDefaultUserBanners'),
            type: 'info',
            show: banner.type === 3,
            disabled: !banner.show,
          },
        ],
        onAction: (key: string) => handleAction(key, banner),
      })
    },
  },
])

/** 批量操作配置 */
const batchActions = computed(() => [
  {
    key: 'manageDefaultUserBanners',
    label: t('banner.actions.manageDefaultUserBanners'),
    type: 'info' as const,
    icon: 'edit' as const,
  },
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

/** 处理创建 */
function handleCreate(): void {
  editingBanner.value = null
  formModalVisible.value = true
}

/** 处理操作 */
function handleAction(key: string, row: BannerItem): void {
  if (key === 'setRegisterDefaultBanner') {
    handleSetRegisterDefaultBanner(row)
  } else if (key === 'manageDefaultUserBanners') {
    handleOpenDefaultBannerDialog(resolveTargetIds(row.id))
  } else if (key === 'edit') {
    editingBanner.value = row
    formModalVisible.value = true
  } else if (key === 'delete') {
    confirmDelete(resolveTargetIds(row.id))
  }
}

/** 处理设置注册时主页默认横幅 */
function handleSetRegisterDefaultBanner(row: BannerItem): void {
  if (!row.show) {
    message.warning(t('banner.status.hide'))
    return
  }

  dialog.warning({
    title: t('banner.setRegisterDefaultBanner.title'),
    content: t('banner.setRegisterDefaultBanner.confirm'),
    positiveText: t('common.confirm'),
    negativeText: t('common.cancel'),
    onPositiveClick: () => {
      setRegisterDefaultBannerMutation.mutate({ bannerId: row.id })
    },
  })
}

function getBannerById(bannerId: number): BannerItem | undefined {
  return bannerItems.value.find((item) => item.id === bannerId)
}

function isDefaultBannerCandidate(banner: BannerItem | undefined): banner is BannerItem {
  return !!banner && banner.type === 3 && banner.show
}

function validateDefaultBannerSelection(bannerIds: number[]): boolean {
  if (bannerIds.length === 0) {
    message.warning(t('common.tips.selectAtLeastOne'))
    return false
  }

  const hasInvalidBanner = bannerIds.some(
    (bannerId) => !isDefaultBannerCandidate(getBannerById(bannerId))
  )
  if (hasInvalidBanner) {
    message.warning(t('banner.tips.invalidDefaultBannerSelection'))
    return false
  }

  return true
}

function handleOpenDefaultBannerDialog(initialBannerIds?: number[]): void {
  const bannerIds = initialBannerIds ?? checkedBannerIds.value
  if (!validateDefaultBannerSelection(bannerIds)) {
    return
  }

  selectedDefaultBannerIds.value = bannerIds
  defaultBannerDialogVisible.value = true
}

function handleOpenSelectedDefaultBannerDialog(): void {
  handleOpenDefaultBannerDialog()
}

function handleSubmitDefaultBannerDialog(payload: {
  bannerIds: number[]
  action: UpdateDefaultUserBannerListAction
}): void {
  updateDefaultUserBannerListMutation.mutate(payload)
}

/** 处理批量操作 */
function handleBatchAction(key: string): void {
  const ids = checkedRowKeys.value as number[]
  if (ids.length === 0) {
    message.warning(t('common.tips.selectAtLeastOne'))
    return
  }

  if (key === 'manageDefaultUserBanners') {
    handleOpenDefaultBannerDialog()
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
    content: createDialogContent(
      t('banner.delete.title'),
      bannerIds.length,
      t('banner.delete.confirm', { count: bannerIds.length })
    ),
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
  partitionId?: number
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

function onTypeChange(val: unknown): void {
  searchParams.value.type = val as BannerType | null
}

function onShowChange(val: unknown): void {
  searchParams.value.show = val as number | null
}

function onPartitionIdChange(val: unknown): void {
  searchParams.value.partitionId = val as number | null
}

function onCheckedRowKeysChange(keys: DataTableRowKey[]): void {
  checkedRowKeys.value = keys
}

function onClearCheckedKeys(): void {
  checkedRowKeys.value = []
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
              @change="onTypeChange"
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
              @change="onShowChange"
            />
          </n-form-item>
        </n-gi>
        <n-gi v-if="searchParams.type === 1" span="6 m:3 l:2">
          <n-form-item :label="t('banner.filter.partition')" path="partitionId">
            <filter-select
              :value="searchParams.partitionId"
              :options="partitionOptions"
              :placeholder="t('banner.filter.partitionPlaceholder')"
              :width="'100%'"
              @change="onPartitionIdChange"
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
            <n-button
              size="small"
              secondary
              :disabled="checkedRowKeys.length === 0"
              @click="handleOpenSelectedDefaultBannerDialog"
            >
              {{ t('banner.actions.manageDefaultUserBanners') }}
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

      <div class="banner-summary">
        <div class="banner-summary__item">
          <span class="banner-summary__label">
            {{ t('banner.summary.registerDefaultBanner') }}
          </span>
          <n-tag v-if="registerDefaultBannerId !== null" size="small" type="success">
            #{{ registerDefaultBannerId }}
          </n-tag>
          <span v-else class="banner-summary__empty">{{ t('banner.summary.empty') }}</span>
        </div>

        <div class="banner-summary__item">
          <span class="banner-summary__label">
            {{ t('banner.summary.defaultBannerList') }}
          </span>
          <n-space v-if="defaultUserBannerIds.length > 0" :size="6" wrap>
            <n-tag
              v-for="bannerId in defaultUserBannerIds"
              :key="bannerId"
              size="small"
              type="info"
            >
              #{{ bannerId }}
            </n-tag>
          </n-space>
          <span v-else class="banner-summary__empty">{{ t('banner.summary.empty') }}</span>
        </div>
      </div>

      <!-- 批量操作栏 -->
      <BatchActions
        v-if="checkedRowKeys.length > 0"
        :selected-count="checkedRowKeys.length"
        :actions="batchActions"
        @action="handleBatchAction"
        @clear="onClearCheckedKeys"
      />

      <data-table
        :columns="columns"
        :data="bannerList"
        :loading="
          isLoading ||
          deleteMutation.isPending.value ||
          setRegisterDefaultBannerMutation.isPending.value ||
          updateDefaultUserBannerListMutation.isPending.value
        "
        :selectable="true"
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

    <!-- 轮播图表单弹窗 -->
    <banner-form-modal
      v-model:visible="formModalVisible"
      :banner="editingBanner"
      :loading="createMutation.isPending.value || updateMutation.isPending.value"
      @submit="handleFormSubmit"
    />

    <user-banner-defaults-dialog
      v-model:visible="defaultBannerDialogVisible"
      :banner-ids="selectedDefaultBannerIds"
      :loading="updateDefaultUserBannerListMutation.isPending.value"
      @submit="handleSubmitDefaultBannerDialog"
    />
  </div>
</template>

<style scoped lang="scss">
// 使用全局 page-list 样式

.banner-summary {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-4);
  padding: 0 0 var(--spacing-4);
  margin-bottom: var(--spacing-4);
  border-bottom: 1px solid var(--color-border);

  &__item {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--spacing-2);
  }

  &__label {
    font-size: var(--text-sm);
    font-weight: 500;
    color: var(--color-text-secondary);
  }

  &__empty {
    font-size: var(--text-sm);
    color: var(--color-text-tertiary);
  }
}

:deep(.banner-link) {
  color: var(--color-primary);
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
}
</style>
