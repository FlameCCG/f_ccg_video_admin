<script setup lang="ts">
/**
 * 系统默认用户主页横幅维护弹窗
 */
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { NModal, NSpace, NAlert, NRadioGroup, NRadioButton, NTag } from 'naive-ui'
import type { UpdateDefaultUserBannerListAction } from '@/api/types'

interface Props {
  visible: boolean
  bannerIds: number[]
  loading?: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:visible': [visible: boolean]
  submit: [{ bannerIds: number[]; action: UpdateDefaultUserBannerListAction }]
}>()

const { t } = useI18n()

const action = ref<UpdateDefaultUserBannerListAction>(1)

watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      action.value = 1
    }
  }
)

function handleClose(): void {
  emit('update:visible', false)
}

function handleSubmit(): boolean {
  if (props.bannerIds.length === 0) {
    return false
  }

  emit('submit', {
    bannerIds: props.bannerIds,
    action: action.value,
  })

  return false
}
</script>

<template>
  <n-modal
    :show="visible"
    preset="dialog"
    :title="t('banner.defaultUserBanners.title')"
    :positive-text="t('common.confirm')"
    :negative-text="t('common.cancel')"
    :loading="loading"
    @positive-click="handleSubmit"
    @negative-click="handleClose"
    @close="handleClose"
  >
    <div class="user-banner-defaults-dialog">
      <n-space vertical :size="16">
        <n-alert type="info" :show-icon="false">
          {{ t('banner.defaultUserBanners.selectedCount', { count: bannerIds.length }) }}
          <div class="user-banner-defaults-dialog__ids">
            {{ t('banner.defaultUserBanners.selectedIds') }}:
            <n-space :size="6" wrap>
              <n-tag v-for="bannerId in bannerIds" :key="bannerId" size="small" type="info">
                #{{ bannerId }}
              </n-tag>
            </n-space>
          </div>
        </n-alert>

        <div class="user-banner-defaults-dialog__field">
          <div class="user-banner-defaults-dialog__label">
            {{ t('banner.defaultUserBanners.actionLabel') }}
          </div>
          <n-radio-group v-model:value="action">
            <n-radio-button :value="1">
              {{ t('banner.defaultUserBanners.add') }}
            </n-radio-button>
            <n-radio-button :value="2">
              {{ t('banner.defaultUserBanners.remove') }}
            </n-radio-button>
          </n-radio-group>
        </div>
      </n-space>
    </div>
  </n-modal>
</template>

<style scoped lang="scss">
.user-banner-defaults-dialog {
  &__ids {
    margin-top: var(--spacing-3);
  }

  &__field {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-3);
  }

  &__label {
    font-size: var(--text-sm);
    font-weight: 500;
    color: var(--color-text);
  }
}
</style>
