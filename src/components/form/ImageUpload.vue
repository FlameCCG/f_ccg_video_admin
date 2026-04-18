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
import { getAccessToken } from '@/utils/storage'

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

    // 发送请求
    const xhr = new XMLHttpRequest()
    xhr.open('POST', props.action)

    // 设置请求头
    const token = getAccessToken()
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`)
    }
    if (props.headers) {
      Object.entries(props.headers).forEach(([key, value]) => {
        xhr.setRequestHeader(key, value)
      })
    }

    // 上传进度
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        onProgress({ percent: Math.round((e.loaded / e.total) * 100) })
      }
    }

    // 上传完成
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText) as {
            code: number
            data: { imageUrl: string }
            msg: string
          }
          if (response.code === 0 && response.data?.imageUrl) {
            file.url = response.data.imageUrl
            onFinish()
            updateValue()
            emit('success', response.data.imageUrl, file)
          } else {
            message.error(response.msg || t('common.fileUpload.uploadFailed'))
            onError()
          }
        } catch {
          message.error(t('common.fileUpload.uploadFailed'))
          onError()
        }
      } else {
        message.error(t('common.fileUpload.uploadFailed'))
        onError()
      }
    }

    // 上传错误
    xhr.onerror = () => {
      message.error(t('common.fileUpload.uploadFailed'))
      onError()
      emit('error', new Error('Upload failed'), file)
    }

    xhr.send(formData)
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
  <div class="image-upload">
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
      <!-- 上传按钮 -->
      <template v-if="listType === 'image-card'">
        <div
          v-if="canUpload"
          class="image-upload__trigger"
          :style="{ width: `${imageWidth}px`, height: `${imageHeight}px` }"
        >
          <n-icon size="24" color="var(--color-text-muted)">
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
          <span class="image-upload__text">{{ t('common.upload') }}</span>
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
  &__trigger {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-1);
    border: 1px dashed var(--color-border);
    border-radius: var(--radius-md);
    background-color: var(--color-surface-alt);
    cursor: pointer;
    transition:
      border-color var(--duration-fast) var(--easing-standard),
      background-color var(--duration-fast) var(--easing-standard);

    &:hover {
      border-color: var(--color-primary);
      background-color: var(--color-primary-light);
    }
  }

  &__text {
    font-size: var(--text-xs);
    color: var(--color-text-muted);
  }

  &__tip {
    margin-top: var(--spacing-2);
    font-size: var(--text-xs);
    color: var(--color-text-muted);
  }

  // 覆盖 Naive UI upload 组件的默认边框样式
  :deep(.n-upload-trigger) {
    border: none !important;
  }

  :deep(.n-upload-file-list) {
    .n-upload-file {
      border: 1px solid var(--color-border) !important;
      border-radius: var(--radius-md) !important;

      &:hover {
        border-color: var(--color-primary) !important;
      }
    }
  }
}
</style>
