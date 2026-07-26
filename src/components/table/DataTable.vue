<script setup lang="ts">
/**
 * 数据表格组件
 * 封装 Naive UI DataTable，提供统一的表格展示
 * 滚动条始终在内部，不影响外部布局
 * Requirements: 8.1, 9.1
 */
import { computed, ref, watch } from 'vue'
import type { CSSProperties } from 'vue'
import { useI18n } from 'vue-i18n'
import { NDataTable, NPagination, NSpace } from 'naive-ui'
import type { DataTableColumns, DataTableRowKey, ScrollbarProps } from 'naive-ui'
import AppEmpty from '@/components/common/AppEmpty.vue'

/** 表格行数据类型 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RowData = any

/** 单列配置（可能是分组列） */
type TableColumnItem = DataTableColumns<RowData>[number]

/** 首屏骨架行数上限：再多也填不满一屏，只是徒增 DOM */
const MAX_SKELETON_ROWS = 10

interface Props {
  /** 表格列配置 */
  columns: DataTableColumns<RowData>
  /** 表格数据 */
  data: RowData[]
  /** 是否加载中 */
  loading?: boolean
  /** 行 key 字段 */
  rowKey?: string | ((row: unknown) => DataTableRowKey)
  /** 是否可选择 */
  selectable?: boolean
  /** 已选择的行 keys */
  checkedRowKeys?: DataTableRowKey[]
  /** 是否显示分页 */
  pagination?: boolean
  /** 当前页码 */
  page?: number
  /** 每页数量 */
  pageSize?: number
  /** 总数 */
  total?: number
  /** 每页数量选项 */
  pageSizes?: number[]
  /** 是否显示快速跳转 */
  showQuickJumper?: boolean
  /** 是否显示每页数量选择 */
  showSizePicker?: boolean
  /** 表格最大高度 */
  maxHeight?: string | number
  /** 是否显示边框 */
  bordered?: boolean
  /** 是否单行显示 */
  singleLine?: boolean
  /** 是否条纹 */
  striped?: boolean
  /** 表格大小 */
  size?: 'small' | 'medium' | 'large'
  /** 是否虚拟滚动 */
  virtualScroll?: boolean
  /** 空状态描述 */
  emptyDescription?: string
  /** 子节点字段名（树形表格） */
  childrenKey?: string
  /** 默认展开的行 keys（树形表格） */
  defaultExpandedRowKeys?: DataTableRowKey[]
  /** 是否默认展开所有行（树形表格） */
  defaultExpandAll?: boolean
  /** 缩进宽度（树形表格） */
  indent?: number
  /** 是否加载失败（在表格框架内渲染重试态，取代空状态） */
  error?: boolean
  /** 加载失败描述（默认 common.tips.loadFailed） */
  errorDescription?: string
  /** 首屏骨架行数（默认取 pageSize，最多 10 行） */
  skeletonRows?: number
  /** 横向滚动宽度；不传则按各列声明的 width 之和自动推导 */
  scrollX?: string | number
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  rowKey: 'id',
  selectable: false,
  checkedRowKeys: () => [],
  pagination: true,
  page: 1,
  pageSize: 10,
  total: 0,
  pageSizes: () => [10, 20, 50, 100],
  showQuickJumper: true,
  showSizePicker: true,
  maxHeight: undefined,
  bordered: false,
  singleLine: true,
  striped: false,
  size: 'medium',
  virtualScroll: false,
  emptyDescription: undefined,
  childrenKey: 'children',
  defaultExpandedRowKeys: () => [],
  defaultExpandAll: false,
  indent: 24,
  error: false,
  errorDescription: undefined,
  skeletonRows: undefined,
  scrollX: undefined,
})

const emit = defineEmits<{
  'update:page': [page: number]
  'update:pageSize': [pageSize: number]
  'update:checkedRowKeys': [keys: DataTableRowKey[]]
  pageChange: [page: number]
  pageSizeChange: [pageSize: number]
  selectionChange: [keys: DataTableRowKey[], rows: unknown[]]
  retry: []
}>()

const { t } = useI18n()

/** 内部选中状态 */
const internalCheckedKeys = ref<DataTableRowKey[]>([...props.checkedRowKeys])

/** 同步外部选中状态 */
watch(
  () => props.checkedRowKeys,
  (newKeys) => {
    internalCheckedKeys.value = [...newKeys]
  }
)

