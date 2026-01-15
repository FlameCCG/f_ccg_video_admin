<script setup lang="ts">
/**
 * 权限表格组件
 * Permission Table Component
 * Requirements: 18.8 - 支持按标签分组展示、勾选/取消勾选、批量操作
 */
import { ref, computed, h } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  NDataTable,
  NTag,
  NSpace,
  NInput,
  NSelect,
  NEmpty,
  NCollapse,
  NCollapseItem,
  NCheckbox,
} from 'naive-ui'
import type { DataTableColumns, SelectOption, DataTableRowKey } from 'naive-ui'
import type { Resource, Permission } from '@/api/types'

interface Props {
  /** 资源列表 */
  resources: Resource[]
  /** 选中的权限 */
  checkedPermissions?: Permission[]
  /** 是否只读 */
  readonly?: boolean
  /** 是否显示搜索 */
  showSearch?: boolean
  /** 是否按标签分组 */
  groupByTag?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  checkedPermissions: () => [],
  readonly: false,
  showSearch: true,
  groupByTag: true,
})

const emit = defineEmits<{
  'update:checkedPermissions': [permissions: Permission[]]
}>()

const { t } = useI18n()

/** 搜索关键词 */
const searchKeyword = ref('')

/** 选中的标签 */
const selectedTag = ref<string | null>(null)

/** 内部选中状态 */
const internalChecked = ref<Set<string>>(new Set())

/** 生成权限 key */
function getPermissionKey(resource: string, action: string): string {
  return `${action}:${resource}`
}

/** 解析权限 key */
function parsePermissionKey(key: string): Permission {
  const parts = key.split(':')
  const action = parts[0] || ''
  const resource = parts.slice(1).join(':')
  return { action, resource }
}

/** 初始化选中状态 */
function initCheckedState(): void {
  const keys = new Set<string>()
  props.checkedPermissions.forEach((p) => {
    keys.add(getPermissionKey(p.resource, p.action))
  })
  internalChecked.value = keys
}

// 初始化
initCheckedState()

/** 所有标签选项 */
const tagOptions = computed<SelectOption[]>(() => {
  const tags = new Set<string>()
  props.resources.forEach((r) => {
    r.tags?.forEach((tag) => tags.add(tag))
  })
  return Array.from(tags).map((tag) => ({ label: tag, value: tag }))
})

/** 按标签分组的资源 */
const groupedResources = computed(() => {
  const groups = new Map<string, Resource[]>()

  props.resources.forEach((r) => {
    const tag = r.tags?.[0] || t('rbac.api.uncategorized')
    if (!groups.has(tag)) {
      groups.set(tag, [])
    }
    groups.get(tag)!.push(r)
  })

  return groups
})

/** 过滤后的资源 */
const filteredResources = computed(() => {
  let list = props.resources

  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    list = list.filter(
      (r) => r.path.toLowerCase().includes(keyword) || r.summary?.toLowerCase().includes(keyword)
    )
  }

  if (selectedTag.value) {
    list = list.filter((r) => r.tags?.includes(selectedTag.value!))
  }

  return list
})

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
const columns = computed<DataTableColumns<Resource>>(() => {
  const cols: DataTableColumns<Resource> = []

  if (!props.readonly) {
    cols.push({
      type: 'selection',
      width: 50,
    })
  }

  cols.push(
    {
      title: t('rbac.api.method'),
      key: 'method',
      width: 90,
      render: (row) =>
        h(NTag, { type: getMethodType(row.method), size: 'small', round: true }, () => row.method),
    },
    {
      title: t('rbac.api.path'),
      key: 'path',
      minWidth: 250,
      ellipsis: { tooltip: true },
      render: (row) => h('code', { class: 'api-path' }, row.path),
    },
    {
      title: t('rbac.api.summary'),
      key: 'summary',
      minWidth: 150,
      ellipsis: { tooltip: true },
    }
  )

  return cols
})

/** 选中的行 keys */
const checkedRowKeys = computed<DataTableRowKey[]>({
  get: () => Array.from(internalChecked.value),
  set: (keys: DataTableRowKey[]) => {
    internalChecked.value = new Set(keys.map(String))
    emitChange()
  },
})

