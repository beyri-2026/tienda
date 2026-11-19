<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { formatear } from '@/core/utils/dinero'
import { fechaHora } from '@/core/utils/fechas'
import { useToast } from 'primevue/usetoast'
import { useOperador } from '@/core/auth/useOperador'
import { usePermisos } from '@/core/auth/usePermisos'
import TextoImprimibleDialog from '@/shared/components/TextoImprimibleDialog.vue'
import type { MovimientoEfectivo, ResumenTurno } from '../../types/turno.types'
import {
  construirComprobanteCierre,
  construirComprobanteCorte,
  construirComprobanteMovimiento,
  construirComprobanteParcialCajero,
} from '../../utils/ticket'
import AbrirTurnoForm from '../components/AbrirTurnoForm.vue'
import CorteDialog from '../components/CorteDialog.vue'
import ComprobanteMovimientoDialog from '../components/ComprobanteMovimientoDialog.vue'
import RetiroDialog from '../components/RetiroDialog.vue'
import { useTurno } from '../composables/useTurno'

const { turno, resumen, cargado, configuracion, efectivoEnCaja, porcentajeTope, nivelTope, verEfectivo, recargar, cortarParcial } = useTurno()
const toast = useToast()
const { operador } = useOperador()
const { puede } = usePermisos()
/** Solo dueño y gerente ven el detalle de los cortes; el cajero corta a ciegas. */
const verDetalleCorte = computed(() => puede('pos.verCorte'))
const cortando = ref(false)

const retiroVisible = ref(false)
const corteVisible = ref(false)
const comprobante = ref({ visible: false, titulo: '', texto: '' })
const movimientoVista = ref({ visible: false, mov: null as MovimientoEfectivo | null, texto: '' })

onMounted(recargar)

const colorTope = computed(() =>
  nivelTope.value === 'bloqueado' ? 'var(--p-red-500)' : nivelTope.value === 'aviso' ? 'var(--p-orange-500)' : 'var(--p-green-500)',
)

function mostrar(titulo: string, texto: string) {
  comprobante.value = { visible: true, titulo, texto }
}

/** Registra un corte parcial: el turno sigue abierto y el siguiente tramo empieza aquí. */
async function cortePreliminar() {
  if (cortando.value || !configuracion.value) return
  cortando.value = true
  try {
    const c = await cortarParcial(operador.value)
    if (verDetalleCorte.value && resumen.value) mostrar(`Corte parcial ${c.numero}`, construirComprobanteCorte(resumen.value, configuracion.value))
    else mostrar(`Corte parcial ${c.numero}`, construirComprobanteParcialCajero(c.numero, c.fecha, c.operadorNombre, configuracion.value))
    toast.add({ severity: 'success', summary: `Corte parcial ${c.numero} registrado`, life: 2500 })
  } catch (e) {
    toast.add({ severity: 'error', summary: 'No se pudo registrar el corte', detail: e instanceof Error ? e.message : '', life: 4000 })
  } finally {
    cortando.value = false
  }
}

function corteFinal(r: ResumenTurno) {
  if (!configuracion.value) return
  if (verDetalleCorte.value) mostrar('Corte de caja', construirComprobanteCorte(r, configuracion.value))
  else mostrar('Turno cerrado', construirComprobanteCierre(r, configuracion.value))
}

const iniciales = (nombre: string) =>
  nombre.split(' ').filter(Boolean).slice(0, 2).map((x) => x[0]).join('').toUpperCase()

const textoNivel = computed(() =>
  nivelTope.value === 'bloqueado' ? 'Tope alcanzado' : nivelTope.value === 'aviso' ? 'Cerca del tope' : 'Nivel seguro en cajón',
)

function comprobanteMovimiento(mov: MovimientoEfectivo) {
  if (turno.value && configuracion.value) {
    movimientoVista.value = { visible: true, mov, texto: construirComprobanteMovimiento(mov, turno.value, configuracion.value) }
  }
}
</script>