/** 表格列配置（添加选择列，避免重复；默认不 fixed，避免强制横向滚动/叠字） */
const tableColumns = computed(() => {
  const hasSelectionColumn = props.columns.some((col) => 'type' in col && col.type === 'selection')
  if (!props.selectable || hasSelectionColumn) return props.columns
  return [
    {
      type: 'selection' as const,
      width: 40,
    },
    ...props.columns,
  ]
})

/** 展开分组列，取出真正占一列的叶子列 */
function flattenColumns(cols: DataTableColumns<RowData>): TableColumnItem[] {
  const leaves: TableColumnItem[] = []
  for (const col of cols) {
    if ('children' in col) {
      leaves.push(...flattenColumns(col.children))
    } else {
      leaves.push(col)
    }
  }
  return leaves
}

/** 列声明宽度转像素数；未声明或非像素值按 0 计（即「这列可伸缩」） */
function toPxWidth(width: number | string | undefined): number {
  if (typeof width === 'number') return width
  if (typeof width !== 'string') return 0
  const parsed = Number.parseFloat(width)
  if (!Number.isFinite(parsed)) return 0
  const unit = width.trim().replace(/^[\d.+-]+/, '')
  return unit === '' || unit === 'px' ? parsed : 0
}

/** 叶子列 */
const leafColumns = computed(() => flattenColumns(tableColumns.value))

/**
 * 横向滚动宽度。
 *
 * 这是「右侧列点不到」的真正修法：14 个列表页的列带 ellipsis，Naive 会把
 * tableLayout 切成 fixed，此时 xScrollable = (scrollX !== undefined)，不传
 * scroll-x 就等于「表格比容器宽，但既不画滚动条、也没有可拖的轨道」——
 * 只有触控板横滑能到达。传入各列声明宽度之和后 Naive 才会渲染横向轨道。
 *
 * 取「已声明宽度之和」而非估算值是有意的：Naive 的内容盒是
 * `min-width: scrollX; width: 100%`，等价于 max(容器宽, 声明宽度和) ——
 * 与今天 table-layout: fixed 的用宽完全一致，因此几何尺寸零变化，
 * 只是补回了可达的滚动条。
 */
const resolvedScrollX = computed<string | number | undefined>(() => {
  if (props.scrollX !== undefined) return props.scrollX
  let total = 0
  for (const col of leafColumns.value) {
    total += toPxWidth(col.width)
  }
  return total > 0 ? total : undefined
})

/**
 * 表格内滚动条常显（Naive 默认 trigger: 'hover'）。
 * 轨道是绝对定位的浮层，不占布局，所以常显不会引起任何纵向位移，
 * 但「右边还有列」这件事必须不 hover 也看得见。
 */
const bodyScrollbarProps: ScrollbarProps = { trigger: 'none' }

/** 行 key 函数 */
const rowKeyFn = computed(() => {
  if (typeof props.rowKey === 'function') {
    return props.rowKey
  }
  return (row: unknown) =>
    (row as Record<string, unknown>)[props.rowKey as string] as DataTableRowKey
})

/** 选中 key 集合（行样式每行都要查一次，用 Set 避免 O(n²)） */
const checkedKeySet = computed(() => new Set(internalCheckedKeys.value))

/**
 * 行样式类。
 * Naive 只输出 --striped / --summary / --expanded，没有「选中行」类，
 * 选中态必须自己标（此前样式表里写了 .n-data-table-tr--selected，是死代码）。
 */
function rowClassName(row: RowData): string {
  if (!props.selectable) return ''
  return checkedKeySet.value.has(rowKeyFn.value(row)) ? 'is-row-selected' : ''
}

/** 首屏加载：没有任何数据可看 */
const isFirstLoad = computed(() => props.loading && props.data.length === 0)

/** 已有数据上的重新拉取：只走顶部进度条，不遮挡内容 */
const isRefetching = computed(() => props.loading && props.data.length > 0)

/** 错误态：仅当没有数据可看且不在重试中时接管空状态 */
const showError = computed(() => props.error && !props.loading && props.data.length === 0)

/** 骨架行数 */
const skeletonRowCount = computed(
  () => props.skeletonRows ?? Math.min(props.pageSize, MAX_SKELETON_ROWS)
)

/** 骨架列数 */
const skeletonColumnCount = computed(() => Math.max(leafColumns.value.length, 1))

