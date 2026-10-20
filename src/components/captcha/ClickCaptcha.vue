<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { NButton, NSpin } from 'naive-ui'
import { getClickCaptcha, type ClickCaptchaResult } from '@/api/captcha'
import type { ClickCaptcha } from '@/api/types'

const props = withDefaults(defineProps<{ visible?: boolean; autoRetry?: boolean }>(), {
  visible: true,
  autoRetry: true,
})
const emit = defineEmits<{
  confirm: [result: ClickCaptchaResult]
  settled: []
  retry: []
}>()
const data = ref<ClickCaptcha | null>(null)
const loading = ref(false)
const imageReady = ref(false)
const imageRef = ref<HTMLImageElement | null>(null)
const status = ref<'idle' | 'verifying' | 'success' | 'fail'>('idle')
const reason = ref('')
const points = ref<{ x: number; y: number; px: number; py: number }[]>([])
let requestId = 0
let timer: ReturnType<typeof setTimeout> | undefined
const interactive = computed(
  () => props.visible && imageReady.value && !loading.value && status.value === 'idle'
)
const tip = computed(() => {
  if (status.value === 'verifying') return '正在核验安全凭证'
  if (status.value === 'success') return '验证成功'
  if (status.value === 'fail') return reason.value || '验证失败，请重试'
  return '请按提示顺序点击图片中的文字'
})
function clearTimer(): void {
  clearTimeout(timer)
  timer = undefined
}
async function reset(): Promise<void> {
  if (!props.visible) return
  const id = ++requestId
  clearTimer()
  status.value = 'idle'
  reason.value = ''
  points.value = []
  imageReady.value = false
  loading.value = true
  try {
    const result = await getClickCaptcha()
    if (id !== requestId) return
    data.value = result
    await nextTick()
  } catch {
    if (id === requestId) data.value = null
  } finally {
    if (id === requestId) loading.value = false
  }
}
function pick(event: MouseEvent): void {
  const image = imageRef.value
  if (!interactive.value || !image || points.value.length >= 6) return
  const rect = image.getBoundingClientRect()
  if (!rect.width || !rect.height) return
  const px = Math.max(0, Math.min((event.clientX - rect.left) / rect.width, 1))
  const py = Math.max(0, Math.min((event.clientY - rect.top) / rect.height, 1))
  points.value.push({
    x: Math.round(px * image.naturalWidth),
    y: Math.round(py * image.naturalHeight),
    px,
    py,
  })
}
function confirm(): void {
  if (!interactive.value || !data.value || !points.value.length) return
  status.value = 'verifying'
  emit('confirm', {
    token: data.value.token,
    dots: points.value.map(({ x, y }, index) => ({ index, x, y })),
  })
}
function refresh(): void {
  if (status.value === 'verifying' || status.value === 'success' || loading.value) return
  clearTimer()
  if (props.autoRetry) void reset()
  else emit('retry')
}
function success(): void {
  if (!props.visible || status.value !== 'verifying') return
  clearTimer()
  status.value = 'success'
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  timer = setTimeout(() => emit('settled'), reduced ? 160 : 1000)
}
function fail(message?: string): void {
  if (!props.visible) return
  clearTimer()
  reason.value = message || ''
  status.value = 'fail'
  timer = setTimeout(() => {
    if (!props.visible) return
    if (props.autoRetry) void reset()
    else emit('retry')
  }, 1100)
}
onMounted(() => {
  if (props.visible) void reset()
})
watch(
  () => props.visible,
  (visible) => {
    if (visible) void reset()
    else {
      requestId += 1
      clearTimer()
    }
  }
)
onBeforeUnmount(() => {
  requestId += 1
  clearTimer()
})
defineExpose({ reset, refresh, success, fail })
</script>