<template>
  <div v-if="!cargado" class="muted">Cargando turno…</div>

  <div v-else-if="!turno">
    <AbrirTurnoForm @abierto="recargar" />
  </div>

  <div v-else-if="resumen" class="pagina">
    <section class="barra">
      <div>
        <div class="fila-titulo">
          <h2>Turno activo</h2>
          <span class="en-curso"><span class="pulso" />Turno en curso</span>
          <span class="caja-chip">{{ turno.cajaNombre }}</span>
        </div>
        <p class="sub">
          <span>Cajero: <strong>{{ turno.cajeroNombre }}</strong></span>
          <span>·</span>
          <span>Iniciado el <strong>{{ fechaHora(turno.abiertoEn) }}</strong></span>
          <span>·</span>
          <span>Fondo inicial: <strong class="verde mono">{{ formatear(turno.fondoCentavos) }}</strong></span>
        </p>
      </div>
      <div class="acciones">
        <div class="grupo">
          <button class="btn-g" @click="retiroVisible = true"><i class="pi pi-arrow-up-right azul" /> Retiro</button>
          <button class="btn-g" :disabled="cortando" @click="cortePreliminar"><i class="pi pi-print gris" /> Corte parcial</button>
        </div>
        <button class="btn-cerrar" @click="corteVisible = true"><i class="pi pi-lock" /> Cerrar turno</button>
      </div>
    </section>

    <section class="hero">
      <div class="hero-izq">
        <span class="hero-etiqueta"><span class="punto" /> Efectivo en caja</span>
        <div v-if="verEfectivo" class="hero-monto mono">{{ formatear(efectivoEnCaja) }} <small>MXN</small></div>
        <div v-else class="hero-monto">{{ nivelTope === 'normal' ? 'Dentro del límite' : nivelTope === 'bloqueado' ? 'Tope alcanzado' : 'Cerca del tope' }}</div>
        <p>
          Fondo: <b class="mono">{{ formatear(resumen.efectivo.fondoCentavos) }}</b> · Retiros:
          <b class="mono rojo-claro">-{{ formatear(resumen.efectivo.retirosCentavos) }}</b>
        </p>
      </div>
      <div class="hero-der">
        <div class="hero-fila">
          <span>Tope de la sucursal:</span>
          <b class="mono">{{ formatear(configuracion?.topeEfectivoCentavos ?? 0) }} MXN</b>
        </div>
        <div v-if="verEfectivo" class="pista">
          <div class="relleno" :style="{ width: Math.min(porcentajeTope, 100) + '%', background: colorTope }" />
        </div>
        <div class="hero-fila pequeno">
          <span class="estado" :class="nivelTope"><i :class="nivelTope === 'normal' ? 'pi pi-check-circle' : 'pi pi-exclamation-triangle'" /> {{ textoNivel }}<template v-if="verEfectivo"> ({{ porcentajeTope }} %)</template></span>
          <span v-if="nivelTope === 'bloqueado'" class="tenue">Ventas bloqueadas hasta hacer un retiro</span>
        </div>
      </div>
    </section>

    <div class="dos">
      <div class="panel">
        <div class="panel-cab">
          <div class="fila-titulo">
            <h3>Retiros del turno</h3>
            <span class="cuenta">{{ turno.movimientos.length }} registro(s)</span>
          </div>
        </div>
        <p v-if="turno.movimientos.length === 0" class="vacio">Todavía no hay movimientos.</p>
        <div v-else class="tabla-caja">
          <table>
            <thead>
              <tr><th>Hora</th><th>Tipo</th><th>Motivo</th><th>Autorizó</th><th class="der">Monto</th><th class="cen">Ticket</th></tr>
            </thead>
            <tbody>
              <tr v-for="m in turno.movimientos" :key="m.id">
                <td><span class="mono hora">{{ fechaHora(m.fecha) }}</span></td>
                <td>
                  <span class="tipo retiro"><i class="pi pi-arrow-up-right" /> Retiro</span>
                </td>
                <td class="motivo">{{ m.motivo }}</td>
                <td>
                  <span v-if="m.autorizoNombre" class="quien"><span class="ini">{{ iniciales(m.autorizoNombre) }}</span>{{ m.autorizoNombre }}</span>
                  <span v-else class="tenue">—</span>
                </td>
                <td class="der"><b class="mono">{{ formatear(m.montoCentavos) }}</b></td>
                <td class="cen">
                  <button class="imprimir" aria-label="Comprobante" @click="comprobanteMovimiento(m)"><i class="pi pi-print" /></button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="panel-pie">
          <div>
            Total retiros: <b class="mono azul-t">{{ formatear(resumen.efectivo.retirosCentavos) }}</b>
          </div>
        </div>
      </div>

    </div>
  </div>

  <RetiroDialog v-model:visible="retiroVisible" @listo="comprobanteMovimiento" />
  <ComprobanteMovimientoDialog
    :visible="movimientoVista.visible"
    :movimiento="movimientoVista.mov"
    :turno="turno"
    :configuracion="configuracion"
    :texto="movimientoVista.texto"
    @update:visible="movimientoVista.visible = $event"
  />
  <CorteDialog v-model:visible="corteVisible" :resumen="resumen" @cerrado="corteFinal" />
  <TextoImprimibleDialog
    :visible="comprobante.visible"
    :titulo="comprobante.titulo"
    :texto="comprobante.texto"
    @update:visible="comprobante.visible = $event"
  />
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
.barra,
.kpi,
.panel {
  background: #fff;
  border: 1px solid rgb(226 232 240 / 90%);
  border-radius: 1rem;
  box-shadow: 0 1px 2px rgb(0 0 0 / 4%);
}
.barra {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.1rem 1.35rem;
}
.fila-titulo {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.6rem;
}
.barra h2 {
  font-size: 1.5rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--p-surface-900);
}
.en-curso {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.15rem 0.65rem;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  color: #065f46;
  background: #d1fae5;
  border: 1px solid #6ee7b7;
  border-radius: 999px;
}
.pulso {
  width: 0.5rem;
  height: 0.5rem;
  background: var(--p-primary-500);
  border-radius: 50%;
  animation: latido 2s ease-in-out infinite;
}
@keyframes latido {
  50% {
    opacity: 0.5;
    transform: scale(1.15);
  }
}
.caja-chip {
  padding: 0.15rem 0.5rem;
  font: 500 0.75rem ui-monospace, Consolas, monospace;
  color: var(--p-surface-600);
  background: var(--p-surface-100);
  border-radius: 0.35rem;
}
.sub {
  display: flex;
  flex-wrap: wrap;
  gap: 0.2rem 0.5rem;
  margin: 0.3rem 0 0;
  font-size: 0.85rem;
  color: var(--p-surface-500);
}
.sub strong {
  font-weight: 500;
  color: var(--p-surface-700);
}
.verde {
  color: #047857 !important;
  font-weight: 600 !important;
}
.acciones {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
}
.grupo {
  display: inline-flex;
  gap: 0.25rem;
  padding: 0.25rem;
  background: var(--p-surface-100);
  border: 1px solid rgb(226 232 240 / 80%);
  border-radius: 0.75rem;
}
.btn-g {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.4rem 0.8rem;
  font: 600 0.78rem system-ui, sans-serif;
  color: var(--p-surface-700);
  background: #fff;
  border: 1px solid rgb(226 232 240 / 90%);
  border-radius: 0.5rem;
  cursor: pointer;
}
.btn-g:hover {
  background: var(--p-surface-50);
}
.btn-g i {
  font-size: 0.8rem;
}
.azul {
  color: #2563eb;
}
.ambar {
  color: #d97706;
}
.gris {
  color: var(--p-surface-500);
}
.btn-cerrar {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.55rem 1rem;
  font: 700 0.8rem system-ui, sans-serif;
  color: #fff;
  background: var(--p-primary-600);
  border: 0;
  border-radius: 0.75rem;
  box-shadow: 0 4px 6px -1px rgb(5 150 105 / 30%);
  cursor: pointer;
}
.btn-cerrar:hover {
  background: var(--p-primary-700);
}

