import { createApp, type Component } from 'vue'
import { createPinia } from 'pinia'
import { VueQueryPlugin } from '@tanstack/vue-query'
import './styles/main.scss'
import App from './App.vue'
import router from './router'
import { i18n, initI18n } from './locales'
import { setupPermissionDirective } from './directives'

const app = createApp(App as unknown as Component)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.use(i18n)
app.use(VueQueryPlugin)

// Register custom directives
setupPermissionDirective(app)

// Initialize i18n (load initial locale messages)
void initI18n(i18n)
  .then(() => {
    app.mount('#app')
  })
  .catch((error) => {
    console.error('Failed to initialize i18n:', error)
    app.mount('#app')
  })
