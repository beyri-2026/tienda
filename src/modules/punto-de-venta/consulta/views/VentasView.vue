<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { vFoco } from '@/core/utils/foco'
import { useToast } from 'primevue/usetoast'
import { formatear } from '@/core/utils/dinero'
import { fechaCorta, horaCompleta } from '@/core/utils/fechas'
import { imprimirVenta } from '../../utils/imprimirTicket'
import { useConfiguracion } from '@/modules/catalogo/composables/useConfiguracion'
import PantallaVacia from '@/shared/components/PantallaVacia.vue'
import { useTurno } from '../../turno/composables/useTurno'
import { ETIQUETA_METODO, type EstadoVenta, type Venta } from '../../types/venta.types'
import VentaDetalleDialog from '../components/VentaDetalleDialog.vue'
import { ETIQUETA_ESTADO, useVentas } from '../composables/useVentas'

const { ventas, filtradas, cargando, busqueda, estado, caja, cajasConVentas, cargar } = useVentas()
const { configuracion, cargar: cargarConfiguracion } = useConfiguracion()
const { recargar } = useTurno()

const toast = useToast()
const campoBusqueda = ref<{ $el: HTMLElement } | null>(null)
const seleccionada = ref<Venta | null>(null)
const detalleVisible = ref(false)

const ESTADOS = Object.keys(ETIQUETA_ESTADO) as EstadoVenta[]
const cuenta = (e: EstadoVenta) => ventas.value.filter((v) => v.estado === e).length

const metodos = (v: Venta) => [...new Set(v.pagos.map((p) => ETIQUETA_METODO[p.metodo]))].join(' + ')
const esMixto = (v: Venta) => new Set(v.pagos.map((p) => p.metodo)).size > 1
const iconoMetodo = (v: Venta) =>
  esMixto(v) ? 'pi pi-wallet' : v.pagos[0]?.metodo === 'tarjeta' ? 'pi pi-credit-card' : 'pi pi-money-bill'
const articulos = (v: Venta) => v.lineas.reduce((n, l) => n + (l.tipo === 'producto' ? l.cantidad : 1), 0)
const iniciales = (n: string) => n.split(' ').filter(Boolean).slice(0, 2).map((x) => x[0]).join('').toUpperCase()

function abrir(v: Venta) {
  seleccionada.value = v
  detalleVisible.value = true
}

function reimprimir(v: Venta) {
  if (configuracion.value) imprimirVenta(v, configuracion.value, true)
}

/** El lector escribe el folio del ticket y manda Enter: si coincide exacto, abre la venta. */
function buscarEnter() {
  const folio = busqueda.value.trim()
  if (!folio) return
  const v = ventas.value.find((x) => x.folio === folio)
  if (v) {
    busqueda.value = ''
    abrir(v)
  } else if (filtradas.value.length === 0) {
    toast.add({ severity: 'warn', summary: `No hay ninguna venta con el folio ${folio}`, life: 3000 })
  }
}

function enfocarBusqueda() {
  const el = campoBusqueda.value?.$el
  const campo = el instanceof HTMLInputElement ? el : el?.querySelector('input')
  campo?.focus()
  campo?.select()
}

/** F2 devuelve el cursor a la búsqueda (igual que en Caja) para escanear otro ticket. */
function atajos(e: KeyboardEvent) {
  if (e.key !== 'F2' || detalleVisible.value) return
  e.preventDefault()
  enfocarBusqueda()
}

async function refrescar() {
  await cargar()
  await recargar()
  seleccionada.value = null
}

onMounted(async () => {
  window.addEventListener('keydown', atajos)
  await Promise.all([cargarConfiguracion(), recargar(), cargar()])
})
onBeforeUnmount(() => window.removeEventListener('keydown', atajos))
</script>

