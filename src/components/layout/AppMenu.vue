<script setup lang="ts">
/**
 * 菜单组件
 * 从后端动态获取菜单，递归渲染菜单树
 * 图标完全由后端返回的 SVG 字符串渲染，无兜底逻辑
 * Requirements: 6.1, 6.4
 */
import { computed, h, ref, watch, type VNode } from 'vue'
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
  /**
   * 折叠态宽度（px）
   * 与侧边栏折叠宽度同源（--layout-sider-collapsed-width）：NMenu 折叠态是按
   * collapsedWidth 反算 padding-left 把图标推到中线的，两个数字不一致就会错位。
   */
  collapsedWidth: number
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
function findMenuIdByPath(menus: Menu[], path: string, parentPath = ''): string {
  for (const menu of menus) {
    // 计算当前菜单的完整路径
    let currentPath: string
    if (menu.path) {
      if (menu.path.startsWith('/')) {
        currentPath = menu.path
      } else {
        currentPath = parentPath ? `${parentPath}/${menu.path}` : `/${menu.path}`
      }
    } else {
      currentPath = parentPath
    }

    // 检查当前菜单的路径是否匹配
    if (currentPath && currentPath === path) {
      return String(menu.id)
    }

    // 递归检查子菜单
    if (menu.children && menu.children.length > 0) {
      const childId = findMenuIdByPath(menu.children, path, currentPath)
      if (childId) return childId
    }
  }
  return ''
}

