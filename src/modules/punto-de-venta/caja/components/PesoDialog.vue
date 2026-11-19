<script setup lang="ts">
import { vFoco } from '@/core/utils/foco'
import { computed, ref, watch } from 'vue'
import { formatear } from '@/core/utils/dinero'
import { precioPorPeso } from '@/core/utils/peso'
import type { Producto } from '@/modules/catalogo/types/producto.types'

/** Peso capturado a mano para un producto de kilo (cuando no viene con etiqueta de mostrador). */
const props = defineProps<{ visible: boolean; producto: Producto | null }>()
const emit = defineEmits<{ 'update:visible': [valor: boolean]; confirmar: [gramos: number] }>()

const gramos = ref<number | null>(null)
watch(
  () => props.visible,
  (v) => {
    if (v) gramos.value = null
  },
)

const precio = computed(() =>
  props.producto && gramos.value ? precioPorPeso(gramos.value, props.producto.precioCentavos) : 0,
)

function confirmar() {
  if (!gramos.value || gramos.value <= 0) return
  emit('confirmar', gramos.value)
  emit('update:visible', false)
}
</script>

<template>
  <Dialog
    :visible="visible"
    modal
    :closable="false"
    class="dialogo-moderno"
    :style="{ width: '33rem', maxWidth: '96vw' }"
    @update:visible="emit('update:visible', $event)"
  >
    <template #header>
      <div class="cabecera">
        <div>
          <span class="chip"><i class="pi pi-box" /> Venta a granel</span>
          <h2>{{ producto ? `Peso de ${producto.nombre}` : 'Peso' }}</h2>
          <p v-if="producto">
            Precio por kilo: <b>{{ formatear(producto.precioCentavos) }} MXN / kg</b>
          </p>
        </div>
        <button type="button" class="cerrar" title="Cerrar (Esc)" @click="emit('update:visible', false)">
          <i class="pi pi-times" />
        </button>
      </div>
    </template>

    <div v-if="producto" class="cuerpo">
      <div>
        <div class="fila-l">
          <label for="peso-gramos">Peso en báscula</label>
          <small>Captura en gramos</small>
        </div>
        <InputNumber
          v-model="gramos"
          input-id="peso-gramos"
          suffix=" g"
          :min="1"
          :max-fraction-digits="0"
          fluid
          v-foco
          class="entrada-peso"
          placeholder="0 g"
          @input="gramos = ($event.value as number | null) ?? null"
          @keydown.enter.prevent.stop="confirmar"
        />
      </div>

      <div class="importe">
        <div>
          <span class="etq">Importe a cobrar</span>
          <div class="formula">
            {{ ((gramos ?? 0) / 1000).toFixed(3) }} kg × {{ formatear(producto.precioCentavos) }} / kg ·
            <b>IVA incluido</b>
          </div>
        </div>
        <div class="total">
          <strong>{{ formatear(precio) }}</strong>
          <small>MXN</small>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="pie">
        <button type="button" class="btn-sec" @click="emit('update:visible', false)">
          Cancelar <kbd>Esc</kbd>
        </button>
        <button type="button" class="btn-prim" :disabled="!gramos" @click="confirmar">
          <i class="pi pi-plus" /> <span>Agregar a la cuenta</span> <kbd>↵ Enter</kbd>
        </button>
      </div>
    </template>
  </Dialog>
</template>

<style scoped>
.cabecera {
  width: 100%;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.5rem 1.5rem 1rem;
  background: rgb(248 250 252 / 60%);
  border-bottom: 1px solid var(--p-surface-100);
}
.chip {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.15rem 0.6rem;
  font-size: 0.72rem;
  font-weight: 600;
  color: #047857;
  background: var(--p-primary-50);
  border: 1px solid rgb(167 243 208 / 70%);
  border-radius: 999px;
}
h2 {
  margin: 0.5rem 0 0.25rem;
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--p-surface-900);
}
.cabecera p {
  margin: 0;
  font-size: 0.85rem;
  color: var(--p-surface-500);
}
.cabecera p b {
  color: var(--p-surface-800);
}
.cerrar {
  display: grid;
  place-items: center;
  width: 2.25rem;
  height: 2.25rem;
  color: var(--p-surface-400);
  background: transparent;
  border: 0;
  border-radius: 0.75rem;
  cursor: pointer;
}
.cerrar:hover {
  color: var(--p-surface-700);
  background: var(--p-surface-200);
}
.cuerpo {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 1.5rem;
}
.fila-l {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}
.fila-l label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--p-surface-700);
}
.fila-l small {
  font-size: 0.72rem;
  color: var(--p-surface-500);
}
:deep(.entrada-peso .p-inputtext) {
  padding: 0.75rem 1.25rem;
  font-size: 2.2rem;
  font-weight: 800;
  letter-spacing: -0.01em;
  color: var(--p-surface-900);
  background: rgb(236 253 245 / 30%);
  border: 2px solid var(--p-primary-500);
  border-radius: 1rem;
}
:deep(.entrada-peso .p-inputtext:focus) {
  box-shadow: 0 0 0 4px rgb(16 185 129 / 20%);
}
.importe {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem;
  background: var(--p-surface-50);
  border: 1px solid var(--p-surface-200);
  border-radius: 1rem;
}
.etq {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--p-surface-500);
}
.formula {
  margin-top: 0.15rem;
  font-size: 0.75rem;
  color: var(--p-surface-500);
}
.formula b {
  color: var(--p-primary-600);
}
.total {
  text-align: right;
}
.total strong {
  display: block;
  font-size: 1.9rem;
  font-weight: 900;
  letter-spacing: -0.01em;
  color: var(--p-surface-900);
}
.total small {
  font-size: 0.68rem;
  font-weight: 600;
  color: var(--p-surface-400);
}
.pie {
  width: 100%;
  display: flex;
  gap: 0.75rem;
  padding: 0.5rem 1.5rem 1.5rem;
  background: rgb(248 250 252 / 50%);
}
.btn-sec,
.btn-prim {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.85rem 1rem;
  font: 600 0.9rem system-ui, sans-serif;
  border-radius: 0.8rem;
  cursor: pointer;
}
.btn-sec {
  flex: 1;
  white-space: nowrap;
  color: var(--p-surface-700);
  background: #fff;
  border: 1px solid var(--p-surface-300);
}
.btn-sec:hover {
  background: var(--p-surface-100);
}
.btn-prim {
  flex: 2;
  white-space: nowrap;
  font-weight: 700;
  font-size: 1rem;
  color: #fff;
  background: var(--p-primary-500);
  border: 0;
  box-shadow: 0 10px 15px -3px rgb(16 185 129 / 30%);
}
.btn-prim:hover:not(:disabled) {
  background: var(--p-primary-600);
}
.btn-prim:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
kbd {
  padding: 0.05rem 0.45rem;
  font: 400 0.7rem ui-monospace, Consolas, monospace;
  border-radius: 0.3rem;
}
.btn-sec kbd {
  color: var(--p-surface-500);
  background: var(--p-surface-200);
}
.btn-prim kbd {
  color: var(--p-primary-100);
  background: rgb(5 150 105 / 70%);
  border: 1px solid rgb(52 211 153 / 40%);
}
</style>
