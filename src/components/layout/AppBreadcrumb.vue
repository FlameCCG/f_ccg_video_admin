<script setup lang="ts">
/**
 * 面包屑组件
 * 根据路由自动生成面包屑导航，标题从后端菜单数据动态获取
 * Requirements: 6.3
 */
import { computed } from 'vue'
import { useRoute, useRouter, type RouteLocationMatched } from 'vue-router'
import { NBreadcrumb, NBreadcrumbItem } from 'naive-ui'
import { useI18n } from 'vue-i18n'
import { usePermissionStore } from '@/stores/permission'
import type { LocaleType } from '@/locales'

const route = useRoute()
const router = useRouter()
const { t, locale } = useI18n()
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

/** 生成面包屑数据 */
const breadcrumbs = computed<BreadcrumbItem[]>(() => {
  const items: BreadcrumbItem[] = []
  const matched = route.matched

  // 始终添加首页
  items.push({
    title: t('layout.breadcrumb.home'),
    path: '/dashboard',
    clickable: true,
  })

  // 根据路由匹配生成面包屑
  matched.forEach((record: RouteLocationMatched, index: number) => {
    const path = record.path
    const isLast = index === matched.length - 1

    // 跳过根路由和登录页
    if (path === '/' || path === '/login' || path === '/dashboard') {
      return
    }

    // 优先从后端菜单数据获取标题
    const menu = permissionStore.getMenuByPath(path)
    let title: string

    if (menu) {
      // 从菜单数据获取多语言标题
      title = getMenuTitle(menu)
    } else if (record.meta?.title) {
      // 回退到路由 meta 中的标题
      title = record.meta.title
    } else {
      // 最后回退到路径
      title = path
    }

    items.push({
      title,
      path: isLast ? undefined : path,
      clickable: !isLast,
    })
  })

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
