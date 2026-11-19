import { createApp } from 'vue'
import { createPinia } from 'pinia'
import PrimeVue from 'primevue/config'
import ToastService from 'primevue/toastservice'
import ConfirmationService from 'primevue/confirmationservice'
import Aura from '@primeuix/themes/aura'
import { definePreset } from '@primeuix/themes'
import 'primeicons/primeicons.css'
import './assets/main.css'

import App from './App.vue'
import router from '@/core/router'
import { useSesion } from '@/core/auth/sesion.store'

/** Tema de la marca: Aura con esmeralda como color principal. */
const Marca = definePreset(Aura, {
  semantic: {
    primary: {
      50: '#ecfdf5', 100: '#d1fae5', 200: '#a7f3d0', 300: '#6ee7b7', 400: '#34d399',
      500: '#10b981', 600: '#059669', 700: '#047857', 800: '#065f46', 900: '#064e3b', 950: '#022c22',
    },
  },
})

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(PrimeVue, {
  theme: { preset: Marca, options: { darkModeSelector: '.modo-oscuro-desactivado' } },
})
app.use(ToastService)
app.use(ConfirmationService)

useSesion().cargarDeStorage()
app.use(router)
app.mount('#app')
