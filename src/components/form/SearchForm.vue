<script setup lang="ts">
/**
 * 搜索表单组件
 * 用于表格筛选的搜索表单容器
 * Requirements: 8.2, 9.2
 *
 * 栅格契约（重要，改动前先读）：
 * 11 个视图里 31 个筛选项统一声明 `<n-gi span="6 m:3 l:2">`，
 * 也就是「总列数 6」这一个前提下的 1 / 2 / 3 列。本组件的 cols 必须等于 6，
 * 否则每个断点都对不齐（此前 cols 是 4：base 的 span=6 被 clamp 成整行，
 * m 断点每项占 3/4、右侧空出一个 1/4 的死列，没有一个断点是整行铺满的）。
 */
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { NForm, NGrid, NGi, NButton, NIcon } from 'naive-ui'
import type { FormInst } from 'naive-ui'

/**
 * 栅格间距。NGrid 的 x-gap / y-gap 是在 JS 里算成内联样式的
 * （seemly 的 pxfy 会给任何非数值字符串直接拼上 px），所以这里不能传
 * CSS 变量，只能给一个与 --spacing-4（16px）同值的常量。
 */
const GRID_GAP = 16

/**
 * 操作区跨度：与视图侧筛选项完全一致，操作区才占「刚好一个筛选格」。
 * 配合 n-gi 的 suffix，它会被钉在当前行末尾（右对齐），行不会被撑出半格。
 */
const ACTIONS_SPAN = '6 m:3 l:2'

interface Props {
  /**
   * 栅格总列数。必须与视图侧 `<n-gi span="6 m:3 l:2">` 保持一致：
   * 6 列时 base = 6/6（1 列）、m = 3/6（2 列）、l 及以上 = 2/6（3 列），
   * 每个断点都能整行铺满。
   */
  cols?: number
  /** 是否可收起：超出 defaultExpandedRows 行的筛选项折叠到「展开」按钮后面 */
  collapsible?: boolean
  /** 收起状态下保留的行数 */
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
  cols: 6,
  // 默认不折叠：折叠会把已经可见的筛选项藏起来，需要时由调用方显式开启。
  // 开启后折叠计算完全交给 NGrid（见下方 collapsed），不再由本组件数个数。
  collapsible: false,
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

/**
 * 收起态。交给 NGrid 原生的 collapsed / collapsed-rows：
 * 它按当前断点的真实跨度（含 suffix 操作格）算行数，
 * 比「行数 × 列数 - 1」这种在响应式下必然算错的公式可靠。
 */
const collapsed = computed(() => props.collapsible && !expanded.value)

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
      <n-grid
        :cols="cols"
        :x-gap="GRID_GAP"
        :y-gap="GRID_GAP"
        :collapsed="collapsed"
        :collapsed-rows="defaultExpandedRows"
        responsive="screen"
        :item-responsive="true"
      >
        <!-- 表单项插槽 -->
        <slot :expanded="expanded" />

        <!-- 操作按钮：suffix 让它始终位于当前行末尾 -->
        <n-gi :span="ACTIONS_SPAN" suffix class="search-form__actions">
          <div class="search-form__buttons">
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

            <n-button v-if="collapsible" text @click="toggleExpand">
              {{ expanded ? t('common.collapse') : t('common.expand') }}
              <template #icon>
                <n-icon
                  class="search-form__expand-icon"
                  :class="{ 'search-form__expand-icon--expanded': expanded }"
                >
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
          </div>
        </n-gi>
      </n-grid>
    </n-form>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/transitions/interaction' as ix;

// 这里不再有表面、内边距、圆角和描边：11 个调用点全部是把本组件塞进
// `<n-card :bordered="false">` 里用的，卡片已经给了表面 + 16px 内边距 + 卡片圆角。
// 此前组件自己又叠了一层同色描边盒子，等于「无边框卡片里套一个有边框的同色盒子」，
// 32px 内缩叠加、两个不一致的圆角，11 个页面同时如此。一个盒子只留一层表面。
.search-form {
  &__form {
    width: 100%;
  }

  &__actions {
    display: flex;

    // 与同行筛选项的控件顶边对齐。原来是 flex-end：n-form-item 在控件下方
    // 还有一条 feedback 占位（约一行高），底对齐会把按钮压到 feedback 之下，
    // 比同行的输入框整整低一行 —— 这就是筛选条「按钮掉下去了」的来源。
    // 调用点均为 label-placement="left"（标签与控件同行），故顶对齐即对齐控件。
    align-items: flex-start;
  }

  &__buttons {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--spacing-3);
  }

  &__expand-icon {
    // 过渡声明放在基类上，收起时（修饰类被移除）才同样有动画；
    // 时长/曲线走展开语义 token，减少动效场景由 token 侧压到 0。
    transition: transform ix.$expand-motion;

    &--expanded {
      transform: rotate(180deg);
    }
  }
}
</style>
