<script setup lang="ts">
/**
 * 角色继承树弹窗
 * Role Inheritance Tree Modal
 * Requirements: 16.2 - 角色继承管理
 *
 * 统一走系统继承树接口 GET /admin/rbac/role/inherit/tree，
 * 通过 highlightRoleId 高亮指定角色（可选 roleId query 由 getRoleInheritTreeById 使用）。
 */
import { computed, defineAsyncComponent, h } from 'vue'
import { useI18n } from 'vue-i18n'
import { useQuery } from '@tanstack/vue-query'
import { NModal, NButton, NIcon, NSpin } from 'naive-ui'
import type { FunctionalComponent } from 'vue'
import { getRoleInheritTree } from '@/api/rbac'

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

/** 异步组件占位延迟（ms）：网络足够快时不闪一下骨架 */
const ASYNC_LOADING_DELAY_MS = 150

/** 继承树 chunk 加载中的占位 */
const RoleInheritTreeLoading: FunctionalComponent = () =>
  h('div', { class: 'role-inherit-tree-loading' }, [
    h(NSpin, { size: 'small' }),
    h('span', { class: 'role-inherit-tree-loading__text' }, t('common.loading')),
  ])

/**
 * 角色继承树（内部依赖 @vue-flow，约 359KB）。
 * 这里必须异步加载：本弹窗从角色列表页静态引入，若同步 import 会把整个图库
 * 打进角色管理页的 chunk —— 而继承树只在用户主动点开时才需要。
 *
 * 下面的 disable 说明：typescript-eslint 的 program 不解析 .vue 模块，
 * 动态 import 在它眼里是 any；vue-tsc 能拿到真实 SFC 类型，
 * 模板上的 props 依旧受 strictTemplates 校验，所以这里不是真的丢类型。
 */
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const RoleInheritTree = defineAsyncComponent({
  loader: () => import('@/components/rbac/RoleInheritTree.vue'),
  loadingComponent: RoleInheritTreeLoading,
  delay: ASYNC_LOADING_DELAY_MS,
})

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
  // 包装为无参 queryFn，避免与 API 可选 roleId 参数签名冲突
  queryFn: () => getRoleInheritTree(),
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
      <!-- 弹窗关闭时不挂载，@vue-flow chunk 才不会被提前拉取 -->
      <role-inherit-tree
        v-if="visible"
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

// 继承树 chunk 加载占位（由渲染函数产出，故需穿透 scoped）
:deep(.role-inherit-tree-loading) {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-3);
  padding: var(--spacing-16) 0;
}

:deep(.role-inherit-tree-loading__text) {
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}
</style>
