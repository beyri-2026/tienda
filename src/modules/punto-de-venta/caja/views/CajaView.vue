<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import { formatear } from '@/core/utils/dinero'
import type { Producto } from '@/modules/catalogo/types/producto.types'
import AutorizacionDialog from '../../components/AutorizacionDialog.vue'
import AbrirTurnoForm from '../../turno/components/AbrirTurnoForm.vue'
import ComprobanteMovimientoDialog from '../../turno/components/ComprobanteMovimientoDialog.vue'
import RetiroDialog from '../../turno/components/RetiroDialog.vue'
import { useTurno } from '../../turno/composables/useTurno'
import type { MovimientoEfectivo } from '../../types/turno.types'
import type { Pago, Venta } from '../../types/venta.types'
import { construirComprobanteMovimiento, construirTicket } from '../../utils/ticket'
import BarraBusqueda from '../components/BarraBusqueda.vue'
import CamaraDialog from '../components/CamaraDialog.vue'
import CobroDialog from '../components/CobroDialog.vue'
import AvisoTopeDialog from '../components/AvisoTopeDialog.vue'
import VentaCobradaDialog from '../components/VentaCobradaDialog.vue'
import CodigosPrueba from '../components/CodigosPrueba.vue'
import EsperaDialog from '../components/EsperaDialog.vue'
import ListaCuenta from '../components/ListaCuenta.vue'
import PanelTotales from '../components/PanelTotales.vue'
import PesoDialog from '../components/PesoDialog.vue'
import { ErrorCaja, useCarrito } from '../composables/useCarrito'
import { useOperador } from '@/core/auth/useOperador'
import { useRegistrarVenta } from '../composables/useRegistrarVenta'

const toast = useToast()
const { operador } = useOperador()
const confirmar = useConfirm()

const {
  lineas,
  espera,
  totales,
  agregarPorCodigo,
  agregarProducto,
  agregarPeso,
  cambiarCantidad,
  fijarCantidad,
  quitar,
  vaciar,
  ponerEnEspera,
  retomar,
  eliminarEspera,
} = useCarrito()
const { turno, cargado, configuracion, efectivoEnCaja, nivelTope, verEfectivo, recargar, saltarTope, avisoTopeVisto } = useTurno()
const { guardando, registrar } = useRegistrarVenta()

const barra = ref<InstanceType<typeof BarraBusqueda> | null>(null)
const cobroVisible = ref(false)
const pesoVisible = ref(false)
const productoPeso = ref<Producto | null>(null)
const camaraVisible = ref(false)
const esperaVisible = ref(false)
const retiroVisible = ref(false)
const avisoTopeVisible = ref(false)
const excepcionVisible = ref(false)
const ticketVisible = ref(false)
/** Cantidad pedida con F7 para el siguiente producto que se escanee. */
const cantidadPendiente = ref<number | null>(null)
const ventaCobrada = ref<Venta | null>(null)
const comprobante = ref({ visible: false, mov: null as MovimientoEfectivo | null, texto: '' })

onMounted(async () => {
  window.addEventListener('keydown', atajos)
  await recargar()
  // Si se entra a Caja y ya está en el tope, el aviso aparece igual que después de una venta.
  if (bloqueado.value && !hayDialogo()) avisoTopeVisible.value = true
})
onBeforeUnmount(() => window.removeEventListener('keydown', atajos))

// El cursor queda en la búsqueda en cuanto la caja está lista (sin dar clic).
watch(
  () => cargado.value && !!turno.value,
  (lista) => lista && nextTick(enfocar),
  { immediate: true },
)

function enfocar() {
  setTimeout(() => barra.value?.enfocar(), 50)
}

const bloqueado = computed(() => nivelTope.value === 'bloqueado')
const motivoBloqueo = computed(() =>
  bloqueado.value ? 'Tope de efectivo alcanzado: haz un retiro para seguir vendiendo.' : undefined,
)
const textoTicket = computed(() =>
  ventaCobrada.value && configuracion.value ? construirTicket(ventaCobrada.value, configuracion.value) : '',
)

function avisar(e: unknown) {
  const mensaje = e instanceof Error ? e.message : 'Ocurrió un error'
  toast.add({ severity: e instanceof ErrorCaja ? 'warn' : 'error', summary: mensaje, life: 4000 })
}

/** Con el tope alcanzado y una venta nueva, el retiro se muestra a fuerza antes de agregar nada. */
function exigirRetiro(): boolean {
  if (!bloqueado.value || lineas.value.length > 0) return false
  retiroVisible.value = true
  toast.add({ severity: 'warn', summary: 'Tope de efectivo alcanzado: haz el retiro para empezar otra venta', life: 4000 })
  return true
}

async function procesarCodigo(texto: string) {
  if (exigirRetiro()) return
  try {
    const r = await agregarPorCodigo(texto, cantidadPendiente.value ?? 1)
    if (r.cantidadIgnorada) {
      toast.add({ severity: 'warn', summary: 'La cantidad solo aplica a productos normales (no a peso, folios o etiquetas)', life: 3500 })
    }
    cantidadPendiente.value = null
    if (r.requierePeso) {
      productoPeso.value = r.requierePeso
      pesoVisible.value = true
    } else {
      toast.add({ severity: 'success', summary: r.mensaje, life: 1200 })
    }
  } catch (e) {
    avisar(e)
  }
  if (!pesoVisible.value) enfocar()
}