<template>
  <div class="pagina">
    <div class="titulo">
      <div>
        <h2>Historial de ventas</h2>
        <p>Consulta, reimpresión de comprobantes, devoluciones y cancelaciones.</p>
      </div>
      <button class="refrescar" aria-label="Actualizar" title="Actualizar" @click="refrescar"><i class="pi pi-refresh" /></button>
    </div>

    <section class="panel">
      <div class="filtros">
        <IconField class="buscar">
          <InputIcon class="pi pi-search" />
          <InputText
            ref="campoBusqueda"
            v-model="busqueda"
            placeholder="Escanea el ticket o busca por folio, cajero o producto…"
            fluid
            v-foco
            @keydown.enter.prevent="buscarEnter"
          />
        </IconField>
        <div class="chips">
          <span class="etq-f">Filtrar por estado:</span>
          <button class="chip" :class="{ activo: estado === null }" @click="estado = null">
            Todos los estados <span class="n">{{ ventas.length }}</span>
          </button>
          <button v-for="e in ESTADOS" :key="e" class="chip" :class="{ activo: estado === e }" @click="estado = e">
            <span class="dot" :class="e" />{{ ETIQUETA_ESTADO[e] }} <span class="n">{{ cuenta(e) }}</span>
          </button>
          <template v-if="cajasConVentas.length > 1">
            <span class="etq-f sep">Caja:</span>
            <button class="chip" :class="{ activo: caja === null }" @click="caja = null">Todas</button>
            <button v-for="c in cajasConVentas" :key="c" class="chip" :class="{ activo: caja === c }" @click="caja = c">
              <i class="pi pi-desktop" /> {{ c }}
            </button>
          </template>
          <span class="mostrando">Mostrando {{ filtradas.length }} venta(s)</span>
        </div>
      </div>

      <DataTable
        :value="filtradas"
        :loading="cargando"
        data-key="id"
        paginator
        :rows="10"
        :rows-per-page-options="[10, 25, 50]"
        row-hover
        class="tabla"
        @row-click="abrir($event.data)"
      >
        <template #empty>
          <PantallaVacia icono="pi pi-receipt" titulo="Todavía no hay ventas" texto="Las ventas que cobres en Caja aparecerán aquí." />
        </template>
        <Column header="Folio">
          <template #body="{ data }"><span class="folio mono">{{ data.folio }}</span></template>
        </Column>
        <Column header="Fecha y hora">
          <template #body="{ data }">
            <div class="f1">{{ fechaCorta(data.fecha) }}</div>
            <div class="f2 mono">{{ horaCompleta(data.fecha) }}</div>
          </template>
        </Column>
        <Column header="Caja">
          <template #body="{ data }"><span class="mono tenue"><i class="pi pi-desktop" /> {{ data.cajaNombre }}</span></template>
        </Column>
        <Column header="Cajero">
          <template #body="{ data }">
            <span class="quien"><span class="ini">{{ iniciales(data.cajeroNombre) }}</span>{{ data.cajeroNombre }}</span>
          </template>
        </Column>
        <Column header="Método de pago">
          <template #body="{ data }">
            <span class="metodo" :class="{ mixto: esMixto(data) }"><i :class="iconoMetodo(data)" /> {{ metodos(data) }}</span>
          </template>
        </Column>
        <Column header="Artículos">
          <template #body="{ data }"><span class="mono tenue">{{ articulos(data) }} art.</span></template>
        </Column>
        <Column header="Total cobrado" header-class="der" body-class="der">
          <template #body="{ data }"><b class="mono total">{{ formatear(data.totalCentavos) }}</b></template>
        </Column>
        <Column header="Estado" header-class="cen" body-class="cen">
          <template #body="{ data }">
            <span class="estado" :class="data.estado"><span class="dot" :class="data.estado" />{{ ETIQUETA_ESTADO[data.estado as EstadoVenta] }}</span>
          </template>
        </Column>
        <Column header="Acciones" header-class="cen" body-class="cen">
          <template #body="{ data }">
            <div class="acc">
              <button title="Ver ticket" aria-label="Ver ticket" @click.stop="abrir(data)"><i class="pi pi-eye" /></button>
              <button title="Reimprimir comprobante" aria-label="Reimprimir" @click.stop="reimprimir(data)"><i class="pi pi-print" /></button>
            </div>
          </template>
        </Column>
      </DataTable>
    </section>
  </div>

  <VentaDetalleDialog v-model:visible="detalleVisible" :venta="seleccionada" @actualizada="refrescar" />
</template>

