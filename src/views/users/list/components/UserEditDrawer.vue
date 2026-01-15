<script setup lang="ts">
/**
 * 用户编辑抽屉组件
 * User Edit Drawer Component
 * Requirements: 8.3
 */
import { ref, watch, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useMutation } from '@tanstack/vue-query'
import {
  NDrawer,
  NDrawerContent,
  NForm,
  NFormItem,
  NInput,
  NSelect,
  NDatePicker,
  NButton,
  NSpace,
  NSpin,
  useMessage,
} from 'naive-ui'
import type { FormInst, FormRules } from 'naive-ui'
import { updateUserInfo } from '@/api/user'
import type { AdminUserListItem, UpdateUserInfoParams, Gender } from '@/api/types'
import { AppAvatar } from '@/components/common'
import { ImageUpload } from '@/components/form'

interface Props {
  /** 是否显示 */
  visible: boolean
  /** 用户数据 */
  user: AdminUserListItem | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:visible': [visible: boolean]
  success: []
}>()

const { t } = useI18n()
const message = useMessage()

/** 表单实例 */
const formRef = ref<FormInst | null>(null)

/** 表单数据 */
const formData = ref<{
  username: string
  avatar: string
  description: string
  gender: Gender
  birthday: number | null
}>({
  username: '',
  avatar: '',
  description: '',
  gender: 0,
  birthday: null,
})

/** 性别选项 */
const genderOptions = computed(() => [
  { value: 0, label: t('user.edit.genderOptions.unknown') },
  { value: 1, label: t('user.edit.genderOptions.male') },
  { value: 2, label: t('user.edit.genderOptions.female') },
])

/** 表单验证规则 */
const rules: FormRules = {
  username: [
    {
      required: true,
      message: () => t('common.tips.required'),
      trigger: ['blur', 'input'],
    },
    {
      min: 2,
      max: 20,
      message: () => t('user.edit.usernameLength'),
      trigger: ['blur', 'input'],
    },
  ],
}

/** 更新用户信息 mutation */
const { mutate: updateUser, isPending } = useMutation({
  mutationFn: (params: UpdateUserInfoParams) => updateUserInfo(params),
  onSuccess: () => {
    emit('success')
  },
  onError: (error: Error) => {
    message.error(error.message || t('common.tips.updateFailed'))
  },
})

/** 监听用户数据变化，初始化表单 */
watch(
  () => props.user,
  (user) => {
    if (user) {
      formData.value = {
        username: user.username || '',
        avatar: user.avatar || '',
        description: '',
        gender: 0,
        birthday: null,
      }
    }
  },
  { immediate: true }
)

/** 处理关闭 */
function handleClose(): void {
  emit('update:visible', false)
}

/** 处理头像变化 */
function handleAvatarChange(urls: string[]): void {
  formData.value.avatar = urls[0] || ''
}

/** 处理提交 */
async function handleSubmit(): Promise<void> {
  if (!props.user) return

  try {
    await formRef.value?.validate()

    const params: UpdateUserInfoParams = {
      userId: props.user.id,
      username: formData.value.username,
      avatar: formData.value.avatar || undefined,
      description: formData.value.description || undefined,
      gender: formData.value.gender,
      birthday: formData.value.birthday
        ? new Date(formData.value.birthday).toISOString().split('T')[0]
        : undefined,
    }

    updateUser(params)
  } catch {
    // 表单验证失败
  }
}
</script>

<template>
  <n-drawer :show="visible" :width="480" placement="right" @update:show="handleClose">
    <n-drawer-content :title="t('user.edit.title')" closable>
      <n-spin :show="isPending">
        <n-form
          ref="formRef"
          :model="formData"
          :rules="rules"
          label-placement="left"
          label-width="100"
          require-mark-placement="right-hanging"
        >
          <!-- 头像预览 -->
          <n-form-item :label="t('user.edit.avatar')">
            <n-space vertical align="center" :size="12">
              <app-avatar :src="formData.avatar" :text="formData.username" :size="80" />
              <image-upload
                :value="formData.avatar ? [formData.avatar] : []"
                :max="1"
                :max-size="2"
                list-type="text"
                @change="handleAvatarChange"
              />
            </n-space>
          </n-form-item>

          <!-- 用户名 -->
          <n-form-item :label="t('user.edit.username')" path="username">
            <n-input
              v-model:value="formData.username"
              :placeholder="t('common.form.pleaseInput')"
              maxlength="20"
              show-count
            />
          </n-form-item>

          <!-- 邮箱（只读） -->
          <n-form-item :label="t('user.edit.email')">
            <n-input :value="user?.email" disabled />
          </n-form-item>

          <!-- 个人简介 -->
          <n-form-item :label="t('user.edit.description')" path="description">
            <n-input
              v-model:value="formData.description"
              type="textarea"
              :placeholder="t('common.form.pleaseInput')"
              :rows="3"
              maxlength="200"
              show-count
            />
          </n-form-item>

          <!-- 性别 -->
          <n-form-item :label="t('user.edit.gender')" path="gender">
            <n-select v-model:value="formData.gender" :options="genderOptions" />
          </n-form-item>

          <!-- 生日 -->
          <n-form-item :label="t('user.edit.birthday')" path="birthday">
            <n-date-picker
              v-model:value="formData.birthday"
              type="date"
              :placeholder="t('common.form.pleaseSelect')"
              style="width: 100%"
              clearable
            />
          </n-form-item>
        </n-form>
      </n-spin>

      <template #footer>
        <n-space justify="end">
          <n-button @click="handleClose">{{ t('common.cancel') }}</n-button>
          <n-button type="primary" :loading="isPending" @click="handleSubmit">
            {{ t('common.save') }}
          </n-button>
        </n-space>
      </template>
    </n-drawer-content>
  </n-drawer>
</template>
