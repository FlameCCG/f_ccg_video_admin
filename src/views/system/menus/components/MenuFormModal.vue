<script setup lang="ts">
/**
 * 菜单表单弹窗
 * Menu Form Modal
 * Requirements: 17.2-17.4 - 创建/更新菜单
 */
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  NModal,
  NCard,
  NForm,
  NFormItem,
  NInput,
  NInputNumber,
  NTreeSelect,
  NSpace,
  NButton,
  NAlert,
} from 'naive-ui'
import type { FormInst, FormRules, TreeSelectOption } from 'naive-ui'
import type { Menu, CreateMenuParams, UpdateMenuParams } from '@/api/types'
import { SvgInput } from '@/components/common'

interface Props {
  /** 是否显示 */
  visible: boolean
  /** 编辑的菜单（null 表示创建） */
  menu?: Menu | null
  /** 父菜单（创建子菜单时使用） */
  parentMenu?: Menu | null
  /** 所有菜单列表 */
  menus?: Menu[]
  /** 加载状态 */
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  menu: null,
  parentMenu: null,
  menus: () => [],
  loading: false,
})

const emit = defineEmits<{
  'update:visible': [value: boolean]
  submit: [data: CreateMenuParams | UpdateMenuParams]
}>()

const { t } = useI18n()

/** 表单引用 */
const formRef = ref<FormInst | null>(null)

/** 表单数据 */
const formData = ref({
  title: '',
  titleEn: '',
  titleJa: '',
  icon: '',
  parentId: null as number | null,
  sortOrder: 0 as number | null,
})

/** 是否编辑模式 */
const isEdit = computed(() => !!props.menu)

/** 弹窗标题 */
const modalTitle = computed(() => {
  if (isEdit.value) return t('rbac.menu.edit')
  if (props.parentMenu) return t('rbac.menu.addChild')
  return t('rbac.menu.create')
})

/** 菜单树选项（排除当前编辑的菜单及其子菜单） */
const menuTreeOptions = computed<TreeSelectOption[]>(() => {
  const buildOptions = (menus: Menu[], excludeId?: number): TreeSelectOption[] => {
    return menus
      .filter((m) => m.id !== excludeId)
      .map((m) => ({
        key: m.id,
        label: m.title,
        children: m.children ? buildOptions(m.children, excludeId) : undefined,
      }))
  }
  return buildOptions(props.menus, props.menu?.id)
})

/** 表单验证规则 */
const rules: FormRules = {
  title: [
    {
      required: true,
      message: () => t('rbac.menu.titleRequired'),
      trigger: ['blur', 'input'],
    },
  ],
}

/** 监听 menu 变化，初始化表单 */
watch(
  () => props.menu,
  (menu) => {
    if (menu) {
      formData.value = {
        title: menu.title,
        titleEn: menu.titleEn || '',
        titleJa: menu.titleJa || '',
        icon: menu.icon || '',
        parentId: menu.parentId || null,
        sortOrder: menu.sortOrder || 0,
      }
    } else {
      resetForm()
    }
  },
  { immediate: true }
)

/** 监听 parentMenu 变化 */
watch(
  () => props.parentMenu,
  (parent) => {
    if (parent && !props.menu) {
      formData.value.parentId = parent.id
    }
  },
  { immediate: true }
)

/** 监听 visible 变化 */
watch(
  () => props.visible,
  (visible) => {
    if (!visible) {
      resetForm()
    }
  }
)

/** 重置表单 */
function resetForm(): void {
  formData.value = {
    title: '',
    titleEn: '',
    titleJa: '',
    icon: '',
    parentId: props.parentMenu?.id ?? null,
    sortOrder: 0,
  }
  formRef.value?.restoreValidation()
}

/** 处理关闭 */
function handleClose(): void {
  emit('update:visible', false)
}

/** 处理提交 */
async function handleSubmit(): Promise<void> {
  try {
    await formRef.value?.validate()

    const data: CreateMenuParams | UpdateMenuParams = {
      title: formData.value.title,
      titleEn: formData.value.titleEn || undefined,
      titleJa: formData.value.titleJa || undefined,
      icon: formData.value.icon || undefined,
      parentId: formData.value.parentId ?? undefined,
      sortOrder: formData.value.sortOrder ?? 0,
    }

    emit('submit', data)
  } catch {
    // 验证失败
  }
}
</script>

<template>
  <n-modal
    :show="visible"
    :mask-closable="false"
    :close-on-esc="!loading"
    @update:show="handleClose"
  >
    <n-card
      :title="modalTitle"
      :bordered="false"
      size="medium"
      role="dialog"
      style="width: 560px"
      :closable="!loading"
      @close="handleClose"
    >
      <!-- 父菜单提示 -->
      <n-alert v-if="parentMenu" type="info" :show-icon="false" style="margin-bottom: 16px">
        {{ t('rbac.menu.parentMenu') }}: {{ parentMenu.title }}
      </n-alert>

      <n-form
        ref="formRef"
        :model="formData"
        :rules="rules"
        label-placement="left"
        label-width="100"
        require-mark-placement="right-hanging"
      >
        <n-form-item :label="t('rbac.menu.nameZh')" path="title" required>
          <n-input
            v-model:value="formData.title"
            :placeholder="t('rbac.menu.namePlaceholder')"
            :maxlength="50"
            show-count
            clearable
          />
        </n-form-item>

        <n-form-item :label="t('rbac.menu.nameEn')" path="titleEn">
          <n-input
            v-model:value="formData.titleEn"
            :placeholder="t('rbac.menu.nameEnPlaceholder')"
            :maxlength="50"
            show-count
            clearable
          />
        </n-form-item>

        <n-form-item :label="t('rbac.menu.nameJa')" path="titleJa">
          <n-input
            v-model:value="formData.titleJa"
            :placeholder="t('rbac.menu.nameJaPlaceholder')"
            :maxlength="50"
            show-count
            clearable
          />
        </n-form-item>

        <n-form-item :label="t('rbac.menu.icon')" path="icon">
          <svg-input v-model:value="formData.icon" :preview-size="24" />
        </n-form-item>

        <n-form-item v-if="!parentMenu" :label="t('rbac.menu.parentMenu')" path="parentId">
          <n-tree-select
            v-model:value="formData.parentId"
            :options="menuTreeOptions"
            :placeholder="t('rbac.menu.parentMenuPlaceholder')"
            clearable
            default-expand-all
          />
        </n-form-item>

        <n-form-item :label="t('rbac.menu.sortOrder')" path="sortOrder">
          <n-input-number
            v-model:value="formData.sortOrder"
            :min="0"
            :max="9999"
            :placeholder="t('rbac.menu.sortOrderPlaceholder')"
            style="width: 100%"
          />
        </n-form-item>
      </n-form>

      <template #footer>
        <n-space justify="end">
          <n-button :disabled="loading" @click="handleClose">
            {{ t('common.cancel') }}
          </n-button>
          <n-button type="primary" :loading="loading" @click="handleSubmit">
            {{ t('common.confirm') }}
          </n-button>
        </n-space>
      </template>
    </n-card>
  </n-modal>
</template>
