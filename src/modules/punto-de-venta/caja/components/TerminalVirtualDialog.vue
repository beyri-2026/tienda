<script setup lang="ts">
import { ref, watch } from 'vue'
import { formatear, type Centavos } from '@/core/utils/dinero'
import { terminal, type ResultadoSimulado } from '../../api/terminal.api'
import type { DatosTarjeta } from '../../types/venta.types'

/**
 * Terminal de tarjeta SIMULADA. Se comporta como una real: recibe el monto y responde
 * aprobada, rechazada o sin respuesta. La venta solo avanza si viene aprobada.
 * Para la terminal real se cambia el adaptador en terminal.api.ts; esta pantalla desaparece.
 */
const props = defineProps<{ visible: boolean; montoCentavos: Centavos }>()
const emit = defineEmits<{ 'update:visible': [valor: boolean]; aprobada: [tarjeta: DatosTarjeta] }>()

type Estado = 'espera' | 'procesando' | 'rechazada' | 'sin_respuesta'
const estado = ref<Estado>('espera')
const mensaje = ref('')
const tipo = ref<'debito' | 'credito'>('debito')
const tipos = [
  { label: 'Débito', value: 'debito' },
  { label: 'Crédito', value: 'credito' },
]

watch(
  () => props.visible,
  (v) => {
    if (v) {
      estado.value = 'espera'
      mensaje.value = ''
    }
  },
)

async function simular(resultado: ResultadoSimulado) {
  estado.value = 'procesando'
  mensaje.value = ''
  const r = await terminal.cobrar(props.montoCentavos, { resultado, tipo: tipo.value })
  if (r.estado === 'aprobada' && r.tarjeta) {
    emit('aprobada', r.tarjeta)
    emit('update:visible', false)
    return
  }
  estado.value = r.estado === 'rechazada' ? 'rechazada' : 'sin_respuesta'
  mensaje.value = r.mensaje ?? ''
}
</script>

<template>
  <Dialog
    :visible="visible"
    header="Terminal de pago (simulada)"
    modal
    :closable="estado !== 'procesando'"
    :style="{ width: '24rem' }"
    @update:visible="emit('update:visible', $event)"
  >
    <div class="columna centro">
      <small class="muted">Monto a cobrar</small>
      <div class="monto dinero">{{ formatear(montoCentavos) }}</div>

      <template v-if="estado === 'espera'">
        <p class="estado"><i class="pi pi-credit-card" /> Esperando tarjeta…</p>
        <SelectButton v-model="tipo" :options="tipos" option-label="label" option-value="value" :allow-empty="false" />
        <small class="muted">Simula lo que respondería la terminal:</small>
        <Button label="Aprobar" icon="pi pi-check" severity="success" @click="simular('aprobada')" />
        <Button label="Rechazar" icon="pi pi-times" severity="danger" outlined @click="simular('rechazada')" />
        <Button label="Sin respuesta" icon="pi pi-clock" severity="secondary" outlined @click="simular('sin_respuesta')" />
      </template>

      <template v-else-if="estado === 'procesando'">
        <ProgressSpinner style="width: 3rem; height: 3rem" />
        <p class="estado">Procesando…</p>
      </template>

      <template v-else>
        <Message :severity="estado === 'rechazada' ? 'error' : 'warn'" :closable="false">{{ mensaje }}</Message>
        <Button label="Reintentar" icon="pi pi-refresh" @click="estado = 'espera'" />
        <Button label="Cancelar cobro con tarjeta" severity="secondary" text @click="emit('update:visible', false)" />
      </template>
    </div>
  </Dialog>
</template>

<style scoped>
.centro {
  align-items: stretch;
  text-align: center;
}
.monto {
  font-size: 2.4rem;
  font-weight: 700;
}
.estado {
  margin: 0.25rem 0;
  font-weight: 600;
}
</style>
