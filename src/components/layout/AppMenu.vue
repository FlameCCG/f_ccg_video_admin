<script setup lang="ts">
/**
 * 菜单组件
 * 从后端动态获取菜单，递归渲染菜单树
 * 图标完全由后端返回的 SVG 字符串渲染，无兜底逻辑
 * Requirements: 6.1, 6.4
 */
import { computed, h, type VNode } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NMenu, type MenuOption } from 'naive-ui'
import { useI18n } from 'vue-i18n'
import type { Menu } from '@/api/types/rbac'
import type { LocaleType } from '@/locales'
import { usePermissionStore } from '@/stores/permission'
import { SvgIcon } from '@/components/common'

defineProps<{
  /** 是否折叠状态 */
  collapsed?: boolean
}>()

const route = useRoute()
const router = useRouter()
const { locale } = useI18n()
const permissionStore = usePermissionStore()

/** 获取菜单标题（根据当前语言） */
function getMenuTitle(menu: Menu): string {
  const currentLocale = locale.value as LocaleType
  switch (currentLocale) {
    case 'en-US':
      return menu.titleEn || menu.title
    case 'ja-JP':
      return menu.titleJa || menu.title
    default:
      return menu.title
  }
}

/**
 * 渲染图标 - 仅支持后端返回的 SVG 字符串
 * 如果后端返回的不是 SVG 字符串，则不渲染图标
 */
function renderIcon(iconValue: string): (() => VNode) | undefined {
  if (!iconValue) return undefined

  // 检查是否是 SVG 字符串
  const trimmedIcon = iconValue.trim()
  if (trimmedIcon.startsWith('<svg')) {
    return () => h(SvgIcon, { svg: trimmedIcon, size: 18 })
  }

  // 非 SVG 字符串不渲染图标
  return undefined
}

/** 将菜单数据转换为 Naive UI MenuOption */
function convertToMenuOptions(menus: Menu[]): MenuOption[] {
  return menus.map((menu) => {
    const option: MenuOption = {
      key: String(menu.id),
      label: getMenuTitle(menu),
      icon: menu.icon ? renderIcon(menu.icon) : undefined,
    }

    if (menu.children && menu.children.length > 0) {
      option.children = convertToMenuOptions(menu.children)
    }

    return option
  })
}

/** 菜单选项 - 从 permission store 获取后端菜单数据 */
const menuOptions = computed(() => convertToMenuOptions(permissionStore.menus))

/** 根据路由路径查找菜单 ID */
function findMenuIdByPath(menus: Menu[], path: string): string {
  for (const menu of menus) {
    // 检查当前菜单的路径是否匹配
    if (menu.path) {
      // 完整路径匹配
      if (menu.path === path) {
        return String(menu.id)
      }
      // 子路径匹配（如 /overview/dashboard 匹配 dashboard）
      if (path.endsWith('/' + menu.path) || path === '/' + menu.path) {
        return String(menu.id)
      }
    }
    // 递归检查子菜单
    if (menu.children && menu.children.length > 0) {
      const childId = findMenuIdByPath(menu.children, path)
      if (childId) return childId
    }
  }
  return ''
}

/** 根据路由路径查找需要展开的父菜单 ID */
function findExpandedKeys(menus: Menu[], path: string): string[] {
  const keys: string[] = []

  function findParent(items: Menu[], _parentId?: string): boolean {
    for (const menu of items) {
      const currentId = String(menu.id)

      if (menu.children && menu.children.length > 0) {
        // 检查子菜单是否匹配
        for (const child of menu.children) {
          if (child.path) {
            const fullPath = menu.path ? `${menu.path}/${child.path}` : child.path
            if (path === fullPath || path.endsWith('/' + child.path)) {
              keys.push(currentId)
              return true
            }
          }
        }
        // 递归检查更深层级
        if (findParent(menu.children, currentId)) {
          keys.push(currentId)
          return true
        }
      }
    }
    return false
  }

  findParent(menus)
  return keys
}

/** 当前选中的菜单 key */
const activeKey = computed(() => {
  return findMenuIdByPath(permissionStore.menus, route.path)
})

/** 展开的菜单 keys */
const expandedKeys = computed(() => {
  return findExpandedKeys(permissionStore.menus, route.path)
})

