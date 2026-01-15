<script setup lang="ts">
/**
 * 角色菜单分配抽屉
 * Role Menu Assignment Drawer
 * Requirements: 18.5 - 角色菜单分配
 */
import { ref, computed, watch, h } from 'vue'
import { useI18n } from 'vue-i18n'
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import {
  NDrawer,
  NDrawerContent,
  NSpace,
  NButton,
  NTree,
  NSpin,
  NEmpty,
  NAlert,
  useMessage,
} from 'naive-ui'
import type { TreeOption } from 'naive-ui'
import { getMenus, getRoleMenus, assignMenu, removeMenu } from '@/api/rbac'
import type { Role, Menu } from '@/api/types'
import { SvgIcon } from '@/components/common'

interface Props {
  /** 是否显示 */
  visible: boolean
  /** 角色 */
  role?: Role | null
}

const props = withDefaults(defineProps<Props>(), {
  role: null,
})

const emit = defineEmits<{
  'update:visible': [value: boolean]
}>()

const { t, locale } = useI18n()
const message = useMessage()
const queryClient = useQueryClient()

/** 选中的菜单 ID */
const checkedKeys = ref<number[]>([])

/** 展开的节点 */
const expandedKeys = ref<number[]>([])

/** 获取所有菜单 */
const { data: allMenus, isLoading: menusLoading } = useQuery({
  queryKey: ['allMenus'],
  queryFn: getMenus,
  staleTime: 60 * 1000,
})

/** 获取角色已分配的菜单 */
const {
  data: roleMenus,
  isLoading: roleMenusLoading,
  refetch: refetchRoleMenus,
} = useQuery({
  queryKey: ['roleMenus', computed(() => props.role?.id)],
  queryFn: () => (props.role ? getRoleMenus({ roleId: props.role.id }) : Promise.resolve([])),
  enabled: computed(() => !!props.role && props.visible),
  staleTime: 30 * 1000,
})

/** 分配菜单 mutation */
const assignMutation = useMutation({
  mutationFn: assignMenu,
  onSuccess: () => {
    message.success(t('rbac.menu.assignSuccess'))
    void queryClient.invalidateQueries({ queryKey: ['roleMenus'] })
  },
  onError: (error: Error) => {
    message.error(error.message || t('common.tips.operationFailed'))
  },
})

/** 移除菜单 mutation */
const removeMutation = useMutation({
  mutationFn: removeMenu,
  onSuccess: () => {
    message.success(t('rbac.menu.removeSuccess'))
    void queryClient.invalidateQueries({ queryKey: ['roleMenus'] })
  },
  onError: (error: Error) => {
    message.error(error.message || t('common.tips.operationFailed'))
  },
})

/** 加载状态 */
const isLoading = computed(
  () =>
    menusLoading.value ||
    roleMenusLoading.value ||
    assignMutation.isPending.value ||
    removeMutation.isPending.value
)

/** 获取菜单标题（根据当前语言） */
function getMenuTitle(menu: Menu): string {
  if (locale.value === 'en-US' && menu.titleEn) return menu.titleEn
  if (locale.value === 'ja-JP' && menu.titleJa) return menu.titleJa
  return menu.title
}

/** 将菜单转换为树选项 */
function convertToTreeOptions(menus: Menu[]): TreeOption[] {
  return menus.map((menu) => {
    // 仅支持后端返回的 SVG 字符串渲染图标
    const svgIcon = menu.icon?.trim().startsWith('<svg') ? menu.icon : null
    return {
      key: menu.id,
      label: getMenuTitle(menu),
      prefix: svgIcon ? () => h(SvgIcon, { svg: svgIcon, size: 16 }) : undefined,
      children: menu.children ? convertToTreeOptions(menu.children) : undefined,
    }
  })
}

/** 树选项 */
const treeOptions = computed(() => convertToTreeOptions(allMenus.value ?? []))

/** 获取所有菜单 ID */
function getAllMenuIds(menus: Menu[]): number[] {
  const ids: number[] = []
  function traverse(items: Menu[]): void {
    for (const item of items) {
      ids.push(item.id)
      if (item.children) {
        traverse(item.children)
      }
    }
  }
  traverse(menus)
  return ids
}

/** 获取角色已分配的菜单 ID */
function getRoleMenuIds(menus: Menu[]): number[] {
  const ids: number[] = []
  function traverse(items: Menu[]): void {
    for (const item of items) {
      ids.push(item.id)
      if (item.children) {
        traverse(item.children)
      }
    }
  }
  traverse(menus)
  return ids
}

/** 监听角色菜单变化，初始化选中状态 */
watch(
  () => roleMenus.value,
  (menus) => {
    if (menus) {
      checkedKeys.value = getRoleMenuIds(menus)
    }
  },
  { immediate: true }
)

/** 监听 visible 变化 */
watch(
  () => props.visible,
  (visible) => {
    if (visible && props.role) {
      void refetchRoleMenus()
      // 默认展开全部
      if (allMenus.value) {
        expandedKeys.value = getAllMenuIds(allMenus.value)
      }
    }
  }
)

/** 处理关闭 */
function handleClose(): void {
  emit('update:visible', false)
}

/** 处理保存 */
function handleSave(): void {
  if (!props.role) return

  const roleId = props.role.id
  const currentMenuIds = getRoleMenuIds(roleMenus.value ?? [])
  const newMenuIds = checkedKeys.value

  // 计算需要添加和移除的菜单
  const toAdd = newMenuIds.filter((id) => !currentMenuIds.includes(id))
  const toRemove = currentMenuIds.filter((id) => !newMenuIds.includes(id))

  // 执行操作
  const promises: Promise<unknown>[] = []

  if (toAdd.length > 0) {
    promises.push(assignMutation.mutateAsync({ roleId, menuIds: toAdd }))
  }

  if (toRemove.length > 0) {
    promises.push(removeMutation.mutateAsync({ roleId, menuIds: toRemove }))
  }

  if (promises.length === 0) {
    message.info(t('common.tips.noChanges'))
    return
  }

  void Promise.all(promises).then(() => {
    handleClose()
  })
}

/** 全选 */
function handleSelectAll(): void {
  if (allMenus.value) {
    checkedKeys.value = getAllMenuIds(allMenus.value)
  }
}

/** 取消全选 */
function handleDeselectAll(): void {
  checkedKeys.value = []
}
</script>

<template>
  <n-drawer :show="visible" :width="480" placement="right" @update:show="handleClose">
    <n-drawer-content :title="t('rbac.menu.assignMenus')" :native-scrollbar="false" closable>
      <template #default>
        <n-spin :show="isLoading">
          <!-- 工具栏 -->
          <n-space :size="8" style="margin-bottom: 16px">
            <n-button size="tiny" quaternary @click="handleSelectAll">
              {{ t('common.selectAll') }}
            </n-button>
            <n-button size="tiny" quaternary @click="handleDeselectAll">
              {{ t('common.deselectAll') }}
            </n-button>
          </n-space>

          <!-- 角色信息 -->
          <n-alert v-if="role" type="info" :show-icon="false" style="margin-bottom: 16px">
            {{ t('rbac.role.name') }}: {{ role.name }}
          </n-alert>

          <!-- 菜单树 -->
          <n-tree
            v-if="treeOptions.length > 0"
            v-model:checked-keys="checkedKeys"
            v-model:expanded-keys="expandedKeys"
            :data="treeOptions"
            checkable
            cascade
            :block-line="true"
            key-field="key"
            label-field="label"
            children-field="children"
          />

          <!-- 空状态 -->
          <n-empty v-else :description="t('common.noData')" />
        </n-spin>
      </template>

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
