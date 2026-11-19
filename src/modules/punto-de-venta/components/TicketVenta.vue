<script setup lang="ts">
import { code128 } from '@/core/utils/code128'
import { computed } from 'vue'
import { formatear } from '@/core/utils/dinero'
import { fechaCorta, horaCompleta } from '@/core/utils/fechas'
import { formatearKg } from '@/core/utils/peso'
import type { Configuracion } from '@/modules/catalogo/types/producto.types'
import { ETIQUETA_METODO, type LineaVenta, type Venta } from '../types/venta.types'

/** Ticket de una venta dibujado en pantalla (solo presenta datos). */
const props = defineProps<{ venta: Venta; configuracion: Configuracion | null }>()

const hayCambio = computed(() => props.venta.cambioCentavos > 0)
const articulos = computed(() => props.venta.lineas.reduce((n, l) => n + (l.tipo === 'producto' ? l.cantidad : 1), 0))

function detalle(l: LineaVenta): string {
  if (l.tipo === 'peso' || l.tipo === 'etiqueta') return `${formatearKg(l.pesoGramos ?? 0)} kg`
  if (l.precioAnteriorCentavos) return `Promo · antes ${formatear(l.precioAnteriorCentavos)}`
  return `${l.cantidad} x ${formatear(l.precioUnitarioCentavos)}`
}

/** Code 128 real del folio (el mismo que se imprime en el ticket). */
const codigo = computed(() => code128(props.venta.folio))
</script>

<template>
<section class="ticket-marco">
    <article class="ticket mono">
      <header class="negocio">
        <h3>{{ configuracion?.negocioNombre }}</h3>
        <p>{{ venta.sucursalNombre }}</p>
        <p class="tenue">{{ configuracion?.direccion }}</p>
        <p class="tenue">Tel: {{ configuracion?.telefono }}</p>
      </header>
      <div class="raya" />
      <div class="meta">
        <div><span class="mini">Folio</span><b>{{ venta.folio }}</b></div>
        <div class="der"><span class="mini">Caja</span><b>{{ venta.cajaNombre }}</b></div>
        <div><span class="mini">Fecha y hora</span>{{ fechaCorta(venta.fecha) }} {{ horaCompleta(venta.fecha) }}</div>
        <div class="der"><span class="mini">Cajero</span>{{ venta.cajeroNombre }}</div>
      </div>
      <div class="raya" />
      <div class="lineas">
        <div class="encab"><span>Descripción</span><span>Importe</span></div>
        <div v-for="l in venta.lineas" :key="l.id" class="linea">
          <div>
            <p class="nombre">{{ l.nombre }}</p>
            <span class="detalle">{{ detalle(l) }}</span>
          </div>
          <b>{{ formatear(l.importeCentavos) }}</b>
        </div>
      </div>
      <div class="raya" />
      <div class="totales">
        <div><span>Artículos:</span><span>{{ articulos }}</span></div>
        <div><span>Subtotal (sin imp.):</span><span>{{ formatear(venta.subtotalCentavos) }}</span></div>
        <div><span>IVA:</span><span>{{ formatear(venta.ivaCentavos) }}</span></div>
        <div v-if="venta.redondeoCentavos !== 0">
          <span>Redondeo:</span><span>{{ formatear(venta.redondeoCentavos) }}</span>
        </div>
        <div class="total"><span>TOTAL</span><span>{{ formatear(venta.totalCentavos) }} <small>MXN</small></span></div>
      </div>
      <div class="raya" />
      <div class="pagos">
        <template v-for="(p, i) in venta.pagos" :key="i">
          <div class="metodo">
            <span>{{ ETIQUETA_METODO[p.metodo] }}:</span>
            <b>{{ formatear(p.metodo === 'efectivo' ? (p.recibidoCentavos ?? p.montoCentavos) : p.montoCentavos) }}</b>
          </div>
          <div v-if="p.tarjeta" class="sub">{{ p.tarjeta.marca }} ****{{ p.tarjeta.ultimos4 }} · Aut: {{ p.tarjeta.autorizacion }}</div>
        </template>
        <div v-if="hayCambio" class="cambio"><span>Cambio devuelto:</span><b>{{ formatear(venta.cambioCentavos) }}</b></div>
      </div>
      <footer class="pie-ticket">
        <svg class="barras" :viewBox="`0 0 ${codigo.ancho} 34`" preserveAspectRatio="none" fill="currentColor" shape-rendering="crispEdges" aria-hidden="true">
          <rect v-for="(b, i) in codigo.barras" :key="i" :x="b.x" y="0" :width="b.w" height="34" />
        </svg>
        <span class="folio-barras">{{ venta.folio }}</span>
        <p v-if="venta.ahorroCentavos > 0" class="ahorro">Ahorraste {{ formatear(venta.ahorroCentavos) }} en promos</p>
        <p class="gracias">{{ configuracion?.mensajeTicket }}</p>
      </footer>
    </article>
  </section>
