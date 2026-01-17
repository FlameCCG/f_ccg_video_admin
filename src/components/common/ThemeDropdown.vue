<script setup lang="ts">
/**
 * 涓婚涓嬫媺缁勪欢
 * 鏀寔 hover 灞曞紑
 * 鍙湪鐧诲綍椤靛拰甯冨眬澶撮儴澶嶇敤
 */
import { computed } from 'vue'
import { NPopover, NIcon } from 'naive-ui'
import { useI18n } from 'vue-i18n'
import { useAppStore, type ThemeName, themeConfigs } from '@/stores/app'

interface Props {
  /** 鏄惁鏄剧ず褰撳墠涓婚鍚嶇О */
  showLabel?: boolean
  /** 鎸夐挳澶у皬 */
  size?: 'small' | 'medium' | 'large'
}

withDefaults(defineProps<Props>(), {
  showLabel: true,
  size: 'small',
})

const { t } = useI18n()
const appStore = useAppStore()

const currentTheme = computed(() => appStore.currentTheme)

/** 鑾峰彇涓婚鏍囩 */
function getThemeLabel(name: ThemeName): string {
  const key = `layout.theme.${name}` as const
  return t(key)
}

/** 褰撳墠涓婚閰嶇疆 */
const currentConfig = computed(() => {
  return themeConfigs.find((c) => c.name === currentTheme.value)
})

/** 褰撳墠涓婚鏄剧ず鍚嶇О */
const currentThemeName = computed(() => {
  if (!currentConfig.value) return 'Theme'
  return getThemeLabel(currentConfig.value.name)
})

/** 鍒囨崲涓婚 */
function handleThemeChange(name: ThemeName): void {
  appStore.setTheme(name)
}
</script>

<template>
  <NPopover trigger="hover" placement="bottom" :show-arrow="false" raw>
    <template #trigger>
      <button
        class="theme-trigger"
        :class="[`theme-trigger--${size}`]"
        :title="t('layout.header.theme')"
      >
        <NIcon :size="size === 'small' ? 16 : 18" class="theme-trigger__icon">
          <!-- Pearl: Sun -->
          <svg
            v-if="currentTheme === 'pearl'"
            xmlns="http://www.w3.org/2000/svg"
            width="1em"
            height="1em"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <circle cx="12" cy="12" r="5" />
            <line x1="12" y1="1" x2="12" y2="3" />
            <line x1="12" y1="21" x2="12" y2="23" />
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
            <line x1="1" y1="12" x2="3" y2="12" />
            <line x1="21" y1="12" x2="23" y2="12" />
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
          </svg>
          <!-- Obsidian: Moon -->
          <svg
            v-else-if="currentTheme === 'obsidian'"
            xmlns="http://www.w3.org/2000/svg"
            width="1em"
            height="1em"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
          <!-- Cyberpunk: Hexagon/Chip -->
          <svg
            v-else-if="currentTheme === 'cyberpunk'"
            xmlns="http://www.w3.org/2000/svg"
            width="1em"
            height="1em"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
          <!-- Sakura: Flower -->
          <svg
            v-else-if="currentTheme === 'sakura'"
            xmlns="http://www.w3.org/2000/svg"
            width="1em"
            height="1em"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path
              d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"
            />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </NIcon>
        <span v-if="showLabel" class="theme-trigger__label">
          {{ currentThemeName }}
        </span>
        <svg
          class="theme-trigger__arrow"
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
      <div class="dropdown-title">{{ t('layout.theme.title') }}</div>
      <div class="dropdown-options">
        <button
          v-for="config in themeConfigs"
          :key="config.name"
          class="dropdown-option"
          :class="{ 'is-active': currentTheme === config.name }"
          @click="handleThemeChange(config.name)"
        >
          <span class="dropdown-option__icon">
            <svg
              v-if="config.name === 'pearl'"
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
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" />
              <line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" />
              <line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
            <svg
              v-else-if="config.name === 'obsidian'"
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
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
            <svg
              v-else-if="config.name === 'cyberpunk'"
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
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
            <svg
              v-else-if="config.name === 'sakura'"
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
              <path
                d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"
              />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </span>
          <span class="dropdown-option__name">{{ getThemeLabel(config.name) }}</span>
          <svg
            v-if="currentTheme === config.name"
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
.theme-trigger {
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
