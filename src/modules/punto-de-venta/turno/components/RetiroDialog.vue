<script setup lang="ts">
import { vFoco } from '@/core/utils/foco'
import { computed, ref, watch } from 'vue'
import { useToast } from 'primevue/usetoast'
import { aCentavos, formatear } from '@/core/utils/dinero'
import { useOperador } from '@/core/auth/useOperador'
import AutorizacionDialog from '../../components/AutorizacionDialog.vue'
import type { Autorizacion } from '../../types/venta.types'
import type { MovimientoEfectivo } from '../../types/turno.types'
import { useTurno } from '../composables/useTurno'

/** Retiro parcial de efectivo: pide autorización (PIN + motivo) y genera comprobante. */
const props = defineProps<{ visible: boolean }>()
const emit = defineEmits<{ 'update:visible': [valor: boolean]; listo: [movimiento: MovimientoEfectivo] }>()

const toast = useToast()
const { operador } = useOperador()
const { turno, efectivoEnCaja, verEfectivo, nivelTope, registrarMovimiento } = useTurno()
/** La recomendación (el excedente) se muestra a la cajera desde que el sistema avisa que el tope está cerca; antes, el retiro no le dice nada. */
const verRecomendado = computed(() => verEfectivo.value || nivelTope.value !== 'normal')

const monto = ref<number | null>(null)
const autorizando = ref(false)
const guardando = ref(false)

const excedente = computed(() => Math.max(0, efectivoEnCaja.value - (turno.value?.fondoCentavos ?? 0)))
const montoCentavos = computed(() => aCentavos(monto.value ?? 0))
const quedaCentavos = computed(() => efectivoEnCaja.value - montoCentavos.value)
const fondoCentavos = computed(() => turno.value?.fondoCentavos ?? 0)
/** vacio: sin monto · ok: el fondo queda intacto · aviso: se invade el fondo · error: excede lo que hay. */
const estado = computed<'ok' | 'aviso' | 'error'>(() =>
  quedaCentavos.value < 0 ? 'error' : quedaCentavos.value < fondoCentavos.value ? 'aviso' : 'ok',
)
const textoEstado = computed(() =>
  estado.value === 'error'
    ? 'El monto supera el efectivo en caja:'
    : estado.value === 'aviso'
      ? `Atención: se invade el fondo de caja (${formatear(fondoCentavos.value)}). Quedará:`
      : 'Quedará en caja tras el retiro:',
)

/** No se puede retirar más de lo que hay; el aviso nunca dice cuánto hay. */
const excede = computed(() => montoCentavos.value > efectivoEnCaja.value)
const valido = computed(() => montoCentavos.value > 0 && !excede.value)

watch(
  () => props.visible,
  (v) => {
    if (v) monto.value = verRecomendado.value && excedente.value > 0 ? excedente.value / 100 : null
  },
)

