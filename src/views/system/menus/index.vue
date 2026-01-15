<script setup lang="ts">
/**
 * 菜单权限页
 * Menu Permissions Page
 * Requirements: 17.1-17.5 - 菜单管理
 */
import { ref, computed, h } from 'vue'
import { useI18n } from 'vue-i18n'
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { NCard, NSpace, NButton, NIcon, NText, useMessage, useDialog } from 'naive-ui'
import type { DataTableColumns } from 'naive-ui'
import { getMenus, createMenu, updateMenu, deleteMenu } from '@/api/rbac'
import type { Menu, CreateMenuParams, UpdateMenuParams } from '@/api/types'
import { DataTable, TableActions } from '@/components/table'
import { SvgIcon } from '@/components/common'
import MenuFormModal from './components/MenuFormModal.vue'

const { t, locale } = useI18n()
const message = useMessage()
const dialog = useDialog()
const queryClient = useQueryClient()

/** 表单弹窗状态 */
const formModalVisible = ref(false)
const editingMenu = ref<Menu | null>(null)
const parentMenu = ref<Menu | null>(null)

/** 获取菜单列表 */
const {
  data: menuList,
  isLoading,
  refetch,
} = useQuery({
  queryKey: ['menuList'],
  queryFn: getMenus,
  staleTime: 30 * 1000,
})

/** 创建菜单 mutation */
const createMutation = useMutation({
  mutationFn: createMenu,
  onSuccess: () => {
    message.success(t('rbac.menu.createSuccess'))
    formModalVisible.value = false
    editingMenu.value = null
    parentMenu.value = null
    void queryClient.invalidateQueries({ queryKey: ['menuList'] })
  },
  onError: (error: Error) => {
    message.error(error.message || t('common.tips.operationFailed'))
  },
})

/** 更新菜单 mutation */
const updateMutation = useMutation({
  mutationFn: updateMenu,
  onSuccess: () => {
    message.success(t('rbac.menu.updateSuccess'))
    formModalVisible.value = false
    editingMenu.value = null
    parentMenu.value = null
    void queryClient.invalidateQueries({ queryKey: ['menuList'] })
  },
  onError: (error: Error) => {
    message.error(error.message || t('common.tips.operationFailed'))
  },
})

/** 删除菜单 mutation */
const deleteMutation = useMutation({
  mutationFn: deleteMenu,
  onSuccess: () => {
    message.success(t('rbac.menu.deleteSuccess'))
    void queryClient.invalidateQueries({ queryKey: ['menuList'] })
  },
  onError: (error: Error) => {
    message.error(error.message || t('common.tips.operationFailed'))
  },
})

/** 树形菜单数据 */
const treeMenus = computed(() => {
  return (menuList.value ?? []) as unknown as Record<string, unknown>[]
})

/** 获取菜单标题（根据当前语言） */
function getMenuTitle(menu: Menu): string {
  if (locale.value === 'en-US' && menu.titleEn) return menu.titleEn
  if (locale.value === 'ja-JP' && menu.titleJa) return menu.titleJa
  return menu.title
}

/** 表格列配置 */
const columns = computed<DataTableColumns<Record<string, unknown>>>(() => [
  {
    title: t('rbac.menu.name'),
    key: 'title',
    minWidth: 320,
    render: (row) => {
      const menu = row as unknown as Menu
      const hasSvgIcon = menu.icon && menu.icon.trim().startsWith('<svg')
      return h(NSpace, { align: 'center', size: 8, wrap: false }, () => [
        hasSvgIcon ? h(SvgIcon, { svg: menu.icon, size: 16 }) : null,
        h('span', {}, getMenuTitle(menu)),
      ])
    },
  },
  {
    title: 'ID',
    key: 'id',
    width: 80,
    align: 'center',
  },
  {
    title: t('rbac.menu.icon'),
    key: 'icon',
    width: 100,
    align: 'center',
    render: (row) => {
      const icon = row.icon as string
      if (!icon) return h(NText, { depth: 3 }, () => '-')
      // 如果是 SVG 字符串，渲染图标
      if (icon.trim().startsWith('<svg')) {
        return h(SvgIcon, { svg: icon, size: 20 })
      }
      return h(NText, { depth: 3 }, () => '-')
    },
  },
  {
    title: t('rbac.menu.sortOrder'),
    key: 'sortOrder',
    width: 100,
    align: 'center',
  },
  {
    title: t('common.table.operation'),
    key: 'actions',
    width: 250,
    fixed: 'right',
    render: (row) =>
      h(TableActions, {
        actions: [
          { key: 'addChild', label: t('rbac.menu.addChild') },
          { key: 'edit', label: t('common.edit') },
          { key: 'delete', label: t('common.delete'), type: 'error' },
        ],
        onAction: (key: string) => handleAction(key, row as unknown as Menu),
      }),
  },
])

