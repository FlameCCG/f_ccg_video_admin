<script setup lang="ts">
/**
 * 系统配置页面
 * 根据路由参数显示不同的配置项
 */
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NCard, NTabs, NTabPane, NButton, NSpace, NSpin, useMessage } from 'naive-ui'
import { useI18n } from 'vue-i18n'
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { getSiteConfig, updateSiteConfig } from '@/api/site'
import type {
  SiteConfigName,
  SiteConfig,
  LoggerConfig,
  EmailConfig,
  TranscodeConfig,
  ThirdLoginConfig,
  JwtConfig,
} from '@/api/types'
import {
  SiteConfigForm,
  LoggerConfigForm,
  EmailConfigForm,
  TranscodeConfigForm,
  ThirdLoginConfigForm,
  JwtConfigForm,
} from './components'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const message = useMessage()
const queryClient = useQueryClient()

// 当前配置类型，从路由路径获取
const currentTab = computed(() => {
  const path = route.path
  const segments = path.split('/')
  const lastSegment = segments[segments.length - 1] || 'site'
  // 验证是否为有效的配置名称
  const validNames: SiteConfigName[] = ['site', 'logger', 'email', 'transcode', 'thirdLogin', 'jwt']
  return validNames.includes(lastSegment as SiteConfigName)
    ? (lastSegment as SiteConfigName)
    : 'site'
})

// 配置项列表
const configTabs = computed(() => [
  { key: 'site' as const, label: t('siteConfig.tabs.site') },
  { key: 'logger' as const, label: t('siteConfig.tabs.logger') },
  { key: 'email' as const, label: t('siteConfig.tabs.email') },
  { key: 'transcode' as const, label: t('siteConfig.tabs.transcode') },
  { key: 'thirdLogin' as const, label: t('siteConfig.tabs.thirdLogin') },
  { key: 'jwt' as const, label: t('siteConfig.tabs.jwt') },
])

// 表单数据
const siteFormData = ref<SiteConfig | null>(null)
const loggerFormData = ref<LoggerConfig | null>(null)
const emailFormData = ref<EmailConfig | null>(null)
const transcodeFormData = ref<TranscodeConfig | null>(null)
const thirdLoginFormData = ref<ThirdLoginConfig | null>(null)
const jwtFormData = ref<JwtConfig | null>(null)

// 获取配置数据
const { isLoading, refetch } = useQuery({
  queryKey: ['siteConfig', currentTab],
  queryFn: async () => {
    const name = currentTab.value
    const data = await getSiteConfig(name)
    // 根据类型设置对应的表单数据
    switch (name) {
      case 'site':
        siteFormData.value = data as SiteConfig
        break
      case 'logger':
        loggerFormData.value = data as LoggerConfig
        break
      case 'email':
        emailFormData.value = data as EmailConfig
        break
      case 'transcode':
        transcodeFormData.value = data as TranscodeConfig
        break
      case 'thirdLogin':
        thirdLoginFormData.value = data as ThirdLoginConfig
        break
      case 'jwt':
        jwtFormData.value = data as JwtConfig
        break
    }
    return data
  },
  staleTime: 30 * 1000,
})

// 更新配置 mutation
const updateMutation = useMutation({
  mutationFn: async () => {
    const name = currentTab.value
    let data: unknown
    switch (name) {
      case 'site':
        data = siteFormData.value
        break
      case 'logger':
        data = loggerFormData.value
        break
      case 'email':
        data = emailFormData.value
        break
      case 'transcode':
        data = transcodeFormData.value
        break
      case 'thirdLogin':
        data = thirdLoginFormData.value
        break
      case 'jwt':
        data = jwtFormData.value
        break
    }
    if (!data) throw new Error('No data to save')
    await updateSiteConfig(name, data as never)
  },
  onSuccess: () => {
    message.success(t('siteConfig.actions.saveSuccess'))
    void queryClient.invalidateQueries({ queryKey: ['siteConfig', currentTab.value] })
  },
  onError: (error: Error) => {
    message.error(error.message || t('siteConfig.actions.saveFailed'))
  },
})

// 切换 tab
function handleTabChange(name: string): void {
  const tabName = name as SiteConfigName
  void router.push(`/system-config/${tabName}`)
}

// 保存配置
function handleSave(): void {
  updateMutation.mutate()
}

// 重置配置
function handleReset(): void {
  void refetch()
}

// 监听 tab 变化，重新加载数据
watch(currentTab, () => {
  void refetch()
})
</script>

<template>
  <div class="site-config-page">
    <n-card :bordered="false">
      <template #header>
        <n-space justify="space-between" align="center">
          <span class="page-title">{{ t('siteConfig.title') }}</span>
          <n-space :size="8">
            <n-button
              size="small"
              secondary
              :disabled="isLoading || updateMutation.isPending.value"
              @click="handleReset"
            >
              {{ t('siteConfig.actions.reset') }}
            </n-button>
            <n-button
              type="primary"
              size="small"
              :loading="updateMutation.isPending.value"
              :disabled="isLoading"
              @click="handleSave"
            >
              {{ t('siteConfig.actions.save') }}
            </n-button>
          </n-space>
        </n-space>
      </template>

      <n-tabs :value="currentTab" type="line" @update:value="handleTabChange">
        <n-tab-pane
          v-for="tab in configTabs"
          :key="tab.key"
          :name="tab.key"
          :tab="tab.label"
          :disabled="isLoading"
        >
          <n-spin :show="isLoading" class="config-spin">
            <div class="config-content">
              <!-- 基础配置 -->
              <site-config-form
                v-if="tab.key === 'site'"
                v-model="siteFormData"
                :loading="updateMutation.isPending.value"
              />
              <!-- 日志配置 -->
              <logger-config-form
                v-else-if="tab.key === 'logger'"
                v-model="loggerFormData"
                :loading="updateMutation.isPending.value"
              />
              <!-- 邮件配置 -->
              <email-config-form
                v-else-if="tab.key === 'email'"
                v-model="emailFormData"
                :loading="updateMutation.isPending.value"
              />
              <!-- 转码配置 -->
              <transcode-config-form
                v-else-if="tab.key === 'transcode'"
                v-model="transcodeFormData"
                :loading="updateMutation.isPending.value"
              />
              <!-- 第三方登录 -->
              <third-login-config-form
                v-else-if="tab.key === 'thirdLogin'"
                v-model="thirdLoginFormData"
                :loading="updateMutation.isPending.value"
              />
              <!-- JWT配置 -->
              <jwt-config-form
                v-else-if="tab.key === 'jwt'"
                v-model="jwtFormData"
                :loading="updateMutation.isPending.value"
              />
            </div>
          </n-spin>
        </n-tab-pane>
      </n-tabs>
    </n-card>
  </div>
</template>

<style scoped lang="scss">
.site-config-page {
  height: 100%;
}

.page-title {
  font-size: 16px;
  font-weight: 500;
}

.config-spin {
  min-height: 300px;
}

.config-content {
  padding: 16px 0;
}
</style>
