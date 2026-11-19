import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import Components from 'unplugin-vue-components/vite'
import { PrimeVueResolver } from '@primevue/auto-import-resolver'

export default defineConfig({
  plugins: [
    vue(),
    // Registra automáticamente los componentes de PrimeVue usados en las plantillas
    Components({ resolvers: [PrimeVueResolver()], dts: 'src/components.d.ts' }),
  ],
  server: { port: 5173, strictPort: true },
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
})
