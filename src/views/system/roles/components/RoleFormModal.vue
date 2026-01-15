<script setup lang="ts">
/**
 * 角色表单弹窗
 * Role Form Modal
 * Requirements: 16.1-16.3 - 创建/更新角色
 */
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { NModal, NCard, NForm, NFormItem, NInput, NSelect, NSpace, NButton } from 'naive-ui'
import type { FormInst, FormRules, SelectOption } from 'naive-ui'
import type { Role, CreateRoleParams, UpdateRoleParams } from '@/api/types'

interface Props {
  /** 是否显示 */
  visible: boolean
  /** 编辑的角色（null 表示创建） */
  role?: Role | null
  /** 所有角色列表（用于复制功能） */
  roles?: Role[]
  /** 加载状态 */
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  role: null,
  roles: () => [],
  loading: false,
})

const emit = defineEmits<{
  'update:visible': [value: boolean]
  submit: [data: CreateRoleParams | UpdateRoleParams]
}>()

const { t } = useI18n()

/** 表单引用 */
const formRef = ref<FormInst | null>(null)

/** 表单数据 */
const formData = ref({
  name: '',
  desc: '',
  copyRoleId: null as number | null,
})

/** 是否编辑模式 */
const isEdit = computed(() => !!props.role)

/** 弹窗标题 */
const modalTitle = computed(() => (isEdit.value ? t('rbac.role.edit') : t('rbac.role.create')))

/** 可复制的角色选项（排除当前编辑的角色） */
const copyRoleOptions = computed<SelectOption[]>(() => {
  return props.roles
    .filter((r) => !props.role || r.id !== props.role.id)
    .map((r) => ({
      value: r.id,
      label: r.name,
    }))
})

/** 表单验证规则 */
const rules: FormRules = {
  name: [
    {
      required: true,
      message: () => t('rbac.role.nameRequired'),
      trigger: ['blur', 'input'],
    },
    {
      min: 2,
      max: 50,
      message: () => t('rbac.role.nameLength'),
      trigger: ['blur', 'input'],
    },
  ],
}

/** 监听 role 变化，初始化表单 */
watch(
  () => props.role,
  (role) => {
    if (role) {
      formData.value = {
        name: role.name,
        desc: role.desc || '',
        copyRoleId: null,
      }
    } else {
      resetForm()
    }
  },
  { immediate: true }
)

/** 监听 visible 变化 */
watch(
  () => props.visible,
  (visible) => {
    if (!visible) {
      // 关闭时重置表单
      resetForm()
    }
  }
)

/** 重置表单 */
function resetForm(): void {
  formData.value = {
    name: '',
    desc: '',
    copyRoleId: null,
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

    if (isEdit.value) {
      // 更新角色
      emit('submit', {
        roleId: props.role!.id,
        name: formData.value.name,
        desc: formData.value.desc || undefined,
      } as UpdateRoleParams)
    } else {
      // 创建角色
      const params: CreateRoleParams = {
        name: formData.value.name,
        desc: formData.value.desc || undefined,
      }
      if (formData.value.copyRoleId) {
        params.copyRoleId = formData.value.copyRoleId
      }
      emit('submit', params)
    }
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
      style="width: 480px"
      :closable="!loading"
      @close="handleClose"
    >
      <n-form
        ref="formRef"
        :model="formData"
        :rules="rules"
        label-placement="left"
        label-width="100"
        require-mark-placement="right-hanging"
      >
        <n-form-item :label="t('rbac.role.name')" path="name" required>
          <n-input
            v-model:value="formData.name"
            :placeholder="t('rbac.role.namePlaceholder')"
            :maxlength="50"
            show-count
            clearable
          />
        </n-form-item>

        <n-form-item :label="t('rbac.role.description')" path="desc">
          <n-input
            v-model:value="formData.desc"
            type="textarea"
            :placeholder="t('rbac.role.descriptionPlaceholder')"
            :maxlength="200"
            show-count
            :rows="3"
          />
        </n-form-item>

        <!-- 仅创建时显示复制选项 -->
        <n-form-item v-if="!isEdit" :label="t('rbac.role.copyFrom')" path="copyRoleId">
          <n-select
            v-model:value="formData.copyRoleId"
            :options="copyRoleOptions"
            :placeholder="t('rbac.role.copyFromPlaceholder')"
            clearable
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
