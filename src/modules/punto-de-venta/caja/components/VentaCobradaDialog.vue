<script setup lang="ts">
import { computed, onBeforeUnmount, watch } from 'vue'
import { formatear, sumar } from '@/core/utils/dinero'
import { imprimirVenta } from '../../utils/imprimirTicket'
import type { Configuracion } from '@/modules/catalogo/types/producto.types'
import { ETIQUETA_METODO, type Venta } from '../../types/venta.types'
import TicketVenta from '../../components/TicketVenta.vue'

/** Venta recién cobrada: banner de cambio + ticket en pantalla. Solo presenta; imprime el texto ya generado. */
const props = defineProps<{ visible: boolean; venta: Venta | null; configuracion: Configuracion | null; texto: string }>()
const emit = defineEmits<{ 'update:visible': [valor: boolean] }>()

const cerrar = () => emit('update:visible', false)

const hayCambio = computed(() => (props.venta?.cambioCentavos ?? 0) > 0)
const recibido = computed(() =>
  sumar((props.venta?.pagos ?? []).filter((p) => p.metodo === 'efectivo').map((p) => p.recibidoCentavos ?? p.montoCentavos)),
)
const metodos = computed(() => [...new Set((props.venta?.pagos ?? []).map((p) => ETIQUETA_METODO[p.metodo]))].join(' + '))

// Enter = nueva venta (se intercepta antes de que active el botón enfocado).
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
    :style="{ width: '35rem', maxWidth: '96vw' }"
    @update:visible="emit('update:visible', $event)"
  >
    <template #header>
      <div class="cabecera">
        <div class="titulo">
          <div class="icono"><i class="pi pi-check" /></div>
          <div>
            <div class="fila-titulo">
              <h2>Venta cobrada con éxito</h2>
              <span class="chip">Completado</span>
            </div>
            <p v-if="venta">
              Folio: <strong class="mono">{{ venta.folio }}</strong> · {{ venta.cajaNombre }} · Cajero: {{ venta.cajeroNombre }}
            </p>
          </div>
        </div>
        <button class="cerrar" aria-label="Cerrar" @click="cerrar"><span>ESC</span><i class="pi pi-times" /></button>
      </div>
    </template>

    <div v-if="venta" class="cuerpo">
      <section class="banner">
        <div>
          <span class="etiqueta"><span class="pulso" />{{ hayCambio ? 'Cambio a entregar' : 'Total cobrado' }}</span>
          <div class="monto mono">{{ formatear(hayCambio ? venta.cambioCentavos : venta.totalCentavos) }} <small>MXN</small></div>
        </div>
        <div class="desglose">
          <template v-if="hayCambio">
            <div><span>Efectivo recibido:</span> <strong class="mono">{{ formatear(recibido) }}</strong></div>
            <div><span>Monto cobrado:</span> <strong class="mono">{{ formatear(venta.totalCentavos) }}</strong></div>
          </template>
          <div v-else><span>Pagado con:</span> <strong>{{ metodos }}</strong></div>
        </div>
      </section>

      <TicketVenta :venta="venta" :configuracion="configuracion" />
    </div>

    <template #footer>
      <div class="pie">
        <button class="secundario" @click="venta && configuracion && imprimirVenta(venta, configuracion)"><i class="pi pi-print" /> Reimprimir</button>
        <button class="principal" @click="cerrar">
          <i class="pi pi-check" />
          <span>Nueva venta</span>
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
  width: 2.5rem;
  height: 2.5rem;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  color: var(--p-primary-600);
  background: var(--p-primary-50);
  border: 1px solid var(--p-primary-100);
  border-radius: 1rem;
}
.fila-titulo {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
h2 {
  font-size: 1.1rem;
  font-weight: 700;
  line-height: 1;
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
  margin: 0.35rem 0 0;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--p-surface-500);
}
.titulo p strong {
  color: var(--p-surface-700);
}
.cerrar {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.4rem 0.6rem;
  color: var(--p-surface-400);
  background: none;
  border: 1px solid transparent;
  border-radius: 0.75rem;
  cursor: pointer;
}
.cerrar span {
  font: 600 0.62rem ui-monospace, Consolas, monospace;
}
.cerrar:hover {
  color: var(--p-surface-700);
  background: var(--p-surface-100);
  border-color: var(--p-surface-200);
}
.cuerpo {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-height: 68vh;
  padding: 1.25rem 1.5rem;
  overflow-y: auto;
}
.banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 1.25rem;
  background: linear-gradient(135deg, rgb(16 185 129 / 10%), rgb(16 185 129 / 4%), rgb(20 184 166 / 10%));
  border: 1px solid rgb(16 185 129 / 20%);
  border-radius: 1rem;
}
.etiqueta {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.7rem;
  font-weight: 600;
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
  margin-top: 0.25rem;
  font-size: 2.3rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: #022c22;
}
.monto small {
  font: 700 0.7rem system-ui, sans-serif;
  color: #047857;
}
.desglose {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  padding-left: 1.25rem;
  font-size: 0.75rem;
  text-align: right;
  border-left: 1px solid rgb(16 185 129 / 20%);
}
.desglose span {
  color: var(--p-surface-500);
}
.desglose strong {
  color: var(--p-surface-800);
}
.pie {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  width: 100%;
  padding: 1rem 1.5rem;
  background: rgb(248 250 252 / 90%);
  border-top: 1px solid var(--p-surface-200);
}
.secundario {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.65rem 0.9rem;
  font: 600 0.75rem system-ui, sans-serif;
  color: var(--p-surface-700);
  background: #fff;
  border: 1px solid var(--p-surface-300);
  border-radius: 0.75rem;
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
  padding: 0.65rem 1.25rem;
  font: 600 0.85rem system-ui, sans-serif;
  color: #fff;
  background: var(--p-primary-600);
  border: 0;
  border-radius: 0.75rem;
  box-shadow: 0 4px 6px -1px rgb(5 150 105 / 25%);
  cursor: pointer;
}
.principal:hover {
  background: var(--p-primary-700);
}
.principal kbd {
  padding: 0.1rem 0.4rem;
  font: 500 0.62rem ui-monospace, Consolas, monospace;
  color: var(--p-primary-100);
  background: rgb(4 120 87 / 80%);
  border-radius: 0.25rem;
}
</style>
