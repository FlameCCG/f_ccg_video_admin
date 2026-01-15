<script setup lang="ts">
/**
 * 用户角色管理抽屉
 * User Role Management Drawer
 * Requirements: 18.9 - 用户角色管理
 */
import { ref, computed, watch } from 'vue'
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
  useMessage,
} from 'naive-ui'
import { getRoles, getUserRoles, updateUserRoles } from '@/api/rbac'
import type { AdminUserListItem } from '@/api/types'

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
</script>

<template>
  <n-drawer :show="visible" :width="500" placement="right" @update:show="handleClose">
    <n-drawer-content :title="t('rbac.userRole.title')" :native-scrollbar="false" closable>
      <n-spin :show="isLoading">
        <!-- 用户信息 -->
        <n-alert v-if="user" type="info" :show-icon="false" style="margin-bottom: 16px">
          {{ t('rbac.userRole.currentUser') }}: {{ user.username }}
          <template v-if="selectedRoleIds.length > 0">
            &nbsp;|&nbsp;{{ t('rbac.userRole.selectedCount') }}: {{ selectedRoleIds.length }}
          </template>
        </n-alert>

        <!-- 角色穿梭框 -->
        <n-transfer
          v-model:value="selectedRoleIds"
          :options="transferOptions"
          :source-title="t('rbac.userRole.availableRoles')"
          :target-title="t('rbac.userRole.assignedRoles')"
          source-filterable
          target-filterable
          style="height: 400px"
          @update:value="handleTransferChange"
        />
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
.transfer-source-list {
  padding: var(--spacing-2);
}

.transfer-item {
  padding: var(--spacing-2) var(--spacing-3);
  cursor: pointer;
  border-radius: var(--radius-sm);
  transition: background-color var(--motion-fast);

  &:hover {
    background-color: var(--color-surface-hover);
  }
}
</style>