/** 处理创建 */
function handleCreate(): void {
  editingMenu.value = null
  parentMenu.value = null
  formModalVisible.value = true
}

/** 处理操作 */
function handleAction(key: string, row: Menu): void {
  if (key === 'edit') {
    editingMenu.value = row
    parentMenu.value = null
    formModalVisible.value = true
  } else if (key === 'addChild') {
    editingMenu.value = null
    parentMenu.value = row
    formModalVisible.value = true
  } else if (key === 'delete') {
    confirmDelete(row)
  }
}

/** 确认删除 */
function confirmDelete(menu: Menu): void {
  if (menu.children && menu.children.length > 0) {
    message.warning(t('rbac.menu.hasChildren'))
    return
  }

  dialog.warning({
    title: t('rbac.menu.delete'),
    content: t('rbac.menu.confirmDelete'),
    positiveText: t('common.confirm'),
    negativeText: t('common.cancel'),
    onPositiveClick: () => {
      deleteMutation.mutate(menu.id)
    },
  })
}

/** 处理表单提交 */
function handleFormSubmit(data: CreateMenuParams | UpdateMenuParams): void {
  if (editingMenu.value) {
    // 更新
    updateMutation.mutate({
      id: editingMenu.value.id,
      ...data,
    } as UpdateMenuParams)
  } else {
    // 创建
    const params: CreateMenuParams = { ...data } as CreateMenuParams
    if (parentMenu.value) {
      params.parentId = parentMenu.value.id
    }
    createMutation.mutate(params)
  }
}

/** 处理刷新 */
function handleRefresh(): void {
  void refetch()
}
</script>

<template>
  <div class="page-list">
    <!-- 数据表格 -->
    <n-card :bordered="false" class="page-list__table">
      <template #header>
        <n-space justify="space-between" align="center">
          <span class="page-list__title">{{ t('rbac.menu.title') }}</span>
          <n-space :size="8">
            <n-button type="primary" size="small" @click="handleCreate">
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
              {{ t('rbac.menu.create') }}
            </n-button>
            <n-button size="small" secondary @click="handleRefresh">
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
                    <path
                      d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"
                    />
                  </svg>
                </n-icon>
              </template>
              {{ t('common.refresh') }}
            </n-button>
          </n-space>
        </n-space>
      </template>

      <data-table
        :columns="columns"
        :data="treeMenus"
        :loading="isLoading || deleteMutation.isPending.value"
        :selectable="false"
        :pagination="false"
        :default-expand-all="true"
        :indent="60"
        row-key="id"
        children-key="children"
        class="menu-tree-table"
      />
    </n-card>

    <!-- 菜单表单弹窗 -->
    <menu-form-modal
      v-model:visible="formModalVisible"
      :menu="editingMenu"
      :parent-menu="parentMenu"
      :menus="(menuList ?? []) as Menu[]"
      :loading="createMutation.isPending.value || updateMutation.isPending.value"
      @submit="handleFormSubmit"
    />
  </div>
</template>

<style scoped lang="scss">
.menu-list-page {
  // 已迁移到全局 page-list 样式
}

