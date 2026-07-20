<script setup lang="ts">
/**
 * 图片上传组件
 * 支持单图和多图上传、预览、删除
 * 自动计算 fileHash 并携带 token
 * Requirements: 8.2, 9.2
 */
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { NUpload, NButton, NIcon, useMessage } from 'naive-ui'
import type { UploadFileInfo, UploadInst, UploadCustomRequestOptions } from 'naive-ui'
import { request } from '@/utils/request'

interface Props {
  /** 已上传的图片列表 */
  value?: string[]
  /** 上传地址 */
  action?: string
  /** 最大上传数量 */
  max?: number
  /** 最大文件大小（MB） */
  maxSize?: number
  /** 接受的文件类型 */
  accept?: string
  /** 是否禁用 */
  disabled?: boolean
  /** 是否显示文件列表 */
  showFileList?: boolean
  /** 列表类型 */
  listType?: 'text' | 'image' | 'image-card'
  /** 是否多选 */
  multiple?: boolean
  /** 请求头 */
  headers?: Record<string, string>
  /** 额外数据 */
  data?: Record<string, string>
  /** 文件字段名 */
  name?: string
  /** 是否拖拽上传 */
  drag?: boolean
  /** 图片宽度 */
  imageWidth?: number
  /** 图片高度 */
  imageHeight?: number
}

const props = withDefaults(defineProps<Props>(), {
  value: () => [],
  action: '/v1/common/video/image/upload',
  max: 1,
  maxSize: 20,
  accept: 'image/*',
  disabled: false,
  showFileList: true,
  listType: 'image-card',
  multiple: false,
  headers: undefined,
  data: undefined,
  name: 'cover',
  drag: false,
  imageWidth: 100,
  imageHeight: 100,
})

const emit = defineEmits<{
  'update:value': [value: string[]]
  change: [value: string[]]
  success: [url: string, file: UploadFileInfo]
  error: [error: Error, file: UploadFileInfo]
}>()

const { t } = useI18n()
const message = useMessage()

/** 上传组件实例 */
const uploadRef = ref<UploadInst | null>(null)

/** 文件列表 */
const fileList = ref<UploadFileInfo[]>([])

/** 初始化文件列表 */
watch(
  () => props.value,
  (urls) => {
    fileList.value = urls.map((url, index) => ({
      id: `${index}-${Date.now()}`,
      name: `image-${index}`,
      status: 'finished' as const,
      url,
    }))
  },
  { immediate: true }
)

/** 是否可以继续上传 */
const canUpload = computed(() => {
  return fileList.value.length < props.max
})

/** image-card 宽高 CSS 变量（同时驱动触发器与预览卡片） */
const uploadSizeStyle = computed(() => ({
  '--upload-w': `${props.imageWidth}px`,
  '--upload-h': `${props.imageHeight}px`,
}))

/**
 * 超扁/超窄预览时的紧凑布局：
 * - compact：横向排列图标+文字（高度不足以竖排时）
 * - iconOnly：仅显示 + 号（高度极小时避免「上传」溢出）
 */
const isCompactTrigger = computed(() => props.imageHeight < 88)
const isIconOnlyTrigger = computed(() => props.imageHeight < 52)
const triggerIconSize = computed(() => {
  if (isIconOnlyTrigger.value) return 18
  if (isCompactTrigger.value) return 18
  return 24
})

/** 计算文件 SHA-256 哈希 */
async function calculateFileHash(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** 自定义上传请求（支持 fileHash） */
async function customRequest(options: UploadCustomRequestOptions): Promise<void> {
  const { file, onFinish, onError, onProgress } = options

  if (!file.file) {
    onError()
    return
  }

  try {
    // 计算文件哈希
    const fileHash = await calculateFileHash(file.file)

    // 构建 FormData
    const formData = new FormData()
    formData.append('fileHash', fileHash)
    formData.append(props.name, file.file)

    // 添加额外数据
    if (props.data) {
      Object.entries(props.data).forEach(([key, value]) => {
        formData.append(key, value)
      })
    }

    // 整理上传路径：如果 action 包含 baseURL 路径前缀（如 '/v1'），则剥离，避免重复拼接路径
    const actionUrl = props.action.startsWith('/v1') ? props.action.substring(3) : props.action

    // 用统一的 request client 上传，实现 token 拦截与刷新
    request
      .post(actionUrl, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          ...props.headers,
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percent = Math.round((progressEvent.loaded / progressEvent.total) * 100)
            onProgress({ percent })
          }
        },
      })
      .then((res: unknown) => {
        const data = res as { imageUrl?: string } | null
        if (data && data.imageUrl) {
          file.url = data.imageUrl
          onFinish()
          updateValue()
          emit('success', data.imageUrl, file)
        } else {
          message.error(t('common.fileUpload.uploadFailed'))
          onError()
        }
      })
      .catch((err: unknown) => {
        const error = err as { msg?: string } | null
        message.error(error?.msg || t('common.fileUpload.uploadFailed'))
        onError()
        emit('error', err instanceof Error ? err : new Error(String(err)), file)
      })
  } catch {
    message.error(t('common.fileUpload.uploadFailed'))
    onError()
  }
}

/** 上传前校验 */
function handleBeforeUpload(data: { file: UploadFileInfo }): boolean {
  const { file } = data

  // 检查文件类型
  if (file.file && !file.file.type.startsWith('image/')) {
    message.error(t('common.fileUpload.limitType', { types: 'image' }))
    return false
  }

  // 检查文件大小
  if (file.file && file.file.size > props.maxSize * 1024 * 1024) {
    message.error(t('common.fileUpload.limitSize', { size: `${props.maxSize}MB` }))
    return false
  }

  // 检查数量限制
  if (fileList.value.length >= props.max) {
    message.error(t('common.fileUpload.limitCount', { count: props.max }))
    return false
  }

  return true
}

