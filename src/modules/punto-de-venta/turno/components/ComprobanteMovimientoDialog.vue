<script setup lang="ts">
import { onBeforeUnmount, watch } from 'vue'
import { formatear } from '@/core/utils/dinero'
import { fechaCorta, horaCompleta } from '@/core/utils/fechas'
import { imprimirTexto } from '@/core/utils/imprimir'
import type { Configuracion } from '@/modules/catalogo/types/producto.types'
import type { MovimientoEfectivo } from '../../types/turno.types'

/** Comprobante de retiro de caja: solo presenta; imprime el texto ya generado. */
const props = defineProps<{
  visible: boolean
  movimiento: MovimientoEfectivo | null
  turno: { cajaNombre: string; cajeroNombre: string } | null
  configuracion: Configuracion | null
  texto: string
}>()
const emit = defineEmits<{ 'update:visible': [valor: boolean] }>()

const cerrar = () => emit('update:visible', false)

// Enter = Listo / Cerrar (se intercepta antes de que active el botón enfocado).
function teclas(e: KeyboardEvent) {
  if (e.key !== 'Enter') return
  e.preventDefault()
  e.stopPropagation()
  cerrar()
}
watch(
  () => props.visible,
  (v) => {
    if (v) window.addEventListener('keydown', teclas, true)
    else window.removeEventListener('keydown', teclas, true)
  },
  { immediate: true },
)
onBeforeUnmount(() => window.removeEventListener('keydown', teclas, true))
</script>

