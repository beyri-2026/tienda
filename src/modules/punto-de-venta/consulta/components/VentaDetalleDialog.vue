<script setup lang="ts">
import { computed, ref } from 'vue'
import { useToast } from 'primevue/usetoast'
import { useOperador } from '@/core/auth/useOperador'
import { usePermisos } from '@/core/auth/usePermisos'
import { imprimirVenta } from '../../utils/imprimirTicket'
import { ETIQUETA_ESTADO } from '../composables/useVentas'
import TicketVenta from '../../components/TicketVenta.vue'
import { fechaCorta, horaCompleta } from '@/core/utils/fechas'
import { formatear } from '@/core/utils/dinero'
import { useConfiguracion } from '@/modules/catalogo/composables/useConfiguracion'
import AutorizacionDialog from '../../components/AutorizacionDialog.vue'
import { useTurno } from '../../turno/composables/useTurno'
import type { Autorizacion, Venta } from '../../types/venta.types'
import { construirTicket } from '../../utils/ticket'
import { useVentas } from '../composables/useVentas'
import DevolucionDialog from './DevolucionDialog.vue'

const props = defineProps<{ visible: boolean; venta: Venta | null }>()
const emit = defineEmits<{ 'update:visible': [valor: boolean]; actualizada: [] }>()

const toast = useToast()
const { puede } = usePermisos()
const { operador } = useOperador()
const { configuracion } = useConfiguracion()
const { turno } = useTurno()
const { cancelar } = useVentas()

const cancelando = ref(false)
const devolviendo = ref(false)
const guardando = ref(false)

const texto = computed(() =>
  props.venta && configuracion.value ? construirTicket(props.venta, configuracion.value, true) : '',
)
const turnoActual = computed(() => !!props.venta && turno.value?.id === props.venta.turnoId)
const operaCaja = computed(() => puede('pos.cobrar'))
const puedeCancelar = computed(() => operaCaja.value && props.venta?.estado === 'cobrada' && turnoActual.value)
const puedeDevolver = computed(
  () =>
    operaCaja.value &&
    !!turno.value &&
    (props.venta?.estado === 'cobrada' || props.venta?.estado === 'devolucion_parcial'),
)

async function confirmarCancelacion(aut: Autorizacion) {
  if (!props.venta) return
  guardando.value = true
  try {
    await cancelar(props.venta.id, aut, operador.value)
    toast.add({ severity: 'success', summary: `Venta ${props.venta.folio} cancelada`, life: 3000 })
    emit('update:visible', false)
    emit('actualizada')
  } catch (e) {
    toast.add({ severity: 'error', summary: 'No se pudo cancelar', detail: e instanceof Error ? e.message : '', life: 4000 })
  } finally {
    guardando.value = false
  }
}
</script>

<template>
  <Dialog
    :visible="visible"
    modal
    :closable="false"
    class="dialogo-moderno"
    :style="{ width: '38rem', maxWidth: '96vw' }"
    @update:visible="emit('update:visible', $event)"
  >
    <template #header>
      <div class="cabecera">
        <div class="titulo">
          <div class="icono"><i class="pi pi-file" /></div>
          <div>
            <div class="fila-titulo">
              <h2>Detalle de venta {{ venta?.folio }}</h2>
              <span v-if="venta" class="estado" :class="venta.estado">{{ ETIQUETA_ESTADO[venta.estado] }}</span>
            </div>
            <p v-if="venta">{{ venta.cajaNombre }} · {{ fechaCorta(venta.fecha) }} {{ horaCompleta(venta.fecha) }}</p>
          </div>
        </div>
        <button class="cerrar" aria-label="Cerrar" @click="emit('update:visible', false)"><span>ESC</span><i class="pi pi-times" /></button>
      </div>
    </template>

    <div v-if="venta" class="cuerpo">
      <div v-if="venta.estado === 'cancelada'" class="aviso">
        <i class="pi pi-ban" /> Cancelada por {{ venta.cancelacion?.autorizoNombre }} · {{ venta.cancelacion?.motivo }}
      </div>
      <TicketVenta :venta="venta" :configuracion="configuracion" />
      <small v-if="operaCaja && venta.estado === 'cobrada' && !turnoActual" class="nota">
        Solo se cancelan ventas del turno abierto. Para ventas anteriores usa una devolución.
      </small>
      <small v-if="venta.devoluciones.length" class="nota">
        Reembolsado: <b>{{ formatear(venta.devoluciones.reduce((a, d) => a + d.totalCentavos, 0)) }}</b>
      </small>
    </div>

    <template #footer>
      <div class="pie">
        <button class="secundario" @click="venta && configuracion && imprimirVenta(venta, configuracion, true)"><i class="pi pi-print" /> Imprimir copia</button>
        <div class="der">
          <button v-if="puedeDevolver" class="secundario" @click="devolviendo = true"><i class="pi pi-undo" /> Devolución</button>
          <button v-if="puedeCancelar" class="peligro" :disabled="guardando" @click="cancelando = true"><i class="pi pi-ban" /> Cancelar venta</button>
          <button class="principal" @click="emit('update:visible', false)"><i class="pi pi-check" /> Cerrar</button>
        </div>
      </div>
    </template>
  </Dialog>

  <AutorizacionDialog
    v-model:visible="cancelando"
    titulo="Autorizar cancelación"
    :descripcion="`Cancelar la venta ${venta?.folio ?? ''} por ${venta ? formatear(venta.totalCentavos) : ''}`"
    permiso="pos.cancelar"
    :motivos="['Error del cajero', 'El cliente se arrepintió', 'Producto incorrecto']"
    @autorizado="confirmarCancelacion"
  />
  <DevolucionDialog
    v-model:visible="devolviendo"
    :venta="venta"
    @hecha="() => { emit('update:visible', false); emit('actualizada') }"
  />
