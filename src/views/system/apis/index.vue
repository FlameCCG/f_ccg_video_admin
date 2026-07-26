<script setup lang="ts">
/**
 * 接口资源页
 * API Resources Page
 * Requirements: 18.6 - 接口资源管理
 */
import { ref, computed, h } from 'vue'
import { useI18n } from 'vue-i18n'
import { useQuery } from '@tanstack/vue-query'
import { NCard, NSpace, NButton, NIcon, NTag, NInput, NSelect } from 'naive-ui'
import type { DataTableColumns, SelectOption } from 'naive-ui'
import { getResources } from '@/api/rbac'
import { DataTable } from '@/components/table'
import AppPageHeader from '@/components/layout/AppPageHeader.vue'

const { t } = useI18n()

/** 搜索关键词 */
const searchKeyword = ref('')

/** 选中的标签 */
const selectedTag = ref<string | null>(null)

/** 选中的方法 */
const selectedMethod = ref<string | null>(null)

/** 分页参数 */
const pagination = ref({
  page: 1,
  pageSize: 10,
})

/**
 * 获取资源列表
 * 接口一次返回全量接口资源，关键词/标签/方法筛选与分页都在本地做，
 * 因此 queryKey 里没有可变参数，筛选与翻页都不需要重新请求。
 */
const {
  data: resourceList,
  isFetching,
  isError,
  error: listError,
  refetch,
} = useQuery({
  queryKey: ['resourceList'],
  queryFn: getResources,
  staleTime: 60 * 1000,
})

/** 所有标签选项 */
const tagOptions = computed<SelectOption[]>(() => {
  const tags = new Set<string>()
  resourceList.value?.forEach((r) => {
    r.tags?.forEach((tag) => tags.add(tag))
  })
  return Array.from(tags).map((tag) => ({ label: tag, value: tag }))
})

/** HTTP 方法选项 */
const methodOptions: SelectOption[] = [
  { label: 'GET', value: 'GET' },
  { label: 'POST', value: 'POST' },
  { label: 'PUT', value: 'PUT' },
  { label: 'DELETE', value: 'DELETE' },
  { label: 'PATCH', value: 'PATCH' },
]

/** 过滤后的资源列表 */
const filteredResources = computed(() => {
  let list = resourceList.value ?? []

  // 按关键词过滤
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    list = list.filter(
      (r) => r.path.toLowerCase().includes(keyword) || r.summary?.toLowerCase().includes(keyword)
    )
  }

  // 按标签过滤
  if (selectedTag.value) {
    list = list.filter((r) => r.tags?.includes(selectedTag.value!))
  }

  // 按方法过滤
  if (selectedMethod.value) {
    list = list.filter((r) => r.method === selectedMethod.value)
  }

  return list as unknown as Record<string, unknown>[]
})

/** 总数 */
const total = computed(() => filteredResources.value.length)

/** 分页后的数据 */
const paginatedResources = computed(() => {
  const start = (pagination.value.page - 1) * pagination.value.pageSize
  const end = start + pagination.value.pageSize
  return filteredResources.value.slice(start, end)
})

/** 加载失败描述：优先服务端 msg，缺失时由 DataTable 兜底通用文案 */
const loadErrorDescription = computed(() => listError.value?.message?.trim() || undefined)

/** 获取方法标签类型 */
function getMethodType(method: string): 'success' | 'info' | 'warning' | 'error' | 'default' {
  switch (method.toUpperCase()) {
    case 'GET':
      return 'success'
    case 'POST':
      return 'info'
    case 'PUT':
      return 'warning'
    case 'DELETE':
      return 'error'
    default:
      return 'default'
  }
}

/** 表格列配置 */
const columns = computed<DataTableColumns<Record<string, unknown>>>(() => [
  {
    title: t('rbac.api.method'),
    key: 'method',
    width: 100,
    align: 'center',
    render: (row) => {
      const method = row.method as string
      return h(NTag, { type: getMethodType(method), size: 'small', round: true }, () => method)
    },
  },
  {
    title: t('rbac.api.path'),
    key: 'path',
    minWidth: 300,
    ellipsis: { tooltip: true },
    render: (row) => h('code', { class: 'api-path' }, row.path as string),
  },
  {
    title: t('rbac.api.summary'),
    key: 'summary',
    minWidth: 200,
    ellipsis: { tooltip: true },
  },
  {
    title: t('rbac.api.tags'),
    key: 'tags',
    width: 200,
    render: (row) => {
      const tags = row.tags as string[] | undefined
      if (!tags || tags.length === 0) return '-'
      return h(NSpace, { size: 4 }, () =>
        tags.map((tag) => h(NTag, { size: 'small', bordered: false }, () => tag))
      )
    },
  },
])

/** 处理刷新 */
function handleRefresh(): void {
  void refetch()
}

/** 清除筛选 */
function handleClearFilters(): void {
  searchKeyword.value = ''
  selectedTag.value = null
  selectedMethod.value = null
  pagination.value.page = 1
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
    <app-page-header class="page-list__header" :title="t('rbac.api.title')">
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

    <!-- 筛选区域 -->
    <n-card :bordered="false" class="page-list__search">
      <n-space :size="12" align="center" wrap>
        <n-input
          v-model:value="searchKeyword"
          :placeholder="t('rbac.api.searchPlaceholder')"
          clearable
          style="width: 280px"
        >
          <template #prefix>
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
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </n-icon>
          </template>
        </n-input>

        <n-select
          v-model:value="selectedMethod"
          :options="methodOptions"
          :placeholder="t('rbac.api.methodPlaceholder')"
          clearable
          style="width: 120px"
        />

        <n-select
          v-model:value="selectedTag"
          :options="tagOptions"
          :placeholder="t('rbac.api.tagPlaceholder')"
          clearable
          style="width: 160px"
        />

        <n-button quaternary @click="handleClearFilters">
          {{ t('common.reset') }}
        </n-button>
      </n-space>
    </n-card>

    <!-- 数据表格 -->
    <n-card :bordered="false" class="page-list__table">
      <data-table
        :columns="columns"
        :data="paginatedResources"
        :loading="isFetching"
        :error="isError"
        :error-description="loadErrorDescription"
        :selectable="false"
        :page="pagination.page"
        :page-size="pagination.pageSize"
        :total="total"
        row-key="path"
        @update:page="handlePageChange"
        @update:page-size="handlePageSizeChange"
        @retry="handleRefresh"
      />
    </n-card>
  </div>
</template>

<style scoped lang="scss">
// 使用全局 page-list 样式

:deep(.api-path) {
  font-family: var(--font-mono, monospace);
  font-size: var(--text-sm);
  color: var(--color-primary);
  background: var(--color-surface);
  padding: 2px 6px;
  border-radius: var(--radius-sm);
}
</style>