<template>
  <Dialog
    :visible="visible"
    modal
    :closable="false"
    class="dialogo-moderno"
    :style="{ width: '32rem', maxWidth: '96vw' }"
    @update:visible="emit('update:visible', $event)"
  >
    <template #header>
      <div class="cabecera">
        <div class="titulo">
          <div class="icono"><i class="pi pi-arrow-up-right" /></div>
          <div>
            <div class="fila-titulo">
              <h2>Comprobante de retiro</h2>
              <span class="chip">Completado</span>
            </div>
            <p v-if="turno">{{ turno.cajaNombre }} · Cajero: {{ turno.cajeroNombre }}</p>
          </div>
        </div>
        <button class="cerrar" aria-label="Cerrar" @click="cerrar"><span>ESC</span><i class="pi pi-times" /></button>
      </div>
    </template>

    <div v-if="movimiento" class="cuerpo">
      <section class="banner">
        <div>
          <span class="etiqueta"><span class="pulso" />Monto retirado de caja</span>
          <div class="monto">{{ formatear(movimiento.montoCentavos) }} <small>MXN</small></div>
        </div>
        <div class="lado">
          <span class="motivo"><i class="pi pi-tag" /> {{ movimiento.motivo }}</span>
          <p>{{ fechaCorta(movimiento.fecha) }} · {{ horaCompleta(movimiento.fecha) }}</p>
        </div>
      </section>

      <section class="papel">
        <div class="negocio">
          <h3>{{ configuracion?.negocioNombre }}</h3>
          <p>{{ configuracion?.sucursalNombre }}</p>
          <p class="tenue">{{ configuracion?.direccion }}</p>
          <p class="tenue">Tel: {{ configuracion?.telefono }}</p>
        </div>
        <div class="titulo-vale mono">*** RETIRO DE EFECTIVO ***</div>
        <div class="datos mono">
          <div><span>FECHA Y HORA:</span><b>{{ fechaCorta(movimiento.fecha) }} {{ horaCompleta(movimiento.fecha) }}</b></div>
          <div v-if="turno"><span>CAJA:</span><b>{{ turno.cajaNombre }}</b></div>
          <div v-if="turno"><span>CAJERO:</span><b>{{ turno.cajeroNombre }}</b></div>
        </div>
        <div class="raya" />
        <div>
          <span class="mini mono">Motivo:</span>
          <p class="concepto">{{ movimiento.motivo }}</p>
        </div>
        <div class="total">
          <span class="mono">TOTAL RETIRADO</span>
          <b class="mono">{{ formatear(movimiento.montoCentavos) }} <small>MXN</small></b>
        </div>
        <div class="firmas dos">
          <div class="firma">
            <span class="rol">Entregó</span>
            <div class="linea-firma" />
            <p class="mono">{{ turno?.cajeroNombre }}</p>
          </div>
          <div class="firma">
            <span class="rol">Recibió</span>
            <div class="linea-firma" />
            <p class="mono">{{ movimiento.autorizoNombre ?? '' }}</p>
          </div>
        </div>
      </section>
    </div>

    <template #footer>
      <div class="pie">
        <button class="secundario" @click="imprimirTexto(texto)"><i class="pi pi-print" /> Reimprimir</button>
        <button class="principal" @click="cerrar">
          <i class="pi pi-check" />
          <span>Listo / Cerrar</span>
          <kbd>Enter ↵</kbd>
        </button>
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
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  width: 100%;
  padding: 1.25rem 1.5rem 1rem;
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
  border: 1px solid #fef3c7;
  border-radius: 1rem;
  box-shadow: 0 1px 2px rgb(0 0 0 / 5%);
}
.fila-titulo {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
h2 {
  font-size: 1.2rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--p-surface-900);
}
.chip {
  padding: 0.15rem 0.5rem;
  font-size: 0.6rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: #065f46;
  background: #d1fae5;
  border-radius: 999px;
}
.titulo p {
  margin: 0.2rem 0 0;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--p-surface-500);
}
.cerrar {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.4rem 0.5rem;
  color: var(--p-surface-400);
  background: none;
  border: 0;
  border-radius: 0.75rem;
  cursor: pointer;
}
.cerrar span {
  padding: 0 0.25rem;
  font: 600 0.6rem ui-monospace, Consolas, monospace;
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
  gap: 1.1rem;
  max-height: 66vh;
  padding: 1.25rem 1.5rem;
  overflow-y: auto;
  background: rgb(248 250 252 / 60%);
}
.banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 1.25rem;
  background: rgb(236 253 245 / 80%);
  border: 1px solid rgb(167 243 208 / 90%);
  border-radius: 1rem;
  box-shadow: 0 1px 2px rgb(0 0 0 / 4%);
}
.etiqueta {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin-bottom: 0.25rem;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #065f46;
}
.pulso {
  width: 0.5rem;
  height: 0.5rem;
  background: var(--p-primary-500);
  border-radius: 50%;
  animation: latido 1.6s ease-in-out infinite;
}
@keyframes latido {
  50% {
    opacity: 0.35;
  }
}
.monto {
  font-size: 2rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--p-surface-900);
}
.monto small {
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  color: var(--p-surface-500);
}
.lado {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  text-align: right;
}
.motivo {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.25rem 0.6rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: #064e3b;
  background: rgb(255 255 255 / 80%);
  border: 1px solid #a7f3d0;
  border-radius: 0.5rem;
}
.motivo i {
  font-size: 0.7rem;
  color: var(--p-primary-600);
}
.lado p {
  margin: 0.3rem 0 0;
  font-size: 0.68rem;
  font-weight: 500;
  color: var(--p-surface-500);
}
.papel {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
  padding: 1.5rem 1.75rem;
  font-size: 0.75rem;
  background: #fff;
  border: 1px solid var(--p-surface-200);
  border-radius: 1rem;
  box-shadow: 0 1px 2px rgb(0 0 0 / 5%);
}
.negocio {
  text-align: center;
}
.negocio h3 {
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--p-surface-900);
}
.negocio p {
  margin: 0.1rem 0 0;
  font-size: 0.7rem;
  color: var(--p-surface-500);
}
.negocio .tenue {
  color: var(--p-surface-400);
}
.titulo-vale {
  padding: 0.4rem 0;
  font-size: 0.75rem;
  font-weight: 700;
  text-align: center;
  color: var(--p-surface-800);
  border-block: 1px dashed var(--p-surface-300);
}
.datos {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  color: var(--p-surface-600);
}
.datos > div {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
}
.datos span {
  color: var(--p-surface-400);
}
.datos b {
  font-weight: 500;
  color: var(--p-surface-800);
}
.raya {
  border-bottom: 1px dashed var(--p-surface-300);
}
.mini {
  font-size: 0.68rem;
  text-transform: uppercase;
  color: var(--p-surface-400);
}
.concepto {
  margin: 0.3rem 0 0;
  padding: 0.65rem 0.8rem;
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--p-surface-800);
  background: var(--p-surface-50);
  border: 1px solid rgb(226 232 240 / 70%);
  border-radius: 0.6rem;
}
.total {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 0.9rem;
  background: rgb(241 245 249 / 70%);
  border-radius: 0.75rem;
}
.total span {
  font-size: 0.7rem;
  font-weight: 500;
  text-transform: uppercase;
  color: var(--p-surface-500);
}
.total b {
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--p-surface-900);
}
.total small {
  font-size: 0.7rem;
  font-weight: 400;
  color: var(--p-surface-500);
}
.firmas {
  padding-top: 0.75rem;
  text-align: center;
  border-top: 1px dashed var(--p-surface-300);
}
.autorizo {
  margin-bottom: 1.25rem;
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--p-surface-400);
}
.autorizo strong {
  color: var(--p-surface-600);
}
.linea-firma {
  width: 60%;
  height: 2rem;
  margin: 0 auto;
  border-bottom: 1px solid var(--p-surface-300);
}
.firmas p {
  margin: 0.3rem 0 0;
  font-size: 0.68rem;
  font-weight: 500;
  color: var(--p-surface-500);
}
.pie {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  width: 100%;
  padding: 1rem 1.5rem;
  background: #fff;
  border-top: 1px solid var(--p-surface-100);
}
.secundario {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.65rem 0.9rem;
  font: 600 0.75rem system-ui, sans-serif;
  color: var(--p-surface-700);
  background: #fff;
  border: 1px solid var(--p-surface-200);
  border-radius: 0.75rem;
  box-shadow: 0 1px 2px rgb(0 0 0 / 5%);
  cursor: pointer;
}
.secundario i {
  color: var(--p-surface-500);
}
.secundario:hover {
  background: var(--p-surface-50);
}
.principal {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.65rem 1.5rem;
  font: 600 0.75rem system-ui, sans-serif;
  color: #fff;
  background: var(--p-primary-600);
  border: 0;
  border-radius: 0.75rem;
  box-shadow: 0 4px 6px -1px rgb(5 150 105 / 20%);
  cursor: pointer;
}
.principal:hover {
  background: var(--p-primary-700);
}
.principal kbd {
  padding: 0.1rem 0.4rem;
  font: 500 0.62rem ui-monospace, Consolas, monospace;
  color: var(--p-primary-100);
  background: rgb(4 120 87 / 60%);
  border-radius: 0.25rem;
}
.firmas.dos {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.25rem;
}
.firma {
  text-align: center;
}
.firma .rol {
  font: 600 0.68rem system-ui, sans-serif;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--p-surface-600);
}
.firmas.dos .linea-firma {
  width: 100%;
}
</style>
