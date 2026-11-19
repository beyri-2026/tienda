<script setup lang="ts">
import { vFoco } from '@/core/utils/foco'
import { computed, ref, watch } from 'vue'
import { useToast } from 'primevue/usetoast'
import { aCentavos, formatear } from '@/core/utils/dinero'
import { useOperador } from '@/core/auth/useOperador'
import { useSesion } from '@/core/auth/sesion.store'
import TecladoNumerico from '@/shared/components/TecladoNumerico.vue'
import { validarPin } from '../../api/autorizacion.api'
import type { ResumenTurno } from '../../types/turno.types'
import { useTurno } from '../composables/useTurno'

/** Corte final a ciegas: el cajero solo cuenta y captura el efectivo; no ve el esperado ni la diferencia. */
const props = defineProps<{ visible: boolean; resumen: ResumenTurno | null }>()
const emit = defineEmits<{ 'update:visible': [valor: boolean]; cerrado: [resumen: ResumenTurno] }>()

const toast = useToast()
const { operador } = useOperador()
const sesion = useSesion()
const { cerrar, configuracion } = useTurno()
/** Fondo que debe quedar en la caja para el siguiente turno (se configura en la tienda). */
const fondoQueda = computed(() => configuracion.value?.fondoSugeridoCentavos ?? 0)

const contado = ref<number | null>(null)
const guardando = ref(false)
/** 1) el cajero cuenta y captura · 2) quien recibe revisa el monto y valida con su PIN. */
const paso = ref<'contar' | 'recibir'>('contar')
const pin = ref('')
const error = ref('')

watch(
  () => props.visible,
  (v) => {
    if (v) {
      contado.value = null
      paso.value = 'contar'
      pin.value = ''
      error.value = ''
    }
  },
)


const montoEntregado = computed(() => aCentavos(contado.value ?? 0))

/** Paso 1 → 2: el cajero ya contó; ahora quien recibe revisa la cantidad. */
function continuar() {
  if (contado.value == null) return
  error.value = ''
  pin.value = ''
  paso.value = 'recibir'
}

/** Esc: regresa un paso; en el primer paso cancela el corte. */
function atras() {
  if (guardando.value) return
  if (paso.value === 'recibir') regresar()
  else emit('update:visible', false)
}

function regresar() {
  error.value = ''
  pin.value = ''
  paso.value = 'contar'
}

