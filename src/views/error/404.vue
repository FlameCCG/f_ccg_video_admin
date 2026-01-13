<script setup lang="ts">
/**
 * 404 Not Found 页面
 * Requirements: 5.4
 */
import { useRouter } from 'vue-router'
import { NButton, NResult } from 'naive-ui'
import { useI18n } from 'vue-i18n'

const router = useRouter()
const { t } = useI18n()

function handleGoBack(): void {
  router.go(-1)
}

function handleGoHome(): void {
  void router.push('/')
}
</script>

<template>
  <div class="error-page">
    <NResult
      status="404"
      :title="t('common.error.title404')"
      :description="t('common.error.desc404')"
    >
      <template #footer>
        <div class="error-actions">
          <NButton @click="handleGoBack">
            {{ t('common.error.backPrev') }}
          </NButton>
          <NButton type="primary" @click="handleGoHome">
            {{ t('common.error.backHome') }}
          </NButton>
        </div>
      </template>
    </NResult>
  </div>
</template>

<style scoped lang="scss">
.error-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background-color: var(--color-bg);
}

.error-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}
</style>
