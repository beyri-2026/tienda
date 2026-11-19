<script setup lang="ts">
import { formatear } from '@/core/utils/dinero'
import { formatearKg } from '@/core/utils/peso'
import PantallaVacia from '@/shared/components/PantallaVacia.vue'
import type { LineaVenta } from '../../types/venta.types'

defineProps<{ lineas: LineaVenta[] }>()
const emit = defineEmits<{ mas: [id: string]; menos: [id: string]; fijar: [id: string, cantidad: number]; quitar: [id: string]; listo: [] }>()

const ICONO: Record<string, { icono: string; clase: string }> = {
  producto: { icono: 'pi pi-box', clase: 'azul' },
  peso: { icono: 'pi pi-gauge', clase: 'rosa' },
  etiqueta: { icono: 'pi pi-tag', clase: 'rosa' },
  promo: { icono: 'pi pi-percentage', clase: 'rojo' },
  paquete: { icono: 'pi pi-gift', clase: 'ambar' },
}
function confirmarCant(id: string, e: Event, volver = true) {
  const el = e.target as HTMLInputElement
  const n = parseInt(el.value, 10)
  if (Number.isFinite(n) && n >= 1) emit('fijar', id, n)
  else el.value = el.defaultValue
  if (volver) emit('listo')
}
function cancelarCant(actual: number, e: Event) {
  ;(e.target as HTMLInputElement).value = String(actual)
  emit('listo')
}
const icono = (tipo: string) => ICONO[tipo] ?? ICONO.producto
</script>

<template>
  <div class="lista">
    <div class="cabecera">
      <div class="c5">Producto / Descripción</div>
      <div class="c3 centro">Cantidad</div>
      <div class="c2 der">Precio unit.</div>
      <div class="c2 der">Importe</div>
    </div>

    <div class="cuerpo">
      <PantallaVacia
        v-if="lineas.length === 0"
        icono="pi pi-shopping-cart"
        titulo="La cuenta está vacía"
        texto="Escanea un producto o búscalo por nombre."
      />
      <div v-for="l in lineas" :key="l.id" class="renglon" :class="{ pesable: !!l.pesoGramos }">
        <div class="c5 producto">
          <div class="icono" :class="icono(l.tipo).clase"><i :class="icono(l.tipo).icono" /></div>
          <div class="texto">
            <div class="nombre">
              <strong>{{ l.nombre }}</strong>
              <Tag v-if="l.tipo === 'promo'" value="PROMO" severity="danger" />
              <Tag v-else-if="l.tipo === 'paquete'" value="PAQUETE" severity="warn" />
              <Tag v-else-if="l.tipo === 'etiqueta'" value="MOSTRADOR" severity="info" />
              <Tag v-else-if="l.tipo === 'peso'" :value="`Báscula ${formatearKg(l.pesoGramos ?? 0)} kg`" severity="warn" />
            </div>
            <small class="detalle">
              <template v-if="l.codigoFolio">folio {{ l.codigoFolio }}</template>
              <template v-if="l.codigoFolio && l.precioAnteriorCentavos"> · </template>
              <template v-if="l.precioAnteriorCentavos">antes {{ formatear(l.precioAnteriorCentavos) }}</template>
            </small>
          </div>
        </div>

        <div class="c3 centro">
          <div v-if="l.tipo === 'producto'" class="stepper">
            <button :disabled="l.cantidad <= 1" aria-label="Menos" @click="emit('menos', l.id)">−</button>
            <input
              class="cant-input"
              type="text"
              inputmode="numeric"
              maxlength="3"
              aria-label="Cantidad"
              :value="l.cantidad"
              @focus="($event.target as HTMLInputElement).select()"
              @input="($event.target as HTMLInputElement).value = ($event.target as HTMLInputElement).value.replace(/\D/g, '')"
              @keydown.enter.prevent.stop="confirmarCant(l.id, $event)"
              @keydown.esc.prevent.stop="cancelarCant(l.cantidad, $event)"
              @blur="confirmarCant(l.id, $event, false)"
            />
            <button aria-label="Más" @click="emit('mas', l.id)">+</button>
          </div>
          <span v-else-if="l.pesoGramos" class="peso">{{ formatearKg(l.pesoGramos) }} kg</span>
          <span v-else class="peso">1</span>
        </div>

        <div class="c2 der dinero precio">{{ formatear(l.precioUnitarioCentavos) }}</div>
        <div class="c2 der importe">
          <strong class="dinero">{{ formatear(l.importeCentavos) }}</strong>
          <button class="quitar" aria-label="Quitar" title="Quitar" @click="emit('quitar', l.id)"><i class="pi pi-trash" /></button>
        </div>
      </div>
    </div>

    <div class="pie">
      Partidas registradas: <strong>{{ lineas.length }} {{ lineas.length === 1 ? 'línea' : 'líneas' }}</strong>
    </div>
  </div>
