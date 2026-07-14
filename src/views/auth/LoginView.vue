<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
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

import { getPublicSiteConfig } from '@/api/site'
import SlideCaptcha from '@/components/captcha/SlideCaptcha.vue'
import LanguageDropdown from '@/components/common/LanguageDropdown.vue'
import ThemeDropdown from '@/components/common/ThemeDropdown.vue'
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
  fail: () => void
  success: () => void
}

const captchaRef = ref<CaptchaExposed | null>(null)

const formData = reactive({
  username: '',
  password: '',
})

const captchaData = reactive({
  token: '',
  x: 0,
  y: 0,
  verified: false,
})

const showCaptchaModal = ref(false)
const shouldNavigateAfterCaptcha = ref(false)

const CAPTCHA_SUCCESS_FEEDBACK_DURATION = 500
let captchaSuccessTimer: ReturnType<typeof setTimeout> | undefined

/** 滑块验证码是否启用（默认 true，安全优先） */
const slideCaptchaEnabled = ref(true)

const isLoading = computed(() => authStore.isLoggingIn)

const rules: FormRules = {
  username: [
    {
      required: true,
      message: () => t('auth.tips.usernameRequired'),
      trigger: 'blur',
    },
  ],
  password: [
    {
      required: true,
      message: () => t('auth.tips.passwordRequired'),
      trigger: 'blur',
    },
  ],
}

onMounted(() => {
  void fetchPublicSiteConfig()
  void focusUsernameInput()
})

onBeforeUnmount(() => {
  if (captchaSuccessTimer) clearTimeout(captchaSuccessTimer)
})

async function focusUsernameInput(): Promise<void> {
  await nextTick()
  usernameInputRef.value?.focus()
}

/** 获取公开站点配置（无需认证） */
async function fetchPublicSiteConfig(): Promise<void> {
  try {
    const config = await getPublicSiteConfig()
    slideCaptchaEnabled.value = config.site.register.slideCaptcha ?? true
  } catch {
    // 获取配置失败时默认启用滑块验证码（安全优先）
    slideCaptchaEnabled.value = true
  }
}

function handleCaptchaConfirm(result: { token: string; x: number; y: number }): void {
  captchaData.token = result.token
  captchaData.x = result.x
  captchaData.y = result.y
  captchaData.verified = true
  void doLogin()
}

function handleCaptchaFail(): void {
  captchaData.verified = false
  message.error(t('auth.captcha.failed'))
}

function handleCaptchaRefresh(): void {
  captchaData.verified = false
  captchaData.token = ''
  captchaData.x = 0
  captchaData.y = 0
}

async function handleLoginClick(): Promise<void> {
  try {
    await formRef.value?.validate()

    if (slideCaptchaEnabled.value) {
      shouldNavigateAfterCaptcha.value = false
      if (captchaSuccessTimer) clearTimeout(captchaSuccessTimer)
      showCaptchaModal.value = true
    } else {
      captchaData.verified = true
      await doLogin()
    }
  } catch {
    // 表单校验已在字段下方给出明确反馈
  }
}

async function doLogin(): Promise<void> {
  if (!captchaData.verified) return

  try {
    const loginParams = slideCaptchaEnabled.value
      ? {
          username: formData.username,
          password: formData.password,
          slideCaptchaToken: captchaData.token,
          slideCaptchaX: captchaData.x,
          slideCaptchaY: captchaData.y,
        }
      : {
          username: formData.username,
          password: formData.password,
        }

    await authStore.login(loginParams)

    if (slideCaptchaEnabled.value) {
      shouldNavigateAfterCaptcha.value = true
      captchaRef.value?.success()
      captchaSuccessTimer = setTimeout(() => {
        showCaptchaModal.value = false
      }, CAPTCHA_SUCCESS_FEEDBACK_DURATION)
    } else {
      message.success(t('auth.tips.loginSuccess'))
      void router.push({ path: '/' })
    }
  } catch (error: unknown) {
    if (slideCaptchaEnabled.value) {
      shouldNavigateAfterCaptcha.value = false
      captchaRef.value?.fail()
    }
    captchaData.verified = false
    if (error instanceof Error) {
      message.error(error.message)
    }
  }
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
      class="captcha-modal"
      header-class="captcha-modal__header"
      content-class="captcha-modal__content"
      :title="t('auth.captcha.title')"
      :style="{ width: 'min(22.5rem, calc(100vw - var(--spacing-8)))' }"
      :bordered="false"
      :mask-closable="false"
      :close-on-esc="!isLoading"
      @after-leave="handleCaptchaAfterLeave"
    >
      <SlideCaptcha
        ref="captchaRef"
        :visible="showCaptchaModal"
        @confirm="handleCaptchaConfirm"
        @fail="handleCaptchaFail"
        @refresh="handleCaptchaRefresh"
      />
    </n-modal>
  </div>
</template>

<style lang="scss" scoped src="./LoginView.scss"></style>