// 菜单树表格专属样式（缩进、层级与交互一致性）
.menu-tree-table {
  :deep(.n-data-table) {
    // 关闭通用 table 里的“子级竖线”实现（只在菜单树里用更精致的缩进线）
    .n-data-table-tr[data-level]:not([data-level='0']) {
      .n-data-table-td:first-child::before {
        content: none;
      }
    }

    // 树形控件在第一列展示，保持左对齐以凸显层级关系
    .n-data-table-td:first-child {
      text-align: left;
    }

    // 关键修复：让 td 内部所有元素在同一行排列
    // 问题：indent 和 expand-placeholder 是 inline-block，但后面的 n-space 是 flex 会换行
    // 解决：让 td 本身使用 flex 布局
    .n-data-table-td:first-child {
      display: flex !important;
      align-items: center;
    }

    // 缩进：每级展示一条细竖线，辅助辨识层级（Naive 会按 level repeat 该元素）
    // 关键修复：必须设置 width 与 DataTable 的 :indent="60" 保持一致
    // 同时必须设置 height 避免 inline-block 元素高度塌陷
    .n-data-table-indent {
      display: inline-block;
      width: 60px;
      height: 1em; // 关键：给一个高度，避免 inline-block 塌陷
      vertical-align: middle;
      flex-shrink: 0;
      position: relative;

      &::before {
        content: '';
        position: absolute;
        left: 30px; // 宽度的一半，让竖线居中
        top: 0;
        bottom: 0;
        width: 1px;
        transform: translateX(-0.5px);
        background: var(--color-border);
      }

      &:last-of-type::after {
        content: '';
        position: absolute;
        left: 30px;
        right: 0;
        top: 50%;
        height: 1px;
        background: var(--color-border);
      }
    }

    // 展开/叶子占位：统一尺寸与间距，避免层级“跳动”
    .n-data-table-expand-trigger,
    .n-data-table-expand-placeholder {
      width: var(--spacing-6);
      height: var(--spacing-6);
      margin-right: var(--spacing-2);
      vertical-align: middle;
      flex-shrink: 0;
    }

    .n-data-table-expand-trigger {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: var(--radius-sm);
      border: 1px solid var(--color-border);
      background: color-mix(in srgb, var(--color-surface) 92%, transparent);
      color: var(--color-text-muted);
      transition:
        background var(--duration-fast) var(--easing-ease-out),
        border-color var(--duration-fast) var(--easing-ease-out),
        color var(--duration-fast) var(--easing-ease-out),
        transform var(--duration-fast) var(--easing-ease-out);

      &:hover {
        background: color-mix(in srgb, var(--color-primary) 8%, var(--color-surface));
        border-color: color-mix(in srgb, var(--color-primary) 35%, var(--color-border));
        color: var(--color-primary);
        transform: translateY(-1px);
      }

      &--expanded {
        background: color-mix(in srgb, var(--color-primary) 12%, var(--color-surface));
        border-color: color-mix(in srgb, var(--color-primary) 45%, var(--color-border));
        color: var(--color-primary);
      }
    }

    .n-data-table-expand-placeholder {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      position: relative;

      &::before {
        content: '';
        width: 6px;
        height: 6px;
        border-radius: 999px;
        background: color-mix(in srgb, var(--color-text-muted) 55%, var(--color-border));
        z-index: 1;
      }

      &::after {
        content: '';
        position: absolute;
        left: 0;
        width: 50%;
        top: 50%;
        height: 1px;
        background: var(--color-border);
      }
    }

    // 层级文字：一级更强调，子级略弱化（hover 恢复）
    .n-data-table-tr[data-level='0'] {
      .n-data-table-td:first-child {
        font-weight: 600;
        color: var(--color-text);
      }
    }

    .n-data-table-tr[data-level]:not([data-level='0']) {
      .n-data-table-td:first-child {
        color: var(--color-text-secondary);
      }

      &:hover .n-data-table-td:first-child {
        color: var(--color-text);
      }
    }
  }
}
</style>