.hero {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  align-items: center;
  gap: 1.5rem;
  padding: 1.5rem;
  color: #fff;
  background: linear-gradient(to right, #064e3b, #134e4a, #0f172a);
  border-radius: 1rem;
  box-shadow: 0 10px 15px -3px rgb(0 0 0 / 15%);
}
.hero-etiqueta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #a7f3d0;
}
.punto {
  width: 0.6rem;
  height: 0.6rem;
  background: #34d399;
  border-radius: 50%;
}
.hero-monto {
  margin-top: 0.4rem;
  font-size: 2.8rem;
  font-weight: 800;
  letter-spacing: -0.02em;
}
.hero-monto small {
  font: 600 0.9rem system-ui, sans-serif;
  color: #6ee7b7;
}
.hero-izq p {
  margin: 0.4rem 0 0;
  font-size: 0.78rem;
  color: #cbd5e1;
}
.hero-izq b {
  font-weight: 500;
  color: #fff;
}
.hero-izq b.verde-claro {
  color: #6ee7b7;
}
.hero-izq b.rojo-claro {
  color: #fca5a5;
}
.hero-der {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  padding: 1rem 1.1rem;
  background: rgb(255 255 255 / 5%);
  border: 1px solid rgb(255 255 255 / 10%);
  border-radius: 0.75rem;
}
.hero-fila {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  font-size: 0.78rem;
  color: #cbd5e1;
}
.hero-fila b {
  color: #fff;
}
.hero-fila.pequeno {
  font-size: 0.72rem;
}
.pista {
  height: 0.9rem;
  padding: 0.12rem;
  background: rgb(30 41 59 / 80%);
  border: 1px solid rgb(255 255 255 / 10%);
  border-radius: 999px;
}
.relleno {
  height: 100%;
  min-width: 0.4rem;
  border-radius: 999px;
  transition: width 0.5s;
}
.estado {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-weight: 600;
}
.estado.normal {
  color: #6ee7b7;
}
.estado.aviso {
  color: #fdba74;
}
.estado.bloqueado {
  color: #fca5a5;
}
.tenue {
  color: var(--p-surface-400);
}
.hero .tenue {
  color: #94a3b8;
}

