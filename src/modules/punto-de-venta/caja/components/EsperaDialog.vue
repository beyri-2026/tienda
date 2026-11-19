<script setup lang="ts">
import { computed } from 'vue'
import { formatear, sumar } from '@/core/utils/dinero'
import { horaCompleta } from '@/core/utils/fechas'
import type { LineaVenta } from '../../types/venta.types'
import type { VentaEnEspera } from '../composables/useCarrito'

const props = defineProps<{ visible: boolean; ventas: VentaEnEspera[] }>()
const emit = defineEmits<{
  'update:visible': [valor: boolean]
  retomar: [id: string]
  eliminar: [id: string]
}>()

const totalCentavos = (v: VentaEnEspera) => sumar(v.lineas.map((l) => l.importeCentavos))
const totalPausado = computed(() => sumar(props.ventas.map(totalCentavos)))

/** "Leche entera 1L (x3), Jamón…" — los primeros artículos de la venta. */
function resumen(v: VentaEnEspera): string {
  const texto = (l: LineaVenta) => (l.tipo === 'producto' && l.cantidad > 1 ? `${l.nombre} (x${l.cantidad})` : l.nombre)
  const nombres = v.lineas.slice(0, 3).map(texto).join(', ')
  return v.lineas.length > 3 ? `${nombres}…` : nombres
}

function hace(iso: string): { texto: string; lento: boolean } {
  const min = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
  if (min < 1) return { texto: 'hace un momento', lento: false }
  if (min < 60) return { texto: `hace ${min} min`, lento: min >= 15 }
  const h = Math.floor(min / 60)
  return { texto: `hace ${h} h ${min % 60} min`, lento: true }
}
</script>

<template>
  <Dialog
    :visible="visible"
    modal
    :closable="false"
    class="dialogo-moderno"
    :style="{ width: '42rem', maxWidth: '96vw' }"
    @update:visible="emit('update:visible', $event)"
  >
    <template #header>
      <div class="cabecera">
        <div>
          <div class="fila-titulo">
            <h2>Ventas en espera</h2>
            <span class="chip">{{ ventas.length }} {{ ventas.length === 1 ? 'pausada' : 'pausadas' }}</span>
          </div>
          <p>Retoma una venta suspendida para seguir cobrando, o elimínala si el cliente ya no compró.</p>
        </div>
        <button class="cerrar" aria-label="Cerrar" @click="emit('update:visible', false)"><i class="pi pi-times" /></button>
      </div>
    </template>

    <div class="cuerpo">
      <div v-if="ventas.length === 0" class="vacio">
        <i class="pi pi-pause-circle" />
        <strong>No hay ventas en espera</strong>
        <span>Usa F8 en la caja para dejar una venta pausada.</span>
      </div>

      <article v-for="(v, i) in ventas" :key="v.id" class="venta">
        <div class="info">
          <div class="fila-t">
            <span class="folio mono">Espera #{{ i + 1 }}</span>
            <span class="monto">
              {{ v.lineas.length }} línea(s) <span class="punto">·</span> {{ formatear(totalCentavos(v)) }}
              <small>MXN</small>
            </span>
          </div>
          <p class="arts"><b>Artículos:</b> {{ resumen(v) }}</p>
          <p class="hora">
            <i class="pi pi-clock" /> Puesta en espera a las {{ horaCompleta(v.creadaEn) }}
            <span :class="hace(v.creadaEn).lento ? 'ambar' : 'verde'">({{ hace(v.creadaEn).texto }})</span>
          </p>
        </div>
        <div class="acciones">
          <button class="retomar" @click="emit('retomar', v.id)"><i class="pi pi-play" /> Retomar</button>
          <button class="borrar" aria-label="Eliminar esta venta" title="Eliminar esta venta" @click="emit('eliminar', v.id)">
            <i class="pi pi-trash" />
          </button>
        </div>
      </article>
    </div>

    <template #footer>
      <div class="pie">
        <div class="total">
          <span>Monto total pausado:</span>
          <b>{{ formatear(totalPausado) }} MXN</b>
          <small>({{ ventas.length }} {{ ventas.length === 1 ? 'venta' : 'ventas' }})</small>
        </div>
        <button class="cerrar-btn" @click="emit('update:visible', false)">Cerrar <kbd>ESC</kbd></button>
      </div>
    </template>
  </Dialog>
</template>

