<script setup lang="ts">
import { vFoco } from '@/core/utils/foco'
import { onMounted, ref } from 'vue'
import { useToast } from 'primevue/usetoast'
import { aCentavos, formatear } from '@/core/utils/dinero'
import { fechaCorta, horaCompleta } from '@/core/utils/fechas'
import { useOperador } from '@/core/auth/useOperador'
import { useRouter } from 'vue-router'
import { puede } from '@/core/auth/permisos'
import { useSesion } from '@/core/auth/sesion.store'
import { useEquipo } from '@/modules/equipo/composables/useEquipo'
import { useTurno } from '../composables/useTurno'

const emit = defineEmits<{ abierto: [] }>()

const toast = useToast()
const { operador } = useOperador()
const { configuracion, recargar, abrir } = useTurno()
const equipo = useEquipo()
const router = useRouter()
const sesion = useSesion()

const fondo = ref<number | null>(null)
const ahora = new Date()
const guardando = ref(false)

onMounted(async () => {
  await Promise.all([recargar(), equipo.cargar()])
  fondo.value = (configuracion.value?.fondoSugeridoCentavos ?? 0) / 100
})

async function confirmar() {
  guardando.value = true
  try {
    await abrir(aCentavos(fondo.value ?? 0), operador.value)
    toast.add({ severity: 'success', summary: 'Turno abierto', life: 2500 })
    emit('abierto')
  } catch (e) {
    toast.add({ severity: 'error', summary: 'No se pudo abrir el turno', detail: e instanceof Error ? e.message : '', life: 4000 })
  } finally {
    guardando.value = false
  }
}
</script>

