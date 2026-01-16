<script setup lang="ts">
/**
 * 角色继承管理抽屉
 * Role Inheritance Management Drawer
 * Requirements: 16.2 - 角色继承管理
 */
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import {
  NDrawer,
  NDrawerContent,
  NSpace,
  NButton,
  NSelect,
  NTag,
  NEmpty,
  NSpin,
  NList,
  NListItem,
  NThing,
  NIcon,
  useMessage,
  useDialog,
} from 'naive-ui'
import type { SelectOption } from 'naive-ui'
import { getRoleInherits, inheritRole, removeRoleInherit, getRoles } from '@/api/rbac'
import type { Role } from '@/api/types'
import RoleInheritTreeModal from './RoleInheritTreeModal.vue'

interface Props {
  /** 是否显示 */
  visible: boolean
  /** 当前角色 */
  role: Role | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
}>()

const { t } = useI18n()
const message = useMessage()
const dialog = useDialog()
const queryClient = useQueryClient()

/** 选择的父角色 ID */
const selectedParentRoleId = ref<number | null>(null)

/** 继承树弹窗状态 */
const treeModalVisible = ref(false)

/** 获取所有角色列表 */
const { data: allRoles } = useQuery({
  queryKey: ['roleList'],
  queryFn: getRoles,
  staleTime: 30 * 1000,
})

/** 获取角色继承列表 */
const {
  data: inheritedRoles,
  isLoading,
  refetch,
} = useQuery({
  queryKey: ['roleInherits', () => props.role?.id],
  queryFn: () => {
    if (!props.role) return Promise.resolve([])
    return getRoleInherits({ roleId: props.role.id })
  },
  enabled: () => !!props.role && props.visible,
  staleTime: 30 * 1000,
})

/** 添加继承 mutation */
const addInheritMutation = useMutation({
  mutationFn: inheritRole,
  onSuccess: () => {
    message.success(t('rbac.role.inheritSuccess'))
    selectedParentRoleId.value = null
    void queryClient.invalidateQueries({ queryKey: ['roleInherits'] })
  },
  onError: (error: Error) => {
    message.error(error.message || t('common.tips.operationFailed'))
  },
})

/** 移除继承 mutation */
const removeInheritMutation = useMutation({
  mutationFn: removeRoleInherit,
  onSuccess: () => {
    message.success(t('rbac.role.removeInheritSuccess'))
    void queryClient.invalidateQueries({ queryKey: ['roleInherits'] })
  },
  onError: (error: Error) => {
    message.error(error.message || t('common.tips.operationFailed'))
  },
})

/** 可选的父角色列表（排除当前角色和已继承的角色） */
const availableParentRoles = computed<SelectOption[]>(() => {
  if (!allRoles.value || !props.role) return []
  const inherited = inheritedRoles.value ?? []
  return allRoles.value
    .filter((r) => r.id !== props.role!.id && !inherited.includes(r.name))
    .map((r) => ({
      value: r.id,
      label: r.name,
    }))
})

/** 监听 visible 变化 */
watch(
  () => props.visible,
  (visible) => {
    if (visible && props.role) {
      void refetch()
    } else {
      selectedParentRoleId.value = null
    }
  }
)

/** 处理关闭 */
function handleClose(): void {
  emit('update:visible', false)
}

/** 处理查看继承树 */
function handleViewTree(): void {
  treeModalVisible.value = true
}

/** 处理添加继承 */
function handleAddInherit(): void {
  if (!props.role || !selectedParentRoleId.value) return
  addInheritMutation.mutate({
    roleId: props.role.id,
    parentRoleId: selectedParentRoleId.value,
  })
}

/** 处理移除继承 */
function handleRemoveInherit(parentRoleName: string): void {
  if (!props.role) return

  // 找到父角色的 ID
  const parentRole = allRoles.value?.find((r) => r.name === parentRoleName)
  if (!parentRole) return

  dialog.warning({
    title: t('rbac.role.removeInherit'),
    content: t('rbac.role.confirmRemoveInherit', { name: parentRoleName }),
    positiveText: t('common.confirm'),
    negativeText: t('common.cancel'),
    onPositiveClick: () => {
      removeInheritMutation.mutate({
        roleId: props.role!.id,
        parentRoleId: parentRole.id,
      })
    },
  })
}
</script>

<template>
  <n-drawer :show="visible" :width="400" placement="right" @update:show="handleClose">
    <n-drawer-content :title="t('rbac.role.inherit')" closable>
      <template #header-extra>
        <n-button size="small" quaternary @click="handleViewTree">
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
                <path d="M12 3v18" />
                <path d="M18 9H6" />
                <path d="M18 15H6" />
              </svg>
            </n-icon>
          </template>
          {{ t('rbac.role.inheritTree.view') }}
        </n-button>
      </template>

      <template v-if="role">
        <n-space vertical :size="16">
          <!-- 当前角色信息 -->
          <div class="role-inherit-drawer__current">
            <span class="role-inherit-drawer__label">{{ t('rbac.role.name') }}:</span>
            <n-tag type="info">{{ role.name }}</n-tag>
          </div>

          <!-- 添加继承 -->
          <div class="role-inherit-drawer__add">
            <span class="role-inherit-drawer__label">{{ t('rbac.role.addInherit') }}:</span>
            <n-space :size="8">
              <n-select
                v-model:value="selectedParentRoleId"
                :options="availableParentRoles"
                :placeholder="t('rbac.role.selectParentRole')"
                style="width: 200px"
                clearable
              />
              <n-button
                type="primary"
                :disabled="!selectedParentRoleId"
                :loading="addInheritMutation.isPending.value"
                @click="handleAddInherit"
              >
                {{ t('common.add') }}
              </n-button>
            </n-space>
          </div>

          <!-- 已继承的角色列表 -->
          <div class="role-inherit-drawer__list">
            <span class="role-inherit-drawer__label">{{ t('rbac.role.inheritFrom') }}:</span>
            <n-spin :show="isLoading">
              <n-list v-if="inheritedRoles && inheritedRoles.length > 0" bordered>
                <n-list-item v-for="parentName in inheritedRoles" :key="parentName">
                  <n-thing :title="parentName">
                    <template #action>
                      <n-button
                        size="small"
                        type="error"
                        text
                        :loading="removeInheritMutation.isPending.value"
                        @click="handleRemoveInherit(parentName)"
                      >
                        {{ t('common.delete') }}
                      </n-button>
                    </template>
                  </n-thing>
                </n-list-item>
              </n-list>
              <n-empty v-else :description="t('rbac.role.noInherit')" />
            </n-spin>
          </div>
        </n-space>
      </template>
    </n-drawer-content>
  </n-drawer>

  <!-- 继承树弹窗 -->
  <role-inherit-tree-modal
    v-model:visible="treeModalVisible"
    :highlight-role-id="role?.id ?? null"
  />
</template>

<style scoped lang="scss">
.role-inherit-drawer {
  &__current,
  &__add,
  &__list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2);
  }

  &__label {
    font-size: var(--text-sm);
    color: var(--color-text-secondary);
    font-weight: 500;
  }
}
</style>
