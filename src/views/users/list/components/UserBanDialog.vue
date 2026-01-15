<script setup lang="ts">
/**
 * 用户封禁对话框组件
 * User Ban Dialog Component
 * Requirements: 8.4
 */
import { ref, watch, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useMutation } from '@tanstack/vue-query'
import {
  NModal,
  NForm,
  NFormItem,
  NInputNumber,
  NInput,
  NSwitch,
  NSpace,
  NAlert,
  useMessage,
} from 'naive-ui'
import type { FormInst, FormRules } from 'naive-ui'
import { banUser } from '@/api/user'
import type { AdminUserListItem, BanUserParams, UserStatus } from '@/api/types'
import { AppAvatar } from '@/components/common'

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

/** 是否为解封操作 */
const isUnban = computed(() => props.user?.status !== 1)

/** 表单数据 */
const formData = ref({
  days: 7 as number | null,
  reason: '',
  permanent: false,
})

/** 表单验证规则 */
const rules = computed<FormRules>(() => ({
  days: [
    {
      required: !formData.value.permanent && !isUnban.value,
      type: 'number',
      min: 1,
      max: 3650,
      message: () => t('user.ban.daysRequired'),
      trigger: ['blur', 'change'],
    },
  ],
  reason: [
    {
      required: !isUnban.value,
      message: () => t('common.tips.required'),
      trigger: ['blur', 'input'],
    },
  ],
}))

/** 封禁用户 mutation */
const { mutate: doBanUser, isPending } = useMutation({
  mutationFn: (params: BanUserParams) => banUser(params),
  onSuccess: () => {
    const successMsg = isUnban.value ? t('user.ban.unbanSuccess') : t('user.ban.banSuccess')
    message.success(successMsg)
    emit('success')
  },
  onError: (error: Error) => {
    message.error(error.message || t('common.tips.operationFailed'))
  },
})

/** 监听显示状态，重置表单 */
watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      formData.value = {
        days: 7 as number | null,
        reason: '',
        permanent: false,
      }
    }
  }
)

/** 处理关闭 */
function handleClose(): void {
  emit('update:visible', false)
}

/** 处理提交 */
async function handleSubmit(): Promise<void> {
  if (!props.user) return

  try {
    await formRef.value?.validate()

    let status: UserStatus
    if (isUnban.value) {
      // 解封
      status = 1
    } else if (formData.value.permanent) {
      // 永久封禁
      status = 3
    } else {
      // 临时封禁
      status = 2
    }

    const params: BanUserParams = {
      userId: props.user.id,
      status,
      days: isUnban.value
        ? undefined
        : formData.value.permanent
          ? undefined
          : (formData.value.days ?? undefined),
      reason: isUnban.value ? undefined : formData.value.reason,
    }

    doBanUser(params)
  } catch {
    // 表单验证失败
  }
}
</script>

<template>
  <n-modal
    :show="visible"
    preset="dialog"
    :title="isUnban ? t('user.ban.unbanTitle') : t('user.ban.title')"
    :positive-text="t('common.confirm')"
    :negative-text="t('common.cancel')"
    :loading="isPending"
    @positive-click="handleSubmit"
    @negative-click="handleClose"
    @close="handleClose"
  >
    <div class="user-ban-dialog">
      <!-- 用户信息 -->
      <div v-if="user" class="user-ban-dialog__user">
        <app-avatar :src="user.avatar" :text="user.username" :size="48" />
        <div class="user-ban-dialog__info">
          <div class="user-ban-dialog__name">{{ user.username }}</div>
          <div class="user-ban-dialog__email">{{ user.email }}</div>
        </div>
      </div>

      <!-- 解封确认 -->
      <template v-if="isUnban">
        <n-alert type="info" :title="t('user.ban.unbanTitle')">
          {{ t('user.ban.confirmUnban') }}
        </n-alert>
      </template>

      <!-- 封禁表单 -->
      <template v-else>
        <n-form
          ref="formRef"
          :model="formData"
          :rules="rules"
          label-placement="left"
          label-width="100"
          require-mark-placement="right-hanging"
        >
          <!-- 永久封禁开关 -->
          <n-form-item :label="t('user.ban.permanent')">
            <n-switch v-model:value="formData.permanent" />
          </n-form-item>

          <!-- 封禁天数 -->
          <n-form-item v-if="!formData.permanent" :label="t('user.ban.duration')" path="days">
            <n-space align="center">
              <n-input-number
                v-model:value="formData.days"
                :min="1"
                :max="3650"
                :placeholder="t('user.ban.durationPlaceholder')"
                style="width: 150px"
              />
              <span>{{ t('user.ban.durationUnit') }}</span>
            </n-space>
          </n-form-item>

          <!-- 封禁原因 -->
          <n-form-item :label="t('user.ban.reason')" path="reason">
            <n-input
              v-model:value="formData.reason"
              type="textarea"
              :placeholder="t('user.ban.reasonPlaceholder')"
              :rows="3"
              maxlength="200"
              show-count
            />
          </n-form-item>
        </n-form>

        <n-alert v-if="formData.permanent" type="warning" :title="t('common.dialog.warningTitle')">
          {{ t('user.ban.permanentWarning') }}
        </n-alert>
      </template>
    </div>
  </n-modal>
</template>

<style scoped lang="scss">
.user-ban-dialog {
  &__user {
    display: flex;
    align-items: center;
    gap: var(--spacing-3);
    padding: var(--spacing-4);
    margin-bottom: var(--spacing-4);
    background-color: var(--color-surface-alt);
    border-radius: var(--radius-md);
  }

  &__info {
    flex: 1;
    min-width: 0;
  }

  &__name {
    font-size: var(--text-base);
    font-weight: 500;
    color: var(--color-text);
  }

  &__email {
    font-size: var(--text-sm);
    color: var(--color-text-secondary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
</style>