</template>

<style scoped>
.mono {
  font-family: ui-monospace, 'JetBrains Mono', Consolas, monospace;
}
.rojo {
  color: #dc2626 !important;
}
.ticket-marco {
  padding: 0.9rem;
  background: rgb(248 250 252 / 70%);
  border: 1px solid var(--p-surface-200);
  border-radius: 1rem;
}
.ticket {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
  padding: 1.25rem 1.5rem;
  font-size: 0.75rem;
  color: var(--p-surface-800);
  background: #fff;
  border: 1px solid var(--p-surface-200);
  border-radius: 0.75rem;
  box-shadow: 0 1px 2px rgb(0 0 0 / 5%);
}
.negocio {
  text-align: center;
  font-family: system-ui, sans-serif;
}
.negocio h3 {
  font-size: 0.9rem;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--p-surface-900);
}
.negocio p {
  margin: 0.1rem 0 0;
  font-size: 0.7rem;
  color: var(--p-surface-600);
}
.negocio .tenue {
  color: var(--p-surface-400);
}
.raya {
  border-bottom: 1px dashed var(--p-surface-300);
}
.meta {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
  font-size: 0.7rem;
}
.meta .der {
  text-align: right;
}
.mini {
  display: block;
  font: 500 0.6rem system-ui, sans-serif;
  text-transform: uppercase;
  color: var(--p-surface-400);
}
.meta b {
  color: var(--p-surface-900);
}
.lineas {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.encab {
  display: flex;
  justify-content: space-between;
  padding-bottom: 0.25rem;
  font: 700 0.6rem system-ui, sans-serif;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--p-surface-400);
  border-bottom: 1px solid var(--p-surface-200);
}
.linea {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
}
.nombre {
  margin: 0;
  font: 500 0.78rem system-ui, sans-serif;
  color: var(--p-surface-800);
}
.detalle {
  font-size: 0.68rem;
  color: var(--p-surface-500);
}
.linea b {
  align-self: center;
  color: var(--p-surface-900);
}
.totales,
.pagos {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}
.totales > div,
.metodo,
.cambio {
  display: flex;
  justify-content: space-between;
  color: var(--p-surface-600);
}
.total {
  padding-top: 0.5rem;
  margin-top: 0.15rem;
  border-top: 1px solid var(--p-surface-200);
  font-weight: 700;
  font-size: 0.95rem;
  color: var(--p-surface-900) !important;
}
.total small {
  font: 500 0.65rem system-ui, sans-serif;
  color: var(--p-surface-500);
}
.pagos {
  padding: 0.6rem 0.7rem;
  background: var(--p-surface-50);
  border: 1px solid var(--p-surface-100);
  border-radius: 0.6rem;
}
.metodo b {
  color: var(--p-surface-800);
}
.sub {
  font-size: 0.68rem;
  color: var(--p-surface-500);
}
.cambio {
  padding-top: 0.3rem;
  border-top: 1px solid var(--p-surface-200);
  font-weight: 700;
  color: #047857;
}
.cambio b {
  color: #047857;
}
.pie-ticket {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.35rem;
  font-family: system-ui, sans-serif;
  text-align: center;
}
.barras {
  width: 11rem;
  height: 2.3rem;
  color: var(--p-surface-900);
}
.folio-barras {
  font: 0.65rem ui-monospace, Consolas, monospace;
  letter-spacing: 0.15em;
  color: var(--p-surface-500);
}
.ahorro {
  margin: 0;
  font-size: 0.72rem;
  font-weight: 600;
  color: #047857;
}
.gracias {
  margin: 0;
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--p-surface-700);
}
</style>