function elegirProducto(p: Producto) {
  if (exigirRetiro()) return
  if (p.unidad === 'kg') {
    cantidadPendiente.value = null
    productoPeso.value = p
    pesoVisible.value = true
    return
  }
  agregarProducto(p, cantidadPendiente.value ?? 1)
  cantidadPendiente.value = null
  enfocar()
}

function confirmarPeso(gramos: number) {
  if (productoPeso.value) agregarPeso(productoPeso.value, gramos)
  enfocar()
}

function cobrar() {
  if (bloqueado.value) {
    toast.add({ severity: 'warn', summary: 'Haz un retiro de efectivo para seguir vendiendo', life: 3500 })
    return
  }
  cobroVisible.value = true
}

async function confirmarCobro(pagos: Pago[]) {
  try {
    ventaCobrada.value = await registrar(pagos)
    cobroVisible.value = false
    ticketVisible.value = true
  } catch (e) {
    avisar(e)
  }
}

function alCerrarTicket() {
  ticketVisible.value = false
  // Si esta venta dejó la caja en el tope, se avisa en un cuadro que hay que atender.
  if (bloqueado.value) avisoTopeVisible.value = true
  else enfocar()
}

async function decidirAvisoTope(decision: 'retiro' | 'despues') {
  avisoTopeVisible.value = false
  await avisoTopeVisto(decision, operador.value)
  if (decision === 'retiro') retiroVisible.value = true
  else enfocar()
}

function pedirVaciar() {
  confirmar.require({
    header: 'Vaciar cuenta',
    message: '¿Quitar todos los productos de la cuenta actual?',
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: 'Vaciar',
    rejectLabel: 'Cancelar',
    accept: () => {
      vaciar()
      enfocar()
    },
  })
}

function ponerEspera() {
  ponerEnEspera()
  toast.add({ severity: 'info', summary: 'Cuenta puesta en espera', life: 1800 })
  enfocar()
}

function retomarEspera(id: string) {
  try {
    retomar(id)
    esperaVisible.value = false
    enfocar()
  } catch (e) {
    avisar(e)
  }
}

function mostrarComprobante(mov: MovimientoEfectivo) {
  if (!turno.value || !configuracion.value) return
  comprobante.value = { visible: true, mov, texto: construirComprobanteMovimiento(mov, turno.value, configuracion.value) }
}

const hayDialogo = () =>
  cobroVisible.value || pesoVisible.value || camaraVisible.value || esperaVisible.value ||
  retiroVisible.value || avisoTopeVisible.value || excepcionVisible.value || ticketVisible.value || comprobante.value.visible

/** F2 buscar · F4 cobrar · F7 cantidad · F8 poner en espera. */
function atajos(e: KeyboardEvent) {
  if (!['F2', 'F4', 'F7', 'F8'].includes(e.key) || !turno.value || hayDialogo()) return
  e.preventDefault()
  if (e.key === 'F2') barra.value?.enfocar()
  else if (e.key === 'F7') barra.value?.pedirCantidad()
  else if (e.key === 'F4' && lineas.value.length > 0) cobrar()
  else if (e.key === 'F8' && lineas.value.length > 0) ponerEspera()
}

function permitirExcepcion() {
  saltarTope()
  toast.add({ severity: 'info', summary: 'Excepción autorizada para la siguiente venta', life: 2500 })
}
</script>

