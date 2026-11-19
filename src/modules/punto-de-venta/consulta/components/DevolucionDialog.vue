<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useToast } from 'primevue/usetoast'
import { formatear } from '@/core/utils/dinero'
import { useOperador } from '@/core/auth/useOperador'
import AutorizacionDialog from '../../components/AutorizacionDialog.vue'
import { ETIQUETA_METODO, type Autorizacion, type MetodoPago, type Venta } from '../../types/venta.types'
import { useVentas } from '../composables/useVentas'

/** Devolución de una venta anterior. Los folios usados NO se reactivan. */
const props = defineProps<{ visible: boolean; venta: Venta | null }>()
const emit = defineEmits<{ 'update:visible': [valor: boolean]; hecha: [] }>()

const toast = useToast()
const { operador } = useOperador()
const { devolver } = useVentas()

const cantidades = ref<Record<string, number>>({})
const destino = ref<'inventario' | 'merma'>('inventario')
const metodo = ref<MetodoPago | null>(null)
const autorizando = ref(false)
const guardando = ref(false)

const destinos = [
  { label: 'Regresa al inventario', value: 'inventario' },
  { label: 'Merma', value: 'merma' },
]

watch(
  () => props.visible,
  (v) => {
    if (!v || !props.venta) return
    cantidades.value = {}
    destino.value = 'inventario'
    metodo.value = props.venta.pagos[0]?.metodo ?? null
  },
)

const metodos = computed(() =>
  [...new Set(props.venta?.pagos.map((p) => p.metodo) ?? [])].map((m) => ({ label: ETIQUETA_METODO[m], value: m })),
)
const restante = (id: string) => {
  const l = props.venta?.lineas.find((x) => x.id === id)
  return l ? l.cantidad - (l.devuelta ?? 0) : 0
}
const reembolsoCentavos = computed(() =>
  (props.venta?.lineas ?? []).reduce(
    (a, l) => a + Math.round((l.importeCentavos * (cantidades.value[l.id] ?? 0)) / l.cantidad),
    0,
  ),
)
const items = computed(() =>
  Object.entries(cantidades.value)
    .filter(([, c]) => c > 0)
    .map(([lineaId, cantidad]) => ({ lineaId, cantidad })),
)

async function registrar(aut: Autorizacion) {
  if (!props.venta || !metodo.value) return
  guardando.value = true
  try {
    await devolver(
      props.venta.id,
      { items: items.value, destino: destino.value, metodo: metodo.value, autorizacion: aut },
      operador.value,
    )
    toast.add({ severity: 'success', summary: 'Devolución registrada', detail: `Reembolso ${formatear(reembolsoCentavos.value)}`, life: 3500 })
    emit('update:visible', false)
    emit('hecha')
  } catch (e) {
    toast.add({ severity: 'error', summary: 'No se pudo registrar la devolución', detail: e instanceof Error ? e.message : '', life: 4000 })
  } finally {
    guardando.value = false
  }
}
</script>

<template>
  <Dialog
    :visible="visible"
    :header="`Devolución · venta ${venta?.folio ?? ''}`"
    modal
    :style="{ width: '36rem', maxWidth: '96vw' }"
    @update:visible="emit('update:visible', $event)"
  >
    <div v-if="venta" class="columna">
      <table>
        <thead><tr><th>Producto</th><th class="derecha">Importe</th><th class="derecha">Devolver</th></tr></thead>
        <tbody>
          <tr v-for="l in venta.lineas" :key="l.id">
            <td>
              {{ l.nombre }} <small class="muted">× {{ l.cantidad }}</small>
              <small v-if="l.devuelta" class="muted"> · ya devuelto {{ l.devuelta }}</small>
            </td>
            <td class="derecha dinero">{{ formatear(l.importeCentavos) }}</td>
            <td class="derecha">
              <InputNumber
                :model-value="cantidades[l.id] ?? 0"
                :min="0"
                :max="restante(l.id)"
                :disabled="restante(l.id) === 0"
                show-buttons
                button-layout="horizontal"
                :input-style="{ width: '3.5rem', textAlign: 'center' }"
                @update:model-value="cantidades[l.id] = $event ?? 0"
              />
            </td>
          </tr>
        </tbody>
      </table>

      <label class="columna">
        Destino del producto
        <SelectButton v-model="destino" :options="destinos" option-label="label" option-value="value" :allow-empty="false" />
      </label>
      <label class="columna">
        Reembolsar por
        <Select v-model="metodo" :options="metodos" option-label="label" option-value="value" />
      </label>
      <small class="muted">Los folios de promoción y etiquetas usados no se reactivan.</small>

      <div class="fila-entre total">
        <span>Reembolso</span><strong class="dinero">{{ formatear(reembolsoCentavos) }}</strong>
      </div>
      <Button label="Continuar" icon="pi pi-lock" :disabled="items.length === 0 || !metodo" :loading="guardando" @click="autorizando = true" />
    </div>
  </Dialog>

  <AutorizacionDialog
    v-model:visible="autorizando"
    titulo="Autorizar devolución"
    :descripcion="`Reembolso de ${formatear(reembolsoCentavos)} por ${metodo ? ETIQUETA_METODO[metodo] : ''}`"
    permiso="pos.devolver"
    :motivos="['Producto en mal estado', 'Producto equivocado', 'El cliente no lo quiso']"
    @autorizado="registrar"
  />
</template>

<style scoped>
table {
  width: 100%;
  border-collapse: collapse;
}
th {
  text-align: left;
  font-size: 0.8rem;
  color: var(--p-text-muted-color);
  padding: 0.4rem 0.5rem;
  border-bottom: 1px solid var(--p-content-border-color);
}
td {
  padding: 0.45rem 0.5rem;
  border-bottom: 1px solid var(--p-surface-100);
}
.derecha {
  text-align: right;
}
.total {
  padding: 0.6rem 0.9rem;
  background: var(--p-surface-100);
  border-radius: 0.6rem;
  font-size: 1.2rem;
}
</style>