/** 根据菜单 ID 查找菜单路径 */
function findMenuPath(menus: Menu[], menuId: string, parentPath = ''): string | null {
  for (const menu of menus) {
    const currentPath = menu.path
      ? parentPath
        ? `${parentPath}/${menu.path}`
        : menu.path
      : parentPath

    if (String(menu.id) === menuId) {
      return currentPath || null
    }

    if (menu.children && menu.children.length > 0) {
      const childPath = findMenuPath(menu.children, menuId, currentPath)
      if (childPath) return childPath
    }
  }
  return null
}

/** 菜单点击处理 */
function handleMenuSelect(key: string): void {
  const targetPath = findMenuPath(permissionStore.menus, key)
  if (targetPath) {
    void router.push(targetPath)
  }
}
</script>

<template>
  <NMenu
    :collapsed="collapsed"
    :collapsed-width="64"
    :collapsed-icon-size="20"
    :options="menuOptions"
    :value="activeKey"
    :default-expanded-keys="expandedKeys"
    :indent="24"
    @update:value="handleMenuSelect"
  />
</template>

<style scoped lang="scss">
:deep(.n-menu) {
  --n-item-height: 44px;
  --n-item-text-color: var(--color-text-secondary);
  --n-item-text-color-hover: var(--color-text);
  --n-item-text-color-active: var(--color-primary);
  --n-item-icon-color: var(--color-text-muted);
  --n-item-icon-color-hover: var(--color-text-secondary);
  --n-item-icon-color-active: var(--color-primary);
  --n-arrow-color: var(--color-text-muted);
  --n-arrow-color-hover: var(--color-text-secondary);
  --n-arrow-color-active: var(--color-primary);

  transition: padding 280ms cubic-bezier(0.4, 0, 0.2, 1);
}

:deep(.n-menu-item) {
  margin: 2px 0;
}

:deep(.n-menu-item-content) {
  position: relative;
  border-radius: var(--radius-lg) !important;
  margin: 0 8px;
  padding: 0 12px !important;
  transition:
    background 200ms cubic-bezier(0.4, 0, 0.2, 1),
    color 200ms cubic-bezier(0.4, 0, 0.2, 1),
    margin 280ms cubic-bezier(0.4, 0, 0.2, 1),
    padding 280ms cubic-bezier(0.4, 0, 0.2, 1);

  // 折叠时调整边距
  .n-menu--collapsed & {
    margin: 0 4px;
    padding: 0 !important;
    justify-content: center;
  }
}

:deep(.n-menu-item-content--selected) {
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--color-primary) 12%, transparent) 0%,
    color-mix(in srgb, var(--color-primary) 8%, transparent) 100%
  ) !important;

  // 左侧指示条
  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 3px;
    height: 20px;
    background: var(--color-primary);
    border-radius: 0 2px 2px 0;
    box-shadow: 0 0 8px color-mix(in srgb, var(--color-primary) 50%, transparent);
  }

  .n-menu--collapsed &::before {
    left: 50%;
    top: auto;
    bottom: 4px;
    transform: translateX(-50%);
    width: 20px;
    height: 3px;
    border-radius: 2px 2px 0 0;
  }
}

:deep(.n-menu-item-content:not(.n-menu-item-content--selected):hover) {
  background: color-mix(in srgb, var(--color-text) 5%, transparent) !important;
}

:deep(.n-menu-item-content:not(.n-menu-item-content--selected):active) {
  background: color-mix(in srgb, var(--color-text) 8%, transparent) !important;
}

// 图标样式
:deep(.n-menu-item-content__icon) {
  transition:
    color 200ms cubic-bezier(0.4, 0, 0.2, 1),
    transform 200ms cubic-bezier(0.4, 0, 0.2, 1);

  .n-menu-item-content:hover & {
    transform: scale(1.08);
  }

  .n-menu-item-content--selected & {
    color: var(--color-primary) !important;
  }
}

// 子菜单样式
:deep(.n-submenu-children) {
  --n-item-height: 40px;

  .n-menu-item-content {
    padding-left: 20px !important;

    &::before {
      left: 8px;
      width: 2px;
      height: 16px;
    }
  }
}

// 展开箭头动画
:deep(.n-base-icon) {
  transition: transform 200ms cubic-bezier(0.4, 0, 0.2, 1) !important;
}

// Reduced motion
@media (prefers-reduced-motion: reduce) {
  :deep(.n-menu),
  :deep(.n-menu-item-content),
  :deep(.n-menu-item-content__icon),
  :deep(.n-base-icon) {
    transition: none !important;
  }
}
</style>
