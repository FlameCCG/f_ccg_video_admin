<script setup lang="ts">
/**
 * 用户权限查看抽屉
 * User Permission View Drawer
 * Requirements: 18.10 - 用户权限查看
 */
import { computed, watch, h } from 'vue'
import { useI18n } from 'vue-i18n'
import { useQuery } from '@tanstack/vue-query'
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
  NStatistic,
} from 'naive-ui'
import type { DataTableColumns, SelectOption } from 'naive-ui'
import { getUserPermissions, getUserRoles } from '@/api/rbac'
import type { AdminUserListItem, Permission } from '@/api/types'
import { ref } from 'vue'

interface Props {
  /** 是否显示 */
  visible: boolean
  /** 用户 */
  user?: AdminUserListItem | null
}

const props = withDefaults(defineProps<Props>(), {
  user: null,
})

const emit = defineEmits<{
  'update:visible': [value: boolean]
}>()

const { t } = useI18n()

/** 搜索关键词 */
const searchKeyword = ref('')

/** 选中的方法 */
const selectedMethod = ref<string | null>(null)

/** 获取用户权限 */
const {
  data: userPermissions,
  isLoading: permissionsLoading,
  refetch: refetchPermissions,
} = useQuery({
  queryKey: ['viewUserPermissions', computed(() => props.user?.id)],
  queryFn: () => (props.user ? getUserPermissions({ userId: props.user.id }) : Promise.resolve([])),
  enabled: computed(() => !!props.user && props.visible),
  staleTime: 30 * 1000,
})

/** 获取用户角色 */
const { data: userRoles, isLoading: rolesLoading } = useQuery({
  queryKey: ['viewUserRoles', computed(() => props.user?.id)],
  queryFn: () => (props.user ? getUserRoles(props.user.id) : Promise.resolve([])),
  enabled: computed(() => !!props.user && props.visible),
  staleTime: 30 * 1000,
})

/** 加载状态 */
const isLoading = computed(() => permissionsLoading.value || rolesLoading.value)

/** 方法选项 */
const methodOptions = computed<SelectOption[]>(() => {
  const methods = new Set<string>()
  userPermissions.value?.forEach((p) => methods.add(p.action))
  return Array.from(methods).map((m) => ({ label: m, value: m }))
})

/** 按方法分组的权限 */
const groupedPermissions = computed(() => {
  const permissions = userPermissions.value ?? []
  const groups = new Map<string, Permission[]>()

  permissions.forEach((p) => {
    const method = p.action
    if (!groups.has(method)) {
      groups.set(method, [])
    }
    groups.get(method)!.push(p)
  })

  return groups
})

/** 过滤后的权限 */
const filteredPermissions = computed(() => {
  let list = userPermissions.value ?? []

  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    list = list.filter((p) => p.resource.toLowerCase().includes(keyword))
  }

  if (selectedMethod.value) {
    list = list.filter((p) => p.action === selectedMethod.value)
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
const columns = computed<DataTableColumns<Permission>>(() => [
  {
    title: t('rbac.api.method'),
    key: 'action',
    width: 90,
    render: (row) =>
      h(NTag, { type: getMethodType(row.action), size: 'small', round: true }, () => row.action),
  },
  {
    title: t('rbac.api.path'),
    key: 'resource',
    minWidth: 300,
    ellipsis: { tooltip: true },
    render: (row) => h('code', { class: 'api-path' }, row.resource),
  },
])

/** 监听 visible 变化 */
watch(
  () => props.visible,
  (visible) => {
    if (visible && props.user) {
      void refetchPermissions()
      searchKeyword.value = ''
      selectedMethod.value = null
    }
  }
)

/** 处理关闭 */
function handleClose(): void {
  emit('update:visible', false)
}
</script>

<template>
  <n-drawer :show="visible" :width="680" placement="right" @update:show="handleClose">
    <n-drawer-content :title="t('rbac.userPermission.title')" :native-scrollbar="false" closable>
      <n-spin :show="isLoading">
        <!-- 用户信息 -->
        <n-alert v-if="user" type="info" :show-icon="false" style="margin-bottom: 16px">
          {{ t('rbac.userPermission.currentUser') }}: {{ user.username }}
        </n-alert>

        <!-- 统计信息 -->
        <n-space :size="24" style="margin-bottom: 16px">
          <n-statistic :label="t('rbac.userPermission.roleCount')">
            {{ userRoles?.length ?? 0 }}
          </n-statistic>
          <n-statistic :label="t('rbac.userPermission.permissionCount')">
            {{ userPermissions?.length ?? 0 }}
          </n-statistic>
        </n-space>

        <!-- 角色列表 -->
        <div v-if="userRoles && userRoles.length > 0" style="margin-bottom: 16px">
          <div class="section-title">{{ t('rbac.userPermission.roles') }}</div>
          <n-space :size="8">
            <n-tag v-for="role in userRoles" :key="role.id" type="primary" round>
              {{ role.name }}
            </n-tag>
          </n-space>
        </div>

        <!-- 筛选 -->
        <n-space :size="12" style="margin-bottom: 16px">
          <n-input
            v-model:value="searchKeyword"
            :placeholder="t('rbac.api.searchPlaceholder')"
            clearable
            style="width: 200px"
          />
          <n-select
            v-model:value="selectedMethod"
            :options="methodOptions"
            :placeholder="t('rbac.userPermission.methodPlaceholder')"
            clearable
            style="width: 120px"
          />
        </n-space>

        <!-- 按方法分组的权限表格 -->
        <n-tabs
          v-if="!selectedMethod && !searchKeyword && groupedPermissions.size > 0"
          type="line"
          animated
        >
          <n-tab-pane
            v-for="[method, permissions] in groupedPermissions"
            :key="method"
            :name="method"
          >
            <template #tab>
              <n-space :size="4" align="center">
                <n-tag :type="getMethodType(method)" size="small" round>{{ method }}</n-tag>
                <span>({{ permissions.length }})</span>
              </n-space>
            </template>
            <n-data-table
              :columns="columns"
              :data="permissions"
              :max-height="400"
              size="small"
              bordered
            />
          </n-tab-pane>
        </n-tabs>

        <!-- 筛选后的表格 -->
        <template v-else-if="filteredPermissions.length > 0">
          <n-data-table
            :columns="columns"
            :data="filteredPermissions"
            :max-height="500"
            size="small"
            bordered
          />
        </template>

        <!-- 空状态 -->
        <n-empty v-else :description="t('rbac.userPermission.noPermissions')" />
      </n-spin>

      <template #footer>
        <n-space justify="end">
          <n-button @click="handleClose">
            {{ t('common.close') }}
          </n-button>
        </n-space>
      </template>
    </n-drawer-content>
  </n-drawer>
</template>

<style scoped lang="scss">
.section-title {
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-2);
}

:deep(.api-path) {
  font-family: var(--font-mono, monospace);
  font-size: var(--text-xs);
  color: var(--color-primary);
}
</style>
