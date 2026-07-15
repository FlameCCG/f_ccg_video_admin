<script setup lang="ts">
/**
 * 角色继承树弹窗
 * Role Inheritance Tree Modal
 * Requirements: 16.2 - 角色继承管理
 *
 * 统一走系统继承树接口 GET /admin/rbac/role/inherit/tree，
 * 通过 highlightRoleId 高亮指定角色（可选 roleId query 由 getRoleInheritTreeById 使用）。
 */
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useQuery } from '@tanstack/vue-query'
import { NModal, NButton, NIcon } from 'naive-ui'
import { getRoleInheritTree } from '@/api/rbac'
import { RoleInheritTree } from '@/components/rbac'

interface Props {
  /** 是否显示 */
  visible: boolean
  /** 高亮的角色 ID */
  highlightRoleId?: number | null
  /**
   * 指定角色 ID（兼容旧调用）
   * 仅用于高亮与标题，不再单独请求 by-id 接口
   */
  roleId?: number | null
}

const props = withDefaults(defineProps<Props>(), {
  highlightRoleId: null,
  roleId: null,
})

const emit = defineEmits<{
  'update:visible': [value: boolean]
}>()

const { t } = useI18n()

const isSpecificRole = computed(() => {
  const id = props.roleId ?? props.highlightRoleId
  return id !== null && id !== undefined
})

const activeHighlightId = computed(() => props.highlightRoleId ?? props.roleId ?? null)

/** 系统整体继承树 */
const {
  data: systemTreeData,
  isLoading,
  isError,
  error,
  refetch,
} = useQuery({
  queryKey: ['roleInheritTree'],
  queryFn: getRoleInheritTree,
  staleTime: 30 * 1000,
  enabled: computed(() => props.visible),
  // 失败时不要静默重试多次刷屏「无权限访问」
  retry: 1,
})

const treeData = computed(() => systemTreeData.value ?? [])

const errorMessage = computed(() => {
  if (!isError.value) return null
  const msg = error.value instanceof Error ? error.value.message : String(error.value ?? '')
  return msg || t('common.tips.operationFailed')
})

const modalTitle = computed(() => {
  if (isSpecificRole.value) {
    return t('rbac.role.inheritTree.view')
  }
  return t('rbac.role.inheritTree.title')
})

function handleShowUpdate(show: boolean): void {
  emit('update:visible', show)
}

function handleRefresh(): void {
  void refetch()
}
</script>

<template>
  <n-modal
    :show="visible"
    preset="card"
    :title="modalTitle"
    :style="{ width: '860px', maxWidth: '92vw' }"
    :mask-closable="true"
    :close-on-esc="true"
    @update:show="handleShowUpdate"
  >
    <template #header-extra>
      <n-button size="small" quaternary circle :loading="isLoading" @click="handleRefresh">
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
      </n-button>
    </template>

    <div class="role-inherit-tree-modal">
      <p class="role-inherit-tree-modal__hint">
        {{ t('rbac.role.inheritTree.hint') }}
      </p>
      <role-inherit-tree
        :data="treeData"
        :loading="isLoading"
        :highlight-role-id="activeHighlightId"
        :error-message="errorMessage"
      />
    </div>
  </n-modal>
</template>

<style scoped lang="scss">
.role-inherit-tree-modal {
  &__hint {
    margin-bottom: var(--spacing-4);
    font-size: var(--text-sm);
    color: var(--color-text-secondary);
  }
}
</style>
