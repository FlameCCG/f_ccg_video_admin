<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import {
  NButton,
  NForm,
  NFormItem,
  NInput,
  NModal,
  useMessage,
  type FormInst,
  type FormRules,
  type InputInst,
} from 'naive-ui'
import SlideCaptcha from '@/components/captcha/SlideCaptcha.vue'
import ClickCaptcha from '@/components/captcha/ClickCaptcha.vue'
import LanguageDropdown from '@/components/common/LanguageDropdown.vue'
import ThemeDropdown from '@/components/common/ThemeDropdown.vue'
import { useCaptchaTypeQueue } from '@/composables/useCaptchaTypeQueue'
import type { ClickCaptchaResult } from '@/api/captcha'
import type { LoginCredentials } from '@/api/types'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const { t } = useI18n()
const message = useMessage()
const authStore = useAuthStore()
const formRef = ref<FormInst | null>(null)
const usernameInputRef = ref<InputInst | null>(null)
interface CaptchaExposed {
  reset: () => void
  refresh: () => void
  fail: (message?: string) => void
  success: () => void
}
const captchaRef = ref<CaptchaExposed | null>(null)
const formData = reactive({ username: '', password: '' })
const showCaptchaModal = ref(false)
const shouldNavigateAfterCaptcha = ref(false)
const captchaKind = ref<'click' | 'slide'>('slide')
const captchaRevision = ref(0)
const preparingCaptcha = ref(false)
const typeQueue = useCaptchaTypeQueue(() => 'login')
const isLoading = computed(() => authStore.isLoggingIn || preparingCaptcha.value)
let selectionId = 0
const rules: FormRules = {
  username: [{ required: true, message: () => t('auth.tips.usernameRequired'), trigger: 'blur' }],
  password: [{ required: true, message: () => t('auth.tips.passwordRequired'), trigger: 'blur' }],
}
onMounted(() => {
  typeQueue.warmup()
  void nextTick(() => usernameInputRef.value?.focus())
})
watch(
  showCaptchaModal,
  (open) => {
    if (open) typeQueue.warmup()
    else selectionId += 1
  },
  { flush: 'post' }
)

async function handleLoginClick(): Promise<void> {
  if (isLoading.value) return
  preparingCaptcha.value = true
  try {
    try {
      await formRef.value?.validate()
    } catch {
      return
    }
    const type = await typeQueue.take()
    shouldNavigateAfterCaptcha.value = false
    if (type === 'none') {
      typeQueue.warmup()
      await doLogin({})
      return
    }
    captchaKind.value = type
    captchaRevision.value += 1
    showCaptchaModal.value = true
  } catch (error: unknown) {
    message.error(error instanceof Error ? error.message : '验证码准备失败，请重试')
    typeQueue.warmup()
  } finally {
    preparingCaptcha.value = false
  }
}
function handleSlideConfirm(result: { token: string; x: number; y: number }): void {
  void doLogin({
    slideCaptchaToken: result.token,
    slideCaptchaX: result.x,
    slideCaptchaY: result.y,
  })
}
function handleClickConfirm(result: ClickCaptchaResult): void {
  void doLogin({ captchaToken: result.token, captchaDots: result.dots })
}
async function handleCaptchaRetry(): Promise<void> {
  if (!showCaptchaModal.value || shouldNavigateAfterCaptcha.value || isLoading.value) return
  const id = ++selectionId
  preparingCaptcha.value = true
  try {
    const type = await typeQueue.take()
    if (id !== selectionId || !showCaptchaModal.value) return
    if (type === 'none') {
      showCaptchaModal.value = false
    } else {
      captchaKind.value = type
      captchaRevision.value += 1
    }
    await nextTick()
    typeQueue.warmup()
  } catch (error: unknown) {
    if (id !== selectionId) return
    message.error(error instanceof Error ? error.message : '验证码准备失败，请重试')
    typeQueue.warmup()
  } finally {
    preparingCaptcha.value = false
  }
}
async function doLogin(captcha: Partial<LoginCredentials>): Promise<void> {
  if (authStore.isLoggingIn) return
  const withCaptcha = showCaptchaModal.value
  const id = selectionId
  try {
    await authStore.login(
      { username: formData.username.trim(), password: formData.password, ...captcha },
      { silent: withCaptcha }
    )
    if (withCaptcha) {
      if (id !== selectionId || !showCaptchaModal.value) return
      shouldNavigateAfterCaptcha.value = true
      captchaRef.value?.success()
    } else {
      message.success(t('auth.tips.loginSuccess'))
      void router.push({ path: '/' })
    }
  } catch (error: unknown) {
    if (withCaptcha && id === selectionId && showCaptchaModal.value) {
      shouldNavigateAfterCaptcha.value = false
      captchaRef.value?.fail(error instanceof Error ? error.message : '')
      typeQueue.warmup()
    }
  }
}
function handleCaptchaSettled(): void {
  if (shouldNavigateAfterCaptcha.value) showCaptchaModal.value = false
}
function handleCaptchaAfterLeave(): void {
  if (!shouldNavigateAfterCaptcha.value) return
  shouldNavigateAfterCaptcha.value = false
  message.success(t('auth.tips.loginSuccess'))
  void router.push({ path: '/' })
}
function handleEnterSubmit(): void {
  void handleLoginClick()
}
</script>

