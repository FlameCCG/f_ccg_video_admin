<script setup lang="ts">
/**
 * 登录页面 - 世界级设计
 * 左右分栏布局：左侧品牌展示 + 右侧登录表单
 * 滑块验证码弹窗触发，右上角语言/主题切换
 * Requirements: 4.1
 */
import { ref, reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import {
  NForm,
  NFormItem,
  NInput,
  NButton,
  NDropdown,
  NIcon,
  NModal,
  useMessage,
  type FormInst,
  type FormRules,
} from 'naive-ui'
import { LanguageOutline, ColorPaletteOutline } from '@vicons/ionicons5'
import { useAuthStore } from '@/stores/auth'
import { useAppStore, type ThemeName } from '@/stores/app'
import type { LocaleType } from '@/locales'
import SlideCaptcha from '@/components/captcha/SlideCaptcha.vue'

// ==================== Composables ====================

const router = useRouter()
const { t, locale } = useI18n()
const message = useMessage()
const authStore = useAuthStore()
const appStore = useAppStore()

// ==================== Refs ====================

const formRef = ref<FormInst | null>(null)

interface CaptchaExposed {
  reset: () => void
  refresh: () => void
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

// ==================== 计算属性 ====================

const isLoading = computed(() => authStore.isLoggingIn)

/** 语言下拉选项 */
const localeOptions = computed(() =>
  appStore.localeConfigs.map((config) => ({
    label: config.label,
    key: config.locale,
  }))
)

/** 主题下拉选项 */
const themeOptions = computed(() =>
  appStore.themeConfigs.map((config) => ({
    label:
      appStore.currentLocale === 'zh-CN'
        ? config.labelZh
        : appStore.currentLocale === 'ja-JP'
          ? config.labelJa
          : config.label,
    key: config.name,
  }))
)

/** 当前语言显示名称 */
const currentLocaleName = computed(() => {
  const config = appStore.localeConfigs.find((c) => c.locale === appStore.currentLocale)
  return config?.label ?? 'Language'
})

/** 当前主题显示名称 */
const currentThemeName = computed(() => {
  const config = appStore.currentThemeConfig
  if (!config) return 'Theme'
  if (appStore.currentLocale === 'zh-CN') return config.labelZh
  if (appStore.currentLocale === 'ja-JP') return config.labelJa
  return config.label
})

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

// ==================== 方法 ====================

function handleLocaleSelect(key: string): void {
  appStore.setLocale(key as LocaleType)
  locale.value = key
}

function handleThemeSelect(key: string): void {
  appStore.setTheme(key as ThemeName)
}

function handleCaptchaSuccess(result: { token: string; x: number; y: number }): void {
  captchaData.token = result.token
  captchaData.x = result.x
  captchaData.y = result.y
  captchaData.verified = true
  showCaptchaModal.value = false
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
    showCaptchaModal.value = true
    captchaRef.value?.refresh()
  } catch {
    // 表单验证失败
  }
}

async function doLogin(): Promise<void> {
  if (!captchaData.verified) return

  try {
    await authStore.login({
      username: formData.username,
      password: formData.password,
      slideCaptchaToken: captchaData.token,
      slideCaptchaX: captchaData.x,
      slideCaptchaY: captchaData.y,
    })

    message.success(t('auth.tips.loginSuccess'))
    void router.push({ path: '/dashboard' })
  } catch {
    captchaRef.value?.reset()
    captchaData.verified = false
  }
}

function handleEnterSubmit(): void {
  void handleLoginClick()
}
</script>

<template>
  <div class="login-page">
    <!-- 左侧品牌区域 -->
    <div class="login-page__brand">
      <div class="login-page__brand-content">
        <!-- 装饰图形 -->
        <div class="login-page__brand-shapes">
          <div class="login-page__shape login-page__shape--1" />
          <div class="login-page__shape login-page__shape--2" />
          <div class="login-page__shape login-page__shape--3" />
          <div class="login-page__shape login-page__shape--4" />
        </div>

        <!-- 品牌信息 -->
        <div class="login-page__brand-info">
          <div class="login-page__brand-logo">
            <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="48" height="48" rx="12" fill="currentColor" fill-opacity="0.1" />
              <path d="M18 16L32 24L18 32V16Z" fill="currentColor" />
            </svg>
          </div>
          <h1 class="login-page__brand-title">Video Admin</h1>
          <p class="login-page__brand-desc">{{ t('auth.login.subtitle') }}</p>
        </div>

        <!-- 底部装饰文字 -->
        <div class="login-page__brand-footer">
          <span class="login-page__brand-version">v1.0.0</span>
        </div>
      </div>
    </div>

    <!-- 右侧登录区域 -->
    <div class="login-page__form-section">
      <!-- 顶部工具栏：语言/主题切换 -->
      <div class="login-page__toolbar">
        <n-dropdown :options="localeOptions" trigger="click" @select="handleLocaleSelect">
          <n-button quaternary size="small" class="login-page__toolbar-btn">
            <template #icon>
              <n-icon><LanguageOutline /></n-icon>
            </template>
            {{ currentLocaleName }}
          </n-button>
        </n-dropdown>

        <n-dropdown :options="themeOptions" trigger="click" @select="handleThemeSelect">
          <n-button quaternary size="small" class="login-page__toolbar-btn">
            <template #icon>
              <n-icon><ColorPaletteOutline /></n-icon>
            </template>
            {{ currentThemeName }}
          </n-button>
        </n-dropdown>
      </div>

      <!-- 登录表单容器 -->
      <div class="login-page__form-container">
        <div class="login-page__form-wrapper">
          <!-- 表单标题 -->
          <div class="login-page__form-header">
            <h2 class="login-page__form-title">{{ t('auth.login.title') }}</h2>
            <p class="login-page__form-subtitle">{{ t('auth.login.subtitle') }}</p>
          </div>

          <!-- 表单 -->
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

            <!-- 登录按钮 -->
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

    <!-- 滑块验证码弹窗 -->
    <n-modal
      v-model:show="showCaptchaModal"
      preset="card"
      :title="t('auth.captcha.title')"
      :style="{ width: '360px' }"
      :mask-closable="false"
    >
      <SlideCaptcha
        ref="captchaRef"
        :visible="showCaptchaModal"
        @success="handleCaptchaSuccess"
        @fail="handleCaptchaFail"
        @refresh="handleCaptchaRefresh"
      />
    </n-modal>
  </div>
</template>

<style lang="scss" scoped>
.login-page {
  display: flex;
  min-height: 100vh;
  background-color: var(--color-bg);

  // 左侧品牌区域
  &__brand {
    display: none;
    flex: 0 0 45%;
    position: relative;
    background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-hover) 100%);
    overflow: hidden;

    @media (width >= 1024px) {
      display: flex;
      align-items: center;
      justify-content: center;
    }
  }

  &__brand-content {
    position: relative;
    z-index: 1;
    padding: var(--spacing-8);
    text-align: center;
    color: #fff;
  }

  &__brand-shapes {
    position: absolute;
    inset: 0;
    overflow: hidden;
    pointer-events: none;
  }

  &__shape {
    position: absolute;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.1);

    &--1 {
      top: -10%;
      left: -5%;
      width: 40%;
      height: 40%;
    }

    &--2 {
      bottom: -15%;
      right: -10%;
      width: 50%;
      height: 50%;
    }

    &--3 {
      top: 40%;
      left: 60%;
      width: 20%;
      height: 20%;
    }

    &--4 {
      top: 60%;
      left: 10%;
      width: 15%;
      height: 15%;
    }
  }

  &__brand-info {
    position: relative;
    z-index: 2;
  }

  &__brand-logo {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 80px;
    height: 80px;
    margin-bottom: var(--spacing-6);
    background: rgba(255, 255, 255, 0.2);
    border-radius: var(--radius-xl);
    backdrop-filter: blur(10px);

    svg {
      width: 48px;
      height: 48px;
      color: #fff;
    }
  }

  &__brand-title {
    margin: 0 0 var(--spacing-3);
    font-size: var(--text-4xl);
    font-weight: var(--font-bold);
    letter-spacing: -0.02em;
  }

  &__brand-desc {
    margin: 0;
    font-size: var(--text-lg);
    opacity: 0.9;
  }

  &__brand-footer {
    position: absolute;
    bottom: var(--spacing-6);
    left: 50%;
    transform: translateX(-50%);
  }

  &__brand-version {
    font-size: var(--text-sm);
    opacity: 0.7;
  }

  // 右侧表单区域
  &__form-section {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }

  &__toolbar {
    display: flex;
    justify-content: flex-end;
    gap: var(--spacing-2);
    padding: var(--spacing-4) var(--spacing-6);
  }

  &__toolbar-btn {
    color: var(--color-text-muted);

    &:hover {
      color: var(--color-text);
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
    width: 100%;
    max-width: 400px;
  }

  &__form-header {
    text-align: center;
    margin-bottom: var(--spacing-8);
  }

  &__form-title {
    margin: 0 0 var(--spacing-2);
    font-size: var(--text-3xl);
    font-weight: var(--font-semibold);
    color: var(--color-text);
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
    margin-bottom: var(--spacing-5);

    &--button {
      margin-top: var(--spacing-6);
      margin-bottom: 0;
    }
  }

  &__input {
    :deep(.n-input__input-el) {
      height: 48px;
    }
  }

  &__submit-btn {
    height: 48px;
    font-size: var(--text-base);
    font-weight: var(--font-medium);
  }
}

// 深色主题调整
[data-theme='obsidian'],
[data-theme='aurum'] {
  .login-page {
    &__brand {
      background: linear-gradient(135deg, var(--color-surface-alt) 0%, var(--color-surface) 100%);
    }

    &__brand-logo {
      background: rgba(255, 255, 255, 0.1);
    }

    &__shape {
      background: rgba(255, 255, 255, 0.05);
    }
  }
}
</style>
