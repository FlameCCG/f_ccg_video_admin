<script setup lang="ts">
/**
 * 日期范围选择组件
 * 用于表格筛选的日期范围选择
 * Requirements: 8.2, 9.2
 */
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { NDatePicker } from 'naive-ui'
import type { Shortcuts } from 'naive-ui/es/date-picker/src/interface'

type DateRange = [number, number]

interface Props {
  /** 选中的日期范围 [开始时间戳, 结束时间戳] */
  value?: DateRange | null
  /** 开始日期占位文字 */
  startPlaceholder?: string
  /** 结束日期占位文字 */
  endPlaceholder?: string
  /** 是否可清除 */
  clearable?: boolean
  /** 是否禁用 */
  disabled?: boolean
  /** 日期格式 */
  format?: string
  /** 值格式 */
  valueFormat?: string
  /** 尺寸 */
  size?: 'small' | 'medium' | 'large'
  /** 是否显示时间 */
  showTime?: boolean
  /** 快捷选项 */
  shortcuts?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  value: null,
  startPlaceholder: undefined,
  endPlaceholder: undefined,
  clearable: true,
  disabled: false,
  format: 'yyyy-MM-dd',
  valueFormat: undefined,
  size: 'medium',
  showTime: false,
  shortcuts: true,
})

const emit = defineEmits<{
  'update:value': [value: DateRange | null]
  change: [value: DateRange | null]
}>()

const { t } = useI18n()

/** 快捷选项配置 */
const shortcutOptions = computed<Shortcuts | undefined>(() => {
  if (!props.shortcuts) return undefined

  const now = Date.now()
  const day = 24 * 60 * 60 * 1000

  return {
    [t('common.time.today')]: () => {
      const start = new Date()
      start.setHours(0, 0, 0, 0)
      const end = new Date()
      end.setHours(23, 59, 59, 999)
      return [start.getTime(), end.getTime()] as const
    },
    [t('common.time.yesterday')]: () => {
      const start = new Date(now - day)
      start.setHours(0, 0, 0, 0)
      const end = new Date(now - day)
      end.setHours(23, 59, 59, 999)
      return [start.getTime(), end.getTime()] as const
    },
    [t('common.time.recent7Days')]: () => {
      const start = new Date(now - 6 * day)
      start.setHours(0, 0, 0, 0)
      const end = new Date()
      end.setHours(23, 59, 59, 999)
      return [start.getTime(), end.getTime()] as const
    },
    [t('common.time.recent30Days')]: () => {
      const start = new Date(now - 29 * day)
      start.setHours(0, 0, 0, 0)
      const end = new Date()
      end.setHours(23, 59, 59, 999)
      return [start.getTime(), end.getTime()] as const
    },
    [t('common.time.thisMonth')]: () => {
      const start = new Date()
      start.setDate(1)
      start.setHours(0, 0, 0, 0)
      const end = new Date()
      end.setHours(23, 59, 59, 999)
      return [start.getTime(), end.getTime()] as const
    },
    [t('common.time.lastMonth')]: () => {
      const start = new Date()
      start.setMonth(start.getMonth() - 1)
      start.setDate(1)
      start.setHours(0, 0, 0, 0)
      const end = new Date()
      end.setDate(0)
      end.setHours(23, 59, 59, 999)
      return [start.getTime(), end.getTime()] as const
    },
  }
})

/** 开始日期占位文字 */
const displayStartPlaceholder = computed(() => {
  return props.startPlaceholder || t('common.form.startDate')
})

/** 结束日期占位文字 */
const displayEndPlaceholder = computed(() => {
  return props.endPlaceholder || t('common.form.endDate')
})

/** 处理值变化 */
function handleUpdate(value: DateRange | null): void {
  emit('update:value', value)
  emit('change', value)
}
</script>

<template>
  <n-date-picker
    :value="value"
    type="daterange"
    :format="format"
    :value-format="valueFormat"
    :clearable="clearable"
    :disabled="disabled"
    :size="size"
    :shortcuts="shortcutOptions"
    :start-placeholder="displayStartPlaceholder"
    :end-placeholder="displayEndPlaceholder"
    class="date-range-picker"
    @update:value="handleUpdate"
  />
</template>

<style scoped lang="scss">
.date-range-picker {
  min-width: 260px;
}
</style>
