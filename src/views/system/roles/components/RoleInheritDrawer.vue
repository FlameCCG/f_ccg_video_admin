<script setup lang="ts">
/**
 * 角色继承管理抽屉
 * - 禁止选择已直接/间接继承的角色
 * - 列表展示直接继承（可解绑）与间接继承（不可解绑，提示顶层父角色）
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
  NTooltip,
  useMessage,
  useDialog,
} from 'naive-ui'
import type { SelectOption } from 'naive-ui'
import { getRoleInherits, inheritRole, removeRoleInherit, getRoles } from '@/api/rbac'
import type { Role, RoleInheritsDetail } from '@/api/types'
import RoleInheritTreeModal from './RoleInheritTreeModal.vue'

interface Props {
  visible: boolean
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

const selectedParentRoleId = ref<number | null>(null)
const treeModalVisible = ref(false)

const emptyInherits = (): RoleInheritsDetail => ({ direct: [], indirect: [] })

const { data: allRoles } = useQuery({
  queryKey: ['roleList'],
  queryFn: getRoles,
  staleTime: 30 * 1000,
})

const {
  data: inheritsDetail,
  isLoading,
  refetch,
} = useQuery({
  queryKey: ['roleInherits', () => props.role?.id],
  queryFn: () => {
    if (!props.role) return Promise.resolve(emptyInherits())
    return getRoleInherits({ roleId: props.role.id })
  },
  enabled: () => !!props.role && props.visible,
  staleTime: 30 * 1000,
})

const directParents = computed(() => inheritsDetail.value?.direct ?? [])
const indirectParents = computed(() => inheritsDetail.value?.indirect ?? [])

const addInheritMutation = useMutation({
  mutationFn: inheritRole,
  onSuccess: () => {
    message.success(t('rbac.role.inheritSuccess'))
    selectedParentRoleId.value = null
    void queryClient.invalidateQueries({ queryKey: ['roleInherits'] })
    void queryClient.invalidateQueries({ queryKey: ['roleInheritTree'] })
  },
  // 业务错误由 request 拦截器弹出
})

const removeInheritMutation = useMutation({
  mutationFn: removeRoleInherit,
  onSuccess: () => {
    message.success(t('rbac.role.removeInheritSuccess'))
    void queryClient.invalidateQueries({ queryKey: ['roleInherits'] })
    void queryClient.invalidateQueries({ queryKey: ['roleInheritTree'] })
  },
})

/** 可选父角色：排除自己、已直接/间接继承的角色 */
const availableParentRoles = computed<SelectOption[]>(() => {
  if (!allRoles.value || !props.role) return []
  const blocked = new Set<string>([
    ...directParents.value,
    ...indirectParents.value.map((i) => i.name),
  ])
  return allRoles.value
    .filter((r) => r.id !== props.role!.id && !blocked.has(r.name))
    .map((r) => ({
      value: r.id,
      label: r.name,
    }))
})

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

function handleClose(): void {
  emit('update:visible', false)
}

function handleViewTree(): void {
  treeModalVisible.value = true
}

function handleAddInherit(): void {
  if (!props.role || !selectedParentRoleId.value) return
  addInheritMutation.mutate({
    roleId: props.role.id,
    parentRoleId: selectedParentRoleId.value,
  })
}

function handleRemoveInherit(parentRoleName: string): void {
  if (!props.role) return

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
  <n-drawer :show="visible" :width="440" placement="right" @update:show="handleClose">
    <n-drawer-content closable>
      <template #header>
        <div class="drawer-header-with-extra">
          <span>{{ t('rbac.role.inherit') }}</span>
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
        </div>
      </template>

      <template v-if="role">
        <n-space vertical :size="16">
          <div class="role-inherit-drawer__current">
            <span class="role-inherit-drawer__label">{{ t('rbac.role.name') }}:</span>
            <n-tag type="info">{{ role.name }}</n-tag>
          </div>

          <div class="role-inherit-drawer__add">
            <span class="role-inherit-drawer__label">{{ t('rbac.role.addInherit') }}:</span>
            <n-space :size="8">
              <n-select
                v-model:value="selectedParentRoleId"
                :options="availableParentRoles"
                :placeholder="t('rbac.role.selectParentRole')"
                style="width: 220px"
                clearable
                filterable
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
            <div class="role-inherit-drawer__hint">
              {{ t('rbac.role.inheritBlockedHint') }}
            </div>
          </div>

          <div class="role-inherit-drawer__list">
            <span class="role-inherit-drawer__label">{{ t('rbac.role.inheritFrom') }}:</span>
            <n-spin :show="isLoading">
              <template
                v-if="
                  (directParents && directParents.length > 0) ||
                  (indirectParents && indirectParents.length > 0)
                "
              >
                <!-- 直接继承 -->
                <div v-if="directParents.length > 0" class="role-inherit-drawer__section">
                  <n-tag size="small" type="success" :bordered="false">
                    {{ t('rbac.role.inheritDirect') }}
                  </n-tag>
                  <n-list bordered>
                    <n-list-item v-for="parentName in directParents" :key="`d-${parentName}`">
                      <n-thing :title="parentName">
                        <template #action>
                          <n-button
                            size="small"
                            type="error"
                            text
                            :loading="removeInheritMutation.isPending.value"
                            @click="handleRemoveInherit(parentName)"
                          >
                            {{ t('rbac.permission.removeInherit') }}
                          </n-button>
                        </template>
                      </n-thing>
                    </n-list-item>
                  </n-list>
                </div>

                <!-- 间接继承 -->
                <div v-if="indirectParents.length > 0" class="role-inherit-drawer__section">
                  <n-tag size="small" type="warning" :bordered="false">
                    {{ t('rbac.role.inheritIndirect') }}
                  </n-tag>
                  <n-list bordered>
                    <n-list-item v-for="item in indirectParents" :key="`i-${item.name}`">
                      <n-thing :title="item.name">
                        <template #description>
                          <span class="role-inherit-drawer__via">
                            {{ t('rbac.role.inheritVia', { role: item.via || '-' }) }}
                          </span>
                        </template>
                        <template #action>
                          <n-tooltip>
                            <template #trigger>
                              <n-button size="small" type="warning" text disabled>
                                {{ t('rbac.permission.removeInherit') }}
                              </n-button>
                            </template>
                            {{
                              t('rbac.role.unlinkIndirectTip', {
                                role: item.via || '-',
                              })
                            }}
                          </n-tooltip>
                        </template>
                      </n-thing>
                    </n-list-item>
                  </n-list>
                </div>
              </template>
              <n-empty v-else :description="t('rbac.role.noInherit')" />
            </n-spin>
          </div>
        </n-space>
      </template>
    </n-drawer-content>
  </n-drawer>

  <role-inherit-tree-modal
    v-model:visible="treeModalVisible"
    :highlight-role-id="role?.id ?? null"
  />
</template>

<style scoped lang="scss">
.drawer-header-with-extra {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  gap: var(--spacing-3);
}

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

  &__hint {
    font-size: var(--text-xs);
    color: var(--color-text-tertiary);
  }

  &__section {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2);
    margin-bottom: var(--spacing-3);
  }

  &__via {
    font-size: var(--text-xs);
    color: var(--color-text-tertiary);
  }
}
</style>
