<script setup lang="ts">
import { vFoco } from '@/core/utils/foco'
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { puede, type Permiso } from '@/core/auth/permisos'
import { useSesion } from '@/core/auth/sesion.store'
import TecladoNumerico from '@/shared/components/TecladoNumerico.vue'
import { validarPin } from '../api/autorizacion.api'
import type { Autorizacion } from '../types/venta.types'

/**
 * Autorización de acciones delicadas (cancelar, devolver, retirar…):
 * 1) una persona con permiso teclea su PIN, 2) se pide el motivo, 3) queda en bitácora.
 * El cajero NO cierra su sesión. Si quien opera ya tiene el permiso, se salta el PIN.
 */
const props = defineProps<{
  visible: boolean
  titulo: string
  descripcion?: string
  permiso: Permiso
  motivos: string[]
}>()
const emit = defineEmits<{ 'update:visible': [valor: boolean]; autorizado: [autorizacion: Autorizacion] }>()

const sesion = useSesion()
const paso = ref<'pin' | 'motivo'>('pin')
const pin = ref('')
const error = ref('')
const validando = ref(false)
const autorizador = ref<{ id: string; nombre: string } | null>(null)
const motivoElegido = ref<string | null>(null)
const motivoOtro = ref('')
const requirioPin = ref(false)
const botonConfirmar = ref<HTMLButtonElement | null>(null)
const selectorMotivo = ref<{ $el: HTMLElement } | null>(null)

const opciones = computed(() => [...props.motivos, 'Otro'])
const motivoFinal = computed(() =>
  motivoElegido.value === 'Otro' ? motivoOtro.value.trim() : (motivoElegido.value ?? ''),
)

watch(
  () => props.visible,
  (visible) => {
    if (!visible) return
    pin.value = ''
    error.value = ''
    motivoElegido.value = null
    motivoOtro.value = ''
    autorizador.value = null
    paso.value = 'pin'
    requirioPin.value = true
    if (sesion.usuario && puede(sesion.rol, props.permiso)) {
      autorizador.value = { id: sesion.usuario.id, nombre: sesion.usuario.nombre }
      paso.value = 'motivo'
      requirioPin.value = false
    }
  },
)

async function validar() {
  if (!sesion.usuario) return
  error.value = ''
  validando.value = true
  try {
    autorizador.value = await validarPin(pin.value, props.permiso, {
      id: sesion.usuario.id,
      rol: sesion.usuario.rol,
    })
    paso.value = 'motivo'
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'No se pudo validar el PIN'
    pin.value = ''
  } finally {
    validando.value = false
  }
}

/** Botón principal del pie: valida el PIN o confirma el motivo. */
const puedeAvanzar = computed(() => (paso.value === 'pin' ? pin.value.length >= 4 && !validando.value : !!motivoFinal.value))
function avanzar() {
  if (!puedeAvanzar.value) return
  if (paso.value === 'pin') validar()
  else confirmar()
}

watch(paso, async (p) => {
  if (p !== 'motivo') return
  await nextTick()
  selectorMotivo.value?.$el?.querySelector<HTMLElement>('[role=combobox]')?.focus()
})

/** Al elegir el motivo, el foco pasa al botón (o al texto si es «Otro»), así Enter confirma. */
async function alElegirMotivo() {
  if (motivoElegido.value === 'Otro') return
  await nextTick()
  // PrimeVue devuelve el foco al selector al cerrar la lista; se lo quitamos justo después.
  setTimeout(() => botonConfirmar.value?.focus(), 80)
}

/** Esc: regresa un paso (del motivo al PIN); en el primer paso cancela. */
function atras() {
  if (paso.value === 'motivo' && requirioPin.value) {
    pin.value = ''
    error.value = ''
    autorizador.value = null
    paso.value = 'pin'
  } else emit('update:visible', false)
}

/**
 * Esc se atiende en captura a nivel de ventana: la lista de motivos (Select) se traga el Esc
 * y el diálogo nunca lo recibiría. Si la lista está desplegada, Esc solo la cierra.
 */
function alTeclear(e: KeyboardEvent) {
  if (e.key !== 'Escape') return
  if ((document.activeElement as HTMLElement | null)?.getAttribute('aria-expanded') === 'true') return
  e.preventDefault()
  e.stopPropagation()
  atras()
}
watch(
  () => props.visible,
  (v) => {
    window.removeEventListener('keydown', alTeclear, true)
    if (v) window.addEventListener('keydown', alTeclear, true)
  },
  { immediate: true },
)
onBeforeUnmount(() => window.removeEventListener('keydown', alTeclear, true))

function confirmar() {
  if (!autorizador.value || !motivoFinal.value) return
  emit('autorizado', {
    autorizoId: autorizador.value.id,
    autorizoNombre: autorizador.value.nombre,
    motivo: motivoFinal.value,
  })
  emit('update:visible', false)
}
</script>

