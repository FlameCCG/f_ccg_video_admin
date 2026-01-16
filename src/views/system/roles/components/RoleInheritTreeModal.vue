<script setup lang="ts">
/**
 * 角色继承树弹窗
 * Role Inheritance Tree Modal
 * Requirements: 16.2 - 角色继承管理
 */
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useQuery } from '@tanstack/vue-query'
import { NModal, NButton, NIcon } from 'naive-ui'
import { getRoleInheritTree, getRoleInheritTreeById } from '@/api/rbac'
import { RoleInheritTree } from '@/components/rbac'

interface Props {
  /** 是否显示 */
  visible: boolean
  /** 高亮的角色 ID */
  highlightRoleId?: number | null
  /** 指定角色 ID（如果提供，则只显示该角色的继承树分支） */
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

/** 是否为指定角色模式 */
const isSpecificRole = computed(() => props.roleId !== null && props.roleId !== undefined)

/** 获取角色继承树（系统整体） */
const {
  data: systemTreeData,
  isLoading: systemLoading,
  refetch: refetchSystem,
} = useQuery({
  queryKey: ['roleInheritTree'],
  queryFn: getRoleInheritTree,
  staleTime: 30 * 1000,
  enabled: computed(() => props.visible && !isSpecificRole.value),
})

/** 获取指定角色继承树 */
const {
  data: specificTreeData,
  isLoading: specificLoading,
  refetch: refetchSpecific,
} = useQuery({
  queryKey: ['roleInheritTreeById', computed(() => props.roleId)],
  queryFn: () => getRoleInheritTreeById(props.roleId!),
  staleTime: 30 * 1000,
  enabled: computed(() => props.visible && isSpecificRole.value && !!props.roleId),
})

/** 当前显示的树数据 */
const treeData = computed(() => {
  if (isSpecificRole.value) {
    return specificTreeData.value ?? []
  }
  return systemTreeData.value ?? []
})

/** 加载状态 */
const isLoading = computed(() => {
  if (isSpecificRole.value) {
    return specificLoading.value
  }
  return systemLoading.value
})

/** 弹窗标题 */
const modalTitle = computed(() => {
  if (isSpecificRole.value) {
    return t('rbac.role.inheritTree.view')
  }
  return t('rbac.role.inheritTree.title')
})

/** 处理关闭 */
function handleClose(): void {
  emit('update:visible', false)
}

/** 处理刷新 */
function handleRefresh(): void {
  if (isSpecificRole.value) {
    void refetchSpecific()
  } else {
    void refetchSystem()
  }
}
</script>

<template>
  <n-modal
    :show="visible"
    preset="card"
    :title="modalTitle"
    :style="{ width: '800px', maxWidth: '90vw' }"
    :mask-closable="true"
    :close-on-esc="true"
    @update:show="handleClose"
  >
    <template #header-extra>
      <n-button size="small" quaternary circle @click="handleRefresh">
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
        :highlight-role-id="props.highlightRoleId"
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
