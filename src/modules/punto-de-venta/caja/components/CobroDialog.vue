<script setup lang="ts">
import { vFoco } from '@/core/utils/foco'
import { computed, nextTick, ref, watch } from 'vue'
import { formatear, formatearConSigno, type Centavos } from '@/core/utils/dinero'
import { ETIQUETA_METODO, type DatosTarjeta, type Pago } from '../../types/venta.types'
import { useCobro, type ModoCobro } from '../composables/useCobro'
import TerminalVirtualDialog from './TerminalVirtualDialog.vue'

const props = defineProps<{ visible: boolean; totalCentavos: Centavos; guardando: boolean }>()
const emit = defineEmits<{ 'update:visible': [valor: boolean]; confirmar: [pagos: Pago[]] }>()

const total = computed(() => props.totalCentavos)
const {
  modo,
  recibidoPesos,
  redondeo,
  totalACobrar,
  recibido,
  cambio,
  efectivoSuficiente,
  sugerencias,
  pagosMixto,
  montoMixtoPesos,
  montoMixtoCentavos,
  pendienteMixto,
  hayTarjetaAprobada,
  reiniciar,
  pagoEfectivoSimple,
  pagoTarjeta,
  agregarMixto,
  quitarMixto,
} = useCobro(total)

const modos: { label: string; value: ModoCobro; icono: string }[] = [
  { label: 'Efectivo', value: 'efectivo', icono: 'pi pi-money-bill' },
  { label: 'Tarjeta', value: 'tarjeta', icono: 'pi pi-credit-card' },
  { label: 'Mixto', value: 'mixto', icono: 'pi pi-percentage' },
]

const terminalVisible = ref(false)
const terminalMonto = ref<Centavos>(0)
const terminalDestino = ref<'simple' | 'mixto'>('simple')

watch(
  () => props.visible,
  (v) => {
    if (v) reiniciar()
  },
)

const sePuedeCerrar = computed(() => !props.guardando && !hayTarjetaAprobada.value)

function cambiarModo(valor: ModoCobro | null) {
  if (valor && pagosMixto.value.length === 0) modo.value = valor
}

function abrirTerminalSimple() {
  terminalMonto.value = totalACobrar.value
  terminalDestino.value = 'simple'
  terminalVisible.value = true
}

function abrirTerminalMixto() {
  terminalMonto.value = Math.min(montoMixtoCentavos.value, pendienteMixto.value)
  terminalDestino.value = 'mixto'
  terminalVisible.value = true
}

function tarjetaAprobada(tarjeta: DatosTarjeta) {
  if (terminalDestino.value === 'simple') emit('confirmar', [pagoTarjeta(totalACobrar.value, tarjeta)])
  else agregarMixto('tarjeta', { tarjeta })
}

/** Botón principal del pie según la forma de pago elegida. */
const accion = computed(() => {
  switch (modo.value) {
    case 'efectivo':
      return { texto: 'Cobrar en efectivo', icono: 'pi pi-check', deshabilitado: !efectivoSuficiente.value, tecla: 'Enter ↵' }
    case 'tarjeta':
      return { texto: 'Cobrar con terminal', icono: 'pi pi-credit-card', deshabilitado: false, tecla: '' }
    default:
      return { texto: 'Confirmar venta', icono: 'pi pi-check', deshabilitado: pendienteMixto.value !== 0, tecla: 'Enter ↵' }
  }
})

const botonConfirmar = ref<HTMLButtonElement | null>(null)
/** En mixto, al cubrir el total el foco pasa a «Confirmar venta» para que Enter la confirme. */
watch(
  () => modo.value === 'mixto' && pendienteMixto.value === 0 && pagosMixto.value.length > 0,
  async (listo) => {
    if (!listo) return
    await nextTick()
    botonConfirmar.value?.focus()
  },
)

function ejecutarAccion() {
  if (accion.value.deshabilitado || props.guardando) return
  if (modo.value === 'efectivo') emit('confirmar', [pagoEfectivoSimple()])
  else if (modo.value === 'tarjeta') abrirTerminalSimple()
  else emit('confirmar', pagosMixto.value)
}

const cerrar = () => sePuedeCerrar.value && emit('update:visible', false)

const resumenMixto = (p: Pago) =>
  p.metodo === 'tarjeta' ? `Tarjeta ****${p.tarjeta?.ultimos4}` : ETIQUETA_METODO[p.metodo]
</script>

