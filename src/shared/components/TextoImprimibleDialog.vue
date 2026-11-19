<script setup lang="ts">
import { imprimirTexto } from '@/core/utils/imprimir'

defineProps<{ visible: boolean; titulo: string; texto: string }>()
const emit = defineEmits<{ 'update:visible': [valor: boolean] }>()
</script>

<template>
  <Dialog
    :visible="visible"
    :header="titulo"
    modal
    :style="{ width: '26rem' }"
    @update:visible="emit('update:visible', $event)"
  >
    <div class="columna">
      <slot />
      <pre class="ticket-pre">{{ texto }}</pre>
    </div>
    <template #footer>
      <Button label="Imprimir" icon="pi pi-print" severity="secondary" @click="imprimirTexto(texto)" />
      <Button label="Cerrar" icon="pi pi-check" @click="emit('update:visible', false)" />
    </template>
  </Dialog>
</template>