<style scoped>
.mono {
  font-family: ui-monospace, 'JetBrains Mono', Consolas, monospace;
}
.pagina {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  max-width: 120rem;
}
.titulo {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}
h2 {
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--p-surface-900);
}
.titulo p {
  margin: 0.2rem 0 0;
  font-size: 0.78rem;
  color: var(--p-surface-500);
}
.refrescar {
  width: 2.4rem;
  height: 2.4rem;
  color: var(--p-surface-600);
  background: #fff;
  border: 1px solid var(--p-surface-200);
  border-radius: 0.6rem;
  box-shadow: 0 1px 2px rgb(0 0 0 / 5%);
  cursor: pointer;
}
.refrescar:hover {
  color: var(--p-primary-600);
  background: var(--p-surface-50);
}
.kpis {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1rem;
}
.kpi {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 1.25rem;
  background: #fff;
  border: 1px solid rgb(226 232 240 / 80%);
  border-radius: 0.9rem;
  box-shadow: 0 1px 2px rgb(0 0 0 / 4%);
}
.etq {
  margin: 0;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--p-surface-500);
}
.kpi h3 {
  margin: 0.25rem 0 0;
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--p-surface-800);
}
.kpi h3 small {
  font-size: 0.75rem;
  font-weight: 400;
  color: var(--p-surface-500);
}
.kpi h3.mono {
  color: var(--p-surface-900);
}
.num-verde {
  color: #059669 !important;
}
.nota {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  margin: 0.3rem 0 0;
  font-size: 0.7rem;
  color: var(--p-surface-500);
}
.nota.verde {
  font-weight: 500;
  color: var(--p-primary-600);
}
.icono {
  width: 3rem;
  height: 3rem;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  font-size: 1.3rem;
  border: 1px solid;
  border-radius: 0.8rem;
}
.verde-i {
  color: #059669;
  background: #ecfdf5;
  border-color: #d1fae5;
}
.gris-i {
  color: var(--p-surface-400);
  background: var(--p-surface-50);
  border-color: var(--p-surface-200);
}
.panel {
  overflow: hidden;
  background: #fff;
  border: 1px solid rgb(226 232 240 / 90%);
  border-radius: 1rem;
  box-shadow: 0 1px 2px rgb(0 0 0 / 4%);
}
.filtros {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid rgb(226 232 240 / 80%);
}
.buscar {
  max-width: 38rem;
}
.chips {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.4rem;
  padding-top: 0.8rem;
  border-top: 1px solid var(--p-surface-100);
}
.etq-f {
  margin-right: 0.25rem;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--p-surface-500);
}
.chip {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.3rem 0.75rem;
  font: 500 0.75rem system-ui, sans-serif;
  color: var(--p-surface-600);
  background: #fff;
  border: 1px solid var(--p-surface-200);
  border-radius: 0.5rem;
  cursor: pointer;
}
.chip:hover {
  background: var(--p-surface-50);
}
.chip.activo {
  font-weight: 600;
  color: var(--p-primary-700);
  background: var(--p-primary-50);
  border-color: var(--p-primary-200);
}
.n {
  padding: 0 0.4rem;
  font: 0.65rem ui-monospace, Consolas, monospace;
  color: var(--p-surface-500);
  background: var(--p-surface-100);
  border-radius: 999px;
}
.chip.activo .n {
  color: var(--p-primary-800);
  background: var(--p-primary-200);
}
.mostrando {
  margin-left: auto;
  font-size: 0.75rem;
  color: var(--p-surface-400);
}
.dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  background: var(--p-surface-400);
}
.dot.cobrada {
  background: #10b981;
}
.dot.cancelada {
  background: #f43f5e;
}
.dot.devolucion_parcial {
  background: #f59e0b;
}
.dot.devuelta {
  background: #94a3b8;
}
.tabla :deep(.p-datatable-table-container) {
  overflow-x: auto;
}
.tabla :deep(th) {
  padding: 0.8rem 1rem;
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--p-surface-600);
  background: rgb(248 250 252 / 70%);
}
.tabla :deep(td) {
  padding: 0.8rem 1rem;
  font-size: 0.8rem;
}
.tabla :deep(tbody tr) {
  cursor: pointer;
}
.tabla :deep(.der) {
  text-align: right;
}
.tabla :deep(.der .p-datatable-column-header-content) {
  justify-content: flex-end;
}
.tabla :deep(.cen) {
  text-align: center;
}
.tabla :deep(.cen .p-datatable-column-header-content) {
  justify-content: center;
}
.folio {
  padding: 0.15rem 0.5rem;
  font-weight: 600;
  color: var(--p-surface-700);
  background: var(--p-surface-100);
  border: 1px solid var(--p-surface-200);
  border-radius: 0.4rem;
}
.f1 {
  font-weight: 500;
  color: var(--p-surface-800);
}
.f2 {
  font-size: 0.7rem;
  color: var(--p-surface-400);
}
.quien {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 500;
  color: var(--p-surface-800);
}
.ini {
  width: 1.4rem;
  height: 1.4rem;
  display: grid;
  place-items: center;
  font-size: 0.6rem;
  font-weight: 600;
  color: var(--p-surface-700);
  background: var(--p-surface-200);
  border-radius: 50%;
}
.metodo {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.25rem 0.65rem;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--p-surface-700);
  background: var(--p-surface-100);
  border: 1px solid transparent;
  border-radius: 0.4rem;
}
.metodo i {
  color: #059669;
}
.metodo.mixto {
  color: #7e22ce;
  background: #faf5ff;
  border-color: #e9d5ff;
}
.metodo.mixto i {
  color: #9333ea;
}
.tenue {
  color: var(--p-surface-500);
}
.total {
  font-size: 0.9rem;
  color: var(--p-surface-900);
}
.estado {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.15rem 0.65rem;
  font-size: 0.72rem;
  font-weight: 500;
  border: 1px solid;
  border-radius: 999px;
}
.estado.cobrada {
  color: #047857;
  background: #ecfdf5;
  border-color: #a7f3d0;
}
.estado.cancelada {
  color: #be123c;
  background: #fff1f2;
  border-color: #fecdd3;
}
.estado.devolucion_parcial {
  color: #b45309;
  background: #fffbeb;
  border-color: #fde68a;
}
.estado.devuelta {
  color: var(--p-surface-600);
  background: var(--p-surface-100);
  border-color: var(--p-surface-300);
}
.acc {
  display: flex;
  justify-content: center;
  gap: 0.15rem;
}
.acc button {
  width: 2rem;
  height: 2rem;
  color: var(--p-surface-500);
  background: none;
  border: 0;
  border-radius: 0.5rem;
  cursor: pointer;
}
.acc button:hover {
  color: var(--p-primary-600);
  background: var(--p-surface-100);
}
@media (max-width: 900px) {
  .kpis {
    grid-template-columns: minmax(0, 1fr);
  }
}
.sep {
  margin-left: 0.75rem;
}
</style>