/** 骨架行网格轨道：按真实列宽排布，骨架屏与真实行同形 */
const skeletonRowStyle = computed<CSSProperties>(() => {
  const tracks = leafColumns.value
    .map((col) => {
      const width = toPxWidth(col.width)
      return width > 0 ? `${width}px` : 'minmax(0, 1fr)'
    })
    .join(' ')
  return { gridTemplateColumns: tracks || 'minmax(0, 1fr)' }
})

/** 处理选择变化 */
function handleCheckedRowKeysChange(keys: DataTableRowKey[]): void {
  internalCheckedKeys.value = keys
  emit('update:checkedRowKeys', keys)

  const selectedRows = props.data.filter((row) => {
    const key = rowKeyFn.value(row)
    return keys.includes(key)
  })
  emit('selectionChange', keys, selectedRows)
}

/** 处理页码变化 */
function handlePageChange(page: number): void {
  emit('update:page', page)
  emit('pageChange', page)
}

/** 处理每页数量变化 */
function handlePageSizeChange(pageSize: number): void {
  emit('update:pageSize', pageSize)
  emit('pageSizeChange', pageSize)
}

/** 处理错误态重试 */
function handleRetry(): void {
  emit('retry')
}
</script>

<template>
  <div class="data-table">
    <!--
      刷新指示条：取代原来包住整表的 n-spin。
      灰幕会把所有正文对比度一起打掉，等于「刷新一次就看不清一次」；
      这里只在顶部走一条 2px 进度条，已有数据始终保持可读。
    -->
    <div
      v-if="isRefetching"
      class="data-table__progress"
      role="progressbar"
      :aria-label="t('common.loading')"
    />

    <!-- 表格容器 - 滚动区域 -->
    <div class="data-table__body" :aria-busy="loading">
      <n-data-table
        :columns="tableColumns"
        :data="data"
        :row-key="rowKeyFn"
        :row-class-name="rowClassName"
        :checked-row-keys="selectable ? internalCheckedKeys : undefined"
        :max-height="maxHeight"
        :bordered="bordered"
        :single-line="singleLine"
        :striped="striped"
        :size="size"
        :virtual-scroll="virtualScroll"
        :pagination="false"
        :scroll-x="resolvedScrollX"
        :scrollbar-props="bodyScrollbarProps"
        :children-key="childrenKey"
        :default-expanded-row-keys="defaultExpandAll ? undefined : defaultExpandedRowKeys"
        :default-expand-all="defaultExpandAll"
        :indent="indent"
        class="data-table__table"
        @update:checked-row-keys="handleCheckedRowKeysChange"
      >
        <template #empty>
          <!--
            首屏骨架屏：放在 #empty 里，表头/边框/分页全部保持挂载，
            加载结束时不会整块塌陷再弹回来。
          -->
          <div
            v-if="isFirstLoad"
            class="data-table__skeleton"
            role="status"
            :aria-label="t('common.loading')"
          >
            <div
              v-for="row in skeletonRowCount"
              :key="row"
              class="data-table__skeleton-row"
              :style="skeletonRowStyle"
            >
              <span
                v-for="cell in skeletonColumnCount"
                :key="cell"
                class="data-table__skeleton-cell"
              />
            </div>
          </div>

          <!-- 加载失败：重试入口留在表格框架内，而不是渲染成「暂无数据」 -->
          <template v-else-if="showError">
            <slot name="error">
              <app-empty
                type="error"
                :description="errorDescription || t('common.tips.loadFailed')"
                show-action
                @action="handleRetry"
              />
            </slot>
          </template>

          <template v-else>
            <slot name="empty">
              <app-empty
                type="default"
                :description="emptyDescription || t('common.tips.noData')"
              />
            </slot>
          </template>
        </template>
      </n-data-table>
    </div>

    <!-- 分页 - 固定在底部（加载中/空数据时也保持挂载，避免页面高度反复塌陷） -->
    <div v-if="pagination" class="data-table__footer">
      <n-space justify="space-between" align="center" class="data-table__pagination">
        <span v-if="selectable && internalCheckedKeys.length > 0" class="data-table__selected">
          <span class="data-table__selected-badge">{{ internalCheckedKeys.length }}</span>
          {{ t('common.table.selected', { count: internalCheckedKeys.length }) }}
        </span>
        <span v-else class="data-table__total">
          {{ isFirstLoad ? t('common.loading') : t('common.table.total', { total }) }}
        </span>
        <n-pagination
          :page="page"
          :page-size="pageSize"
          :item-count="total"
          :page-sizes="pageSizes"
          :show-quick-jumper="showQuickJumper"
          :show-size-picker="showSizePicker"
          @update:page="handlePageChange"
          @update:page-size="handlePageSizeChange"
        />
      </n-space>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/transitions/interaction' as ix;

