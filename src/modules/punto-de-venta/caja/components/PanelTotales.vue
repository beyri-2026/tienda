<script setup lang="ts">
import { formatear } from '@/core/utils/dinero'
import type { TotalesCuenta } from '../../utils/totales'

defineProps<{
  totales: TotalesCuenta
  puedeCobrar: boolean
  hayLineas: boolean
  enEspera: number
  motivoBloqueo?: string
}>()
const emit = defineEmits<{ cobrar: []; espera: []; verEspera: []; vaciar: [] }>()
</script>

<template>
  <div class="panel">
    <div class="titulo">
      <h2>Resumen de venta</h2>
      <span class="chip">Cuenta actual</span>
    </div>

    <div class="renglones">
      <div class="fila-entre"><span>Artículos totales</span><span class="pieza">{{ totales.articulos }} {{ totales.articulos === 1 ? 'pieza' : 'piezas' }}</span></div>
      <div class="fila-entre"><span>Subtotal</span><span class="dinero mono">{{ formatear(totales.subtotalCentavos) }}</span></div>
      <div class="fila-entre">
        <span>IVA <small class="tenue">incluido</small></span>
        <span class="dinero mono">{{ formatear(totales.ivaCentavos) }}</span>
      </div>
      <div v-if="totales.ahorroCentavos > 0" class="fila-entre ahorro">
        <span>Ahorro por promociones</span><span class="dinero mono">{{ formatear(totales.ahorroCentavos) }}</span>
      </div>
    </div>

    <div class="total">
      <small>Monto total a pagar</small>
      <div class="monto"><span class="dinero">{{ formatear(totales.totalCentavos) }}</span><b>MXN</b></div>
    </div>

    <Message v-if="motivoBloqueo" severity="warn" :closable="false">{{ motivoBloqueo }}</Message>

    <button class="cobrar" :disabled="!puedeCobrar || !hayLineas" @click="emit('cobrar')">
      <span class="izq"><i class="pi pi-credit-card" /> Cobrar orden</span>
      <kbd>F4</kbd>
    </button>

    <div class="secundarios">
      <button :disabled="!hayLineas" title="Guardar la cuenta temporalmente" @click="emit('espera')">
        <i class="pi pi-pause" /> En espera <kbd>F8</kbd>
      </button>
      <button :disabled="enEspera === 0" @click="emit('verEspera')"><i class="pi pi-list" /> Pendientes ({{ enEspera }})</button>
    </div>

    <button class="vaciar" :disabled="!hayLineas" @click="emit('vaciar')"><i class="pi pi-times-circle" /> Cancelar y vaciar cuenta</button>
  </div>
</template>

<style scoped>
.panel {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding: 1.5rem;
  background: #fff;
  border: 1px solid var(--p-surface-200);
  border-radius: 1rem;
  box-shadow: 0 4px 6px -1px rgb(0 0 0 / 5%), 0 2px 4px -2px rgb(0 0 0 / 5%);
}
.titulo {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--p-surface-100);
}
h2 {
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--p-surface-700);
}
.chip {
  padding: 0.15rem 0.55rem;
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--p-surface-700);
  background: var(--p-surface-100);
  border-radius: 999px;
}
.renglones {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--p-surface-500);
}
.pieza {
  padding: 0.1rem 0.5rem;
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--p-surface-800);
  background: var(--p-surface-100);
  border-radius: 0.3rem;
}
.mono {
  font-family: ui-monospace, Consolas, monospace;
  font-size: 1rem;
  color: var(--p-surface-700);
}
.tenue {
  font-size: 0.65rem;
  color: var(--p-surface-400);
  font-weight: 400;
}
.ahorro {
  color: var(--p-primary-600);
  font-weight: 600;
}
.total {
  padding-top: 1rem;
  border-top: 1px dashed var(--p-surface-200);
}
.total small {
  display: block;
  margin-bottom: 0.25rem;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--p-surface-400);
}
.monto {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}
.monto .dinero {
  font: 800 2.35rem ui-monospace, Consolas, monospace;
  letter-spacing: -0.02em;
  color: var(--p-surface-900);
}
.monto b {
  font-size: 0.85rem;
  color: var(--p-surface-500);
}
kbd {
  font: 600 0.68rem ui-monospace, Consolas, monospace;
  padding: 0.15rem 0.45rem;
  border-radius: 0.3rem;
}
.cobrar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 1rem 1.25rem;
  font: inherit;
  font-size: 1rem;
  font-weight: 700;
  color: #fff;
  background: linear-gradient(to right, var(--p-primary-600), #0d9488);
  border: 0;
  border-radius: 0.75rem;
  box-shadow: 0 10px 15px -3px rgb(5 150 105 / 30%);
  cursor: pointer;
  transition: transform 0.1s, filter 0.15s;
}
.cobrar:hover:not(:disabled) {
  filter: brightness(1.08);
}
.cobrar:active:not(:disabled) {
  transform: scale(0.99);
}
.cobrar:disabled {
  background: var(--p-surface-300);
  box-shadow: none;
  cursor: not-allowed;
}
.cobrar .izq {
  display: flex;
  align-items: center;
  gap: 0.65rem;
}
.cobrar i {
  font-size: 1.25rem;
}
.cobrar kbd {
  background: rgb(4 120 87 / 60%);
  border: 1px solid rgb(52 211 153 / 40%);
}
.cobrar:disabled kbd {
  background: rgb(0 0 0 / 8%);
  border-color: transparent;
}
.secundarios {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.6rem;
}
.secundarios button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  padding: 0.65rem 0.5rem;
  font: inherit;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--p-surface-700);
  background: var(--p-surface-100);
  border: 1px solid var(--p-surface-200);
  border-radius: 0.75rem;
  cursor: pointer;
}
.secundarios button:hover:not(:disabled) {
  background: var(--p-surface-200);
}
.secundarios button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.secundarios kbd {
  color: var(--p-surface-500);
  background: #fff;
  border: 1px solid var(--p-surface-300);
}
.vaciar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  padding: 0.5rem;
  font: inherit;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--p-red-600);
  background: transparent;
  border: 0;
  border-radius: 0.5rem;
  cursor: pointer;
}
.vaciar:hover:not(:disabled) {
  background: var(--p-red-50);
}
.vaciar:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>
