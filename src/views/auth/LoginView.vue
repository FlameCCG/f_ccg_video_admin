<script setup lang="ts">
/**
 * 登录页面
 * 用户名/密码表单 + 滑块验证码
 * Requirements: 4.1
 */
import { ref, reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import {
  NCard,
  NForm,
  NFormItem,
  NInput,
  NButton,
  NSpace,
  useMessage,
  type FormInst,
  type FormRules,
} from 'naive-ui'
import { useAuthStore } from '@/stores/auth'
import { useAppStore } from '@/stores/app'
import SlideCaptcha from '@/components/captcha/SlideCaptcha.vue'

// ==================== Composables ====================

const router = useRouter()
const { t } = useI18n()
const message = useMessage()
const authStore = useAuthStore()
const appStore = useAppStore()

// ==================== 状态 ====================

/** 表单引用 */
const formRef = ref<FormInst | null>(null)

/** 滑块验证码组件引用 */
interface CaptchaExposed {
  reset: () => void
  refresh: () => void
}
const captchaRef = ref<CaptchaExposed | null>(null)

/** 表单数据 */
const formData = reactive({
  username: '',
  password: '',
})

/** 验证码数据 */
const captchaData = reactive({
  token: '',
  x: 0,
  y: 0,
  verified: false,
})

/** 是否显示验证码 */
const showCaptcha = ref(true)

// ==================== 计算属性 ====================

/** 是否正在登录 */
const isLoading = computed(() => authStore.isLoggingIn)

/** 当前主题标签 */
const currentThemeLabel = computed(() => {
  const config = appStore.currentThemeConfig
  const locale = appStore.currentLocale
  if (!config) return ''
  if (locale === 'zh-CN') return config.labelZh
  if (locale === 'ja-JP') return config.labelJa
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

/**
 * 验证码验证成功
 */
function handleCaptchaSuccess(result: { token: string; x: number; y: number }): void {
  captchaData.token = result.token
  captchaData.x = result.x
  captchaData.y = result.y
  captchaData.verified = true
}

/**
 * 验证码验证失败
 */
function handleCaptchaFail(): void {
  captchaData.verified = false
  message.error(t('auth.captcha.failed'))
}

/**
 * 刷新验证码
 */
function handleCaptchaRefresh(): void {
  captchaData.verified = false
  captchaData.token = ''
  captchaData.x = 0
  captchaData.y = 0
}

/**
 * 提交登录
 */
async function handleSubmit(): Promise<void> {
  // 验证表单
  try {
    await formRef.value?.validate()
  } catch {
    return
  }

  // 检查验证码
  if (!captchaData.verified) {
    message.warning(t('auth.tips.captchaRequired'))
    return
  }

  // 执行登录
  try {
    await authStore.login({
      username: formData.username,
      password: formData.password,
      slideCaptchaToken: captchaData.token,
      slideCaptchaX: captchaData.x,
      slideCaptchaY: captchaData.y,
    })

    message.success(t('auth.tips.loginSuccess'))

    // 跳转到仪表盘
    void router.push({ path: '/dashboard' })
  } catch {
    // 错误已在 request 层处理
    // 重置验证码
    captchaRef.value?.reset()
    captchaData.verified = false
  }
}
</script>

<template>
  <div class="login-page">
    <!-- 背景装饰 -->
    <div class="login-page__bg">
      <div class="login-page__bg-shape login-page__bg-shape--1" />
      <div class="login-page__bg-shape login-page__bg-shape--2" />
      <div class="login-page__bg-shape login-page__bg-shape--3" />
    </div>

    <!-- 登录卡片 -->
    <n-card class="login-card" :bordered="false">
      <!-- Logo 和标题 -->
      <div class="login-card__header">
        <div class="login-card__logo">
          <svg
            class="login-card__logo-icon"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M4 8L12 4L20 8V16L12 20L4 16V8Z"
              stroke="currentColor"
              stroke-width="2"
              stroke-linejoin="round"
            />
            <path d="M12 4V20" stroke="currentColor" stroke-width="2" />
            <path d="M4 8L12 12L20 8" stroke="currentColor" stroke-width="2" />
          </svg>
        </div>
        <h1 class="login-card__title">{{ t('auth.login.title') }}</h1>
        <p class="login-card__subtitle">{{ t('auth.login.subtitle') }}</p>
      </div>

      <!-- 登录表单 -->
      <div @keydown.enter="handleSubmit">
        <n-form
          ref="formRef"
          :model="formData"
          :rules="rules"
          label-placement="left"
          label-width="0"
          require-mark-placement="right-hanging"
        >
          <n-form-item path="username">
            <n-input
              v-model:value="formData.username"
              :placeholder="t('auth.login.usernamePlaceholder')"
              size="large"
              :disabled="isLoading"
            />
          </n-form-item>

          <n-form-item path="password">
            <n-input
              v-model:value="formData.password"
              type="password"
              show-password-on="click"
              :placeholder="t('auth.login.passwordPlaceholder')"
              size="large"
              :disabled="isLoading"
            />
          </n-form-item>

          <!-- 滑块验证码 -->
          <n-form-item>
            <SlideCaptcha
              ref="captchaRef"
              :visible="showCaptcha"
              @success="handleCaptchaSuccess"
              @fail="handleCaptchaFail"
              @refresh="handleCaptchaRefresh"
            />
          </n-form-item>

          <!-- 登录按钮 -->
          <n-form-item>
            <n-button
              type="primary"
              block
              size="large"
              :loading="isLoading"
              :disabled="!captchaData.verified"
              @click="handleSubmit"
            >
              {{ isLoading ? t('auth.login.logging') : t('auth.login.loginButton') }}
            </n-button>
          </n-form-item>
        </n-form>
      </div>

      <!-- 底部信息 -->
      <div class="login-card__footer">
        <n-space justify="center" align="center">
          <span class="login-card__theme-label">{{ currentThemeLabel }}</span>
        </n-space>
      </div>
    </n-card>
  </div>
</template>

<style lang="scss" scoped>
.login-page {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: var(--spacing-4);
  background-color: var(--color-bg);
  overflow: hidden;

  &__bg {
    position: absolute;
    inset: 0;
    overflow: hidden;
    pointer-events: none;
  }

  &__bg-shape {
    position: absolute;
    border-radius: 50%;
    opacity: 0.5;
    filter: blur(80px);

    &--1 {
      top: -20%;
      left: -10%;
      width: 50%;
      height: 50%;
      background: var(--color-primary);
      opacity: 0.15;
    }

    &--2 {
      bottom: -20%;
      right: -10%;
      width: 40%;
      height: 40%;
      background: var(--color-success);
      opacity: 0.1;
    }

    &--3 {
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 60%;
      height: 60%;
      background: var(--color-primary);
      opacity: 0.05;
    }
  }
}

.login-card {
  position: relative;
  width: 100%;
  max-width: 400px;
  background-color: var(--color-surface);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-elev-3);

  &__header {
    text-align: center;
    margin-bottom: var(--spacing-6);
  }

  &__logo {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 64px;
    height: 64px;
    margin-bottom: var(--spacing-4);
    background: linear-gradient(135deg, var(--color-primary), var(--color-primary-hover));
    border-radius: var(--radius-lg);
    color: #fff;
  }

  &__logo-icon {
    width: 36px;
    height: 36px;
  }

  &__title {
    margin: 0 0 var(--spacing-2);
    font-size: var(--text-2xl);
    font-weight: var(--font-semibold);
    color: var(--color-text);
  }

  &__subtitle {
    margin: 0;
    font-size: var(--text-sm);
    color: var(--color-text-muted);
  }

  &__footer {
    margin-top: var(--spacing-4);
    padding-top: var(--spacing-4);
    border-top: 1px solid var(--color-border);
  }

  &__theme-label {
    font-size: var(--text-xs);
    color: var(--color-text-muted);
  }
}

// 深色主题下的卡片样式调整
[data-theme='obsidian'],
[data-theme='aurum'] {
  .login-card {
    background-color: var(--color-surface);
    border: 1px solid var(--color-border);
  }
}
</style>
