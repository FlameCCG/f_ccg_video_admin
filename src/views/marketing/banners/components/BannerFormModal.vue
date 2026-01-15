<script setup lang="ts">
/**
 * 轮播图表单弹窗
 * Banner Form Modal
 * Requirements: 14.2-14.4 - 创建/更新轮播图
 */
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  NModal,
  NCard,
  NForm,
  NFormItem,
  NInput,
  NSelect,
  NSwitch,
  NSpace,
  NButton,
  useMessage,
} from 'naive-ui'
import type { FormInst, FormRules } from 'naive-ui'
import type { BannerItem, BannerType } from '@/api/types'
import { ImageUpload } from '@/components/form'

interface Props {
  /** 是否显示 */
  visible: boolean
  /** 编辑的轮播图（null 表示创建） */
  banner?: BannerItem | null
  /** 加载状态 */
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  banner: null,
  loading: false,
})

const emit = defineEmits<{
  'update:visible': [value: boolean]
  submit: [data: { cover: string; href?: string; show?: boolean; type?: BannerType }]
}>()

const { t } = useI18n()
const message = useMessage()

/** 表单引用 */
const formRef = ref<FormInst | null>(null)

/** 表单数据 */
const formData = ref({
  cover: '',
  href: '',
  show: true,
  type: 1 as BannerType,
})

/** 图片列表（用于 ImageUpload 组件） */
const coverList = ref<string[]>([])

/** 是否编辑模式 */
const isEdit = computed(() => !!props.banner)

/** 弹窗标题 */
const modalTitle = computed(() =>
  isEdit.value ? t('banner.form.editTitle') : t('banner.form.createTitle')
)

/** 类型选项 */
const typeOptions = computed(() => [
  { value: 1, label: t('banner.type.carousel') },
  { value: 2, label: t('banner.type.header') },
])

/** 表单验证规则 */
const rules: FormRules = {
  cover: [
    {
      required: true,
      message: () => t('banner.form.coverRequired'),
      trigger: ['blur', 'change'],
    },
  ],
}

/** 监听 banner 变化，初始化表单 */
watch(
  () => props.banner,
  (banner) => {
    if (banner) {
      formData.value = {
        cover: banner.cover,
        href: banner.href || '',
        show: banner.show,
        type: banner.type,
      }
      coverList.value = banner.cover ? [banner.cover] : []
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
    cover: '',
    href: '',
    show: true,
    type: 1,
  }
  coverList.value = []
  formRef.value?.restoreValidation()
}

/** 处理图片变化 */
function handleCoverChange(urls: string[]): void {
  formData.value.cover = urls[0] || ''
}

/** 处理关闭 */
function handleClose(): void {
  emit('update:visible', false)
}

/** 处理提交 */
async function handleSubmit(): Promise<void> {
  try {
    await formRef.value?.validate()

    if (!formData.value.cover) {
      message.warning(t('banner.form.coverRequired'))
      return
    }

    emit('submit', {
      cover: formData.value.cover,
      href: formData.value.href || undefined,
      show: formData.value.show,
      type: formData.value.type,
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
      style="width: 500px"
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
        <n-form-item :label="t('banner.form.cover')" path="cover" required>
          <image-upload
            :value="coverList"
            :max="1"
            :max-size="5"
            :image-width="320"
            :image-height="120"
            @change="handleCoverChange"
          >
            <template #tip>
              {{ t('banner.form.coverTip') }}
            </template>
          </image-upload>
        </n-form-item>

        <n-form-item :label="t('banner.form.href')" path="href">
          <n-input
            v-model:value="formData.href"
            :placeholder="t('banner.form.hrefPlaceholder')"
            clearable
          />
        </n-form-item>

        <n-form-item :label="t('banner.form.type')" path="type">
          <n-select
            v-model:value="formData.type"
            :options="typeOptions"
            :placeholder="t('banner.form.typePlaceholder')"
          />
        </n-form-item>

        <n-form-item :label="t('banner.form.showStatus')" path="show">
          <n-switch v-model:value="formData.show">
            <template #checked>{{ t('banner.status.show') }}</template>
            <template #unchecked>{{ t('banner.status.hide') }}</template>
          </n-switch>
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
