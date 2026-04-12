<script setup lang="ts">
import { defineAsyncComponent, onErrorCaptured, shallowRef } from 'vue'
import type { RouteComponent } from 'vue-router'
import MenuComponentFallback from './MenuComponentFallback.vue'

type ComponentLoader = () => Promise<{ default: RouteComponent }>

interface Props {
  menuTitle: string
  componentPath?: string
  loader?: ComponentLoader
}

const props = defineProps<Props>()
const hasRenderError = shallowRef(false)

const AsyncMenuComponent = props.loader
  ? defineAsyncComponent({
      loader: props.loader,
      delay: 0,
    })
  : null

onErrorCaptured((error: unknown, _instance, info: string) => {
  hasRenderError.value = true
  console.error(
    `[Permission] Menu component failed: ${props.componentPath || '<empty>'}; ${info}`,
    error
  )
  return false
})
</script>

<template>
  <menu-component-fallback
    v-if="!loader || hasRenderError"
    :menu-title="menuTitle"
    :component-path="componentPath"
    :reason="!componentPath ? 'missing-path' : hasRenderError ? 'render-error' : 'not-found'"
  />
  <component :is="AsyncMenuComponent" v-else />
</template>
