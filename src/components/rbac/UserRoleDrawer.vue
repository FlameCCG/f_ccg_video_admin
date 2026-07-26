<script setup lang="ts">
/**
 * 用户角色管理抽屉
 * User Role Management Drawer
 * Requirements: 18.9 - 用户角色管理
 */
import { ref, computed, watch, h } from 'vue'
import { useI18n } from 'vue-i18n'
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import {
  NDrawer,
  NDrawerContent,
  NSpace,
  NButton,
  NTransfer,
  NSpin,
  NAlert,
  NIcon,
  NTooltip,
  useMessage,
} from 'naive-ui'
import type { TransferRenderSourceLabel } from 'naive-ui'
import { getRoles, getUserRoles, updateUserRoles, getRoleInheritTreeById } from '@/api/rbac'
import type { AdminUserListItem, RoleInheritTreeNode } from '@/api/types'
import { RoleInheritTree } from '@/components/rbac'

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
  success: []
}>()

const { t } = useI18n()
const message = useMessage()
const queryClient = useQueryClient()

/** 选中的角色 ID */
const selectedRoleIds = ref<Array<string | number>>([])

/** 是否显示继承树 */
const showInheritTree = ref(false)

/** 当前查看继承树的角色 ID */
const viewingTreeRoleId = ref<number | null>(null)

/** 当前查看的角色继承树数据 */
const roleTreeData = ref<RoleInheritTreeNode[]>([])

/** 是否正在加载角色继承树 */
const loadingRoleTree = ref(false)

/** 获取所有角色 */
const { data: allRoles, isLoading: rolesLoading } = useQuery({
  queryKey: ['allRoles'],
  queryFn: getRoles,
  staleTime: 60 * 1000,
})

/** 获取用户已分配的角色 */
const {
  data: userRoles,
  isLoading: userRolesLoading,
  refetch: refetchUserRoles,
} = useQuery({
  queryKey: ['userRoles', computed(() => props.user?.id)],
  queryFn: () => (props.user ? getUserRoles(props.user.id) : Promise.resolve([])),
  enabled: computed(() => !!props.user && props.visible),
  staleTime: 30 * 1000,
})

/** 更新用户角色 mutation */
const updateMutation = useMutation({
  mutationFn: updateUserRoles,
  onSuccess: () => {
    message.success(t('rbac.userRole.updateSuccess'))
    void queryClient.invalidateQueries({ queryKey: ['userRoles'] })
    void queryClient.invalidateQueries({ queryKey: ['userList'] })
    emit('success')
    handleClose()
  },
  onError: (error: Error) => {
    message.error(error.message || t('common.tips.operationFailed'))
  },
})

/** 加载状态 */
const isLoading = computed(
  () => rolesLoading.value || userRolesLoading.value || updateMutation.isPending.value
)

/** 穿梭框选项 */
const transferOptions = computed(() => {
  return (allRoles.value ?? []).map((role) => ({
    value: role.id,
    label: role.name,
    disabled: false,
  }))
})

/** 监听用户角色变化，初始化选中状态 */
watch(
  () => userRoles.value,
  (roles) => {
    if (roles) {
      selectedRoleIds.value = roles.map((r) => r.id)
    }
  },
  { immediate: true }
)

/** 监听 visible 变化 */
watch(
  () => props.visible,
  (visible) => {
    if (visible && props.user) {
      void refetchUserRoles()
      // 重置继承树状态
      showInheritTree.value = false
      viewingTreeRoleId.value = null
      roleTreeData.value = []
    }
  }
)

/** 处理关闭 */
function handleClose(): void {
  emit('update:visible', false)
}

/** 处理保存 */
function handleSave(): void {
  if (!props.user) return

  updateMutation.mutate({
    userId: props.user.id,
    roleIds: selectedRoleIds.value.map(Number),
  })
}

/** 处理穿梭框值变化 */
function handleTransferChange(value: Array<string | number>): void {
  selectedRoleIds.value = value
}

