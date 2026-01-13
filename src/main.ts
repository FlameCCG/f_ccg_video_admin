import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './styles/main.scss'
import App from './App.vue'
import router from './router'
import { i18n, initI18n } from './locales'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.use(i18n)

// Initialize i18n (load initial locale messages)
void initI18n(i18n).then(() => {
  app.mount('#app')
})