/** Valida el PIN de quien recibe y cierra el turno. */
async function confirmar() {
  if (guardando.value || pin.value.length < 4) return
  guardando.value = true
  error.value = ''
  try {
    const receptor = await validarPin(pin.value, 'pos.recibirCorte', { id: operador.value.id, rol: sesion.rol ?? 'cajero' })
    if (receptor.id === operador.value.id) throw new Error('Quien recibe no puede ser quien entrega el efectivo.')
    const r = await cerrar(montoEntregado.value, operador.value, receptor)
    toast.add({ severity: 'success', summary: 'Turno cerrado', life: 2500 })
    emit('update:visible', false)
    emit('cerrado', r)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'No se pudo cerrar el turno'
    pin.value = ''
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
    :close-on-escape="false"
    class="dialogo-moderno"
    :style="{ width: '33rem', maxWidth: '96vw' }"
    @update:visible="emit('update:visible', $event)"
    @keydown.esc.prevent.stop="atras"
  >
    <template #header>
      <div class="cabecera">
        <div>
          <div class="fila-titulo">
            <h2>Corte de caja</h2>
            <span class="chip">Turno en curso</span>
          </div>
          <p>
            Cierre de turno y arqueo final ·
            <strong>{{ resumen?.turno.cajaNombre }} ({{ resumen?.turno.cajeroNombre }})</strong>
          </p>
        </div>
        <button class="cerrar" aria-label="Cerrar" @click="emit('update:visible', false)"><span>Esc</span><i class="pi pi-times" /></button>
      </div>
    </template>

    <div v-if="paso === 'contar'" class="cuerpo">
      <section class="conteo">
        <label for="corte-contado">Efectivo contado en gaveta <span class="req">*</span></label>
        <div class="campo">
          <InputNumber
            v-model="contado"
            input-id="corte-contado"
            mode="currency"
            currency="MXN"
            locale="es-MX"
            :min="0"
            fluid
            class="entrada-grande"
            placeholder="$0.00"
            v-foco
            @input="contado = ($event.value as number | null) ?? null"
            @keydown.enter.prevent.stop="continuar"
          />
          <kbd>↵ Enter</kbd>
        </div>
        <p class="ciego">
          <i class="pi pi-eye-slash" />
          <span>
            Cuenta todo el dinero de la caja (monedas, billetes, etc.) y captura el total que hay.
          </span>
        </p>
        <p v-if="fondoQueda > 0" class="fondo-queda">
          <i class="pi pi-info-circle" />
          <span>
            En la caja deben quedar <b>{{ formatear(fondoQueda) }}</b> de fondo para el siguiente turno.
            El total que captures <b>debe incluir esos {{ formatear(fondoQueda) }}</b>.
          </span>
        </p>
      </section>
    </div>

    <div v-else class="cuerpo">
      <section class="entrega">
        <small>{{ operador.nombre }} entrega</small>
        <strong class="monto">{{ formatear(montoEntregado) }}</strong>
        <p>Quien recibe: revisa que esta cantidad sea correcta y teclea tu PIN para confirmar. Si no es correcta, regresa y corrígela.</p>
      </section>
      <p class="indicacion"><i class="pi pi-lock" /> PIN de <strong>gerente o dueño</strong></p>
      <TecladoNumerico v-model="pin" @enter="confirmar" />
      <div v-if="error" class="error"><i class="pi pi-times-circle" /> {{ error }}</div>
    </div>

    <template #footer>
      <div v-if="paso === 'contar'" class="pie">
        <button class="cancelar" @click="emit('update:visible', false)">Cancelar <kbd>Esc</kbd></button>
        <button class="confirmar" :disabled="contado == null" @click="continuar">
          <span>Continuar</span>
          <kbd>↵ Enter</kbd>
        </button>
      </div>
      <div v-else class="pie">
        <button class="cancelar" :disabled="guardando" @click="regresar"><i class="pi pi-arrow-left" /> Regresar y corregir <kbd>Esc</kbd></button>
        <button class="confirmar" :disabled="pin.length < 4 || guardando" @click="confirmar">
          <i :class="guardando ? 'pi pi-spin pi-spinner' : 'pi pi-lock'" />
          <span>Confirmar y cerrar turno</span>
          <kbd>↵ Enter</kbd>
        </button>
      </div>
    </template>
  </Dialog>
</template>

<style scoped>
.cabecera {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  width: 100%;
  padding: 1.25rem 1.5rem 1rem;
  border-bottom: 1px solid var(--p-surface-100);
}
.fila-titulo {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}
h2 {
  font-size: 1.25rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--p-surface-900);
}
.chip {
  padding: 0.1rem 0.5rem;
  font-size: 0.7rem;
  font-weight: 600;
  color: #047857;
  background: #ecfdf5;
  border: 1px solid rgb(167 243 208 / 70%);
  border-radius: 0.3rem;
}
.cabecera p {
  margin: 0.3rem 0 0;
  font-size: 0.75rem;
  color: var(--p-surface-500);
}
.cabecera p strong {
  font-weight: 500;
  color: var(--p-surface-700);
}
.cerrar {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.4rem 0.5rem;
  color: var(--p-surface-400);
  background: none;
  border: 0;
  border-radius: 0.6rem;
  cursor: pointer;
}
.cerrar span {
  padding: 0 0.25rem;
  font: 0.62rem ui-monospace, Consolas, monospace;
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
  gap: 1rem;
  max-height: 68vh;
  padding: 1rem 1.5rem;
  overflow-y: auto;
}
.libro > div,
.libro span,
.conteo {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.conteo label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--p-surface-800);
}
.req {
  font-weight: 400;
  color: #ef4444;
}
.campo {
  position: relative;
}
.campo kbd {
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  padding: 0.1rem 0.4rem;
  font: 500 0.68rem system-ui, sans-serif;
  color: var(--p-surface-500);
  background: var(--p-surface-100);
  border: 1px solid var(--p-surface-200);
  border-radius: 0.3rem;
}
:deep(.entrada-grande .p-inputtext) {
  padding: 0.65rem 5rem 0.65rem 1rem;
  font-size: 1.15rem;
  font-weight: 700;
  border: 2px solid var(--p-primary-500);
  border-radius: 0.8rem;
}
.cuadra .pildora {
  color: #047857;
  background: #ecfdf5;
  border-color: rgb(167 243 208 / 80%);
}
.mal .pildora {
  color: #c2410c;
  background: #fff7ed;
  border-color: #fed7aa;
}
.pie {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.6rem;
  width: 100%;
  padding: 1rem 1.5rem;
  background: rgb(248 250 252 / 90%);
  border-top: 1px solid var(--p-surface-100);
}
.cancelar {
  padding: 0.65rem 1rem;
  font: 600 0.75rem system-ui, sans-serif;
  color: var(--p-surface-600);
  background: none;
  border: 1px solid transparent;
  border-radius: 0.75rem;
  cursor: pointer;
}
.cancelar:hover {
  color: var(--p-surface-800);
  background: rgb(226 232 240 / 60%);
}
.confirmar {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.65rem 1.4rem;
  font: 600 0.85rem system-ui, sans-serif;
  color: #fff;
  background: var(--p-primary-500);
  border: 0;
  border-radius: 0.75rem;
  box-shadow: 0 1px 2px rgb(0 0 0 / 10%);
  cursor: pointer;
}
.confirmar:hover:not(:disabled) {
  background: var(--p-primary-600);
}
.confirmar:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.ciego {
  display: flex;
  gap: 0.6rem;
  margin: 0.9rem 0 0;
  padding: 0.7rem 0.85rem;
  font-size: 0.78rem;
  line-height: 1.5;
  color: var(--p-surface-600);
  background: var(--p-surface-50);
  border: 1px solid var(--p-surface-200);
  border-radius: 0.75rem;
}
.ciego i {
  margin-top: 0.15rem;
  color: var(--p-surface-400);
}
.fondo-queda {
  display: flex;
  gap: 0.6rem;
  margin: 0.6rem 0 0;
  padding: 0.75rem 0.9rem;
  font-size: 0.82rem;
  line-height: 1.5;
  color: #92400e;
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 0.75rem;
}
.fondo-queda i {
  margin-top: 0.15rem;
  color: #d97706;
}
.entrega {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  padding: 1.1rem 1rem;
  text-align: center;
  background: var(--p-primary-50);
  border: 1px solid var(--p-primary-100);
  border-radius: 1rem;
}
.entrega small {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--p-surface-600);
}
.entrega .monto {
  font-size: 2.2rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--p-primary-700);
}
.entrega p {
  margin: 0.4rem 0 0;
  font-size: 0.8rem;
  line-height: 1.5;
  color: var(--p-surface-600);
}
.indicacion {
  margin: 1rem 0 0.5rem;
  font-size: 0.8rem;
  text-align: center;
  color: var(--p-surface-500);
}
.error {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin-top: 0.75rem;
  padding: 0.6rem 0.8rem;
  font-size: 0.8rem;
  color: #b91c1c;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 0.6rem;
}
kbd {
  padding: 0.1rem 0.45rem;
  font: 400 0.68rem ui-monospace, Consolas, monospace;
  background: rgb(0 0 0 / 8%);
  border-radius: 0.3rem;
}
.confirmar kbd {
  color: var(--p-primary-100);
  background: rgb(0 0 0 / 15%);
}
</style>
