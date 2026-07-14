<script setup lang="ts">
import { ref, reactive, computed, onBeforeUnmount, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'

import {
  NForm,
  NFormItem,
  NInput,
  NButton,
  NModal,
  useMessage,
  type FormInst,
  type FormRules,
} from 'naive-ui'

import { useAuthStore } from '@/stores/auth'
import { getPublicSiteConfig } from '@/api/site'
import SlideCaptcha from '@/components/captcha/SlideCaptcha.vue'
import LanguageDropdown from '@/components/common/LanguageDropdown.vue'
import ThemeDropdown from '@/components/common/ThemeDropdown.vue'

// ==================== Composables ====================
const router = useRouter()
const { t } = useI18n()
const message = useMessage()
const authStore = useAuthStore()

// ==================== Refs ====================
const formRef = ref<FormInst | null>(null)

interface CaptchaExposed {
  reset: () => void
  refresh: () => void
  fail: () => void
  success: () => void
}

const captchaRef = ref<CaptchaExposed | null>(null)

// ==================== 状态 ====================
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

/** 验证成功后等待签名动效完成，再退出弹层并进入控制台 */
const shouldNavigateAfterCaptcha = ref(false)

const CAPTCHA_SUCCESS_FEEDBACK_DURATION = 500
let captchaSuccessTimer: ReturnType<typeof setTimeout> | undefined

/** 滑块验证码是否启用（默认 true，安全优先） */
const slideCaptchaEnabled = ref(true)

// ==================== 计算属性 ====================
const isLoading = computed(() => authStore.isLoggingIn)

// ==================== 表单验证规则 ====================
const rules: FormRules = {
  username: [
    {
      required: true,
      message: () => t('auth.tips.usernameRequired'),
      trigger: ['blur', 'input'],
    },
  ],
  password: [
    {
      required: true,
      message: () => t('auth.tips.passwordRequired'),
      trigger: ['blur', 'input'],
    },
  ],
}

// ==================== 生命周期 ====================
onMounted(() => {
  void fetchPublicSiteConfig()
})

onBeforeUnmount(() => {
  if (captchaSuccessTimer) clearTimeout(captchaSuccessTimer)
})

// ==================== 方法 ====================

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
      // 滑块验证码启用：弹出验证码弹窗
      shouldNavigateAfterCaptcha.value = false
      if (captchaSuccessTimer) clearTimeout(captchaSuccessTimer)
      showCaptchaModal.value = true
    } else {
      // 滑块验证码关闭：直接登录
      captchaData.verified = true
      await doLogin()
    }
  } catch {
    // 表单验证失败
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
    <!-- 左侧品牌区域 -->
    <div class="login-page__brand">
      <!-- 动态背景 -->
      <div class="login-page__brand-bg">
        <div class="login-page__orb login-page__orb--1" />
        <div class="login-page__orb login-page__orb--2" />
        <div class="login-page__orb login-page__orb--3" />
      </div>

      <!-- 网格线 -->
      <div class="login-page__grid" />

      <!-- 品牌内容 -->
      <div class="login-page__brand-content">
        <div class="login-page__brand-logo">
          <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 16L32 24L18 32V16Z" fill="currentColor" />
          </svg>
        </div>
        <h1 class="login-page__brand-title">Video Admin</h1>
        <p class="login-page__brand-desc">{{ t('auth.login.subtitle') }}</p>
      </div>

      <!-- 版本号 -->
      <div class="login-page__brand-footer">
        <span class="login-page__brand-version">v1.0.0</span>
      </div>
    </div>

    <!-- 右侧登录区域 -->
    <div class="login-page__form-section">
      <!-- 顶部工具栏 -->
      <div class="login-page__toolbar">
        <LanguageDropdown show-label size="small" />
        <ThemeDropdown show-label size="small" />
      </div>

      <!-- 登录表单容器 -->
      <div class="login-page__form-container">
        <div class="login-page__form-wrapper">
          <!-- 边框流光效果 -->
          <div class="login-page__glow-border">
            <div class="login-page__glow-line" />
          </div>

          <!-- 表单内容 -->
          <div class="login-page__form-inner">
            <div class="login-page__form-header">
              <h2 class="login-page__form-title">{{ t('auth.login.title') }}</h2>
              <p class="login-page__form-subtitle">{{ t('auth.login.subtitle') }}</p>
            </div>

            <n-form
              ref="formRef"
              :model="formData"
              :rules="rules"
              label-placement="left"
              label-width="0"
              require-mark-placement="right-hanging"
              class="login-page__form"
            >
              <n-form-item path="username" class="login-page__form-item">
                <n-input
                  v-model:value="formData.username"
                  :placeholder="t('auth.login.usernamePlaceholder')"
                  size="large"
                  :disabled="isLoading"
                  class="login-page__input"
                  @keydown.enter="handleEnterSubmit"
                />
              </n-form-item>

              <n-form-item path="password" class="login-page__form-item">
                <n-input
                  v-model:value="formData.password"
                  type="password"
                  show-password-on="click"
                  :placeholder="t('auth.login.passwordPlaceholder')"
                  size="large"
                  :disabled="isLoading"
                  class="login-page__input"
                  @keydown.enter="handleEnterSubmit"
                />
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
                  {{ isLoading ? t('auth.login.logging') : t('auth.login.loginButton') }}
                </n-button>
              </n-form-item>
            </n-form>
          </div>
        </div>
      </div>
    </div>

    <!-- 滑块验证码弹窗 -->
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

<style lang="scss" scoped>
// ============================================
// 基础布局
// ============================================
.login-page {
  display: flex;
  min-height: 100vh;
  background-color: var(--color-bg);
  transition: background-color 0.3s ease;

  // ============================================
  // 左侧品牌区域
  // ============================================
  &__brand {
    display: none;
    flex: 0 0 50%;
    position: relative;
    overflow: hidden;
    background: var(--color-primary);

    @media (width >= 1024px) {
      display: flex;
      align-items: center;
      justify-content: center;
    }
  }

  &__brand-bg {
    position: absolute;
    inset: 0;
    overflow: hidden;
  }

  // 动态光球
  &__orb {
    position: absolute;
    border-radius: 50%;
    filter: blur(80px);
    opacity: 0.6;
    animation: orb-float 20s ease-in-out infinite;

    &--1 {
      top: -20%;
      left: -10%;
      width: 60%;
      height: 60%;
      background: var(--color-primary-hover);
      animation-delay: 0s;
    }

    &--2 {
      bottom: -20%;
      right: -10%;
      width: 50%;
      height: 50%;
      background: var(--color-info);
      animation-delay: -7s;
    }

    &--3 {
      top: 40%;
      left: 50%;
      width: 30%;
      height: 30%;
      background: var(--color-success);
      opacity: 0.4;
      animation-delay: -14s;
    }
  }

  // 网格背景
  &__grid {
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px);
    background-size: 50px 50px;
    opacity: 0.5;
  }

  &__brand-content {
    position: relative;
    z-index: 10;
    text-align: center;
    color: #fff;
    padding: var(--spacing-8);
  }

  &__brand-logo {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 100px;
    height: 100px;
    margin-bottom: var(--spacing-8);
    background: rgba(255, 255, 255, 0.15);
    border: 1px solid rgba(255, 255, 255, 0.25);
    border-radius: var(--radius-2xl);
    backdrop-filter: blur(20px);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
    transition:
      transform 0.3s ease,
      box-shadow 0.3s ease;

    &:hover {
      transform: scale(1.05);
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.2);
    }

    svg {
      width: 56px;
      height: 56px;
      color: #fff;
      filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.2));
    }
  }

  &__brand-title {
    margin: 0 0 var(--spacing-4);
    font-size: 3rem;
    font-weight: 700;
    letter-spacing: -0.02em;
    color: #fff;
    text-shadow: 0 2px 20px rgba(0, 0, 0, 0.2);
  }

  &__brand-desc {
    margin: 0;
    font-size: var(--text-lg);
    color: rgba(255, 255, 255, 0.85);
    font-weight: 400;
  }

  &__brand-footer {
    position: absolute;
    bottom: var(--spacing-8);
    left: 50%;
    transform: translateX(-50%);
    z-index: 10;
  }

  &__brand-version {
    font-size: var(--text-sm);
    color: rgba(255, 255, 255, 0.5);
    font-family: var(--font-mono);
  }

  // ============================================
  // 右侧表单区域
  // ============================================
  &__form-section {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    background: var(--color-bg);
    position: relative;
  }

  &__toolbar {
    display: flex;
    justify-content: flex-end;
    gap: var(--spacing-3);
    padding: var(--spacing-6) var(--spacing-8);
    z-index: 10;
  }

  &__toolbar-btn {
    height: 36px;
    padding: 0 var(--spacing-3);
    border-radius: var(--radius-full);
    transition: all 0.2s ease;

    &:hover {
      background-color: var(--color-surface-hover);
    }
  }

  &__form-container {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--spacing-6);
  }

  &__form-wrapper {
    position: relative;
    width: 100%;
    max-width: 420px;
  }

  // 流光边框容器
  &__glow-border {
    position: absolute;
    inset: 0;
    border-radius: var(--radius-2xl);
    padding: 1px;
    background: var(--color-border);
    overflow: hidden;

    &::before {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: inherit;
      background: var(--color-surface);
    }
  }

  // 流光线条
  &__glow-line {
    position: absolute;
    width: 80px;
    height: 80px;
    background: var(--color-primary);
    filter: blur(20px);
    opacity: 0.6;
    animation: glow-rotate 4s linear infinite;
  }

  &__form-inner {
    position: relative;
    z-index: 1;
    padding: var(--spacing-10);
    background: var(--color-surface);
    border-radius: var(--radius-2xl);
  }

  &__form-header {
    text-align: center;
    margin-bottom: var(--spacing-10);
  }

  &__form-title {
    margin: 0 0 var(--spacing-3);
    font-size: var(--text-3xl);
    font-weight: 700;
    color: var(--color-text);
    letter-spacing: -0.02em;
  }

  &__form-subtitle {
    margin: 0;
    font-size: var(--text-base);
    color: var(--color-text-muted);
  }

  &__form {
    width: 100%;
  }

  &__form-item {
    margin-bottom: var(--spacing-6);

    &--button {
      margin-top: var(--spacing-8);
      margin-bottom: 0;
    }
  }

  &__input {
    :deep(.n-input) {
      border-radius: var(--radius-lg);
      background-color: var(--color-bg);
      transition: all 0.2s ease;

      &:hover,
      &:focus-within {
        border-color: var(--color-primary);
        background-color: var(--color-surface);
      }
    }

    :deep(.n-input__input-el) {
      height: 52px;
      font-size: var(--text-base);
    }
  }

  &__submit-btn {
    height: 52px;
    font-size: var(--text-lg);
    font-weight: 600;
    border-radius: var(--radius-lg);
    transition: all 0.2s ease;

    &:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
    }

    &:active {
      transform: translateY(0);
    }
  }
}

