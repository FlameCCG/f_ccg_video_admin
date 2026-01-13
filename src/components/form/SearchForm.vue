<script setup lang="ts">
/**
 * 搜索表单组件
 * 用于表格筛选的搜索表单容器
 * Requirements: 8.2, 9.2
 */
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { NForm, NGrid, NGi, NSpace, NButton, NIcon } from 'naive-ui'
import type { FormInst } from 'naive-ui'

interface Props {
  /** 列数 */
  cols?: number
  /** 响应式列数配置 */
  responsiveCols?: {
    xs?: number
    s?: number
    m?: number
    l?: number
    xl?: number
    xxl?: number
  }
  /** 是否显示展开/收起 */
  collapsible?: boolean
  /** 默认展开行数 */
  defaultExpandedRows?: number
  /** 标签宽度 */
  labelWidth?: string | number
  /** 标签位置 */
  labelPlacement?: 'left' | 'top'
  /** 是否显示重置按钮 */
  showReset?: boolean
  /** 是否显示搜索按钮 */
  showSearch?: boolean
  /** 搜索按钮加载状态 */
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  cols: 4,
  responsiveCols: () => ({
    xs: 1,
    s: 2,
    m: 3,
    l: 4,
    xl: 4,
    xxl: 6,
  }),
  collapsible: true,
  defaultExpandedRows: 1,
  labelWidth: 'auto',
  labelPlacement: 'left',
  showReset: true,
  showSearch: true,
  loading: false,
})

const emit = defineEmits<{
  search: []
  reset: []
}>()

const { t } = useI18n()

/** 表单实例 */
const formRef = ref<FormInst | null>(null)

/** 是否展开 */
const expanded = ref(false)

/** 计算可见的表单项数量 */
const visibleItemCount = computed(() => {
  if (!props.collapsible || expanded.value) {
    return Infinity
  }
  // 默认展开行数 * 列数 - 1（留一个位置给按钮）
  return props.defaultExpandedRows * props.cols - 1
})

/** 是否显示展开按钮 */
const showExpandButton = computed(() => props.collapsible)

/** 处理搜索 */
function handleSearch(): void {
  emit('search')
}

/** 处理重置 */
function handleReset(): void {
  formRef.value?.restoreValidation()
  emit('reset')
}

/** 切换展开状态 */
function toggleExpand(): void {
  expanded.value = !expanded.value
}

/** 暴露方法 */
defineExpose({
  formRef,
  reset: handleReset,
})
</script>

<template>
  <div class="search-form">
    <n-form
      ref="formRef"
      :label-width="labelWidth"
      :label-placement="labelPlacement"
      class="search-form__form"
    >
      <n-grid :cols="cols" :x-gap="16" :y-gap="16" responsive="screen" :item-responsive="true">
        <!-- 表单项插槽 -->
        <slot :visible-count="visibleItemCount" :expanded="expanded" />

        <!-- 操作按钮 -->
        <n-gi class="search-form__actions">
          <n-space :size="12">
            <n-button v-if="showSearch" type="primary" :loading="loading" @click="handleSearch">
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
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                </n-icon>
              </template>
              {{ t('common.search') }}
            </n-button>

            <n-button v-if="showReset" @click="handleReset">
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
              {{ t('common.reset') }}
            </n-button>

            <n-button v-if="showExpandButton" text @click="toggleExpand">
              {{ expanded ? t('common.collapse') : t('common.expand') }}
              <template #icon>
                <n-icon :class="{ 'search-form__expand-icon--expanded': expanded }">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </n-icon>
              </template>
            </n-button>
          </n-space>
        </n-gi>
      </n-grid>
    </n-form>
  </div>
</template>

<style scoped lang="scss">
.search-form {
  padding: var(--spacing-4);
  background-color: var(--color-surface);
  border-radius: var(--radius-card);
  border: 1px solid var(--color-border-light);

  &__form {
    width: 100%;
  }

  &__actions {
    display: flex;
    align-items: flex-end;
    justify-content: flex-start;
  }

  &__expand-icon--expanded {
    transform: rotate(180deg);
    transition: transform var(--duration-fast) var(--easing-standard);
  }
}
</style>
