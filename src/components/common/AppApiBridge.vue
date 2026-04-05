<script setup lang="ts">
/**
 * 将 Naive UI Message / 路由跳转注入到 Axios 请求层
 * 必须放在 NMessageProvider 子树内
 */
import { onMounted, onUnmounted } from 'vue'
import { useMessage } from 'naive-ui'
import { useRouter } from 'vue-router'
import { setErrorMessageHandler, setLoginRedirectHandler } from '@/utils/request'

const message = useMessage()
const router = useRouter()

/** 短时间相同文案去重，避免拦截器 + mutation onError / 重试刷屏 */
let lastMsg = ''
let lastAt = 0
const DEDUPE_MS = 1500

function handleApiError(msg: string): void {
  const text = msg?.trim() || '请求失败'
  const now = Date.now()
  if (text === lastMsg && now - lastAt < DEDUPE_MS) {
    return
  }
  lastMsg = text
  lastAt = now
  message.error(text, { duration: 5000, closable: true })
}

function handleLoginRedirect(): void {
  const current = router.currentRoute.value
  if (current.path === '/login') return
  void router.replace({
    path: '/login',
    query:
      current.fullPath && current.fullPath !== '/login'
        ? { redirect: current.fullPath }
        : undefined,
  })
}

onMounted(() => {
  setErrorMessageHandler(handleApiError)
  setLoginRedirectHandler(handleLoginRedirect)
})

onUnmounted(() => {
  // 卸载后回退到 console，避免悬空 message 实例
  setErrorMessageHandler((msg: string) => {
    console.error('[API Error]', msg)
  })
  setLoginRedirectHandler(() => {
    window.location.href = '/login'
  })
})
</script>

<template>
  <!-- 无 UI，仅做副作用桥接 -->
  <span class="app-api-bridge" aria-hidden="true" />
</template>

<style scoped>
.app-api-bridge {
  display: none;
}
</style>
