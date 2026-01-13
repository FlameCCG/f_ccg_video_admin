<script setup lang="ts">
/**
 * 筛选下拉框组件
 * 用于表格筛选的下拉选择
 * Requirements: 8.2, 9.2
 */
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { NSelect } from 'naive-ui'
import type { SelectOption } from 'naive-ui'

interface FilterOption {
  /** 选项值 */
  value: string | number
  /** 选项标签 */
  label: string
  /** 是否禁用 */
  disabled?: boolean
}

interface Props {
  /** 选中值 */
  value?: string | number | null
  /** 选项列表 */
  options: FilterOption[]
  /** 占位文字 */
  placeholder?: string
  /** 是否可清除 */
  clearable?: boolean
  /** 是否禁用 */
  disabled?: boolean
  /** 是否可搜索 */
  filterable?: boolean
  /** 是否多选 */
  multiple?: boolean
  /** 宽度 */
  width?: string | number
  /** 是否显示"全部"选项 */
  showAll?: boolean
  /** "全部"选项的值 */
  allValue?: string | number | null
  /** "全部"选项的标签 */
  allLabel?: string
  /** 尺寸 */
  size?: 'tiny' | 'small' | 'medium' | 'large'
  /** 加载状态 */
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  value: null,
  placeholder: undefined,
  clearable: true,
  disabled: false,
  filterable: false,
  multiple: false,
  width: 180,
  showAll: true,
  allValue: null,
  allLabel: undefined,
  size: 'medium',
  loading: false,
})

const emit = defineEmits<{
  'update:value': [value: string | number | null]
  change: [value: string | number | null]
}>()

const { t } = useI18n()

/** 完整选项列表（包含"全部"） */
const fullOptions = computed<SelectOption[]>(() => {
  const options: SelectOption[] = props.options.map((opt) => ({
    value: opt.value,
    label: opt.label,
    disabled: opt.disabled,
  }))

  if (props.showAll) {
    options.unshift({
      value: props.allValue as string | number,
      label: props.allLabel || t('common.all'),
    })
  }

  return options
})

/** 占位文字 */
const displayPlaceholder = computed(() => {
  return props.placeholder || t('common.form.pleaseSelect')
})

/** 宽度样式 */
const widthStyle = computed(() => {
  if (typeof props.width === 'number') {
    return `${props.width}px`
  }
  return props.width
})

/** 处理值变化 */
function handleUpdate(value: string | number | null): void {
  emit('update:value', value)
  emit('change', value)
}
</script>

<template>
  <n-select
    :value="value"
    :options="fullOptions"
    :placeholder="displayPlaceholder"
    :clearable="clearable"
    :disabled="disabled"
    :filterable="filterable"
    :multiple="multiple"
    :size="size"
    :loading="loading"
    :style="{ width: widthStyle }"
    class="filter-select"
    @update:value="handleUpdate"
  />
</template>

<style scoped lang="scss">
.filter-select {
  // 样式由 Naive UI 处理
}
</style>
