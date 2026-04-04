<script setup lang="ts">
/**
 * Logo 组件
 * 显示应用 Logo 和标题，带精致的折叠动画
 */
import { RouterLink } from 'vue-router'

defineProps<{
  /** 是否折叠状态 */
  collapsed?: boolean
}>()
</script>

<template>
  <RouterLink to="/" class="app-logo" :class="{ 'is-collapsed': collapsed }">
    <!-- Logo 图标 -->
    <div class="logo-icon">
      <div class="logo-icon-inner">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <polygon points="23 7 16 12 23 17 23 7" />
          <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
        </svg>
      </div>
      <!-- 光晕效果 -->
      <div class="logo-glow" />
    </div>

    <!-- Logo 文字 -->
    <div class="logo-text-wrapper">
      <transition name="logo-text">
        <span v-if="!collapsed" class="logo-text">
          <span class="logo-text-main">Video</span>
          <span class="logo-text-sub">Admin</span>
        </span>
      </transition>
    </div>
  </RouterLink>
</template>

<style scoped lang="scss">
.app-logo {
  display: flex;
  align-items: center;
  gap: 14px;
  text-decoration: none;
  color: var(--color-text);
  padding: 4px;
  margin: -4px;
  border-radius: var(--radius-lg);
  transition:
    gap 280ms cubic-bezier(0.4, 0, 0.2, 1),
    background 200ms cubic-bezier(0.4, 0, 0.2, 1);

  &:hover {
    background: color-mix(in srgb, var(--color-primary) 5%, transparent);

    .logo-icon-inner {
      transform: scale(1.05);
    }

    .logo-glow {
      opacity: 0.6;
      transform: scale(1.2);
    }
  }

  &:active {
    .logo-icon-inner {
      transform: scale(0.98);
    }
  }

  &.is-collapsed {
    justify-content: center;
    gap: 0;
  }
}

.logo-icon {
  position: relative;
  flex-shrink: 0;
  width: 40px;
  height: 40px;
}

.logo-icon-inner {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  border-radius: var(--radius-lg);
  background: linear-gradient(
    135deg,
    var(--color-primary) 0%,
    color-mix(in srgb, var(--color-primary) 80%, var(--color-primary-hover) 20%) 100%
  );
  color: white;
  box-shadow:
    0 2px 8px color-mix(in srgb, var(--color-primary) 30%, transparent),
    inset 0 1px 0 rgba(255, 255, 255, 0.15);
  transition: transform 200ms cubic-bezier(0.4, 0, 0.2, 1);

  svg {
    filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.1));
  }
}

.logo-glow {
  position: absolute;
  inset: -4px;
  border-radius: var(--radius-xl);
  background: radial-gradient(circle at center, var(--color-primary) 0%, transparent 70%);
  opacity: 0.3;
  filter: blur(8px);
  transition:
    opacity 300ms cubic-bezier(0.4, 0, 0.2, 1),
    transform 300ms cubic-bezier(0.4, 0, 0.2, 1);
  pointer-events: none;
}

.logo-text-wrapper {
  overflow: hidden;
  flex: 1;
  min-width: 0;
}

.logo-text {
  display: flex;
  flex-direction: column;
  gap: 0;
  line-height: 1.2;
}

.logo-text-main {
  font-size: 17px;
  font-weight: 700;
  letter-spacing: -0.02em;
  background: linear-gradient(135deg, var(--color-text) 0%, var(--color-text-secondary) 100%);
  /* stylelint-disable-next-line property-no-vendor-prefix */
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.logo-text-sub {
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-text-muted);
}

/* Logo 文字过渡动画 */
.logo-text-enter-active {
  transition:
    opacity 200ms cubic-bezier(0.4, 0, 0.2, 1) 80ms,
    transform 280ms cubic-bezier(0.4, 0, 0.2, 1);
}

.logo-text-leave-active {
  transition:
    opacity 150ms cubic-bezier(0.4, 0, 0.2, 1),
    transform 200ms cubic-bezier(0.4, 0, 0.2, 1);
}

.logo-text-enter-from {
  opacity: 0;
  transform: translateX(-12px) scale(0.95);
}

.logo-text-leave-to {
  opacity: 0;
  transform: translateX(-8px) scale(0.98);
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .app-logo,
  .logo-icon-inner,
  .logo-glow {
    transition: none;
  }

  .logo-text-enter-active,
  .logo-text-leave-active {
    transition: none;
  }
}
</style>