.kpis {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 1rem;
}
.kpi {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 0.9rem;
  padding: 1.1rem 1.25rem;
}
.kpi.destacado {
  border-color: rgb(110 231 183 / 80%);
  box-shadow: 0 0 0 1px rgb(16 185 129 / 10%);
}
.kpi-arriba {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}
.kpi-etq {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--p-surface-500);
}
.kpi-etq.verde-t {
  color: #047857;
}
.kpi-valor {
  margin-top: 0.4rem;
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--p-surface-900);
}
.kpi-valor.apagado {
  color: var(--p-surface-400);
}
.kpi-icono {
  width: 2.5rem;
  height: 2.5rem;
  display: grid;
  place-items: center;
  font-size: 1.1rem;
  border: 1px solid;
  border-radius: 0.75rem;
}
.verde-i {
  color: #059669;
  background: #ecfdf5;
  border-color: #d1fae5;
}
.azul-i {
  color: #2563eb;
  background: #eff6ff;
  border-color: #dbeafe;
}
.indigo-i {
  color: #4f46e5;
  background: #eef2ff;
  border-color: #e0e7ff;
}
.kpi-pie {
  gap: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 0.7rem;
  font-size: 0.78rem;
  color: var(--p-surface-600);
  border-top: 1px solid var(--p-surface-100);
}
.kpi-pie b {
  color: var(--p-surface-800);
}

