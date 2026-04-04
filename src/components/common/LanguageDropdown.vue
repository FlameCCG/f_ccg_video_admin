<script setup lang="ts">
/**
 * 璇█涓嬫媺缁勪欢
 * 鏀寔 hover 灞曞紑锛屽甫鏂囧瓧 A 鍥炬爣
 * 鍙湪鐧诲綍椤靛拰甯冨眬澶撮儴澶嶇敤
 */
import { computed, type Component } from 'vue'
import { NPopover, NIcon } from 'naive-ui'
import { useI18n } from 'vue-i18n'
import { useLocale, type LocaleType } from '@/composables/useLocale'
import IconLanguage from '@/components/icons/IconLanguage.vue'
import IconFlagCN from '@/components/icons/flags/IconFlagCN.vue'
import IconFlagUS from '@/components/icons/flags/IconFlagUS.vue'
import IconFlagJP from '@/components/icons/flags/IconFlagJP.vue'

interface Props {
  /** 是否显示当前语言名称 */
  showLabel?: boolean
  /** 按钮大小 */
  size?: 'small' | 'medium' | 'large'
}

withDefaults(defineProps<Props>(), {
  showLabel: true,
  size: 'small',
})

const { t } = useI18n()
const { currentLocale, localeConfigs, setLocale } = useLocale()

/** 当前语言配置 */
const currentConfig = computed(() => {
  return localeConfigs.find((c) => c.locale === currentLocale.value)
})

/** 获取国旗图标组件 */
function getFlagIcon(locale: string): Component | null {
  switch (locale) {
    case 'zh-CN':
      return IconFlagCN as unknown as Component
    case 'en-US':
      return IconFlagUS as unknown as Component
    case 'ja-JP':
      return IconFlagJP as unknown as Component
    default:
      return null
  }
}

/** 鍒囨崲璇█ */
async function handleLocaleChange(locale: LocaleType): Promise<void> {
  await setLocale(locale)
}
</script>

<template>
  <NPopover trigger="hover" placement="bottom" :show-arrow="false" raw>
    <template #trigger>
      <button
        class="lang-trigger"
        :class="[`lang-trigger--${size}`]"
        :title="t('layout.header.language')"
      >
        <NIcon :size="size === 'small' ? 16 : 18" class="lang-trigger__icon">
          <IconLanguage />
        </NIcon>
        <span v-if="showLabel" class="lang-trigger__label">
          {{ currentConfig?.label }}
        </span>
        <svg
          class="lang-trigger__arrow"
          xmlns="http://www.w3.org/2000/svg"
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
    </template>

    <div class="dropdown-panel">
      <div class="dropdown-title">{{ t('layout.language.title') }}</div>
      <div class="dropdown-options">
        <button
          v-for="config in localeConfigs"
          :key="config.locale"
          class="dropdown-option"
          :class="{ 'is-active': currentLocale === config.locale }"
          @click="handleLocaleChange(config.locale)"
        >
          <NIcon :size="20" class="dropdown-option__icon">
            <component :is="getFlagIcon(config.locale)" />
          </NIcon>
          <span class="dropdown-option__name">{{ config.labelNative }}</span>
          <svg
            v-if="currentLocale === config.locale"
            class="dropdown-option__check"
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </button>
      </div>
    </div>
  </NPopover>
</template>

<style scoped lang="scss">
.lang-trigger {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-2);
  padding: var(--spacing-2) var(--spacing-3);
  border: none;
  border-radius: var(--radius-full);
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all var(--duration-fast) var(--easing-standard);

  &:hover {
    background-color: var(--color-surface-hover);
    color: var(--color-text);
  }

  &--small {
    height: 32px;
    font-size: var(--text-sm);
  }

  &--medium {
    height: 36px;
    font-size: var(--text-base);
  }

  &--large {
    height: 40px;
    font-size: var(--text-base);
  }

  &__icon {
    flex-shrink: 0;
  }

  &__label {
    font-weight: 500;
  }

  &__arrow {
    flex-shrink: 0;
    opacity: 0.6;
    transition: transform var(--duration-fast) var(--easing-standard);
  }

  &:hover &__arrow {
    transform: translateY(1px);
  }
}

.dropdown-panel {
  min-width: 180px;
  padding: var(--spacing-2) 0;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
}

.dropdown-title {
  padding: var(--spacing-2) var(--spacing-4);
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.dropdown-options {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 0 var(--spacing-2);
}

.dropdown-option {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  width: 100%;
  padding: var(--spacing-2) var(--spacing-3);
  border: none;
  border-radius: var(--radius-md);
  background: transparent;
  cursor: pointer;
  transition: background-color var(--duration-fast) var(--easing-standard);

  &:hover {
    background-color: var(--color-surface-hover);
  }

  &.is-active {
    background-color: var(--color-primary-light);
  }

  &__icon {
    flex-shrink: 0;
  }

  &__name {
    flex: 1;
    text-align: left;
    font-size: var(--text-sm);
    color: var(--color-text);
  }

  &__check {
    flex-shrink: 0;
    color: var(--color-primary);
  }
}
</style>