<template>
  <Dialog
    :visible="visible"
    modal
    :closable="false"
    :close-on-escape="false"
    class="dialogo-moderno"
    :style="{ width: '27.5rem', maxWidth: '96vw' }"
    @update:visible="emit('update:visible', $event)"
  >
    <template #header>
      <div class="cabecera">
        <div class="titulo">
          <div class="icono"><i class="pi pi-shield" /></div>
          <div>
            <h2>{{ titulo }}</h2>
            <p>{{ paso === 'pin' ? 'Paso 1 de 2 · Validar PIN' : 'Paso 2 de 2 · Motivo' }}</p>
          </div>
        </div>
        <button class="cerrar" aria-label="Cerrar" @click="emit('update:visible', false)"><i class="pi pi-times" /></button>
      </div>
    </template>

    <div class="cuerpo">
      <div v-if="descripcion" class="resumen">
        <small>Acción a autorizar</small>
        <strong>{{ descripcion }}</strong>
      </div>

      <template v-if="paso === 'pin'">
        <p class="indicacion">
          <i class="pi pi-lock" /> Pide a un <strong>gerente o dueño</strong> que teclee su PIN
        </p>
        <TecladoNumerico v-model="pin" @enter="validar" />
        <div v-if="error" class="error"><i class="pi pi-times-circle" /> {{ error }}</div>
      </template>

      <template v-else>
        <div class="autoriza">
          <i class="pi pi-check-circle" />
          <span>Autoriza: <strong>{{ autorizador?.nombre }}</strong></span>
        </div>
        <div class="bloque">
          <label class="etiqueta">Motivo <span class="req">*</span></label>
          <Select ref="selectorMotivo" v-model="motivoElegido" :options="opciones" placeholder="Elige un motivo" fluid @change="alElegirMotivo" />
        </div>
        <InputText v-if="motivoElegido === 'Otro'" v-model="motivoOtro" placeholder="Escribe el motivo" fluid v-foco @keydown.enter="avanzar" />
      </template>
    </div>

    <template #footer>
      <div class="pie">
        <button class="cancelar" @click="atras">
          <i v-if="paso === 'motivo' && requirioPin" class="pi pi-arrow-left" />
          {{ paso === 'motivo' && requirioPin ? 'Regresar' : 'Cancelar' }} <kbd>ESC</kbd>
        </button>
        <button ref="botonConfirmar" class="confirmar" :disabled="!puedeAvanzar" @keydown.enter.prevent.stop="avanzar" @click="avanzar">
          <i :class="validando ? 'pi pi-spin pi-spinner' : 'pi pi-check'" />
          <span>{{ paso === 'pin' ? 'Validar PIN' : 'Confirmar' }}</span>
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
  padding: 1.5rem 1.75rem 1rem;
  border-bottom: 1px solid var(--p-surface-100);
}
.titulo {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
.icono {
  width: 2.75rem;
  height: 2.75rem;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  font-size: 1.2rem;
  color: #d97706;
  background: #fffbeb;
  border: 1px solid rgb(253 230 138 / 80%);
  border-radius: 1rem;
  box-shadow: 0 1px 2px rgb(0 0 0 / 5%);
}
h2 {
  font-size: 1.25rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  line-height: 1.25;
  color: var(--p-surface-900);
}
.titulo p {
  margin: 0.15rem 0 0;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--p-surface-500);
}
.cerrar {
  width: 2.25rem;
  height: 2.25rem;
  display: grid;
  place-items: center;
  color: var(--p-surface-400);
  background: rgb(241 245 249 / 80%);
  border: 0;
  border-radius: 50%;
  cursor: pointer;
}
.cerrar:hover {
  color: var(--p-surface-700);
  background: rgb(226 232 240 / 80%);
}
.cuerpo {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1rem 1.75rem 1.25rem;
}
.resumen {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  padding: 0.85rem 1rem;
  background: linear-gradient(to right, var(--p-surface-50), rgb(241 245 249 / 80%));
  border: 1px solid rgb(226 232 240 / 70%);
  border-radius: 1rem;
}
.resumen small {
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--p-surface-500);
}
.resumen strong {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--p-surface-900);
}
.indicacion {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0.25rem 0.25rem 0;
  font-size: 0.75rem;
  color: var(--p-surface-600);
}
.indicacion i {
  color: var(--p-primary-600);
}
.indicacion strong {
  color: var(--p-surface-900);
}
.error {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 0.8rem;
  font-size: 0.8rem;
  font-weight: 500;
  color: #be123c;
  background: #fff1f2;
  border: 1px solid #fecdd3;
  border-radius: 0.75rem;
}
.autoriza {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.8rem 1rem;
  font-size: 0.85rem;
  color: var(--p-surface-700);
  background: rgb(236 253 245 / 70%);
  border: 1px solid rgb(167 243 208 / 80%);
  border-radius: 0.75rem;
}
.autoriza i {
  font-size: 1.2rem;
  color: var(--p-primary-600);
}
.autoriza strong {
  color: #064e3b;
}
.bloque {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
.etiqueta {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--p-surface-700);
}
.req {
  color: #f43f5e;
}
.pie {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  width: 100%;
  padding: 1rem 1.75rem;
  background: rgb(248 250 252 / 90%);
  border-top: 1px solid var(--p-surface-100);
}
kbd {
  font: 0.62rem ui-monospace, Consolas, monospace;
  padding: 0.1rem 0.4rem;
  border-radius: 0.25rem;
}
.cancelar {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  padding: 0.75rem 1rem;
  font: inherit;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--p-surface-700);
  background: #fff;
  border: 1px solid var(--p-surface-300);
  border-radius: 0.75rem;
  cursor: pointer;
}
.cancelar kbd {
  color: var(--p-surface-400);
  background: var(--p-surface-100);
  border: 1px solid var(--p-surface-200);
}
.cancelar:hover {
  background: var(--p-surface-100);
}
.confirmar {
  flex: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  font: inherit;
  font-size: 0.85rem;
  font-weight: 600;
  color: #fff;
  background: linear-gradient(to right, var(--p-primary-500), #14b8a6);
  border: 0;
  border-radius: 0.75rem;
  box-shadow: 0 4px 6px -1px rgb(16 185 129 / 25%);
  cursor: pointer;
  transition: filter 0.15s;
}
.confirmar kbd {
  color: #d1fae5;
  background: rgb(4 120 87 / 40%);
  border: 1px solid rgb(52 211 153 / 30%);
}
.confirmar:hover:not(:disabled) {
  filter: brightness(0.93);
}
.confirmar:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