</template>

<style scoped>
.lista {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: #fff;
  border: 1px solid var(--p-surface-200);
  border-radius: 1rem;
  overflow: hidden;
  box-shadow: 0 4px 6px -1px rgb(0 0 0 / 5%), 0 2px 4px -2px rgb(0 0 0 / 5%);
}
.cabecera,
.renglon {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: 1rem;
  align-items: center;
}
.cabecera {
  padding: 0.85rem 1.5rem;
  background: var(--p-surface-50);
  border-bottom: 1px solid var(--p-surface-200);
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--p-surface-500);
}
.c5 { grid-column: span 5; }
.c3 { grid-column: span 3; }
.c2 { grid-column: span 2; }
.centro { text-align: center; display: flex; justify-content: center; }
.der { text-align: right; }
.cuerpo {
  flex: 1;
  overflow-y: auto;
  padding: 0 0.75rem;
}
.renglon {
  padding: 0.85rem 0.75rem;
  border-bottom: 1px solid var(--p-surface-100);
  border-radius: 0.75rem;
}
.renglon:hover {
  background: var(--p-surface-50);
}
.renglon.pesable {
  background: rgb(248 250 252 / 60%);
}
.producto {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-width: 0;
}
.icono {
  width: 2.5rem;
  height: 2.5rem;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border-radius: 0.6rem;
  border: 1px solid;
}
.icono.azul { background: #eff6ff; border-color: #dbeafe; color: #2563eb; }
.icono.rosa { background: #fff1f2; border-color: #ffe4e6; color: #e11d48; }
.icono.rojo { background: #fef2f2; border-color: #fee2e2; color: #dc2626; }
.icono.ambar { background: #fffbeb; border-color: #fef3c7; color: #d97706; }
.texto {
  min-width: 0;
}
.nombre {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.4rem;
  font-size: 0.9rem;
  color: var(--p-surface-800);
}
.detalle {
  font: 0.7rem ui-monospace, Consolas, monospace;
  color: var(--p-surface-400);
}
.stepper {
  display: inline-flex;
  align-items: center;
  overflow: hidden;
  background: #fff;
  border: 1px solid var(--p-surface-200);
  border-radius: 0.5rem;
}
.stepper button {
  width: 2rem;
  height: 2rem;
  border: 0;
  background: transparent;
  color: var(--p-surface-500);
  font-size: 1rem;
  cursor: pointer;
}
.stepper button:hover:not(:disabled) {
  background: var(--p-surface-100);
  color: var(--p-surface-800);
}
.stepper button:disabled {
  opacity: 0.35;
  cursor: default;
}
.cant-input {
  width: 2.75rem;
  height: 2rem;
  padding: 0;
  text-align: center;
  font: inherit;
  font-weight: 700;
  color: var(--p-surface-800);
  background: transparent;
  border: 0;
  border-inline: 1px solid var(--p-surface-100);
  outline: none;
}
.cant-input:focus {
  background: var(--p-primary-50, #ecfdf5);
  box-shadow: inset 0 0 0 2px var(--p-primary-color);
}
.peso {
  padding: 0.35rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--p-surface-700);
  background: var(--p-surface-100);
  border: 1px solid var(--p-surface-200);
  border-radius: 0.5rem;
}
.precio {
  font-size: 0.75rem;
  color: var(--p-surface-500);
}
.importe {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.6rem;
}
.importe strong {
  font-size: 0.9rem;
  color: var(--p-surface-900);
}
.quitar {
  border: 0;
  background: transparent;
  padding: 0.25rem;
  border-radius: 0.4rem;
  color: var(--p-surface-400);
  opacity: 0.4;
  cursor: pointer;
  transition: all 0.15s;
}
.renglon:hover .quitar {
  opacity: 1;
}
.quitar:hover {
  color: var(--p-red-600);
}
.pie {
  padding: 0.75rem 1.5rem;
  background: var(--p-surface-50);
  border-top: 1px solid var(--p-surface-200);
  font-size: 0.75rem;
  color: var(--p-surface-500);
}
.pie strong {
  color: var(--p-surface-800);
}
</style>