/** 查看角色继承树 */
async function handleViewRoleTree(roleId: number): Promise<void> {
  viewingTreeRoleId.value = roleId
  showInheritTree.value = true
  loadingRoleTree.value = true

  try {
    const treeData = await getRoleInheritTreeById(roleId)
    roleTreeData.value = treeData
  } catch {
    message.error(t('common.tips.operationFailed'))
    roleTreeData.value = []
  } finally {
    loadingRoleTree.value = false
  }
}

/** 返回角色列表 */
function handleBackToList(): void {
  showInheritTree.value = false
  viewingTreeRoleId.value = null
  roleTreeData.value = []
}

/** 树形图标 SVG */
const treeIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18"/><path d="M18 9H6"/><path d="M18 15H6"/></svg>`

/** 自定义渲染穿梭框标签 */
const renderLabel: TransferRenderSourceLabel = ({ option }) => {
  const roleId = option.value as number
  return h(
    'div',
    {
      class: 'transfer-label-wrapper',
    },
    [
      h('span', { class: 'transfer-label-text' }, String(option.label)),
      h(
        NTooltip,
        { trigger: 'hover' },
        {
          trigger: () =>
            h(
              NButton,
              {
                size: 'tiny',
                quaternary: true,
                class: 'transfer-label-btn',
                onClick: (e: MouseEvent) => {
                  e.stopPropagation()
                  void handleViewRoleTree(roleId)
                },
              },
              {
                icon: () => h(NIcon, { innerHTML: treeIconSvg }),
              }
            ),
          default: () => t('rbac.role.inheritTree.view'),
        }
      ),
    ]
  )
}
</script>

<template>
  <n-drawer :show="visible" :width="600" placement="right" @update:show="handleClose">
    <n-drawer-content :title="t('rbac.userRole.title')" :native-scrollbar="false" closable>
      <template #header>
        <div class="drawer-header-with-extra">
          <span>{{ t('rbac.userRole.title') }}</span>
          <n-button v-if="showInheritTree" size="small" quaternary @click="handleBackToList">
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
                  <path d="M19 12H5" />
                  <path d="M12 19l-7-7 7-7" />
                </svg>
              </n-icon>
            </template>
            {{ t('common.back') }}
          </n-button>
        </div>
      </template>

      <n-spin :show="isLoading || loadingRoleTree">
        <!-- 用户信息 -->
        <n-alert v-if="user" type="info" :show-icon="false" style="margin-bottom: 16px">
          {{ t('rbac.userRole.currentUser') }}: {{ user.username }}
          <template v-if="selectedRoleIds.length > 0 && !showInheritTree">
            &nbsp;|&nbsp;{{ t('rbac.userRole.selectedCount') }}: {{ selectedRoleIds.length }}
          </template>
        </n-alert>

        <!-- 角色继承树 -->
        <template v-if="showInheritTree">
          <role-inherit-tree
            :data="roleTreeData"
            :loading="loadingRoleTree"
            :highlight-role-id="viewingTreeRoleId"
          />
        </template>

        <!-- 角色穿梭框 -->
        <template v-else>
          <n-transfer
            v-model:value="selectedRoleIds"
            :options="transferOptions"
            :source-title="t('rbac.userRole.availableRoles')"
            :target-title="t('rbac.userRole.assignedRoles')"
            :render-source-label="renderLabel"
            :render-target-label="renderLabel"
            source-filterable
            target-filterable
            style="height: 400px"
            @update:value="handleTransferChange"
          />
        </template>
      </n-spin>

      <template #footer>
        <n-space justify="end">
          <n-button :disabled="isLoading" @click="handleClose">
            {{ t('common.cancel') }}
          </n-button>
          <n-button
            type="primary"
            :loading="isLoading"
            :disabled="showInheritTree"
            @click="handleSave"
          >
            {{ t('common.save') }}
          </n-button>
        </n-space>
      </template>
    </n-drawer-content>
  </n-drawer>
</template>

<style scoped lang="scss">
:deep(.transfer-label-wrapper) {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  gap: var(--spacing-2);
}

:deep(.transfer-label-text) {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

:deep(.transfer-label-btn) {
  flex-shrink: 0;
  opacity: 0.6;
  transition: opacity var(--duration-fast);

  &:hover {
    opacity: 1;
  }
}

.drawer-header-with-extra {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  gap: var(--spacing-3);
}
</style>