/** 处理选中变化 */
function handleCheckedRowKeysUpdate(keys: DataTableRowKey[]): void {
  internalChecked.value = new Set(keys.map(String))
  emitChange()
}

/** 发送变更事件 */
function emitChange(): void {
  const permissions = Array.from(internalChecked.value).map(parsePermissionKey)
  emit('update:checkedPermissions', permissions)
}

/** 行 key */
function rowKey(row: Resource): string {
  return getPermissionKey(row.path, row.method)
}

/** 检查标签是否全选 */
function isTagAllChecked(tag: string): boolean {
  const resources = groupedResources.value.get(tag) ?? []
  return resources.every((r) => internalChecked.value.has(getPermissionKey(r.path, r.method)))
}

/** 检查标签是否部分选中 */
function isTagIndeterminate(tag: string): boolean {
  const resources = groupedResources.value.get(tag) ?? []
  const checkedCount = resources.filter((r) =>
    internalChecked.value.has(getPermissionKey(r.path, r.method))
  ).length
  return checkedCount > 0 && checkedCount < resources.length
}

/** 切换标签全选 */
function toggleTagAll(tag: string, checked: boolean): void {
  const tagResources = groupedResources.value.get(tag) ?? []
  tagResources.forEach((r) => {
    const key = getPermissionKey(r.path, r.method)
    if (checked) {
      internalChecked.value.add(key)
    } else {
      internalChecked.value.delete(key)
    }
  })
  internalChecked.value = new Set(internalChecked.value)
  emitChange()
}

/** 获取标签选中数量 */
function getTagCheckedCount(tag: string): number {
  const resources = groupedResources.value.get(tag) ?? []
  return resources.filter((r) => internalChecked.value.has(getPermissionKey(r.path, r.method)))
    .length
}
</script>

<template>
  <div class="permission-table">
    <!-- 搜索区域 -->
    <n-space v-if="showSearch" :size="12" style="margin-bottom: 16px">
      <n-input
        v-model:value="searchKeyword"
        :placeholder="t('rbac.api.searchPlaceholder')"
        clearable
        style="width: 200px"
      />
      <n-select
        v-model:value="selectedTag"
        :options="tagOptions"
        :placeholder="t('rbac.api.tagPlaceholder')"
        clearable
        style="width: 150px"
      />
    </n-space>

    <!-- 分组展示 -->
    <template v-if="groupByTag && !selectedTag && !searchKeyword">
      <n-collapse>
        <n-collapse-item v-for="[tag, tagResources] in groupedResources" :key="tag" :name="tag">
          <template #header>
            <n-space align="center" :size="8">
              <div v-if="!readonly" @click.stop>
                <n-checkbox
                  :checked="isTagAllChecked(tag)"
                  :indeterminate="isTagIndeterminate(tag)"
                  @update:checked="(checked: boolean) => toggleTagAll(tag, checked)"
                />
              </div>
              <span>{{ tag }}</span>
              <n-tag size="small" round>
                {{ getTagCheckedCount(tag) }} / {{ tagResources.length }}
              </n-tag>
            </n-space>
          </template>
          <n-data-table
            :checked-row-keys="checkedRowKeys"
            :columns="columns"
            :data="tagResources"
            :row-key="rowKey"
            size="small"
            bordered
            @update:checked-row-keys="handleCheckedRowKeysUpdate"
          />
        </n-collapse-item>
      </n-collapse>
    </template>

    <!-- 平铺展示 -->
    <template v-else-if="filteredResources.length > 0">
      <n-data-table
        :checked-row-keys="checkedRowKeys"
        :columns="columns"
        :data="filteredResources"
        :row-key="rowKey"
        :max-height="500"
        size="small"
        bordered
        @update:checked-row-keys="handleCheckedRowKeysUpdate"
      />
    </template>

    <!-- 空状态 -->
    <n-empty v-else :description="t('common.noData')" />
  </div>
</template>

<style scoped lang="scss">
.permission-table {
  :deep(.api-path) {
    font-family: var(--font-mono, monospace);
    font-size: var(--text-xs);
    color: var(--color-primary);
  }
}
</style>