<template>
  <div class="login-page">
    <aside class="login-page__brand">
      <div class="login-page__brand-bg" aria-hidden="true" />
      <div class="login-page__grid" aria-hidden="true" />

      <div class="login-page__brand-content">
        <div class="login-page__brand-logo" aria-hidden="true">
          <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="24" cy="24" r="20" stroke="currentColor" stroke-width="1.5" />
            <path d="M20 16.5 32.5 24 20 31.5v-15Z" fill="currentColor" />
            <path d="M24 4a20 20 0 0 1 17.32 10" stroke="currentColor" stroke-width="3" />
          </svg>
        </div>
        <p class="login-page__brand-eyebrow">{{ t('auth.login.brandEyebrow') }}</p>
        <h1 class="login-page__brand-title">
          <span>Video</span>
          <span>Admin</span>
        </h1>
        <p class="login-page__brand-desc">{{ t('auth.login.subtitle') }}</p>
      </div>

      <div class="login-page__brand-footer">
        <span class="login-page__brand-footer-line" aria-hidden="true" />
        <span class="login-page__brand-version">v1.0.0</span>
      </div>
    </aside>

    <main class="login-page__form-section">
      <div class="login-page__toolbar">
        <LanguageDropdown show-label size="small" />
        <ThemeDropdown show-label size="small" />
      </div>

      <div class="login-page__form-container">
        <div class="login-page__form-wrapper">
          <div class="login-page__form-inner">
            <header class="login-page__form-header">
              <div class="login-page__form-kicker">
                <span class="login-page__form-kicker-dot" aria-hidden="true" />
                {{ t('auth.login.secureAccess') }}
              </div>
              <h2 class="login-page__form-title">{{ t('auth.login.title') }}</h2>
              <p class="login-page__form-subtitle">{{ t('auth.login.subtitle') }}</p>
            </header>

            <n-form
              ref="formRef"
              :model="formData"
              :rules="rules"
              label-placement="top"
              require-mark-placement="right-hanging"
              class="login-page__form"
            >
              <n-form-item
                path="username"
                :label="t('auth.login.username')"
                class="login-page__form-item"
              >
                <n-input
                  ref="usernameInputRef"
                  v-model:value="formData.username"
                  :placeholder="t('auth.login.usernamePlaceholder')"
                  :input-props="{ autocomplete: 'username', name: 'username' }"
                  size="large"
                  :disabled="isLoading"
                  class="login-page__input"
                  @keydown.enter="handleEnterSubmit"
                >
                  <template #prefix>
                    <svg class="login-page__input-icon" viewBox="0 0 24 24" aria-hidden="true">
                      <circle cx="12" cy="8" r="3.5" />
                      <path d="M5.5 19c.6-3.4 3-5.2 6.5-5.2s5.9 1.8 6.5 5.2" />
                    </svg>
                  </template>
                </n-input>
              </n-form-item>

              <n-form-item
                path="password"
                :label="t('auth.login.password')"
                class="login-page__form-item"
              >
                <n-input
                  v-model:value="formData.password"
                  type="password"
                  show-password-on="click"
                  :placeholder="t('auth.login.passwordPlaceholder')"
                  :input-props="{ autocomplete: 'current-password', name: 'password' }"
                  size="large"
                  :disabled="isLoading"
                  class="login-page__input"
                  @keydown.enter="handleEnterSubmit"
                >
                  <template #prefix>
                    <svg class="login-page__input-icon" viewBox="0 0 24 24" aria-hidden="true">
                      <rect x="5" y="10" width="14" height="10" rx="2" />
                      <path d="M8.5 10V7.5a3.5 3.5 0 0 1 7 0V10" />
                    </svg>
                  </template>
                </n-input>
              </n-form-item>

              <n-form-item class="login-page__form-item login-page__form-item--button">
                <n-button
                  type="primary"
                  block
                  size="large"
                  :loading="isLoading"
                  class="login-page__submit-btn"
                  @click="handleLoginClick"
                >
                  <span>{{
                    isLoading ? t('auth.login.logging') : t('auth.login.loginButton')
                  }}</span>
                  <svg
                    v-if="!isLoading"
                    class="login-page__submit-arrow"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path d="M5 12h13m-5-5 5 5-5 5" />
                  </svg>
                </n-button>
              </n-form-item>
            </n-form>

            <div class="login-page__access-note">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 3 5.5 6v5.5c0 4.2 2.5 7.7 6.5 9.5 4-1.8 6.5-5.3 6.5-9.5V6L12 3Z" />
                <path d="m9.3 12.2 1.8 1.8 3.7-4" />
              </svg>
              <span>{{ t('auth.login.adminOnly') }}</span>
            </div>
          </div>
        </div>
      </div>
    </main>

    <n-modal
      v-model:show="showCaptchaModal"
      preset="card"
      transform-origin="center"
      class="captcha-modal"
      :class="{ 'captcha-modal--success': shouldNavigateAfterCaptcha }"
      :aria-label="t('auth.captcha.title')"
      header-class="captcha-modal__header"
      content-class="captcha-modal__content"
      :style="{ width: 'min(24rem, calc(100vw - var(--spacing-8)))' }"
      :bordered="false"
      :mask-closable="false"
      :closable="!isLoading && !shouldNavigateAfterCaptcha"
      :close-on-esc="!isLoading && !shouldNavigateAfterCaptcha"
      @after-leave="handleCaptchaAfterLeave"
    >
      <template #header>
        <div class="captcha-modal__heading">
          <span class="captcha-modal__emblem" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M12 3 5.5 6v5.5c0 4.2 2.5 7.7 6.5 9.5 4-1.8 6.5-5.3 6.5-9.5V6L12 3Z" />
              <path d="m9.3 12.2 1.8 1.8 3.7-4" />
            </svg>
          </span>
          <div class="captcha-modal__heading-copy">
            <span>{{ t('auth.captcha.title') }}</span>
            <p class="captcha-modal__subtitle">
              {{ captchaKind === 'click' ? '按提示顺序点击文字' : t('auth.captcha.subtitle') }}
            </p>
          </div>
        </div>
      </template>
      <div class="captcha-switch-stage" :aria-busy="preparingCaptcha">
        <Transition name="captcha-switch" mode="out-in">
          <SlideCaptcha
            v-if="captchaKind === 'slide'"
            :key="`slide-${captchaRevision}`"
            ref="captchaRef"
            :visible="showCaptchaModal"
            :auto-retry="false"
            @confirm="handleSlideConfirm"
            @retry="handleCaptchaRetry"
            @settled="handleCaptchaSettled"
          />
          <ClickCaptcha
            v-else
            :key="`click-${captchaRevision}`"
            ref="captchaRef"
            :visible="showCaptchaModal"
            :auto-retry="false"
            @confirm="handleClickConfirm"
            @retry="handleCaptchaRetry"
            @settled="handleCaptchaSettled"
          />
        </Transition>
      </div>
    </n-modal>
  </div>
</template>

<style lang="scss" scoped src="./LoginView.scss"></style>