<template>
  <div v-if="equipo.cargado.value && !equipo.caja.value" class="centro">
    <div class="tarjeta-turno">
      <div class="cab">
        <div class="titulo">
          <div class="icono sin"><i class="pi pi-desktop" /></div>
          <h2>Computadora sin caja</h2>
        </div>
        <p>
          Esta computadora todavía no está vinculada a una caja, por eso no se puede abrir turno ni vender.
          Pide al <b>gerente o dueño</b> que la configure con su PIN; se hace una sola vez.
        </p>
      </div>
      <div class="form">
        <button v-if="puede(sesion.rol, 'equipo.configurar')" type="button" class="abrir" @click="router.push('/equipo')">
          <i class="pi pi-cog" /> <span>Configurar esta computadora</span>
        </button>
      </div>
    </div>
  </div>

  <div v-else class="centro">
    <div class="tarjeta-turno">
      <div class="cab">
        <div class="titulo">
          <div class="icono"><i class="pi pi-lock-open" /></div>
          <h2>Abrir turno</h2>
        </div>
        <p>
          Sin turno abierto no es posible realizar ventas ni movimientos. Captura el fondo de efectivo inicial para empezar la jornada.
        </p>
      </div>

      <div class="meta">
        <span class="quien"><i class="pi pi-user" /> <b>{{ operador.nombre }}</b></span>
        <span class="quien" title="Esta computadora está asignada a esta caja"><i class="pi pi-desktop" /> <b>{{ equipo.caja.value?.nombre }}</b> <i class="pi pi-lock" style="font-size: 0.65rem; opacity: 0.6" /></span>
        <span class="cuando"><i class="pi pi-calendar" /> {{ fechaCorta(ahora) }} · {{ horaCompleta(ahora) }}</span>
      </div>

      <form class="form" @submit.prevent="confirmar">
        <div>
          <div class="fila-l">
            <label for="fondo-turno">Fondo de caja en efectivo</label>
            <small>Moneda nacional (MXN)</small>
          </div>
          <div class="campo">
            <InputNumber
              v-model="fondo"
              input-id="fondo-turno"
              mode="currency"
              currency="MXN"
              locale="es-MX"
              :min="0"
              fluid
              class="entrada-grande"
              placeholder="$0.00"
              v-foco
              @input="fondo = ($event.value as number | null) ?? null"
            />
            <span class="mxn">MXN</span>
          </div>
          <button
            v-if="configuracion"
            type="button"
            class="sugerido"
            @click="fondo = configuracion.fondoSugeridoCentavos / 100"
          >
            Sugerido: <b>{{ formatear(configuracion.fondoSugeridoCentavos) }}</b>
          </button>
        </div>

        <div>
          <button class="abrir" type="submit" :disabled="fondo == null || guardando">
            <i :class="guardando ? 'pi pi-spin pi-spinner' : 'pi pi-check'" />
            <span>Abrir turno</span>
            <kbd>↵ Enter</kbd>
          </button>
          <p class="pie">Al abrir turno se registra la hora exacta y se habilitan los cobros.</p>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.centro {
  display: flex;
  justify-content: center;
  padding: 2rem 0;
}
.tarjeta-turno {
  width: 100%;
  max-width: 32rem;
  overflow: hidden;
  background: #fff;
  border: 1px solid rgb(226 232 240 / 80%);
  border-radius: 1rem;
  box-shadow: 0 20px 25px -5px rgb(226 232 240 / 60%);
}
.cab {
  padding: 2rem 2rem 1.25rem;
}
.titulo {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.6rem;
}
.icono {
  width: 2.5rem;
  height: 2.5rem;
  display: grid;
  place-items: center;
  color: var(--p-primary-600);
  background: var(--p-primary-50);
  border: 1px solid var(--p-primary-100);
  border-radius: 0.8rem;
}
.icono.sin {
  color: #b45309;
  background: #fffbeb;
  border-color: #fde68a;
}
h2 {
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--p-surface-900);
}
.cab p {
  margin: 0;
  font-size: 0.85rem;
  line-height: 1.6;
  color: var(--p-surface-500);
}
.meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.6rem 1rem;
  margin: 0 2rem 1.5rem;
  font-size: 0.75rem;
  background: var(--p-surface-50);
  border: 1px solid rgb(226 232 240 / 70%);
  border-radius: 0.75rem;
}
.meta i {
  margin-right: 0.35rem;
  color: var(--p-surface-400);
}
.quien b {
  font-weight: 500;
  color: var(--p-surface-700);
}
.cuando {
  color: var(--p-surface-500);
}
.form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 0 2rem 2rem;
}
.fila-l {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}
.fila-l label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--p-surface-800);
}
.fila-l small {
  font-size: 0.72rem;
  color: var(--p-surface-400);
}
.campo {
  position: relative;
}
:deep(.entrada-grande .p-inputtext) {
  padding: 0.85rem 4.5rem 0.85rem 1rem;
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  border: 1px solid var(--p-surface-300);
  border-radius: 0.8rem;
  box-shadow: 0 1px 2px rgb(0 0 0 / 5%);
}
:deep(.entrada-grande .p-inputtext:focus) {
  border-color: var(--p-primary-500);
  box-shadow: 0 0 0 4px rgb(16 185 129 / 15%);
}
.mxn {
  position: absolute;
  right: 1rem;
  top: 50%;
  transform: translateY(-50%);
  padding: 0.2rem 0.5rem;
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--p-surface-400);
  background: var(--p-surface-100);
  border-radius: 0.3rem;
  pointer-events: none;
}
.sugerido {
  display: inline-flex;
  gap: 0.4rem;
  margin-top: 0.75rem;
  padding: 0.35rem 0.7rem;
  font: 500 0.75rem system-ui, sans-serif;
  color: #047857;
  background: var(--p-primary-50);
  border: 1px solid rgb(167 243 208 / 80%);
  border-radius: 0.5rem;
  cursor: pointer;
}
.sugerido:hover {
  background: var(--p-primary-100);
}
.abrir {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  padding: 1rem 1.5rem;
  font: 700 1rem system-ui, sans-serif;
  color: #fff;
  background: var(--p-primary-500);
  border: 0;
  border-radius: 0.8rem;
  box-shadow: 0 10px 15px -3px rgb(16 185 129 / 25%);
  cursor: pointer;
  transition: background 0.15s;
}
.abrir:hover:not(:disabled) {
  background: var(--p-primary-600);
}
.abrir:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.abrir kbd {
  padding: 0.1rem 0.5rem;
  font: 400 0.72rem ui-monospace, Consolas, monospace;
  color: var(--p-primary-100);
  background: rgb(5 150 105 / 70%);
  border: 1px solid rgb(52 211 153 / 40%);
  border-radius: 0.3rem;
}
.pie {
  margin: 0.75rem 0 0;
  font-size: 0.72rem;
  text-align: center;
  color: var(--p-surface-400);
}
</style>