<template>
  <Dialog
    :visible="visible"
    modal
    :closable="false"
    :close-on-escape="sePuedeCerrar"
    class="dialogo-cobro"
    :style="{ width: '40rem', maxWidth: '96vw' }"
    @update:visible="emit('update:visible', $event)"
  >
    <template #header>
      <div class="cabecera">
        <div class="titulo">
          <div class="icono"><i class="pi pi-wallet" /></div>
          <div>
            <h2>Cobrar venta</h2>
            <p>Seleccione el método de pago e ingrese el importe</p>
          </div>
        </div>
        <button class="esc" :disabled="!sePuedeCerrar" aria-label="Cerrar ventana de cobro" @click="cerrar">
          <span>ESC</span><i class="pi pi-times" />
        </button>
      </div>
    </template>

    <div class="cuerpo">
      <div class="total">
        <small>Total a cobrar</small>
        <div class="monto"><span class="dinero">{{ formatear(modo === 'mixto' ? total : totalACobrar) }}</span><b>MXN</b></div>
        <small v-if="redondeo !== 0" class="redondeo">Incluye redondeo de efectivo {{ formatearConSigno(redondeo) }}</small>
      </div>

      <div class="bloque">
        <label class="etiqueta">Forma de pago</label>
        <div class="metodos">
          <button
            v-for="m in modos"
            :key="m.value"
            class="metodo"
            :class="{ activo: modo === m.value }"
            :disabled="pagosMixto.length > 0 || guardando"
            @click="cambiarModo(m.value)"
          >
            <i :class="m.icono" /> {{ m.label }}
          </button>
        </div>
      </div>

      <!-- EFECTIVO -->
      <div v-if="modo === 'efectivo'" class="bloque">
        <div class="fila-entre">
          <label class="subtitulo">Efectivo recibido</label>
          <span class="auto"><span class="punto" /> Calculando cambio automático</span>
        </div>
        <InputNumber
          v-model="recibidoPesos"
          mode="currency"
          currency="MXN"
          locale="es-MX"
          :min="0"
          input-class="entrada-grande"
          fluid
          v-foco
          @input="recibidoPesos = ($event.value as number | null) ?? null"
          @keydown.enter="efectivoSuficiente && emit('confirmar', [pagoEfectivoSimple()])"
        />
        <div class="bloque chico">
          <span class="etiqueta tenue">Atajos de denominación</span>
          <div class="sugerencias">
            <button v-for="s in sugerencias" :key="s" class="chip" @click="recibidoPesos = s / 100">
              <template v-if="s === totalACobrar"><span class="bolita" /> Exacto <b>{{ formatear(s) }}</b></template>
              <template v-else>{{ formatear(s) }}</template>
            </button>
          </div>
        </div>
        <div class="cambio" :class="recibido === 0 ? 'vacio' : efectivoSuficiente ? 'ok' : 'falta'">
          <div>
            <strong>Cambio a entregar</strong>
            <small v-if="recibido === 0">Ingrese el monto entregado por el cliente</small>
            <small v-else-if="efectivoSuficiente">{{ cambio === 0 ? 'Pago exacto, no requiere cambio' : 'Entregar ' + formatear(cambio) + ' al cliente' }}</small>
            <small v-else>Faltan {{ formatear(totalACobrar - recibido) }} para completar el total</small>
          </div>
          <div class="importe dinero">{{ recibido === 0 || efectivoSuficiente ? formatear(cambio) : '-' + formatear(totalACobrar - recibido) }}</div>
        </div>
      </div>

      <!-- TARJETA -->
      <div v-else-if="modo === 'tarjeta'" class="bloque">
        <div class="aviso-metodo">
          <i class="pi pi-credit-card" />
          <span>Se cobrará exactamente <strong>{{ formatear(totalACobrar) }}</strong> en la terminal. La venta solo se cierra si la terminal aprueba.</span>
        </div>
      </div>

      <!-- MIXTO -->
      <div v-else class="bloque">
        <ul v-if="pagosMixto.length" class="pagos">
          <li v-for="(p, i) in pagosMixto" :key="i">
            <span>{{ resumenMixto(p) }}</span>
            <span class="fila">
              <strong class="dinero">{{ formatear(p.montoCentavos) }}</strong>
              <Button
                v-if="p.metodo !== 'tarjeta'"
                icon="pi pi-times"
                severity="danger"
                text
                rounded
                size="small"
                aria-label="Quitar pago"
                @click="quitarMixto(i)"
              />
            </span>
          </li>
        </ul>

        <div class="cambio" :class="pendienteMixto === 0 ? 'ok' : 'falta'">
          <div><strong>Pendiente</strong></div>
          <div class="importe dinero">{{ formatear(pendienteMixto) }}</div>
        </div>

        <template v-if="pendienteMixto > 0">
          <label class="subtitulo">Monto de este pago</label>
          <InputNumber
            v-model="montoMixtoPesos"
            mode="currency"
            currency="MXN"
            locale="es-MX"
            :min="0"
            :placeholder="formatear(pendienteMixto)"
            input-class="entrada-grande"
            fluid
            v-foco
            @input="montoMixtoPesos = ($event.value as number | null) ?? null"
            @keydown.enter.prevent.stop="agregarMixto('efectivo')"
          />
          <div class="tres">
            <button class="chip grande" @click="agregarMixto('efectivo')"><i class="pi pi-money-bill" /> Efectivo</button>
            <button class="chip grande" @click="abrirTerminalMixto"><i class="pi pi-credit-card" /> Tarjeta</button>
          </div>
        </template>
        <small class="tenue-texto">En pago mixto no se aplica redondeo (regla pendiente de definir).</small>
      </div>
    </div>

    <template #footer>
      <div class="pie">
        <button class="cancelar" :disabled="!sePuedeCerrar" @click="cerrar">Cancelar <kbd>ESC</kbd></button>
        <button ref="botonConfirmar" class="confirmar" :disabled="accion.deshabilitado || guardando" @keydown.enter.prevent.stop="ejecutarAccion" @click="ejecutarAccion">
          <i :class="guardando ? 'pi pi-spin pi-spinner' : accion.icono" />
          <span>{{ accion.texto }}</span>
          <kbd v-if="accion.tecla">{{ accion.tecla }}</kbd>
        </button>
      </div>
    </template>
  </Dialog>

  <TerminalVirtualDialog v-model:visible="terminalVisible" :monto-centavos="terminalMonto" @aprobada="tarjetaAprobada" />