<template>
  <div v-if="!cargado" class="muted">Cargando caja…</div>

  <AbrirTurnoForm v-else-if="!turno" @abierto="enfocar" />

  <div v-else class="caja">
    <section class="izquierda">
      <div v-if="nivelTope !== 'normal'" class="banner" :class="nivelTope">
        <span>
          <i class="pi pi-exclamation-triangle" />
          {{ nivelTope === 'bloqueado' ? 'Tope de efectivo alcanzado.' : 'El efectivo en caja se acerca al tope.' }}
          <template v-if="verEfectivo">Hay {{ formatear(efectivoEnCaja) }} en caja.</template>
          <template v-else-if="nivelTope === 'bloqueado'">Ya se llegó al límite: haz un retiro para seguir vendiendo.</template>
          <template v-else>Avisa al gerente y prepara un retiro.</template>
        </span>
        <span class="fila">
          <Button label="Hacer retiro" size="small" icon="pi pi-arrow-up-right" @click="retiroVisible = true" />
          <Button v-if="bloqueado" label="Autorizar excepción" size="small" severity="secondary" @click="excepcionVisible = true" />
        </span>
      </div>

      <BarraBusqueda ref="barra" v-model:cantidad="cantidadPendiente" @codigo="procesarCodigo" @elegir="elegirProducto" @camara="camaraVisible = true" />
      <ListaCuenta :lineas="lineas" @mas="cambiarCantidad($event, 1)" @menos="cambiarCantidad($event, -1)" @fijar="fijarCantidad" @listo="enfocar" @quitar="quitar" />
      <CodigosPrueba @escanear="procesarCodigo" />
    </section>

    <aside class="derecha">
      <PanelTotales
        :totales="totales"
        :puede-cobrar="true"
        :hay-lineas="lineas.length > 0"
        :en-espera="espera.length"
        :motivo-bloqueo="motivoBloqueo"
        @cobrar="cobrar"
        @espera="ponerEspera"
        @ver-espera="esperaVisible = true"
        @vaciar="pedirVaciar"
      />
      <div class="efectivo">
        <div class="fila-entre">
          <div>
            <small>Efectivo en cajón</small>
            <strong v-if="verEfectivo" class="dinero">{{ formatear(efectivoEnCaja) }}</strong>
            <strong v-else class="nivel" :class="nivelTope"><i :class="nivelTope === 'normal' ? 'pi pi-check-circle' : 'pi pi-exclamation-triangle'" /> {{ nivelTope === 'normal' ? 'Dentro del límite' : nivelTope === 'bloqueado' ? 'Tope alcanzado' : 'Cerca del tope' }}</strong>
          </div>
          <div class="moneda"><i class="pi pi-dollar" /></div>
        </div>
        <div class="acciones">
          <button @click="retiroVisible = true"><i class="pi pi-arrow-up-right" /> Retiro</button>
        </div>
      </div>
    </aside>
  </div>

  <CobroDialog v-model:visible="cobroVisible" :total-centavos="totales.totalCentavos" :guardando="guardando" @confirmar="confirmarCobro" />
  <PesoDialog v-model:visible="pesoVisible" :producto="productoPeso" @confirmar="confirmarPeso" />
  <CamaraDialog v-model:visible="camaraVisible" @codigo="procesarCodigo" />
  <EsperaDialog v-model:visible="esperaVisible" :ventas="espera" @retomar="retomarEspera" @eliminar="eliminarEspera" />
  <RetiroDialog v-model:visible="retiroVisible" @listo="mostrarComprobante" />
  <AutorizacionDialog
    v-model:visible="excepcionVisible"
    titulo="Autorizar excepción de tope"
    descripcion="Solo el dueño puede permitir vender por encima del tope de efectivo."
    permiso="pos.saltarTope"
    :motivos="['Cliente en espera', 'Retiro en proceso']"
    @autorizado="permitirExcepcion"
  />

  <AvisoTopeDialog :visible="avisoTopeVisible" @retirar="decidirAvisoTope('retiro')" @entendido="decidirAvisoTope('despues')" />
  <VentaCobradaDialog
    :visible="ticketVisible"
    :venta="ventaCobrada"
    :configuracion="configuracion"
    :texto="textoTicket"
    @update:visible="(v) => (v ? null : alCerrarTicket())"
  />
  <ComprobanteMovimientoDialog
    :visible="comprobante.visible"
    :movimiento="comprobante.mov"
    :turno="turno"
    :configuracion="configuracion"
    :texto="comprobante.texto"
    @update:visible="(v) => { comprobante.visible = v; if (!v) enfocar() }"
  />
</template>

<style scoped>
.caja {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 24rem;
  gap: 1rem;
  height: calc(100vh - 6.2rem);
}
.izquierda {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  min-height: 0;
}
.derecha {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  overflow: auto;
}
.banner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
  padding: 0.6rem 0.9rem;
  border-radius: 0.6rem;
}
.banner.aviso {
  background: var(--p-orange-50);
  color: var(--p-orange-800);
}
.banner.bloqueado {
  background: var(--p-red-50);
  color: var(--p-red-800);
}
.cambio-grande {
  font-size: 1.6rem;
  text-align: center;
  padding: 0.5rem;
  background: var(--p-green-50);
  color: var(--p-green-800);
  border-radius: 0.6rem;
}
@media (max-width: 900px) {
  .caja {
    grid-template-columns: 1fr;
    height: auto;
  }
}
.efectivo {
  padding: 1rem;
  background: var(--p-surface-50);
  border: 1px solid var(--p-surface-200);
  border-radius: 1rem;
}
.efectivo small {
  display: block;
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--p-surface-500);
}
.efectivo strong {
  font: 700 1.2rem ui-monospace, Consolas, monospace;
  color: var(--p-surface-900);
}
.moneda {
  width: 2rem;
  height: 2rem;
  display: grid;
  place-items: center;
  border-radius: 50%;
  color: var(--p-primary-700);
  background: var(--p-primary-100);
}
.acciones {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.5rem;
  margin-top: 0.75rem;
}
.acciones button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  padding: 0.5rem;
  font: inherit;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--p-surface-700);
  background: #fff;
  border: 1px solid var(--p-surface-200);
  border-radius: 0.5rem;
  cursor: pointer;
}
.acciones button:hover {
  background: var(--p-surface-100);
}
.nivel {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--p-green-600);
}
.nivel.aviso {
  color: var(--p-orange-600);
}
</style>