</template>

<style scoped>
.cabecera {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  width: 100%;
  padding: 1.1rem 1.5rem;
  border-bottom: 1px solid var(--p-surface-100);
}
.titulo {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
.icono {
  width: 2.5rem;
  height: 2.5rem;
  display: grid;
  place-items: center;
  color: var(--p-primary-600);
  background: var(--p-primary-50);
  border: 1px solid var(--p-primary-100);
  border-radius: 0.9rem;
}
.fila-titulo {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
h2 {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--p-surface-900);
}
.titulo p {
  margin: 0.2rem 0 0;
  font-size: 0.72rem;
  color: var(--p-surface-500);
}
.estado {
  padding: 0.1rem 0.55rem;
  font-size: 0.65rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  border-radius: 999px;
}
.estado.cobrada {
  color: #065f46;
  background: #d1fae5;
}
.estado.cancelada {
  color: #be123c;
  background: #ffe4e6;
}
.estado.devolucion_parcial {
  color: #92400e;
  background: #fef3c7;
}
.estado.devuelta {
  color: var(--p-surface-600);
  background: var(--p-surface-200);
}
.cerrar {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.4rem 0.5rem;
  color: var(--p-surface-400);
  background: none;
  border: 0;
  border-radius: 0.7rem;
  cursor: pointer;
}
.cerrar span {
  padding: 0 0.25rem;
  font: 600 0.6rem ui-monospace, Consolas, monospace;
  border: 1px solid var(--p-surface-200);
  border-radius: 0.25rem;
}
.cerrar:hover {
  color: var(--p-surface-700);
  background: var(--p-surface-100);
}
.cuerpo {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  max-height: 66vh;
  padding: 1.1rem 1.5rem;
  overflow-y: auto;
  background: rgb(248 250 252 / 60%);
}
.aviso {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.7rem 0.9rem;
  font-size: 0.8rem;
  font-weight: 500;
  color: #be123c;
  background: #fff1f2;
  border: 1px solid #fecdd3;
  border-radius: 0.75rem;
}
.nota {
  font-size: 0.75rem;
  color: var(--p-surface-500);
}
.pie {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
  width: 100%;
  padding: 0.9rem 1.5rem;
  background: #fff;
  border-top: 1px solid var(--p-surface-100);
}
.der {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.pie button {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.6rem 0.95rem;
  font: 600 0.75rem system-ui, sans-serif;
  border-radius: 0.7rem;
  cursor: pointer;
}
.secundario {
  color: var(--p-surface-700);
  background: #fff;
  border: 1px solid var(--p-surface-200);
}
.secundario:hover {
  background: var(--p-surface-50);
}
.peligro {
  color: #be123c;
  background: #fff1f2;
  border: 1px solid #fecdd3;
}
.peligro:hover:not(:disabled) {
  background: #ffe4e6;
}
.principal {
  color: #fff;
  background: var(--p-primary-600);
  border: 0;
}
.principal:hover {
  background: var(--p-primary-700);
}
</style>