</template>

<style>
/* Sin scoped: el diálogo se dibuja fuera de este componente. */
.dialogo-cobro {
  border-radius: 1rem !important;
  overflow: hidden;
  border: 1px solid var(--p-surface-100) !important;
  box-shadow: 0 25px 50px -12px rgb(15 23 42 / 35%) !important;
}
.dialogo-cobro .p-dialog-header,
.dialogo-cobro .p-dialog-content,
.dialogo-cobro .p-dialog-footer {
  padding: 0;
}
.dialogo-cobro .p-dialog-header {
  display: block;
}
.p-dialog-mask.p-overlay-mask {
  background: rgb(2 6 23 / 60%);
  backdrop-filter: blur(3px);
}
</style>

<style scoped>
.cabecera {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 1.4rem 1.75rem 1rem;
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
  font-size: 1.1rem;
}
h2 {
  font-size: 1.25rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--p-surface-900);
}
.titulo p {
  margin: 0.1rem 0 0;
  font-size: 0.75rem;
  color: var(--p-surface-500);
}
.esc {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem;
  color: var(--p-surface-400);
  background: transparent;
  border: 0;
  border-radius: 0.75rem;
  cursor: pointer;
}
.esc span {
  padding: 0.05rem 0.3rem;
  font-size: 0.68rem;
  font-weight: 600;
  border: 1px solid var(--p-surface-200);
  border-radius: 0.25rem;
}
.esc:hover:not(:disabled) {
  color: var(--p-surface-700);
  background: var(--p-surface-100);
}
.esc:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.cuerpo {
  display: flex;
  flex-direction: column;
  gap: 1.4rem;
  padding: 1.25rem 1.75rem;
}
.total {
  padding: 1rem;
  text-align: center;
  background: linear-gradient(to bottom, rgb(248 250 252 / 80%), rgb(241 245 249 / 70%));
  border: 1px solid var(--p-surface-200);
  border-radius: 1rem;
}
.total small {
  display: block;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--p-surface-500);
}
.monto {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 0.4rem;
}
.monto .dinero {
  font-size: 3rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--p-surface-900);
}
.monto b {
  padding: 0.1rem 0.5rem;
  font-size: 0.7rem;
  letter-spacing: 0.1em;
  color: var(--p-surface-500);
  background: #fff;
  border: 1px solid var(--p-surface-200);
  border-radius: 0.4rem;
}
.total .redondeo {
  margin-top: 0.25rem;
  text-transform: none;
  letter-spacing: 0;
  font-weight: 500;
}
.bloque {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}
.bloque.chico {
  gap: 0.4rem;
}
.etiqueta {
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--p-surface-600);
}
.etiqueta.tenue {
  font-size: 0.68rem;
  color: var(--p-surface-400);
}
.subtitulo {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--p-surface-700);
}
.metodos {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
  padding: 0.4rem;
  background: rgb(241 245 249 / 90%);
  border: 1px solid rgb(226 232 240 / 70%);
  border-radius: 0.75rem;
}
.metodo {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  padding: 0.7rem 0.5rem;
  font: inherit;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--p-surface-600);
  background: transparent;
  border: 1px solid transparent;
  border-radius: 0.6rem;
  cursor: pointer;
  transition: all 0.15s;
}
.metodo:hover:not(:disabled):not(.activo) {
  color: var(--p-surface-900);
  background: rgb(255 255 255 / 60%);
}
.metodo.activo {
  font-weight: 600;
  color: var(--p-primary-700);
  background: #fff;
  border-color: rgb(16 185 129 / 25%);
  box-shadow: 0 1px 2px rgb(0 0 0 / 6%), 0 0 0 1px rgb(16 185 129 / 20%);
}
.metodo.activo i {
  color: var(--p-primary-600);
}
.metodo:disabled:not(.activo) {
  opacity: 0.5;
  cursor: not-allowed;
}
.auto {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.15rem 0.6rem;
  font-size: 0.72rem;
  font-weight: 500;
  color: var(--p-primary-600);
  background: var(--p-primary-50);
  border: 1px solid var(--p-primary-100);
  border-radius: 999px;
}
.punto,
.bolita {
  width: 0.4rem;
  height: 0.4rem;
  border-radius: 50%;
  background: var(--p-primary-500);
}
.bolita {
  width: 0.5rem;
  height: 0.5rem;
  background: var(--p-surface-400);
}
:deep(.entrada-grande) {
  padding: 0.8rem 1rem;
  font-size: 1.6rem;
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
.sugerencias {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.chip {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 0.75rem;
  font: inherit;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--p-surface-700);
  background: var(--p-surface-100);
  border: 1px solid var(--p-surface-200);
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.15s;
}
.chip b {
  font-family: ui-monospace, Consolas, monospace;
  color: var(--p-surface-500);
}
.chip:hover {
  color: var(--p-primary-700);
  background: var(--p-primary-50);
  border-color: var(--p-primary-300);
}
.chip:active {
  transform: scale(0.95);
}
.chip.grande {
  justify-content: center;
  padding: 0.7rem 0.5rem;
}
.cambio {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  border: 1px solid;
  border-radius: 1rem;
  transition: background 0.2s;
}
.cambio strong {
  display: block;
  font-size: 0.85rem;
  color: var(--p-surface-600);
}
.cambio small {
  font-size: 0.72rem;
  color: var(--p-surface-500);
}
.cambio .importe {
  font-size: 1.9rem;
  font-weight: 800;
  color: var(--p-surface-800);
}
.cambio.vacio {
  background: var(--p-surface-50);
  border-color: rgb(226 232 240 / 90%);
}
.cambio.ok {
  background: rgb(236 253 245 / 70%);
  border-color: var(--p-primary-200);
}
.cambio.ok .importe {
  color: var(--p-primary-700);
}
.cambio.falta {
  background: rgb(255 251 235 / 70%);
  border-color: #fde68a;
}
.cambio.falta .importe {
  color: #d97706;
}
.aviso-metodo {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  font-size: 0.85rem;
  color: var(--p-surface-600);
  background: var(--p-surface-50);
  border: 1px solid var(--p-surface-200);
  border-radius: 1rem;
}
.aviso-metodo i {
  font-size: 1.4rem;
  color: var(--p-primary-600);
}
.pagos {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}
.pagos li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.45rem 0.8rem;
  background: #fff;
  border: 1px solid var(--p-surface-200);
  border-radius: 0.6rem;
}
.tres {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.5rem;
}
.tenue-texto {
  color: var(--p-surface-400);
}
.pie {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  width: 100%;
  padding: 1rem 1.75rem;
  background: rgb(248 250 252 / 80%);
  border-top: 1px solid var(--p-surface-100);
}
kbd {
  font: 600 0.68rem ui-monospace, Consolas, monospace;
  padding: 0.1rem 0.4rem;
  border-radius: 0.3rem;
}
.cancelar {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.25rem;
  font: inherit;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--p-surface-700);
  background: #fff;
  border: 1px solid var(--p-surface-300);
  border-radius: 0.75rem;
  box-shadow: 0 1px 2px rgb(0 0 0 / 5%);
  cursor: pointer;
}
.cancelar:hover:not(:disabled) {
  background: var(--p-surface-100);
}
.cancelar:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.cancelar kbd {
  color: var(--p-surface-500);
  background: var(--p-surface-100);
  border: 1px solid var(--p-surface-200);
}
.confirmar {
  flex: 1;
  max-width: 24rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  padding: 0.85rem 1.5rem;
  font: inherit;
  font-size: 1rem;
  font-weight: 700;
  color: #fff;
  background: var(--p-primary-500);
  border: 0;
  border-radius: 0.75rem;
  box-shadow: 0 10px 15px -3px rgb(16 185 129 / 25%);
  cursor: pointer;
  transition: background 0.15s, transform 0.1s;
}
.confirmar:hover:not(:disabled) {
  background: var(--p-primary-600);
}
.confirmar:active:not(:disabled) {
  transform: scale(0.99);
}
.confirmar:disabled {
  background: #94a3b8;
  box-shadow: none;
  cursor: not-allowed;
}
.confirmar kbd {
  color: #d1fae5;
  background: rgb(4 120 87 / 40%);
  border: 1px solid rgb(52 211 153 / 30%);
}
</style>
