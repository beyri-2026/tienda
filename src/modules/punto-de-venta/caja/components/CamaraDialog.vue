<script setup lang="ts">
import { ref } from 'vue'
import { useEscaner } from '../composables/useEscaner'

/** Lectura de códigos con la cámara (demo del escáner). Con lector USB no se necesita. */
defineProps<{ visible: boolean }>()
const emit = defineEmits<{ 'update:visible': [valor: boolean]; codigo: [texto: string] }>()

const video = ref<HTMLVideoElement | null>(null)
const { soportado, activo, error, iniciar, detener } = useEscaner()

function arrancar() {
  if (video.value) iniciar(video.value, (c) => emit('codigo', c))
}
</script>

<template>
  <Dialog
    :visible="visible"
    header="Escanear con la cámara"
    modal
    :style="{ width: '28rem', maxWidth: '96vw' }"
    @show="arrancar"
    @hide="detener"
    @update:visible="emit('update:visible', $event)"
  >
    <div class="columna">
      <Message v-if="!soportado" severity="warn" :closable="false">
        Este navegador no puede leer códigos de barras con la cámara. Usa Chrome en el celular, o escribe el código
        en la barra de búsqueda (o conecta un lector USB).
      </Message>
      <Message v-if="error" severity="error" :closable="false">{{ error }}</Message>
      <video ref="video" class="video" playsinline muted />
      <small class="muted">
        {{ activo ? 'Apunta al código de barras. Cada lectura se agrega a la cuenta.' : 'Iniciando cámara…' }}
      </small>
    </div>
  </Dialog>
</template>

<style scoped>
.video {
  width: 100%;
  min-height: 12rem;
  background: #000;
  border-radius: 0.6rem;
}
</style>