.dos {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 1.25rem;
  align-items: start;
}
.panel {
  overflow: hidden;
}
.panel-cab {
  padding: 1.1rem 1.25rem;
  border-bottom: 1px solid var(--p-surface-100);
}
.panel h3 {
  font-size: 1rem;
  font-weight: 700;
  color: var(--p-surface-900);
}
.cuenta {
  padding: 0.1rem 0.5rem;
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--p-surface-600);
  background: var(--p-surface-100);
  border-radius: 999px;
}
.sub-chico {
  margin: 0.15rem 0 0;
  font-size: 0.75rem;
  color: var(--p-surface-500);
}
.vacio {
  margin: 0;
  padding: 1.5rem 1.25rem;
  font-size: 0.85rem;
  color: var(--p-surface-500);
}
.tabla-caja {
  overflow-x: auto;
}
table {
  width: 100%;
  font-size: 0.8rem;
  text-align: left;
  border-collapse: collapse;
}
thead {
  background: var(--p-surface-50);
  border-bottom: 1px solid rgb(226 232 240 / 80%);
}
th {
  padding: 0.85rem 1rem;
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--p-surface-600);
}
td {
  padding: 0.85rem 1rem;
  font-weight: 500;
  color: var(--p-surface-700);
  border-bottom: 1px solid var(--p-surface-100);
}
tbody tr:hover {
  background: rgb(248 250 252 / 80%);
}
.der {
  text-align: right;
}
.cen {
  text-align: center;
}
.hora {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--p-surface-900);
}
.motivo {
  color: var(--p-surface-800);
}
.tipo {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.2rem 0.6rem;
  font-size: 0.7rem;
  font-weight: 700;
  border: 1px solid;
  border-radius: 0.4rem;
}
.tipo i {
  font-size: 0.65rem;
}
.tipo.retiro {
  color: #1d4ed8;
  background: #eff6ff;
  border-color: #bfdbfe;
}
.quien {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-weight: 600;
  color: var(--p-surface-800);
}
.ini {
  width: 1.4rem;
  height: 1.4rem;
  display: grid;
  place-items: center;
  font-size: 0.6rem;
  font-weight: 700;
  color: var(--p-surface-700);
  background: var(--p-surface-200);
  border-radius: 50%;
}
.azul-t {
  color: #1d4ed8;
}
.ambar-t {
  color: #b45309;
}
.rojo-t {
  color: #dc2626;
}
.imprimir {
  width: 2rem;
  height: 2rem;
  color: #059669;
  background: none;
  border: 0;
  border-radius: 0.5rem;
  cursor: pointer;
}
.imprimir:hover {
  background: var(--p-primary-50);
}
.panel-pie {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.9rem 1.25rem;
  font-size: 0.78rem;
  color: var(--p-surface-500);
  background: rgb(248 250 252 / 90%);
  border-top: 1px solid var(--p-surface-200);
}
.panel-pie b {
  margin-left: 0.2rem;
  font-weight: 700;
}
.sep {
  margin: 0 0.6rem;
  color: var(--p-surface-300);
}
.acum {
  padding: 0.35rem 0.75rem;
  font-weight: 600;
  color: var(--p-surface-600);
  background: #fff;
  border: 1px solid var(--p-surface-200);
  border-radius: 0.5rem;
}
.acum b {
  color: var(--p-surface-900);
}
.formula {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding: 1rem 1.25rem 1.25rem;
  font-size: 0.82rem;
}
.formula > div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.3rem 0;
  color: var(--p-surface-600);
}
.formula b {
  font-weight: 600;
  color: var(--p-surface-800);
}
.mas,
.menos {
  display: inline-block;
  width: 1.3rem;
  font-size: 0.95rem;
}
.mas {
  color: #059669 !important;
}
.menos {
  color: #ef4444 !important;
}
.formula .esperado {
  margin-top: 0.5rem;
  padding: 0.8rem 0.9rem;
  background: rgb(248 250 252 / 80%);
  border: 1px solid rgb(226 232 240 / 60%);
  border-radius: 0.75rem;
}
.esperado span {
  font-weight: 700;
  color: var(--p-surface-900);
}
.esperado b {
  font-size: 1.3rem;
  font-weight: 800;
  color: #047857;
}

@media (max-width: 1100px) {
  .hero,
  .dos {
    grid-template-columns: minmax(0, 1fr);
  }
  .kpis {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
