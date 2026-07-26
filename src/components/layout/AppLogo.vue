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
@use '@/styles/transitions/interaction' as ix;

.app-logo {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  padding: var(--spacing-1);
  margin: calc(-1 * var(--spacing-1));
  color: var(--color-text);
  text-decoration: none;
  border-radius: var(--radius-lg);

  @include ix.feedback-transition;
  @include ix.focus-ring;

  // $lift 传 0：logo 紧贴 logo 区底部的分隔线，上抬会顶到线上
  @include ix.pressable(0.98, 0);

  &:hover {
    background: var(--color-primary-subtle);

    .logo-icon-inner {
      transform: scale(1.05);
    }

    .logo-glow {
      opacity: 0.6;
      transform: scale(1.2);
    }
  }

  &.is-collapsed {
    gap: 0;
    justify-content: center;
  }
}

.logo-icon {
  position: relative;
  flex-shrink: 0;
  width: var(--spacing-10);
  height: var(--spacing-10);
}

.logo-icon-inner {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  color: var(--color-on-primary);
  background: linear-gradient(
    135deg,
    var(--color-primary) 0%,
    color-mix(in srgb, var(--color-primary) 80%, var(--color-primary-hover) 20%) 100%
  );
  border-radius: var(--radius-lg);

  // 顶部 1px 高光用 on-primary 兑出来：这是「主色表面上的墨色」，
  // 深色主题下自然翻转，不会像写死的白色那样在暗色主色上糊成一片。
  box-shadow:
    var(--shadow-elev-1),
    inset 0 1px 0 color-mix(in srgb, var(--color-on-primary) 15%, transparent);

  @include ix.feedback-transition;

  svg {
    filter: drop-shadow(0 1px 1px var(--color-overlay-soft));
  }
}

.logo-glow {
  position: absolute;
  inset: calc(-1 * var(--spacing-1));
  background: radial-gradient(circle at center, var(--color-primary) 0%, transparent 70%);
  border-radius: var(--radius-xl);
  opacity: 0.3;
  filter: blur(8px);
  pointer-events: none;

  @include ix.feedback-transition;
}

.logo-text-wrapper {
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.logo-text {
  display: flex;
  flex-direction: column;
  gap: 0;
  line-height: var(--leading-tight);
}

.logo-text-main {
  font-size: var(--text-lg);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-tight);
  background: linear-gradient(135deg, var(--color-text) 0%, var(--color-text-secondary) 100%);
  /* stylelint-disable-next-line property-no-vendor-prefix */
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.logo-text-sub {
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  letter-spacing: var(--tracking-wider);
  color: var(--color-text-muted);
  text-transform: uppercase;
}

/* Logo 文字过渡动画：进场减速入位、离场加速离开，时长与曲线全部走语义 token */
@include ix.enter-leave(
  'logo-text',
  translateX(calc(-1 * var(--spacing-3))) scale(0.95),
  translateX(calc(-1 * var(--spacing-2))) scale(0.98)
);
</style>
