<script setup lang="ts">
/**
 * 角色选择器组件
 * Role Selector Component
 * Requirements: 18.11 - 支持单选/多选、搜索、下拉展示
 */
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useQuery } from '@tanstack/vue-query'
import { NSelect } from 'naive-ui'
import type { SelectOption } from 'naive-ui'
import { getRoles } from '@/api/rbac'

interface Props {
  /** 选中的值（单选时为 number，多选时为 number[]） */
  value?: number | number[] | null
  /** 是否多选 */
  multiple?: boolean
  /** 是否禁用 */
  disabled?: boolean
  /** 占位符 */
  placeholder?: string
  /** 是否可清除 */
  clearable?: boolean
  /** 尺寸 */
  size?: 'small' | 'medium' | 'large'
  /** 最大标签数量（多选时） */
  maxTagCount?: number | 'responsive'
}

const props = withDefaults(defineProps<Props>(), {
  value: null,
  multiple: false,
  disabled: false,
  placeholder: undefined,
  clearable: true,
  size: 'medium',
  maxTagCount: 'responsive',
})

const emit = defineEmits<{
  'update:value': [value: number | number[] | null]
  change: [value: number | number[] | null]
}>()

const { t } = useI18n()

/** 获取角色列表 */
const { data: roleList, isLoading } = useQuery({
  queryKey: ['roleList'],
  queryFn: getRoles,
  staleTime: 60 * 1000,
})

/** 角色选项 */
const roleOptions = computed<SelectOption[]>(() => {
  return (roleList.value ?? []).map((role) => ({
    label: role.name,
    value: role.id,
    desc: role.desc,
  }))
})

/** 默认占位符 */
const defaultPlaceholder = computed(() => {
  return (
    props.placeholder || (props.multiple ? t('rbac.role.selectRoles') : t('rbac.role.selectRole'))
  )
})

/** 处理值变化 */
function handleUpdate(value: number | number[] | null): void {
  emit('update:value', value)
  emit('change', value)
}

/** 渲染标签 */
function renderTag({ option }: { option: SelectOption }): string {
  return option.label as string
}

/** 渲染选项 */
function renderLabel(option: SelectOption): string {
  const desc = option.desc as string | undefined
  const label = String(option.label ?? '')
  if (desc) {
    return label + ' (' + desc + ')'
  }
  return label
}
</script>

<template>
  <n-select
    :value="value"
    :options="roleOptions"
    :multiple="multiple"
    :disabled="disabled"
    :placeholder="defaultPlaceholder"
    :clearable="clearable"
    :size="size"
    :loading="isLoading"
    :max-tag-count="maxTagCount"
    :render-tag="renderTag"
    :render-label="renderLabel"
    filterable
    @update:value="handleUpdate"
  />
</template>