<style scoped>
.mono {
  font-family: ui-monospace, 'JetBrains Mono', Consolas, monospace;
}
.cabecera {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  width: 100%;
  padding: 1.5rem 1.75rem 1.1rem;
  border-bottom: 1px solid var(--p-surface-100);
}
.fila-titulo {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}
h2 {
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--p-surface-900);
}
.chip {
  padding: 0.15rem 0.65rem;
  font-size: 0.72rem;
  font-weight: 600;
  color: #047857;
  background: #ecfdf5;
  border: 1px solid rgb(167 243 208 / 70%);
  border-radius: 999px;
}
.cabecera p {
  margin: 0.3rem 0 0;
  font-size: 0.82rem;
  color: var(--p-surface-500);
}
.cerrar {
  width: 2.5rem;
  height: 2.5rem;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  color: var(--p-surface-500);
  background: none;
  border: 0;
  border-radius: 50%;
  cursor: pointer;
}
.cerrar:hover {
  color: var(--p-surface-800);
  background: var(--p-surface-100);
}
.cuerpo {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  max-height: 52vh;
  padding: 1rem 1.75rem;
  overflow-y: auto;
  background: rgb(248 250 252 / 50%);
}
.vacio {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.3rem;
  padding: 2rem 0;
  font-size: 0.85rem;
  color: var(--p-surface-500);
}
.vacio i {
  font-size: 2rem;
  color: var(--p-surface-300);
}
.vacio strong {
  color: var(--p-surface-700);
}
.venta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.1rem 1.25rem;
  background: #fff;
  border: 1px solid rgb(226 232 240 / 90%);
  border-radius: 1rem;
  box-shadow: 0 1px 2px rgb(0 0 0 / 5%);
  transition: all 0.15s;
}
.venta:hover {
  border-color: rgb(167 243 208 / 90%);
  box-shadow: 0 4px 6px -1px rgb(0 0 0 / 8%);
}
.info {
  flex: 1;
  min-width: 0;
}
.fila-t {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.5rem;
}
.folio {
  padding: 0.1rem 0.5rem;
  font-size: 0.72rem;
  font-weight: 500;
  color: var(--p-surface-600);
  background: var(--p-surface-100);
  border: 1px solid var(--p-surface-200);
  border-radius: 0.3rem;
}
.monto {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--p-surface-900);
}
.monto small {
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--p-surface-400);
}
.punto {
  font-weight: 400;
  color: var(--p-surface-300);
}
.arts {
  margin: 0.3rem 0 0;
  overflow: hidden;
  font-size: 0.78rem;
  color: var(--p-surface-600);
  text-overflow: ellipsis;
  white-space: nowrap;
}
.arts b {
  font-weight: 500;
  color: var(--p-surface-700);
}
.hora {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin: 0.45rem 0 0;
  font-size: 0.75rem;
  color: var(--p-surface-500);
}
.hora i {
  font-size: 0.75rem;
  color: var(--p-surface-400);
}
.verde {
  font-weight: 500;
  color: #047857;
}
.ambar {
  font-weight: 500;
  color: #d97706;
}
.acciones {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}
.retomar {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.65rem 1.1rem;
  font: 600 0.85rem system-ui, sans-serif;
  color: #fff;
  background: var(--p-primary-600);
  border: 0;
  border-radius: 0.75rem;
  box-shadow: 0 1px 2px rgb(0 0 0 / 10%);
  cursor: pointer;
}
.retomar i {
  font-size: 0.7rem;
}
.retomar:hover {
  background: var(--p-primary-500);
}
.borrar {
  width: 2.5rem;
  height: 2.5rem;
  color: var(--p-surface-400);
  background: none;
  border: 0;
  border-radius: 0.75rem;
  cursor: pointer;
}
.borrar:hover {
  color: #e11d48;
  background: #fff1f2;
}
.pie {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  width: 100%;
  padding: 1rem 1.75rem;
  background: rgb(248 250 252 / 90%);
  border-top: 1px solid rgb(226 232 240 / 80%);
}
.total {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  font-size: 0.85rem;
  color: var(--p-surface-500);
}
.total b {
  font-size: 1.05rem;
  color: var(--p-surface-900);
}
.total small {
  font-size: 0.72rem;
  color: var(--p-surface-400);
}
.cerrar-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.55rem 1rem;
  font: 600 0.85rem system-ui, sans-serif;
  color: var(--p-surface-700);
  background: #fff;
  border: 1px solid var(--p-surface-200);
  border-radius: 0.75rem;
  box-shadow: 0 1px 2px rgb(0 0 0 / 5%);
  cursor: pointer;
}
.cerrar-btn:hover {
  background: var(--p-surface-100);
}
kbd {
  padding: 0.1rem 0.4rem;
  font: 600 0.68rem ui-monospace, Consolas, monospace;
  color: var(--p-surface-500);
  background: var(--p-surface-50);
  border: 1px solid var(--p-surface-300);
  border-radius: 0.25rem;
}
</style>
