<script setup lang="ts">
/**
 * 通知表单弹窗
 * Notification Form Modal
 * Requirements: 15.2-15.3 - 创建/更新通知
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
  NRadioGroup,
  NRadio,
  NSpace,
  NButton,
} from 'naive-ui'
import type { FormInst, FormRules } from 'naive-ui'
import type { NotificationItem } from '@/api/types'

interface Props {
  /** 是否显示 */
  visible: boolean
  /** 编辑的通知（null 表示创建） */
  notification?: NotificationItem | null
  /** 加载状态 */
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  notification: null,
  loading: false,
})

const emit = defineEmits<{
  'update:visible': [value: boolean]
  submit: [
    data: {
      title: string
      content: string
      receiverId: number
      videoId?: number
      videoTitle?: string
      link?: string
    },
  ]
}>()

const { t } = useI18n()

/** 表单引用 */
const formRef = ref<FormInst | null>(null)

/** 接收者类型 */
const receiverType = ref<'all' | 'user'>('all')

/** 表单数据 */
const formData = ref({
  title: '',
  content: '',
  receiverId: -1 as number,
  videoId: null as number | null,
  videoTitle: '',
  link: '',
})

/** 是否编辑模式 */
const isEdit = computed(() => !!props.notification)

/** 弹窗标题 */
const modalTitle = computed(() =>
  isEdit.value ? t('notification.form.editTitle') : t('notification.form.createTitle')
)

/** 表单验证规则 */
const rules: FormRules = {
  title: [
    {
      required: true,
      message: () => t('notification.form.titleRequired'),
      trigger: ['blur', 'input'],
    },
  ],
  content: [
    {
      required: true,
      message: () => t('notification.form.contentRequired'),
      trigger: ['blur', 'input'],
    },
  ],
}

/** 监听 notification 变化，初始化表单 */
watch(
  () => props.notification,
  (notification) => {
    if (notification) {
      formData.value = {
        title: notification.title,
        content: notification.content,
        receiverId: notification.receiverID,
        videoId: notification.videoID || null,
        videoTitle: notification.videoTitle || '',
        link: notification.link || '',
      }
      receiverType.value = notification.receiverID === -1 ? 'all' : 'user'
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

/** 监听接收者类型变化 */
watch(receiverType, (type) => {
  if (type === 'all') {
    formData.value.receiverId = -1
  } else if (formData.value.receiverId === -1) {
    formData.value.receiverId = 0
  }
})

/** 重置表单 */
function resetForm(): void {
  formData.value = {
    title: '',
    content: '',
    receiverId: -1,
    videoId: null,
    videoTitle: '',
    link: '',
  }
  receiverType.value = 'all'
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

    emit('submit', {
      title: formData.value.title,
      content: formData.value.content,
      receiverId: formData.value.receiverId,
      videoId: formData.value.videoId || undefined,
      videoTitle: formData.value.videoTitle || undefined,
      link: formData.value.link || undefined,
    })
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
      style="width: 600px"
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
        <n-form-item :label="t('notification.form.title')" path="title" required>
          <n-input
            v-model:value="formData.title"
            :placeholder="t('notification.form.titlePlaceholder')"
            :maxlength="100"
            show-count
          />
        </n-form-item>

        <n-form-item :label="t('notification.form.content')" path="content" required>
          <n-input
            v-model:value="formData.content"
            type="textarea"
            :placeholder="t('notification.form.contentPlaceholder')"
            :rows="4"
            :maxlength="500"
            show-count
          />
        </n-form-item>

        <n-form-item :label="t('notification.form.receiver')" path="receiverId">
          <n-space vertical :size="12" style="width: 100%">
            <n-radio-group v-model:value="receiverType">
              <n-space>
                <n-radio value="all">{{ t('notification.receiver.all') }}</n-radio>
                <n-radio value="user">{{ t('notification.receiver.specific') }}</n-radio>
              </n-space>
            </n-radio-group>
            <n-input-number
              v-if="receiverType === 'user'"
              :value="formData.receiverId"
              :placeholder="t('notification.form.receiverIdPlaceholder')"
              :min="1"
              style="width: 100%"
              @update:value="(val) => (formData.receiverId = val ?? 0)"
            />
          </n-space>
        </n-form-item>

        <n-form-item :label="t('notification.form.link')" path="link">
          <n-input
            v-model:value="formData.link"
            :placeholder="t('notification.form.linkPlaceholder')"
            clearable
          />
        </n-form-item>

        <n-form-item :label="t('notification.form.videoId')" path="videoId">
          <n-input-number
            v-model:value="formData.videoId"
            :placeholder="t('notification.form.videoIdPlaceholder')"
            :min="1"
            style="width: 100%"
            clearable
          />
        </n-form-item>

        <n-form-item :label="t('notification.form.videoTitle')" path="videoTitle">
          <n-input
            v-model:value="formData.videoTitle"
            :placeholder="t('notification.form.videoTitlePlaceholder')"
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
