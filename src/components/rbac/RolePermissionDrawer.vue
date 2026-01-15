<script setup lang="ts">
/**
 * 角色权限分配抽屉
 * Role Permission Assignment Drawer
 * Requirements: 18.7 - 角色权限分配
 * 支持通配符权限（如 /v1/admin/** + *）和具体 API 权限
 */
import { ref, computed, watch, h } from 'vue'
import { useI18n } from 'vue-i18n'
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import {
  NDrawer,
  NDrawerContent,
  NSpace,
  NButton,
  NDataTable,
  NTag,
  NInput,
  NSelect,
  NSpin,
  NEmpty,
  NAlert,
  NTabs,
  NTabPane,
  NCard,
  NIcon,
  NPopconfirm,
  useMessage,
} from 'naive-ui'
import type { DataTableColumns, SelectOption, DataTableRowKey } from 'naive-ui'
import { getResources, getRolePermissions, replaceRolePermissions } from '@/api/rbac'
import type { Role, Resource, Permission } from '@/api/types'

interface Props {
  /** 是否显示 */
  visible: boolean
  /** 角色 */
  role?: Role | null
}

/** 通配符权限项 */
interface WildcardPermission {
  id: string
  resource: string
  action: string
  isNew?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  role: null,
})

const emit = defineEmits<{
  'update:visible': [value: boolean]
}>()

const { t } = useI18n()
const message = useMessage()
const queryClient = useQueryClient()

/** 当前 Tab */
const activeTab = ref<'wildcard' | 'specific'>('wildcard')

/** 搜索关键词 */
const searchKeyword = ref('')

/** 选中的标签 */
const selectedTag = ref<string | null>(null)

/** 选中的具体权限 */
const checkedPermissions = ref<Set<string>>(new Set())

/** 通配符权限列表 */
const wildcardPermissions = ref<WildcardPermission[]>([])

/** 新增通配符权限表单 */
const newWildcard = ref({ resource: '', action: '*' })

/** 获取所有资源 */
const { data: allResources, isLoading: resourcesLoading } = useQuery({
  queryKey: ['allResources'],
  queryFn: getResources,
  staleTime: 60 * 1000,
})

/** 获取角色已分配的权限 */
const {
  data: rolePermissions,
  isLoading: permissionsLoading,
  refetch: refetchPermissions,
} = useQuery({
  queryKey: ['rolePermissions', computed(() => props.role?.name)],
  queryFn: () => (props.role ? getRolePermissions({ name: props.role.name }) : Promise.resolve([])),
  enabled: computed(() => !!props.role && props.visible),
  staleTime: 30 * 1000,
})

/** 替换权限 mutation */
const replaceMutation = useMutation({
  mutationFn: replaceRolePermissions,
  onSuccess: () => {
    message.success(t('rbac.permission.updateSuccess'))
    void queryClient.invalidateQueries({ queryKey: ['rolePermissions'] })
    handleClose()
  },
  onError: (error: Error) => {
    message.error(error.message || t('common.tips.operationFailed'))
  },
})

/** 加载状态 */
const isLoading = computed(
  () => resourcesLoading.value || permissionsLoading.value || replaceMutation.isPending.value
)

/** 所有标签选项 */
const tagOptions = computed<SelectOption[]>(() => {
  const tags = new Set<string>()
  allResources.value?.forEach((r) => {
    r.tags?.forEach((tag) => tags.add(tag))
  })
  return Array.from(tags).map((tag) => ({ label: tag, value: tag }))
})