.data-table {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  overflow: hidden;

  // ============================================
  // 刷新指示条
  // ============================================

  // z-index: 4 —— 高于 Naive 的表头与固定列（它们最高 3）
  // height: 2px —— 发丝级指示条，与 ix.sliding-indicator 的默认厚度同级
  // background —— 静态底色：减少动效偏好下滑块动画会被冻结，
  // 底色仍能表达「正在刷新」
  &__progress {
    position: absolute;
    top: 0;
    right: 0;
    left: 0;
    z-index: 4;
    height: 2px;
    overflow: hidden;
    background: var(--color-primary-subtle);

    &::after {
      position: absolute;
      top: 0;
      bottom: 0;
      width: 40%;
      content: '';
      background: var(--color-primary);
      animation: data-table-progress calc(var(--duration-slowest) * 3) var(--easing-ease-in-out)
        infinite;
    }
  }

  &__body {
    position: relative;
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }

  &__table {
    height: 100%;

    // 表格内部滚动
    :deep(.n-data-table-wrapper) {
      flex: 1;
      min-height: 0;
    }

    :deep(.n-data-table-base-table) {
      display: flex;
      flex-direction: column;
      height: 100%;
    }

    // 注意：这个元素是 NScrollbar 的外壳（.n-scrollbar），不是真正的滚动容器
    // （滚动发生在它的子元素 .n-scrollbar-container 上，原生滚动条被 Naive
    // 隐藏、改用自绘轨道）。此前这里写的 `overflow: hidden auto` 与
    // `::-webkit-scrollbar { height: 0 }` 打在了错误的元素上，既没能关掉横条、
    // 也没能关掉纵条 —— 是三行不产生任何效果的样式，删掉。
    // 真正让右侧列不可达的是缺少 scroll-x，见 script 里 resolvedScrollX 的说明。
    :deep(.n-data-table-base-table-body) {
      flex: 1;
      min-height: 0;
    }

    // 真正的滚动容器是它的子元素 .n-scrollbar-container。
    // 这里只补 overscroll-behavior：表格滚到底/滚到最右时不要把整页带着一起滚
    // （横向尤其重要，否则会触发浏览器的「侧滑返回」）。
    // 没有用 ix.scroll-container：那个 mixin 的 overflow-y 与 scrollbar-gutter
    // 是给普通滚动区准备的，而这个容器的 overflow 由 Naive 自己管理（自绘轨道）。
    :deep(.n-scrollbar-container) {
      overscroll-behavior: contain;
    }

    // 自绘滚动条着色。
    // DataTable 的 peer 主题拿不到全局 themeOverrides.Scrollbar
    // （useTheme 只合并 themeOverrides.DataTable.peers），
    // 不在这里接回 token 的话用的就是 Naive 写死的 rgba 灰。
    :deep(.n-scrollbar-rail__scrollbar) {
      background-color: var(--color-scrollbar-thumb);
      border-radius: var(--radius-full);

      &:hover {
        background-color: var(--color-scrollbar-thumb-hover);
      }
    }

    // 表头与正文的层级现在完全由 themeOverrides.DataTable 决定
    // （thColor: surface-2 / thTextColor: text-secondary / thFontWeight: 600 /
    // tdColor: surface / tdTextColor: text / borderColor: border-subtle）。
    // 此前这里把 th 覆写成 --color-text + 600、td 覆写成 --color-text-secondary，
    // 层级正好是反的（表头比数据响）；删掉本地覆写即恢复正常层级。

    :deep(.n-data-table-td) {
      // 计数/时长/日期列不再随分页抖动。Naive 已在 .n-data-table-table 上声明过
      // 一次，这里显式兜住「单元格自定义渲染里用了 font 简写」的情况 ——
      // font 简写会把 font-variant-numeric 复位。
      font-variant-numeric: tabular-nums;
    }

    // 行反馈：
    // - hover 底色由 tdColorHover(--color-surface-hover) 提供，不再本地覆写
    // - 按压不能用 transform：行内有 sticky 固定列，一旦产生新的包含块就会错位
    // - row-reveal 让行内 .is-row-action 元素按需显形，且认 :focus-within，
    //   键盘用户 Tab 进行内即可看到操作区（仅 hover 的实现对键盘等于不存在）
    :deep(.n-data-table-tbody .n-data-table-tr) {
      @include ix.row-reveal;
      @include ix.focus-ring-inset;

      &:active > .n-data-table-td {
        background-color: var(--color-surface-active);
        transition-duration: var(--motion-press-duration);
      }
    }

    // 选中行：类由 rowClassName 打上，见 script
    :deep(.n-data-table-tr.is-row-selected > .n-data-table-td) {
      background-color: var(--color-primary-subtle);
    }

    :deep(.n-data-table-tr.is-row-selected:hover > .n-data-table-td) {
      background-color: var(--color-primary-subtle-hover);
    }

    // 固定列：原先有 4 组 !important 覆写背景与阴影，成因是赛博朋克主题的
    // surface 曾经是半透明的（固定列会透出下层文字）。重写后的 4 套色板里
    // surface 全部不透明，Naive 自己的 tdColor / thColor / hover 已经足够，
    // 覆写整段删除。固定列边缘阴影也交还 Naive —— 它只在真正横向滚动时出现，
    // 而这正是补回横向滚动后需要的「右侧还有内容」提示。

    // 空状态容器：内边距交给 AppEmpty / 骨架屏自己控制，
    // 否则 Naive 的 48px 会和它们的内边距叠加
    :deep(.n-data-table-empty) {
      padding: 0;
    }

    // 树形表格展开图标
    :deep(.n-data-table-expand-trigger) {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: var(--spacing-5);
      height: var(--spacing-5);
      margin-right: var(--spacing-2);
      color: var(--color-text-muted);
      cursor: pointer;
      border-radius: var(--radius-sm);

      @include ix.feedback-transition;

      &:hover {
        color: var(--color-primary-text);
        background: var(--color-primary-subtle);
      }

      svg {
        width: var(--text-base);
        height: var(--text-base);
      }
    }

    :deep(.n-data-table-expand-trigger--expanded) {
      color: var(--color-primary-text);
    }
  }

  // ============================================
  // 首屏骨架屏
  // ============================================

  // overflow: hidden —— 网格轨道按真实列宽铺开，可能宽于可视区
  &__skeleton {
    display: flex;
    flex: 1;
    flex-direction: column;
    align-self: stretch;
    width: 100%;
    overflow: hidden;
  }

  // 与 Naive medium 尺寸的真实行等高：一行正文 + 上下 12px 内边距
  &__skeleton-row {
    display: grid;
    align-items: center;
    min-height: calc(var(--text-base) * var(--leading-normal) + var(--spacing-6));
    border-bottom: 1px solid var(--color-border-subtle);
  }

  // 左右外边距对齐单元格的 12px 内边距
  &__skeleton-cell {
    display: block;
    height: var(--text-base);
    margin: 0 var(--spacing-3);
    border-radius: var(--radius-xs);

    @include ix.skeleton-shimmer;

    // 让骨架读起来像内容而不是条形码
    &:nth-child(4n) {
      margin-right: var(--spacing-10);
    }
  }

  // ============================================
  // 底部分页
  // ============================================

  // 页码/总数同样用等宽数字（继承给分页器），翻页时不左右跳
  &__footer {
    flex-shrink: 0;
    padding: var(--spacing-4) var(--spacing-5);
    font-variant-numeric: tabular-nums;
    background: var(--color-surface-2);
    border-top: 1px solid var(--color-border-subtle);
  }

  &__pagination {
    width: 100%;
  }

  &__total {
    color: var(--color-text-muted);
    font-size: var(--text-sm);
  }

  // 语义色作为「表面上的文字」必须用 -text 角色，保证 ≥ 4.5:1
  &__selected {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
    color: var(--color-primary-text);
    font-size: var(--text-sm);
    font-weight: var(--font-medium);
  }

  // 实色填充上的文字用 on-primary：白字在赛博朋克的霓虹青底上读不出来
  &__selected-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: var(--spacing-5);
    height: var(--spacing-5);
    padding: 0 var(--spacing-2);
    color: var(--color-on-primary);
    font-size: var(--text-xs);
    font-weight: var(--font-semibold);
    background: var(--color-primary);
    border-radius: var(--radius-full);
  }
}

@keyframes data-table-progress {
  from {
    transform: translateX(-100%);
  }

  to {
    transform: translateX(250%);
  }
}
</style>