<template>
  <div
    class="click-captcha"
    :class="`click-captcha--${status}`"
    :aria-busy="loading || status === 'verifying'"
  >
    <n-spin :show="loading">
      <div class="click-captcha__canvas" @click="pick">
        <img
          v-if="data"
          :key="data.token"
          ref="imageRef"
          :src="data.masterImage"
          alt="点选验证码"
          draggable="false"
          @load="imageReady = true"
          @error="imageReady = false"
        />
        <div v-if="!data && !loading" class="click-captcha__empty">
          <n-button @click.stop="refresh">重新加载</n-button>
        </div>
        <button
          v-for="(point, index) in points"
          :key="index"
          type="button"
          class="click-captcha__point"
          :style="{ left: point.px * 100 + '%', top: point.py * 100 + '%' }"
          :disabled="!interactive"
          :aria-label="`撤销第 ${index + 1} 个选点`"
          @click.stop="points.splice(index, 1)"
        >
          <span v-if="status !== 'success'">{{ index + 1 }}</span>
          <span v-else aria-hidden="true">✓</span>
        </button>
        <div v-if="status === 'verifying'" class="click-captcha__scan" aria-hidden="true" />
        <div v-if="status === 'success'" class="click-captcha__success" role="status">
          ✓ 验证成功
        </div>
      </div>
    </n-spin>
    <div class="click-captcha__toolbar">
      <div class="click-captcha__hint">
        <span>依次点击</span><img v-if="data" :src="data.thumbImage" alt="需要点击的文字" />
      </div>
      <n-button size="small" :disabled="!interactive || !points.length" @click="points.pop()"
        >撤销</n-button
      >
      <n-button
        size="small"
        type="primary"
        :disabled="!interactive || !points.length"
        @click="confirm"
        >确定</n-button
      >
    </div>
    <div class="click-captcha__footer">
      <p :role="status === 'fail' ? 'alert' : 'status'">{{ tip }}</p>
      <n-button
        text
        :disabled="loading || status === 'verifying' || status === 'success'"
        @click="refresh"
        >换一张</n-button
      >
    </div>
  </div>
</template>

<style scoped lang="scss">
.click-captcha {
  width: 100%;
  &__canvas {
    position: relative;
    min-height: 160px;
    overflow: hidden;
    background: var(--color-surface-hover);
    border-radius: var(--radius-xl);
    cursor: crosshair;
  }
  &__canvas > img {
    display: block;
    width: 100%;
    user-select: none;
  }
  &__empty {
    display: grid;
    min-height: 160px;
    place-items: center;
  }
  &__point {
    position: absolute;
    display: grid;
    width: 28px;
    height: 28px;
    padding: 0;
    place-items: center;
    color: #fff;
    font-weight: 600;
    background: var(--color-primary);
    border: 2px solid #fff;
    border-radius: 50%;
    box-shadow: 0 2px 8px #0003;
    transform: translate(-50%, -50%);
    transition:
      background-color 200ms,
      transform 200ms;
  }
  &--success &__point {
    background: var(--color-success);
  }
  &--fail &__point {
    background: var(--color-danger);
  }
  &__toolbar {
    display: flex;
    gap: 8px;
    align-items: center;
    margin-top: 12px;
  }
  &__hint {
    display: flex;
    flex: 1;
    gap: 8px;
    align-items: center;
    font-size: 12px;
  }
  &__hint img {
    max-width: 120px;
    max-height: 40px;
    object-fit: contain;
  }
  &__footer {
    display: flex;
    gap: 8px;
    align-items: center;
    justify-content: space-between;
    margin-top: 12px;
    color: var(--color-text-muted);
    font-size: 12px;
  }
  &--fail &__footer {
    color: var(--color-danger);
  }
  &__success {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    color: var(--color-success);
    font-size: 22px;
    font-weight: 600;
    background: color-mix(in srgb, var(--color-surface) 92%, transparent);
    animation: click-success 520ms cubic-bezier(0.22, 1, 0.36, 1) both;
  }
  &__scan {
    position: absolute;
    inset: 0;
    background: linear-gradient(100deg, transparent 25%, #ffffff60 50%, transparent 75%);
    animation: click-scan 1000ms ease-in-out infinite;
    pointer-events: none;
  }
}
@keyframes click-scan {
  from {
    transform: translateX(-100%);
  }
  to {
    transform: translateX(100%);
  }
}
@keyframes click-success {
  from {
    opacity: 0;
    transform: scale(0.96);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
@media (prefers-reduced-motion: reduce) {
  .click-captcha__scan {
    animation: none;
  }
  .click-captcha__success {
    animation: none;
  }
}
</style>
