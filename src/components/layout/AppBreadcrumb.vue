<script setup lang="ts">
/**
 * 面包屑组件
 * 根据路由自动生成面包屑导航，标题从后端菜单数据动态获取
 * Requirements: 6.3
 */
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NBreadcrumb, NBreadcrumbItem } from 'naive-ui'
import { useI18n } from 'vue-i18n'
import { usePermissionStore } from '@/stores/permission'
import type { LocaleType } from '@/locales'

const route = useRoute()
const router = useRouter()
const { locale } = useI18n()
const permissionStore = usePermissionStore()

/** 面包屑项接口 */
interface BreadcrumbItem {
  title: string
  path?: string
  clickable: boolean
}

/**
 * 根据当前语言获取菜单标题
 */
function getMenuTitle(menu: { title: string; titleEn?: string; titleJa?: string }): string {
  const currentLocale = locale.value as LocaleType
  switch (currentLocale) {
    case 'en-US':
      return menu.titleEn || menu.title
    case 'ja-JP':
      return menu.titleJa || menu.title
    case 'zh-CN':
    default:
      return menu.title
  }
}

/** 生成面包屑数据 - 基于后端菜单层级 */
const breadcrumbs = computed<BreadcrumbItem[]>(() => {
  const items: BreadcrumbItem[] = []
  const currentPath = route.path

  // 从后端菜单数据查找当前路径对应的菜单及其父级
  const menuPath = permissionStore.getMenuPathByRoutePath(currentPath)

  if (menuPath.length > 0) {
    // 使用后端菜单层级生成面包屑
    // 如果只有一个菜单且没有子菜单，只显示该菜单
    const lastMenu = menuPath[menuPath.length - 1]
    if (!lastMenu) return items
    const hasChildren = lastMenu.children && lastMenu.children.length > 0

    if (menuPath.length === 1 && !hasChildren) {
      // 单层菜单，只显示一级
      items.push({
        title: getMenuTitle(lastMenu),
        path: undefined,
        clickable: false,
      })
    } else {
      // 多层菜单，显示完整路径
      menuPath.forEach((menu, index) => {
        const isLast = index === menuPath.length - 1
        items.push({
          title: getMenuTitle(menu),
          path: isLast ? undefined : menu.path,
          clickable: !isLast && !!menu.path,
        })
      })
    }
  } else {
    // 回退：使用路由 meta 中的标题（只取最后一个有标题的）
    const matched = route.matched
    const lastWithTitle = matched.filter((r) => r.meta?.title).pop()
    if (lastWithTitle?.meta?.title) {
      items.push({
        title: lastWithTitle.meta.title,
        path: undefined,
        clickable: false,
      })
    }
  }

  return items
})

/** 点击面包屑项 */
function handleClick(item: BreadcrumbItem): void {
  if (item.clickable && item.path) {
    void router.push(item.path)
  }
}
</script>

<template>
  <NBreadcrumb class="app-breadcrumb">
    <NBreadcrumbItem
      v-for="(item, index) in breadcrumbs"
      :key="index"
      :clickable="item.clickable"
      @click="handleClick(item)"
    >
      {{ item.title }}
    </NBreadcrumbItem>
  </NBreadcrumb>
</template>

<style scoped lang="scss">
.app-breadcrumb {
  :deep(.n-breadcrumb-item__link) {
    color: var(--color-text-secondary);
    transition: color var(--duration-fast) var(--easing-standard);

    &:hover {
      color: var(--color-primary);
    }
  }

  :deep(.n-breadcrumb-item:last-child .n-breadcrumb-item__link) {
    color: var(--color-text);
    font-weight: 500;
  }
}
</style>
