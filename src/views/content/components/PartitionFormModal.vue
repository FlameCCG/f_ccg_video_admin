<script setup lang="ts">
/**
 * 分区表单弹窗组件
 * Partition Form Modal Component
 * Requirements: 10.2, 10.3 - 创建/编辑分区
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
  NSwitch,
  NSpace,
  NButton,
} from 'naive-ui'
import type { FormInst, FormRules } from 'naive-ui'
import type { Partition, CreatePartitionParams } from '@/api/types'
import { SvgInput } from '@/components/common'

interface Props {
  visible: boolean
  partition: Partition | null
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
})

const emit = defineEmits<{
  'update:visible': [value: boolean]
  submit: [data: CreatePartitionParams]
}>()

const { t } = useI18n()

/** 表单引用 */
const formRef = ref<FormInst | null>(null)

/** 表单数据类型（允许 sortOrder 为 null） */
interface FormData {
  name: string
  icon: string
  sortOrder: number | null
  isActive: boolean
  isSubmittable: boolean
}

/** 表单数据 */
const formData = ref<FormData>({
  name: '',
  icon: '',
  sortOrder: 0,
  isActive: true,
  isSubmittable: true,
})

/** 是否编辑模式 */
const isEdit = computed(() => props.partition !== null)

/** 弹窗标题 */
const modalTitle = computed(() =>
  isEdit.value ? t('video.partition.edit') : t('video.partition.create')
)

/** 表单验证规则 */
const rules: FormRules = {
  name: [
    {
      required: true,
      message: t('common.tips.required'),
      trigger: ['blur', 'input'],
    },
  ],
}

/** 监听 partition 变化，初始化表单数据 */
watch(
  () => props.partition,
  (newPartition) => {
    if (newPartition) {
      formData.value = {
        name: newPartition.name,
        icon: newPartition.icon || '',
        sortOrder: newPartition.sortOrder,
        isActive: newPartition.isActive,
        isSubmittable: newPartition.isSubmittable,
      }
    } else {
      formData.value = {
        name: '',
        icon: '',
        sortOrder: 0,
        isActive: true,
        isSubmittable: true,
      }
    }
  },
  { immediate: true }
)

/** 监听 visible 变化，重置表单 */
watch(
  () => props.visible,
  (newVisible) => {
    if (!newVisible) {
      formRef.value?.restoreValidation()
    }
  }
)

/** 关闭弹窗 */
function handleClose(): void {
  emit('update:visible', false)
}

/** 提交表单 */
async function handleSubmit(): Promise<void> {
  try {
    await formRef.value?.validate()
    // Convert null to undefined for sortOrder
    const submitData: CreatePartitionParams = {
      name: formData.value.name,
      icon: formData.value.icon || undefined,
      sortOrder: formData.value.sortOrder ?? undefined,
      isActive: formData.value.isActive,
      isSubmittable: formData.value.isSubmittable,
    }
    emit('submit', submitData)
  } catch {
    // 验证失败
  }
}
</script>

<template>
  <n-modal :show="visible" :mask-closable="false" @update:show="handleClose">
    <n-card
      :title="modalTitle"
      :bordered="false"
      style="width: 540px"
      closable
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
        <n-form-item :label="t('video.partition.name')" path="name">
          <n-input
            v-model:value="formData.name"
            :placeholder="t('common.form.pleaseInput')"
            maxlength="50"
            show-count
          />
        </n-form-item>

        <n-form-item :label="t('video.partition.icon')" path="icon">
          <svg-input v-model:value="formData.icon" :preview-size="24" />
        </n-form-item>

        <n-form-item :label="t('video.partition.sortOrder')" path="sortOrder">
          <n-input-number
            v-model:value="formData.sortOrder"
            :min="0"
            :max="9999"
            style="width: 100%"
          />
        </n-form-item>

        <n-form-item :label="t('video.partition.isActive')" path="isActive">
          <n-switch v-model:value="formData.isActive" />
        </n-form-item>

        <n-form-item :label="t('video.partition.isSubmittable')" path="isSubmittable">
          <n-switch v-model:value="formData.isSubmittable" />
        </n-form-item>
      </n-form>

      <template #footer>
        <n-space justify="end">
          <n-button @click="handleClose">
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