/** 根据路由路径查找需要展开的父菜单 ID */
function findExpandedKeys(menus: Menu[], path: string): string[] {
  const keys: string[] = []

  function findParent(items: Menu[], parentPath = ''): boolean {
    for (const menu of items) {
      const currentId = String(menu.id)

      // 计算当前菜单的完整路径
      let currentPath: string
      if (menu.path) {
        if (menu.path.startsWith('/')) {
          currentPath = menu.path
        } else {
          currentPath = parentPath ? `${parentPath}/${menu.path}` : `/${menu.path}`
        }
      } else {
        currentPath = parentPath
      }

      if (menu.children && menu.children.length > 0) {
        // 检查子菜单是否匹配
        for (const child of menu.children) {
          let childPath: string
          if (child.path) {
            if (child.path.startsWith('/')) {
              childPath = child.path
            } else {
              childPath = currentPath ? `${currentPath}/${child.path}` : `/${child.path}`
            }
          } else {
            childPath = currentPath
          }

          if (path === childPath) {
            keys.push(currentId)
            return true
          }
        }
        // 递归检查更深层级
        if (findParent(menu.children, currentPath)) {
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

/**
 * 展开的菜单 keys（受控）
 * 原来绑的是 :default-expanded-keys —— default 系列 prop 只在首次渲染生效，
 * 之后从地址栏或标签栏跳进深层路由，父级菜单都不会跟着展开。
 * 改成受控后：路由变化只「补齐」当前路由所需的父级，不去动其它节点，
 * 用户手动展开/收起的结果因此得以保留。
 */
const expandedKeys = ref<string[]>([])

watch(
  [() => route.path, () => permissionStore.menus],
  ([path, menus]) => {
    const required = findExpandedKeys(menus, path)
    if (required.length === 0) return

    const merged = new Set([...expandedKeys.value, ...required])
    // merged 一定是当前集合的超集，尺寸没变说明父级已经都是展开态
    if (merged.size !== expandedKeys.value.length) {
      expandedKeys.value = [...merged]
    }
  },
  { immediate: true }
)

/** 用户手动展开/收起 */
function handleExpandedKeysUpdate(keys: string[]): void {
  expandedKeys.value = keys
}

/** 根据菜单 ID 查找菜单路径 */
function findMenuPath(menus: Menu[], menuId: string, parentPath = ''): string | null {
  for (const menu of menus) {
    // 如果菜单路径是绝对路径（以 / 开头），直接使用
    // 否则拼接父路径
    let currentPath: string
    if (menu.path) {
      if (menu.path.startsWith('/')) {
        currentPath = menu.path
      } else {
        currentPath = parentPath ? `${parentPath}/${menu.path}` : `/${menu.path}`
      }
    } else {
      currentPath = parentPath
    }

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
    :collapsed-width="collapsedWidth"
    :collapsed-icon-size="20"
    :options="menuOptions"
    :value="activeKey"
    :expanded-keys="expandedKeys"
    :indent="24"
    @update:value="handleMenuSelect"
    @update:expanded-keys="handleExpandedKeysUpdate"
  />
</template>

<style scoped lang="scss">
@use '@/styles/transitions/interaction' as ix;

// 这里原本还有一整块 `:deep(.n-menu) { --n-item-text-color / --n-item-height / ... }`。
// 那块是死代码：NMenu 把主题算出的 --n-item-* / --n-arrow-* / --n-item-height 全部写在
// `.n-menu` 的 inline style 上（Menu.mjs 的 cssVars，且本项目没开 inline-theme-disabled），
// 样式表里的同名声明不加 !important 压不过 inline style。
// 这些颜色的正确入口是 useNaiveTheme.ts 的 themeOverrides.Menu（已覆盖 item/icon 各态），
// 所以这里不再重复一份，也不用 !important 去硬顶。
:deep(.n-menu-item) {
  margin: calc(var(--spacing-1) / 2) 0;
}

:deep(.n-menu-item-content) {
  position: relative;
  margin: 0 var(--spacing-2);
  border-radius: var(--radius-lg);

  // 同时接管 naive 自带的 background-color / padding-left / border-color 过渡：
  // padding 的补间是按「每个菜单项」跑的，折叠一次要给二十多个元素各排一轮布局，
  // 而宽度动画已经把状态变化说清楚了，看不出这一层补间。
  @include ix.feedback-transition;
  @include ix.pressable(0.98, 0);

  // 所有菜单项都预留同一条指示器，只改变合成层上的 opacity / transform。
  // 切换菜单时不会再销毁后重建一根线，视觉上是稳定、连续的状态交接。
  &::after {
    position: absolute;
    top: 50%;
    left: 0;
    z-index: 2;
    width: calc(var(--spacing-1) / 2);
    height: var(--spacing-5);
    content: '';
    background: var(--color-primary);
    border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
    box-shadow: 0 0 var(--spacing-2) color-mix(in srgb, var(--color-primary) 50%, transparent);
    opacity: 0;
    transform: translateY(-50%) scaleY(0.35);
    transform-origin: center;
    transition:
      opacity ix.$hover-motion,
      transform ix.$indicator-motion;
    pointer-events: none;
  }
}

// 展开态才接管横向内边距。必须 !important：naive 把 padding-left 写在 inline style 上，
// 常规声明压不过它。折叠态刻意不覆盖 —— 那里要靠 naive 用 collapsedWidth 算出的
// padding-left 把图标推到侧边栏中线（配合下面的 margin: 0 与 AppSidebar 折叠态去掉
// 滚动容器横向内边距，菜单项宽度正好等于 collapsedWidth，公式才成立）。
:deep(.n-menu:not(.n-menu--collapsed) .n-menu-item-content) {
  padding: 0 var(--spacing-3) !important;
}

:deep(.n-menu--collapsed .n-menu-item-content) {
  margin: 0;
}

:deep(.n-menu-item-content--selected) {
  // ::before 仍交给 Naive UI 负责选中表面；这里只换成 token 化渐变。
  &::before {
    background: linear-gradient(
      135deg,
      color-mix(in srgb, var(--color-primary) 13%, transparent) 0%,
      color-mix(in srgb, var(--color-primary-hover) 7%, transparent) 100%
    ) !important;
  }

  &::after {
    opacity: 1;
    transform: translateY(-50%) scaleY(1);
  }

  // 折叠态改成底部指示条
  .n-menu--collapsed &::after {
    top: auto;
    bottom: var(--spacing-1);
    left: 50%;
    width: var(--spacing-5);
    height: calc(var(--spacing-1) / 2);
    border-radius: var(--radius-sm) var(--radius-sm) 0 0;
    transform: translateX(-50%) scaleX(1);
  }
}

:deep(.n-menu-item-content:not(.n-menu-item-content--selected):hover) {
  background: var(--color-surface-hover);
}

:deep(.n-menu-item-content:not(.n-menu-item-content--selected):active) {
  background: var(--color-surface-active);
}

// 图标样式
:deep(.n-menu-item-content__icon) {
  @include ix.feedback-transition;
}

// 横向轻移比放大更克制，也不会让细线 SVG 在缩放时发虚。
:deep(.n-menu-item-content:hover .n-menu-item-content__icon) {
  transform: translateX(calc(var(--spacing-1) / 2));
}

// 选中态图标着色。多写一个 .n-menu 是为了提高特异性：naive 在折叠态会给所有图标统一
// 上色（.n-menu--collapsed .n-menu-item-content .n-menu-item-content__icon），
// 与不带 .n-menu 的写法特异性相同，谁生效取决于样式注入顺序。
:deep(.n-menu .n-menu-item-content--selected .n-menu-item-content__icon) {
  color: var(--color-primary);
}

// 标题与指示器使用同一条 easing，选中反馈像一个整体，而不是各自动一下。
:deep(.n-menu-item-content-header) {
  transition:
    color ix.$hover-motion,
    opacity ix.$hover-motion,
    transform ix.$indicator-motion;
}

:deep(.n-menu-item-content--selected .n-menu-item-content-header) {
  transform: translateX(var(--spacing-1));
}

// 子菜单样式
// 这里的 --n-item-height 是有效的：它声明在 .n-submenu-children 上，
// 不与 .n-menu 的 inline style 竞争，而是被子项继承。
:deep(.n-submenu-children) {
  --n-item-height: var(--spacing-10);

  .n-menu-item-content::after {
    left: var(--spacing-2);
    height: var(--spacing-4);
  }
}

// 子菜单缩进。选择器必须比上面那条展开态 padding 规则更具体，否则会被它压掉。
:deep(.n-menu:not(.n-menu--collapsed) .n-submenu-children .n-menu-item-content) {
  padding-left: var(--spacing-5) !important;
}

// Naive UI 默认把子菜单的 max-height / opacity 都写死为 200ms。
// 覆盖为“进慢出快”的语义 token：展开看得清，收起不拖沓。
:deep(.n-submenu-children.fade-in-height-expand-transition-enter-active) {
  transition:
    max-height ix.$expand-motion,
    opacity ix.$enter-motion,
    margin-top ix.$expand-motion,
    margin-bottom ix.$expand-motion;
}

:deep(.n-submenu-children.fade-in-height-expand-transition-leave-active) {
  transition:
    max-height ix.$leave-motion,
    opacity ix.$leave-motion,
    margin-top ix.$leave-motion,
    margin-bottom ix.$leave-motion;
}

:deep(.n-menu-item-content__arrow) {
  transition:
    color ix.$hover-motion,
    opacity ix.$hover-motion,
    transform ix.$expand-motion;
}

@media (prefers-reduced-motion: reduce) {
  :deep(.n-menu-item-content-header),
  :deep(.n-menu-item-content__icon) {
    transform: none;
  }

  :deep(.n-menu:not(.n-menu--collapsed) .n-menu-item-content::after) {
    transform: translateY(-50%);
  }

  :deep(.n-menu--collapsed .n-menu-item-content::after) {
    transform: translateX(-50%);
  }
}
</style>
