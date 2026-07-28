<script setup lang="ts">
/**
 * 菜单表单弹窗
 * Menu Form Modal
 * Requirements: 17.2-17.4 - 创建/更新菜单
 */
import { ref, computed, shallowRef, useTemplateRef, watch } from 'vue'
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
  NSwitch,
  NText,
  useMessage,
} from 'naive-ui'
import type { FormInst, FormRules, TreeSelectOption } from 'naive-ui'
import type { Menu, CreateMenuParams, UpdateMenuParams } from '@/api/types'
import { generateMenu } from '@/api/rbac'
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
const message = useMessage()

/** 表单引用 */
const formRef = useTemplateRef<FormInst>('form')
const aiLoading = shallowRef(false)

/** 表单数据 */
const formData = ref({
  title: '',
  titleEn: '',
  titleJa: '',
  icon: '',
  path: '',
  name: '',
  component: '',
  keepAlive: false,
  parentId: null as number | null,
  sortOrder: 1 as number | null,
})

const isBusy = computed(() => props.loading || aiLoading.value)

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
        path: menu.path || '',
        name: menu.name || '',
        component: menu.component || '',
        keepAlive: menu.keepAlive ?? false,
        parentId: menu.parentId || null,
        sortOrder: menu.sortOrder || 1,
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
    path: '',
    name: '',
    component: '',
    keepAlive: false,
    parentId: props.parentMenu?.id ?? null,
    sortOrder: 1,
  }
  formRef.value?.restoreValidation()
}

/** 处理关闭 */
function handleClose(): void {
  if (isBusy.value) return
  emit('update:visible', false)
}

/** 根据中文标题和现有 menus 数据生成其余字段 */
async function handleAIGenerate(): Promise<void> {
  const title = formData.value.title.trim()
  if (!title) {
    message.warning(t('rbac.menu.aiTitleRequired'))
    return
  }

  aiLoading.value = true
  try {
    const suggestion = await generateMenu({
      title,
      parentId: formData.value.parentId ?? undefined,
    })
    Object.assign(formData.value, suggestion)
    message.success(t('rbac.menu.aiGenerateSuccess'))
  } catch (error: unknown) {
    const description = error instanceof Error ? error.message : ''
    message.error(description || t('rbac.menu.aiGenerateFailed'))
  } finally {
    aiLoading.value = false
  }
}

/** 处理提交 */
async function handleSubmit(): Promise<void> {
  try {
    await formRef.value?.validate()

    const data: CreateMenuParams | UpdateMenuParams = {
      title: formData.value.title,
      titleEn: isEdit.value ? formData.value.titleEn : formData.value.titleEn || undefined,
      titleJa: isEdit.value ? formData.value.titleJa : formData.value.titleJa || undefined,
      icon: isEdit.value ? formData.value.icon : formData.value.icon || undefined,
      path: formData.value.path,
      name: formData.value.name,
      component: formData.value.component,
      keepAlive: formData.value.keepAlive,
      parentId: isEdit.value
        ? (formData.value.parentId ?? 0)
        : (formData.value.parentId ?? undefined),
      sortOrder: formData.value.sortOrder ?? 1,
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
    :close-on-esc="!isBusy"
    @update:show="handleClose"
  >
    <n-card
      :title="modalTitle"
      :bordered="false"
      size="medium"
      role="dialog"
      style="width: min(720px, calc(100vw - 32px))"
      :closable="!isBusy"
      @close="handleClose"
    >
      <!-- 父菜单提示 -->
      <n-alert v-if="parentMenu" type="info" :show-icon="false" style="margin-bottom: 16px">
        {{ t('rbac.menu.parentMenu') }}: {{ parentMenu.title }}
      </n-alert>

      <n-form
        ref="form"
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

        <n-space v-if="!isEdit" class="menu-form__ai" align="center" justify="space-between">
          <n-text depth="3">{{ t('rbac.menu.aiGenerateHint') }}</n-text>
          <n-button
            type="primary"
            secondary
            :loading="aiLoading"
            :disabled="!formData.title.trim() || loading"
            @click="handleAIGenerate"
          >
            {{ t('rbac.menu.aiGenerate') }}
          </n-button>
        </n-space>

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

        <n-form-item :label="t('rbac.menu.routePath')" path="path">
          <n-input
            v-model:value="formData.path"
            :placeholder="t('rbac.menu.routePathPlaceholder')"
            :maxlength="255"
            clearable
          />
        </n-form-item>

        <n-form-item :label="t('rbac.menu.routeName')" path="name">
          <n-input
            v-model:value="formData.name"
            :placeholder="t('rbac.menu.routeNamePlaceholder')"
            :maxlength="100"
            clearable
          />
        </n-form-item>

        <n-form-item :label="t('rbac.menu.component')" path="component">
          <n-input
            v-model:value="formData.component"
            :placeholder="t('rbac.menu.componentPlaceholder')"
            :maxlength="255"
            clearable
          />
        </n-form-item>

        <n-form-item :label="t('rbac.menu.keepAlive')" path="keepAlive">
          <n-switch v-model:value="formData.keepAlive" />
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
            :min="1"
            :max="9999"
            :placeholder="t('rbac.menu.sortOrderPlaceholder')"
            style="width: 100%"
          />
        </n-form-item>
      </n-form>

      <template #footer>
        <n-space justify="end">
          <n-button :disabled="isBusy" @click="handleClose">
            {{ t('common.cancel') }}
          </n-button>
          <n-button type="primary" :loading="isBusy" @click="handleSubmit">
            {{ t('common.confirm') }}
          </n-button>
        </n-space>
      </template>
    </n-card>
  </n-modal>
</template>

<style scoped lang="scss">
.menu-form__ai {
  margin: calc(var(--spacing-2) * -1) 0 var(--spacing-4) var(--spacing-24);
  padding: var(--spacing-3);
  background: var(--color-primary-subtle);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-md);
}
</style>