// ============================================
// 动画
// ============================================
@keyframes orb-float {
  0%,
  100% {
    transform: translate(0, 0) scale(1);
  }

  25% {
    transform: translate(10%, 10%) scale(1.1);
  }

  50% {
    transform: translate(-5%, 15%) scale(0.95);
  }

  75% {
    transform: translate(5%, -10%) scale(1.05);
  }
}

@keyframes glow-rotate {
  0% {
    top: -40px;
    left: -40px;
  }

  25% {
    top: -40px;
    left: calc(100% - 40px);
  }

  50% {
    top: calc(100% - 40px);
    left: calc(100% - 40px);
  }

  75% {
    top: calc(100% - 40px);
    left: -40px;
  }

  100% {
    top: -40px;
    left: -40px;
  }
}

// ============================================
// Pearl 主题 - 珍珠白（高端浅色）
// ============================================
[data-theme='pearl'] {
  .login-page {
    &__brand {
      background: linear-gradient(135deg, #6366f1 0%, #4f46e5 50%, #4338ca 100%);
    }

    &__orb--1 {
      background: #818cf8;
    }

    &__orb--2 {
      background: #60a5fa;
    }

    &__orb--3 {
      background: #34d399;
    }

    &__glow-line {
      background: linear-gradient(90deg, #4f46e5, #6366f1);
    }

    &__form-inner {
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06);
    }
  }
}

// ============================================
// Obsidian 主题 - 黑曜石（深色低对比）
// ============================================
[data-theme='obsidian'] {
  .login-page {
    &__brand {
      background: linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #3730a3 100%);
    }

    &__orb--1 {
      background: #6366f1;
    }

    &__orb--2 {
      background: #818cf8;
    }

    &__orb--3 {
      background: #a5b4fc;
    }

    &__grid {
      background-image:
        linear-gradient(rgba(129, 140, 248, 0.08) 1px, transparent 1px),
        linear-gradient(90deg, rgba(129, 140, 248, 0.08) 1px, transparent 1px);
    }

    &__glow-line {
      background: linear-gradient(90deg, #818cf8, #a5b4fc);
    }

    &__form-inner {
      background: var(--color-surface);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
    }
  }
}

// ============================================
// Sakura 主题 - 樱（日系浅粉）
// ============================================
[data-theme='sakura'] {
  .login-page {
    &__brand {
      background: linear-gradient(135deg, #ec4899 0%, #db2777 50%, #be185d 100%);
    }

    &__orb--1 {
      background: #f472b6;
    }

    &__orb--2 {
      background: #fb7185;
    }

    &__orb--3 {
      background: #fda4af;
    }

    &__glow-line {
      background: linear-gradient(90deg, #ec4899, #f472b6);
    }

    &__form-inner {
      box-shadow: 0 4px 24px rgba(236, 72, 153, 0.08);
    }
  }
}

// ============================================
// Cyberpunk 主题 - 赛博朋克（霓虹深色）
// ============================================
[data-theme='cyberpunk'] {
  .login-page {
    &__brand {
      background: #010b14;
      position: relative;
      overflow: hidden;

      // 透视网格地面
      &::before {
        content: '';
        position: absolute;
        bottom: -50%;
        left: -50%;
        right: -50%;
        height: 100%;
        background-image:
          linear-gradient(rgba(0, 243, 255, 0.2) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0, 243, 255, 0.2) 1px, transparent 1px);
        background-size: 40px 40px;
        transform: perspective(500px) rotateX(60deg);
        transform-origin: center top;
        animation: cyber-grid 10s linear infinite;
        mask-image: linear-gradient(to top, black 0%, transparent 80%);
        box-shadow: 0 0 100px rgba(0, 243, 255, 0.2);
      }

      // 扫描线
      &::after {
        content: '';
        position: absolute;
        inset: 0;
        background: repeating-linear-gradient(
          0deg,
          transparent,
          transparent 2px,
          rgba(0, 243, 255, 0.05) 2px,
          rgba(0, 243, 255, 0.05) 4px
        );
        pointer-events: none;
        z-index: 5;
      }
    }

    &__brand-title {
      position: relative;
      color: var(--color-primary);
      text-shadow:
        2px 2px 0 var(--color-danger),
        -2px -2px 0 var(--color-warning);
      animation: glitch 3s infinite;

      &::before,
      &::after {
        content: attr(data-text);
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: #010b14;
      }

      &::before {
        left: 2px;
        text-shadow: -1px 0 #ff00c1;
        clip-path: inset(44px 0 calc(100% - 56px) 0);
        animation: glitch-anim 5s infinite linear alternate-reverse;
      }

      &::after {
        left: -2px;
        text-shadow: -1px 0 #fcee0a;
        clip-path: inset(44px 0 calc(100% - 56px) 0);
        animation: glitch-anim2 5s infinite linear alternate-reverse;
      }
    }

    &__brand-logo {
      border-color: var(--color-primary);
      box-shadow:
        0 0 20px var(--color-primary-light),
        inset 0 0 20px var(--color-primary-light);
      background: rgba(0, 243, 255, 0.05);

      svg {
        filter: drop-shadow(0 0 10px var(--color-primary));
      }
    }

    &__form-inner {
      background: rgba(2, 18, 32, 0.85);
      border: 1px solid var(--color-primary);
      box-shadow:
        0 0 30px rgba(0, 243, 255, 0.1),
        inset 0 0 20px rgba(0, 243, 255, 0.05);
      position: relative;
      clip-path: polygon(0 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%);

      // HUD Corner Accents
      &::before {
        content: '';
        position: absolute;
        top: -2px;
        left: -2px;
        width: 20px;
        height: 20px;
        border-top: 2px solid var(--color-warning);
        border-left: 2px solid var(--color-warning);
      }

      &::after {
        content: '';
        position: absolute;
        bottom: -2px;
        right: -2px;
        width: 20px;
        height: 20px;
        border-bottom: 2px solid var(--color-warning);
        border-right: 2px solid var(--color-warning);
      }
    }

    &__input {
      :deep(.n-input) {
        background: rgba(0, 0, 0, 0.3);
        border: 1px solid var(--color-border);
        color: var(--color-primary);

        &:hover,
        &:focus-within {
          border-color: var(--color-warning);
          box-shadow: 0 0 15px rgba(252, 238, 10, 0.2);
          background: rgba(252, 238, 10, 0.05);
        }
      }
    }

    &__submit-btn {
      background: var(--color-warning);
      color: #000;
      font-weight: 800;
      border: none;
      box-shadow: 0 0 20px rgba(252, 238, 10, 0.3);
      text-transform: uppercase;
      letter-spacing: 2px;
      clip-path: polygon(
        10px 0,
        100% 0,
        100% calc(100% - 10px),
        calc(100% - 10px) 100%,
        0 100%,
        0 10px
      );

      &:hover {
        background: #fff566;
        box-shadow: 0 0 30px var(--color-warning);
        transform: scale(1.02);
      }
    }
  }
}

// ============================================
// 安全验证弹层：克制的层级入场与更清晰的退出关系
// ============================================
:global(.captcha-modal) {
  overflow: hidden;
  background-color: var(--color-surface);
  border: 1px solid color-mix(in srgb, var(--color-border-strong) 76%, transparent);
  border-radius: var(--radius-modal);
  box-shadow: var(--shadow-2xl);
}

:global(.captcha-modal.fade-in-scale-up-transition-enter-active) {
  transition:
    opacity var(--duration-slower) var(--easing-out-expo),
    transform var(--duration-slower) var(--easing-out-expo) !important;
}

:global(.captcha-modal.fade-in-scale-up-transition-leave-active) {
  transition:
    opacity var(--duration-normal) var(--easing-ease-in),
    transform var(--duration-normal) var(--easing-ease-in) !important;
}

:global(.captcha-modal.fade-in-scale-up-transition-enter-from) {
  opacity: 0;
  transform: translateY(var(--spacing-6)) scale(0.965);
}

:global(.captcha-modal.fade-in-scale-up-transition-enter-to),
:global(.captcha-modal.fade-in-scale-up-transition-leave-from) {
  opacity: 1;
  transform: translateY(0) scale(1);
}

:global(.captcha-modal.fade-in-scale-up-transition-leave-to) {
  opacity: 0;
  transform: translateY(var(--spacing-2)) scale(0.985);
}

:global(.captcha-modal__header) {
  padding: var(--spacing-6) var(--spacing-6) var(--spacing-3);
  border-bottom: 0;
}

:global(.captcha-modal__header .n-card-header__main) {
  color: var(--color-text);
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  letter-spacing: var(--tracking-tight);
}

:global(.captcha-modal__content) {
  padding: var(--spacing-3) var(--spacing-6) var(--spacing-6);
}

:global(.n-modal-scroll-content:has(.captcha-modal) > .n-modal-mask) {
  background-color: color-mix(in srgb, var(--color-overlay) 88%, transparent);
  backdrop-filter: blur(4px) saturate(0.82);
}

@keyframes cyber-grid {
  0% {
    transform: perspective(500px) rotateX(60deg) translateY(0);
  }

  100% {
    transform: perspective(500px) rotateX(60deg) translateY(40px);
  }
}

@keyframes glitch {
  0% {
    text-shadow:
      2px 2px 0 var(--color-danger),
      -2px -2px 0 var(--color-info);
  }

  25% {
    text-shadow:
      -2px 2px 0 var(--color-danger),
      2px -2px 0 var(--color-info);
  }

  50% {
    text-shadow:
      2px -2px 0 var(--color-danger),
      -2px 2px 0 var(--color-info);
  }

  75% {
    text-shadow:
      -2px -2px 0 var(--color-danger),
      2px 2px 0 var(--color-info);
  }

  100% {
    text-shadow:
      2px 2px 0 var(--color-danger),
      -2px -2px 0 var(--color-info);
  }
}

@keyframes glitch-anim {
  0% {
    clip-path: inset(24px 0 calc(100% - 90px) 0);
  }

  20% {
    clip-path: inset(65px 0 calc(100% - 12px) 0);
  }

  40% {
    clip-path: inset(89px 0 calc(100% - 5px) 0);
  }

  60% {
    clip-path: inset(12px 0 calc(100% - 67px) 0);
  }

  80% {
    clip-path: inset(45px 0 calc(100% - 34px) 0);
  }

  100% {
    clip-path: inset(78px 0 calc(100% - 89px) 0);
  }
}

@keyframes glitch-anim2 {
  0% {
    clip-path: inset(12px 0 calc(100% - 45px) 0);
  }

  20% {
    clip-path: inset(89px 0 calc(100% - 23px) 0);
  }

  40% {
    clip-path: inset(34px 0 calc(100% - 67px) 0);
  }

  60% {
    clip-path: inset(67px 0 calc(100% - 12px) 0);
  }

  80% {
    clip-path: inset(23px 0 calc(100% - 89px) 0);
  }

  100% {
    clip-path: inset(45px 0 calc(100% - 34px) 0);
  }
}

// Cyberpunk 主题 - 额外样式覆盖
[data-theme='cyberpunk'] {
  .login-page {
    &__orb {
      filter: blur(100px);
      opacity: 0.5;

      &--1 {
        background: #00f3ff; // Cyan
      }

      &--2 {
        background: #fcee0a; // Yellow
      }

      &--3 {
        background: #ff003c; // Red
        opacity: 0.3;
      }
    }

    &__grid {
      display: none;
    }

    &__brand-content {
      z-index: 10;
    }

    &__brand-logo {
      background: rgba(0, 243, 255, 0.1);
      border-color: rgba(0, 243, 255, 0.5);
      box-shadow:
        0 0 30px rgba(0, 243, 255, 0.2),
        inset 0 0 20px rgba(0, 243, 255, 0.1);

      // 角标装饰
      &::before,
      &::after {
        content: '';
        position: absolute;
        width: 12px;
        height: 12px;
        border: 2px solid #fcee0a;
      }

      &::before {
        top: -4px;
        left: -4px;
        border-right: none;
        border-bottom: none;
      }

      &::after {
        bottom: -4px;
        right: -4px;
        border-left: none;
        border-top: none;
      }

      svg {
        color: #00f3ff;
        filter: drop-shadow(0 0 10px #00f3ff);
      }
    }

    &__brand-title {
      font-family: Orbitron, Rajdhani, sans-serif;
      text-transform: uppercase;
      letter-spacing: 0.15em;
      font-size: 2.5rem;
      background: linear-gradient(180deg, #fff 0%, #00f3ff 100%);
      background-clip: text;
      -webkit-text-fill-color: transparent;
      text-shadow: none;
      filter: drop-shadow(0 0 20px rgba(0, 243, 255, 0.5));
    }

    &__brand-desc {
      color: rgba(224, 247, 250, 0.7);
    }

    &__brand-version {
      color: rgba(252, 238, 10, 0.6);
    }

    // 表单区域
    &__form-section {
      background: #010b14;

      &::before {
        content: '';
        position: absolute;
        inset: 0;
        background-image:
          linear-gradient(rgba(0, 51, 77, 0.2) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0, 51, 77, 0.2) 1px, transparent 1px);
        background-size: 40px 40px;
        pointer-events: none;
      }
    }

    // 流光边框 - 霓虹效果
    &__glow-border {
      background: linear-gradient(135deg, rgba(0, 243, 255, 0.3), rgba(252, 238, 10, 0.3));
      padding: 2px;

      &::before {
        background: rgba(2, 18, 32, 0.95);
      }
    }

    &__glow-line {
      width: 100px;
      height: 100px;
      background: linear-gradient(90deg, #00f3ff, #fcee0a);
      filter: blur(25px);
      opacity: 0.8;
    }

    &__form-inner {
      background: rgba(2, 18, 32, 0.9);
      backdrop-filter: blur(20px);
    }

    &__form-title {
      font-family: Orbitron, Rajdhani, sans-serif;
      letter-spacing: 0.05em;
    }

    &__input {
      :deep(.n-input) {
        background-color: rgba(2, 12, 22, 0.6);
        border-color: rgba(0, 51, 77, 0.8);

        &:hover,
        &:focus-within {
          border-color: #fcee0a;
          box-shadow: 0 0 20px rgba(252, 238, 10, 0.15);
          background-color: rgba(2, 12, 22, 0.9);
        }
      }
    }

    &__submit-btn {
      background: linear-gradient(90deg, #fcee0a, #d4c808);
      border: 1px solid rgba(252, 238, 10, 0.3);
      text-transform: uppercase;
      letter-spacing: 0.1em;
      font-family: Orbitron, Rajdhani, sans-serif;

      &:hover {
        background: linear-gradient(90deg, #fff566, #fcee0a);
        box-shadow: 0 0 30px rgba(252, 238, 10, 0.4);
      }
    }
  }
}

@keyframes cyber-grid {
  0% {
    background-position: 0 0;
  }

  100% {
    background-position: 0 60px;
  }
}

// ============================================
// Reduced Motion 支持
// ============================================
@media (prefers-reduced-motion: reduce) {
  .login-page {
    &__orb {
      animation: none;
    }

    &__glow-line {
      animation: none;
      opacity: 0;
    }
  }

  [data-theme='cyberpunk'] .login-page__brand::before {
    animation: none;
  }

  :global(.captcha-modal.fade-in-scale-up-transition-enter-active),
  :global(.captcha-modal.fade-in-scale-up-transition-leave-active) {
    transition: opacity var(--duration-fast) linear !important;
  }

  :global(.captcha-modal.fade-in-scale-up-transition-enter-from),
  :global(.captcha-modal.fade-in-scale-up-transition-leave-to) {
    transform: none;
  }
}
</style>