async function registrar(aut: Autorizacion) {
  guardando.value = true
  try {
    const mov = await registrarMovimiento(
      { tipo: 'retiro', montoCentavos: montoCentavos.value, motivo: aut.motivo },
      operador.value,
      aut,
    )
    toast.add({ severity: 'success', summary: 'Retiro registrado', life: 2500 })
    emit('update:visible', false)
    if (mov) emit('listo', mov)
  } catch (e) {
    toast.add({ severity: 'error', summary: 'No se pudo registrar el retiro', detail: e instanceof Error ? e.message : '', life: 4000 })
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
    :style="{ width: '31.25rem', maxWidth: '96vw' }"
    @update:visible="emit('update:visible', $event)"
  >
    <template #header>
      <div class="cabecera">
        <div class="titulo">
          <div class="icono"><i class="pi pi-lock" /></div>
          <div>
            <h2>Retiro de efectivo</h2>
            <p>Turno activo · {{ turno?.cajaNombre }}</p>
          </div>
        </div>
        <button class="cerrar" aria-label="Cerrar" @click="emit('update:visible', false)"><i class="pi pi-times" /></button>
      </div>
    </template>

    <div class="cuerpo">
      <div v-if="verEfectivo" class="resumen">
        <div class="renglon"><span>Efectivo en caja</span><strong class="dinero">{{ formatear(efectivoEnCaja) }}</strong></div>
        <div class="renglon"><span>Fondo de caja base</span><span class="dinero fondo">{{ formatear(fondoCentavos) }}</span></div>
        <div v-if="excedente > 0" class="renglon sugerido">
          <span><span class="punto" /> Excedente retirable sugerido</span>
          <b class="dinero">{{ formatear(excedente) }}</b>
        </div>
      </div>

      <div class="bloque">
        <div class="fila-entre">
          <label class="etiqueta">Monto a retirar</label>
          <small v-if="verEfectivo" class="tenue">Máximo: {{ formatear(efectivoEnCaja) }}</small>
          <small v-else class="tenue">Cuenta el efectivo que vas a retirar y captura el monto</small>
        </div>
        <InputNumber
          v-model="monto"
          mode="currency"
          currency="MXN"
          locale="es-MX"
          :min="0"
          input-class="entrada-grande"
          fluid
          v-foco
          @input="monto = ($event.value as number | null) ?? null"
          @keydown.enter="valido && (autorizando = true)"
        />
        <button v-if="verRecomendado && excedente > 0" class="excedente" @click="monto = excedente / 100">
          ⚡ Retirar excedente recomendado <b>({{ formatear(excedente) }})</b>
        </button>
      </div>

      <div v-if="excede" class="alerta-excede" role="alert">
        <i class="pi pi-exclamation-triangle" /> No hay esa cantidad en esta caja.
      </div>

      <div v-if="verEfectivo" class="proyeccion" :class="estado">
        <span class="texto"><i :class="estado === 'ok' ? 'pi pi-check-circle' : estado === 'aviso' ? 'pi pi-exclamation-triangle' : 'pi pi-times-circle'" /> {{ textoEstado }}</span>
        <strong class="dinero">{{ formatear(Math.max(0, quedaCentavos)) }}</strong>
      </div>
    </div>

    <template #footer>
      <div class="pie">
        <div class="botones">
          <button class="cancelar" @click="emit('update:visible', false)">Cancelar <span>[ESC]</span></button>
          <button class="confirmar" :disabled="!valido || guardando" @click="autorizando = true">
            <i :class="guardando ? 'pi pi-spin pi-spinner' : 'pi pi-lock'" />
            <span>Continuar</span>
            <small>[Enter ↵]</small>
          </button>
        </div>
        <p><i class="pi pi-print" /> Se imprimirá un comprobante y se registrará en la bitácora de auditoría.</p>
      </div>
    </template>
  </Dialog>

  <AutorizacionDialog
    v-model:visible="autorizando"
    titulo="Autorizar retiro"
    :descripcion="`Retiro de ${formatear(montoCentavos)}`"
    permiso="pos.retirar"
    :motivos="['Excedente de efectivo', 'Depósito al banco', 'Pago a proveedor']"
    @autorizado="registrar"
  />
</template>

<style scoped>
.cabecera {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  width: 100%;
  padding: 1.25rem 1.5rem 1rem;
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
  border-radius: 0.75rem;
}
h2 {
  font-size: 1.1rem;
  font-weight: 700;
  line-height: 1.2;
  color: var(--p-surface-900);
}
.titulo p {
  margin: 0.15rem 0 0;
  font-size: 0.75rem;
  color: var(--p-surface-500);
}
.cerrar {
  padding: 0.4rem 0.5rem;
  color: var(--p-surface-400);
  background: transparent;
  border: 0;
  border-radius: 0.5rem;
  cursor: pointer;
}
.cerrar:hover {
  color: var(--p-surface-600);
  background: var(--p-surface-100);
}
.cuerpo {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem 1.5rem;
}
.resumen {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.9rem;
  background: rgb(248 250 252 / 80%);
  border: 1px solid var(--p-surface-100);
  border-radius: 0.75rem;
}
.renglon {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.85rem;
  color: var(--p-surface-500);
}
.renglon strong {
  font-size: 1rem;
  color: var(--p-surface-800);
}
.fondo {
  font-weight: 600;
  color: var(--p-surface-600);
}
.renglon.sugerido {
  padding-top: 0.5rem;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--p-primary-700);
  border-top: 1px solid rgb(226 232 240 / 70%);
}
.renglon.sugerido > span {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}
.renglon.sugerido b {
  padding: 0.1rem 0.5rem;
  background: rgb(209 250 229 / 60%);
  border-radius: 999px;
}
.punto {
  width: 0.4rem;
  height: 0.4rem;
  border-radius: 50%;
  background: var(--p-primary-500);
}
.bloque {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.etiqueta {
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--p-surface-700);
}
.tenue {
  font-size: 0.7rem;
  color: var(--p-surface-400);
}
:deep(.entrada-grande) {
  padding: 0.65rem 1rem;
  font-size: 1.35rem;
  font-weight: 700;
  color: var(--p-surface-900);
  border: 2px solid var(--p-primary-500);
  border-radius: 0.75rem;
  box-shadow: 0 1px 2px rgb(0 0 0 / 5%);
}
:deep(.entrada-grande:focus) {
  border-color: var(--p-primary-600);
  box-shadow: 0 0 0 4px rgb(16 185 129 / 20%);
}
.excedente {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  padding: 0.55rem 0.75rem;
  font: inherit;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--p-surface-700);
  background: var(--p-surface-100);
  border: 1px solid var(--p-surface-200);
  border-radius: 0.5rem;
  cursor: pointer;
}
.excedente b {
  color: var(--p-primary-700);
}
.excedente:hover {
  background: var(--p-surface-200);
}
.proyeccion {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.75rem;
  font-size: 0.75rem;
  border: 1px solid;
  border-radius: 0.75rem;
  transition: background 0.2s;
}
.proyeccion .texto {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 500;
}
.proyeccion strong {
  font-size: 0.95rem;
  white-space: nowrap;
  color: var(--p-surface-800);
}
.proyeccion.ok {
  color: var(--p-surface-600);
  background: rgb(236 253 245 / 70%);
  border-color: var(--p-primary-100);
}
.proyeccion.ok i {
  color: var(--p-primary-600);
}
.proyeccion.aviso {
  color: #92400e;
  background: #fffbeb;
  border-color: #fde68a;
}
.proyeccion.aviso i {
  color: #d97706;
}
.proyeccion.error {
  color: #be123c;
  background: #fff1f2;
  border-color: #fecdd3;
}
.proyeccion.error i {
  color: #e11d48;
}
.pie {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  width: 100%;
  padding: 1rem 1.5rem;
  background: rgb(248 250 252 / 90%);
  border-top: 1px solid var(--p-surface-100);
}
.botones {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.75rem;
}
.cancelar {
  padding: 0.65rem 1rem;
  font: inherit;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--p-surface-700);
  background: #fff;
  border: 1px solid var(--p-surface-300);
  border-radius: 0.75rem;
  box-shadow: 0 1px 2px rgb(0 0 0 / 5%);
  cursor: pointer;
}
.cancelar span {
  margin-left: 0.25rem;
  font-size: 0.62rem;
  color: var(--p-surface-400);
}
.cancelar:hover {
  background: var(--p-surface-100);
}
.confirmar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.65rem 1.5rem;
  font: inherit;
  font-size: 0.75rem;
  font-weight: 600;
  color: #fff;
  background: var(--p-primary-600);
  border: 0;
  border-radius: 0.75rem;
  box-shadow: 0 4px 6px -1px rgb(16 185 129 / 20%);
  cursor: pointer;
}
.confirmar small {
  font-size: 0.62rem;
  color: #a7f3d0;
  opacity: 0.85;
}
.confirmar:hover:not(:disabled) {
  background: var(--p-primary-700);
}
.confirmar:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.pie p {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  margin: 0;
  font-size: 0.68rem;
  color: var(--p-surface-400);
}
.alerta-excede {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.75rem;
  padding: 0.7rem 0.9rem;
  font-size: 0.85rem;
  font-weight: 600;
  color: #b91c1c;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 0.75rem;
}
</style>