/** 按标签分组的资源 */
const groupedResources = computed(() => {
  const resources = allResources.value ?? []
  const groups = new Map<string, Resource[]>()

  resources.forEach((r) => {
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
  let list = allResources.value ?? []

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

/** 判断是否为通配符权限 */
function isWildcardPermission(resource: string, action: string): boolean {
  return resource.includes('**') || resource.includes('*') || action === '*'
}

/** 获取方法标签类型 */
function getMethodType(method: string): 'success' | 'info' | 'warning' | 'error' | 'default' {
  if (method === '*') return 'default'
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

/** 通配符权限表格列配置 */
const wildcardColumns = computed<DataTableColumns<WildcardPermission>>(() => [
  {
    title: t('rbac.api.method'),
    key: 'action',
    width: 100,
    render: (row) =>
      h(
        NTag,
        { type: getMethodType(row.action), size: 'small', round: true },
        () => row.action || '*'
      ),
  },
  {
    title: t('rbac.api.path'),
    key: 'resource',
    minWidth: 250,
    render: (row) => h('code', { class: 'api-path' }, row.resource),
  },
  {
    title: t('common.table.operation'),
    key: 'actions',
    width: 80,
    render: (row) =>
      h(
        NPopconfirm,
        {
          onPositiveClick: () => handleRemoveWildcard(row.id),
        },
        {
          trigger: () =>
            h(
              NButton,
              { size: 'tiny', type: 'error', quaternary: true },
              { default: () => t('common.delete') }
            ),
          default: () => t('rbac.permission.confirmRemove'),
        }
      ),
  },
])

/** 具体权限表格列配置 */
const columns = computed<DataTableColumns<Resource>>(() => [
  {
    type: 'selection',
    width: 50,
  },
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
  },
])

/** 选中的行 keys */
const checkedRowKeys = computed<DataTableRowKey[]>(() => Array.from(checkedPermissions.value))

/** 处理选中变化 */
function handleCheckedRowKeysUpdate(keys: DataTableRowKey[]): void {
  checkedPermissions.value = new Set(keys.map(String))
}

/** 监听角色权限变化，初始化选中状态 */
watch(
  () => rolePermissions.value,
  (permissions) => {
    if (permissions) {
      const wildcards: WildcardPermission[] = []
      const specificKeys = new Set<string>()

      // Casbin 格式: [["角色名", "/v1/admin/**", "*"], ...]
      permissions.forEach((p, index) => {
        if (p.length >= 3) {
          const resource = p[1] ?? ''
          const action = p[2] ?? ''

          if (isWildcardPermission(resource, action)) {
            wildcards.push({
              id: `existing-${index}`,
              resource,
              action,
            })
          } else {
            specificKeys.add(getPermissionKey(resource, action))
          }
        }
      })

      wildcardPermissions.value = wildcards
      checkedPermissions.value = specificKeys
    }
  },
  { immediate: true }
)

/** 监听 visible 变化 */
watch(
  () => props.visible,
  (visible) => {
    if (visible && props.role) {
      void refetchPermissions()
      searchKeyword.value = ''
      selectedTag.value = null
      newWildcard.value = { resource: '', action: '*' }
    }
  }
)

/** 处理关闭 */
function handleClose(): void {
  emit('update:visible', false)
}

/** 添加通配符权限 */
function handleAddWildcard(): void {
  if (!newWildcard.value.resource.trim()) {
    message.warning(t('rbac.permission.resourceRequired'))
    return
  }

  const id = `new-${Date.now()}`
  wildcardPermissions.value.push({
    id,
    resource: newWildcard.value.resource.trim(),
    action: newWildcard.value.action || '*',
    isNew: true,
  })

  newWildcard.value = { resource: '', action: '*' }
}

/** 移除通配符权限 */
function handleRemoveWildcard(id: string): void {
  wildcardPermissions.value = wildcardPermissions.value.filter((p) => p.id !== id)
}

/** 处理保存 */
function handleSave(): void {
  if (!props.role) return

  // 合并通配符权限和具体权限
  const permissions: Permission[] = []

  // 添加通配符权限
  wildcardPermissions.value.forEach((wp) => {
    permissions.push({
      resource: wp.resource,
      action: wp.action,
    })
  })

  // 添加具体权限
  Array.from(checkedPermissions.value).forEach((key) => {
    const parsed = parsePermissionKey(key)
    permissions.push(parsed)
  })

  replaceMutation.mutate({
    roleId: props.role.id,
    permissions,
  })
}

/** 全选当前标签 */
function handleSelectAllInTag(tag: string): void {
  const resources = groupedResources.value.get(tag) ?? []
  resources.forEach((r) => {
    checkedPermissions.value.add(getPermissionKey(r.path, r.method))
  })
  checkedPermissions.value = new Set(checkedPermissions.value)
}

/** 取消选择当前标签 */
function handleDeselectAllInTag(tag: string): void {
  const resources = groupedResources.value.get(tag) ?? []
  resources.forEach((r) => {
    checkedPermissions.value.delete(getPermissionKey(r.path, r.method))
  })
  checkedPermissions.value = new Set(checkedPermissions.value)
}

/** 行 key */
function rowKey(row: Resource): string {
  return getPermissionKey(row.path, row.method)
}

/** HTTP 方法选项 */
const methodOptions: SelectOption[] = [
  { label: '* (全部)', value: '*' },
  { label: 'GET', value: 'GET' },
  { label: 'POST', value: 'POST' },
  { label: 'PUT', value: 'PUT' },
  { label: 'DELETE', value: 'DELETE' },
  { label: 'PATCH', value: 'PATCH' },
]
</script>

<template>
  <n-drawer :show="visible" :width="780" placement="right" @update:show="handleClose">
    <n-drawer-content
      :title="t('rbac.permission.assignPermissions')"
      :native-scrollbar="false"
      closable
    >
      <n-spin :show="isLoading">
        <!-- 角色信息 -->
        <n-alert v-if="role" type="info" :show-icon="false" style="margin-bottom: 16px">
          {{ t('rbac.role.name') }}: {{ role.name }}
          <template v-if="wildcardPermissions.length > 0 || checkedPermissions.size > 0">
            &nbsp;|&nbsp;{{ t('rbac.permission.wildcardCount') }}:
            {{ wildcardPermissions.length }} &nbsp;|&nbsp;{{ t('rbac.permission.specificCount') }}:
            {{ checkedPermissions.size }}
          </template>
        </n-alert>

        <n-tabs v-model:value="activeTab" type="line" animated>
          <!-- 通配符权限 Tab -->
          <n-tab-pane name="wildcard" :tab="t('rbac.permission.wildcardPermissions')">
            <!-- 添加通配符权限 -->
            <n-card size="small" style="margin-bottom: 16px">
              <n-space :size="8" align="center">
                <n-select
                  v-model:value="newWildcard.action"
                  :options="methodOptions"
                  style="width: 120px"
                  size="small"
                />
                <n-input
                  v-model:value="newWildcard.resource"
                  :placeholder="t('rbac.permission.wildcardPlaceholder')"
                  style="width: 300px"
                  size="small"
                  @keyup.enter="handleAddWildcard"
                />
                <n-button type="primary" size="small" @click="handleAddWildcard">
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
                  {{ t('common.add') }}
                </n-button>
              </n-space>
              <div class="hint-text">
                {{ t('rbac.permission.wildcardHint') }}
              </div>
            </n-card>

            <!-- 通配符权限列表 -->
            <n-data-table
              v-if="wildcardPermissions.length > 0"
              :columns="wildcardColumns"
              :data="wildcardPermissions"
              :max-height="400"
              size="small"
              bordered
            />
            <n-empty v-else :description="t('rbac.permission.noWildcard')" />
          </n-tab-pane>

          <!-- 具体权限 Tab -->
          <n-tab-pane name="specific" :tab="t('rbac.permission.specificPermissions')">
            <!-- 筛选 -->
            <n-space :size="12" style="margin-bottom: 16px">
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

            <!-- 按标签分组的权限表格 -->
            <n-tabs v-if="!selectedTag && groupedResources.size > 0" type="line" animated>
              <n-tab-pane
                v-for="[tag, resources] in groupedResources"
                :key="tag"
                :name="tag"
                :tab="tag"
              >
                <n-space :size="8" style="margin-bottom: 8px">
                  <n-button size="tiny" quaternary @click="handleSelectAllInTag(tag)">
                    {{ t('common.selectAll') }}
                  </n-button>
                  <n-button size="tiny" quaternary @click="handleDeselectAllInTag(tag)">
                    {{ t('common.deselectAll') }}
                  </n-button>
                </n-space>
                <n-data-table
                  :checked-row-keys="checkedRowKeys"
                  :columns="columns"
                  :data="resources"
                  :row-key="rowKey"
                  :max-height="350"
                  size="small"
                  bordered
                  @update:checked-row-keys="handleCheckedRowKeysUpdate"
                />
              </n-tab-pane>
            </n-tabs>

            <!-- 筛选后的表格 -->
            <template v-else-if="filteredResources.length > 0">
              <n-data-table
                :checked-row-keys="checkedRowKeys"
                :columns="columns"
                :data="filteredResources"
                :row-key="rowKey"
                :max-height="450"
                size="small"
                bordered
                @update:checked-row-keys="handleCheckedRowKeysUpdate"
              />
            </template>

            <!-- 空状态 -->
            <n-empty v-else :description="t('common.noData')" />
          </n-tab-pane>
        </n-tabs>
      </n-spin>

      <template #footer>
        <n-space justify="end">
          <n-button :disabled="isLoading" @click="handleClose">
            {{ t('common.cancel') }}
          </n-button>
          <n-button type="primary" :loading="isLoading" @click="handleSave">
            {{ t('common.save') }}
          </n-button>
        </n-space>
      </template>
    </n-drawer-content>
  </n-drawer>
</template>

<style scoped lang="scss">
:deep(.api-path) {
  font-family: var(--font-mono, monospace);
  font-size: var(--text-xs);
  color: var(--color-primary);
}

.hint-text {
  margin-top: var(--spacing-2);
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}
</style>