/** 处理文件移除 */
function handleRemove(data: { file: UploadFileInfo }): boolean {
  const index = fileList.value.findIndex((f) => f.id === data.file.id)
  if (index > -1) {
    fileList.value.splice(index, 1)
    updateValue()
  }
  return true
}

/** 更新值 */
function updateValue(): void {
  const urls = fileList.value
    .filter((f) => f.status === 'finished' && f.url)
    .map((f) => f.url as string)
  emit('update:value', urls)
  emit('change', urls)
}

/** 清空文件列表 */
function clear(): void {
  fileList.value = []
  updateValue()
}

/** 暴露方法 */
defineExpose({
  uploadRef,
  clear,
})
</script>

<template>
  <div
    class="image-upload"
    :class="{
      'image-upload--image-card': listType === 'image-card',
      'image-upload--compact': listType === 'image-card' && isCompactTrigger,
      'image-upload--icon-only': listType === 'image-card' && isIconOnlyTrigger,
    }"
    :style="uploadSizeStyle"
  >
    <n-upload
      ref="uploadRef"
      v-model:file-list="fileList"
      :accept="accept"
      :max="max"
      :disabled="disabled"
      :show-file-list="showFileList"
      :list-type="listType"
      :multiple="multiple && max > 1"
      :custom-request="customRequest"
      :default-upload="true"
      @before-upload="handleBeforeUpload"
      @remove="handleRemove"
    >
      <!-- 上传按钮：尺寸交给外层 image-card 容器，内部不再叠一层虚线框 -->
      <template v-if="listType === 'image-card'">
        <div
          v-if="canUpload"
          class="image-upload__trigger"
          :title="t('common.upload')"
          :aria-label="t('common.upload')"
        >
          <n-icon :size="triggerIconSize" color="var(--color-text-muted)">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </n-icon>
          <span v-if="!isIconOnlyTrigger" class="image-upload__text">
            {{ t('common.upload') }}
          </span>
        </div>
      </template>

      <template v-else>
        <n-button :disabled="!canUpload || disabled">
          <template #icon>
            <n-icon>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </n-icon>
          </template>
          {{ t('common.upload') }}
        </n-button>
      </template>
    </n-upload>

    <!-- 提示信息 -->
    <div class="image-upload__tip">
      <slot name="tip">
        {{ t('common.fileUpload.limitSize', { size: `${maxSize}MB` }) }}
        <template v-if="max > 1">
          , {{ t('common.fileUpload.limitCount', { count: max }) }}
        </template>
      </slot>
    </div>
  </div>
</template>

<style scoped lang="scss">
.image-upload {
  --upload-w: 100px;
  --upload-h: 100px;

  &__trigger {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-1);
    box-sizing: border-box;
    width: 100%;
    height: 100%;
    padding: 4px;

    // 不在这里画边框，避免与 Naive image-card 触发器叠成双层虚线
    border: none;
    background: transparent;
    cursor: pointer;
    overflow: hidden;
  }

  &__text {
    flex-shrink: 0;
    max-width: 100%;
    overflow: hidden;
    font-size: var(--text-xs);
    line-height: 1.2;
    color: var(--color-text-muted);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__tip {
    margin-top: var(--spacing-2);
    font-size: var(--text-xs);
    line-height: 1.5;
    color: var(--color-text-muted);
    overflow-wrap: anywhere;
  }

  // 超扁预览：图标与「上传」横排，避免竖排溢出
  &--compact {
    .image-upload__trigger {
      flex-direction: row;
      gap: 6px;
    }

    .image-upload__text {
      font-size: 12px;
    }
  }

  // 极扁预览：只保留 + 号
  &--icon-only {
    .image-upload__trigger {
      gap: 0;
    }
  }

  // image-card：按传入宽高统一控制触发器与已上传预览，只保留一层边框
  &--image-card {
    :deep(.n-upload-file-list) {
      display: flex;
      flex-wrap: wrap;
      gap: var(--spacing-2);

      // 覆盖 Naive 默认 96px 网格，避免外框尺寸与内容不一致
      grid-template-columns: none !important;
    }

    :deep(.n-upload-trigger.n-upload-trigger--image-card),
    :deep(.n-upload-file.n-upload-file--image-card-type) {
      width: var(--upload-w) !important;
      height: var(--upload-h) !important;
      max-width: 100%;
      border-radius: var(--radius-md) !important;
      transition:
        width var(--duration-fast) var(--easing-standard),
        height var(--duration-fast) var(--easing-standard),
        border-color var(--duration-fast) var(--easing-standard),
        background-color var(--duration-fast) var(--easing-standard);
    }

    :deep(.n-upload-trigger.n-upload-trigger--image-card) {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      border: 1px dashed var(--color-border) !important;
      background-color: var(--color-surface-alt);

      &:hover {
        border-color: var(--color-primary) !important;
        background-color: var(--color-primary-light);
      }
    }

    :deep(.n-upload-file.n-upload-file--image-card-type) {
      overflow: hidden;
      border: 1px solid var(--color-border) !important;
      background-color: var(--color-surface-alt);

      &:hover {
        border-color: var(--color-primary) !important;
      }

      .n-upload-file-info,
      .n-upload-file-info__thumbnail,
      .n-image,
      img {
        width: 100% !important;
        height: 100% !important;
        object-fit: cover;
      }
    }
  }
}
</style>
