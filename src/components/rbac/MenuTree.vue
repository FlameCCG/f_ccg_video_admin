<script setup lang="ts">
/**
 * 菜单树组件
 * Menu Tree Component
 * Requirements: 18.4 - 支持树形展示、展开/折叠
 */
import { ref, computed, watch, h } from 'vue'
import { useI18n } from 'vue-i18n'
import { NTree, NSpace, NButton, NIcon, NInput, NEmpty } from 'naive-ui'
import type { TreeOption } from 'naive-ui'
import type { Menu } from '@/api/types'
import { getIconComponent } from '@/utils/menuIcons'

interface Props {
  /** 菜单列表 */
  menus: Menu[]
  /** 选中的菜单 ID 列表 */
  checkedKeys?: number[]
  /** 是否可勾选 */
  checkable?: boolean
  /** 是否可选择 */
  selectable?: boolean
  /** 是否级联勾选 */
  cascade?: boolean
  /** 是否显示搜索框 */
  showSearch?: boolean
  /** 是否默认展开全部 */
  defaultExpandAll?: boolean
  /** 加载状态 */
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  checkedKeys: () => [],
  checkable: false,
  selectable: false,
  cascade: true,
  showSearch: false,
  defaultExpandAll: true,
  loading: false,
})

const emit = defineEmits<{
  'update:checkedKeys': [keys: number[]]
  select: [keys: number[], options: TreeOption[]]
}>()

const { t, locale } = useI18n()

/** 搜索关键词 */
const searchKeyword = ref('')

/** 展开的节点 */
const expandedKeys = ref<number[]>([])

/** 获取菜单标题（根据当前语言） */
function getMenuTitle(menu: Menu): string {
  if (locale.value === 'en-US' && menu.titleEn) return menu.titleEn
  if (locale.value === 'ja-JP' && menu.titleJa) return menu.titleJa
  return menu.title
}

/** 将菜单转换为树选项 */
function convertToTreeOptions(menus: Menu[]): TreeOption[] {
  return menus.map((menu) => {
    const IconComp = getIconComponent(menu.icon)
    return {
      key: menu.id,
      label: getMenuTitle(menu),
      prefix: IconComp ? () => h(NIcon, { size: 16 }, () => h(IconComp)) : undefined,
      children: menu.children ? convertToTreeOptions(menu.children) : undefined,
    }
  })
}

/** 树选项 */
const treeOptions = computed(() => convertToTreeOptions(props.menus))

/** 过滤后的树选项 */
const filteredTreeOptions = computed(() => {
  if (!searchKeyword.value) return treeOptions.value

  const keyword = searchKeyword.value.toLowerCase()

  function filterTree(options: TreeOption[]): TreeOption[] {
    return options
      .map((option) => {
        const label = (option.label as string).toLowerCase()
        const children = option.children ? filterTree(option.children) : undefined
        const hasMatchingChildren = children && children.length > 0
        const matchesLabel = label.includes(keyword)

        if (matchesLabel || hasMatchingChildren) {
          return {
            ...option,
            children: hasMatchingChildren ? children : option.children,
          }
        }
        return null
      })
      .filter(Boolean) as TreeOption[]
  }

  return filterTree(treeOptions.value)
})

/** 获取所有菜单 ID（用于展开全部） */
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

/** 初始化展开状态 */
watch(
  () => props.menus,
  (menus) => {
    if (props.defaultExpandAll && menus.length > 0) {
      expandedKeys.value = getAllMenuIds(menus)
    }
  },
  { immediate: true }
)

/** 处理勾选变化 */
function handleCheckedKeysChange(keys: Array<string | number>): void {
  emit('update:checkedKeys', keys as number[])
}

/** 处理选择变化 */
function handleSelect(keys: Array<string | number>, options: Array<TreeOption | null>): void {
  emit('select', keys as number[], options.filter(Boolean) as TreeOption[])
}

/** 展开全部 */
function expandAll(): void {
  expandedKeys.value = getAllMenuIds(props.menus)
}

/** 折叠全部 */
function collapseAll(): void {
  expandedKeys.value = []
}

/** 暴露方法 */
defineExpose({
  expandAll,
  collapseAll,
})
</script>

<template>
  <div class="menu-tree">
    <!-- 搜索框 -->
    <div v-if="showSearch" class="menu-tree__search">
      <n-input
        v-model:value="searchKeyword"
        :placeholder="t('common.search')"
        clearable
        size="small"
      >
        <template #prefix>
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
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </n-icon>
        </template>
      </n-input>
    </div>

    <!-- 工具栏 -->
    <n-space v-if="showSearch" class="menu-tree__toolbar" :size="8">
      <n-button size="tiny" quaternary @click="expandAll">
        {{ t('common.expandAll') }}
      </n-button>
      <n-button size="tiny" quaternary @click="collapseAll">
        {{ t('common.collapseAll') }}
      </n-button>
    </n-space>

    <!-- 树组件 -->
    <n-tree
      v-if="filteredTreeOptions.length > 0"
      ref="treeRef"
      v-model:expanded-keys="expandedKeys"
      :data="filteredTreeOptions"
      :checked-keys="checkedKeys"
      :checkable="checkable"
      :selectable="selectable"
      :cascade="cascade"
      :block-line="true"
      :show-irrelevant-nodes="false"
      key-field="key"
      label-field="label"
      children-field="children"
      @update:checked-keys="handleCheckedKeysChange"
      @update:selected-keys="handleSelect"
    />

    <!-- 空状态 -->
    <n-empty v-else :description="t('common.noData')" />
  </div>
</template>

<style scoped lang="scss">
.menu-tree {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);

  &__search {
    flex-shrink: 0;
  }

  &__toolbar {
    flex-shrink: 0;
  }
}
</style>
