<script setup lang="ts">
import { nextTick, ref } from 'vue'
import { formatear } from '@/core/utils/dinero'
import type { Producto } from '@/modules/catalogo/types/producto.types'
import { useBuscador } from '../composables/useBuscador'

const props = defineProps<{ cantidad: number | null }>()
const emit = defineEmits<{
  codigo: [texto: string]
  elegir: [producto: Producto]
  camara: []
  'update:cantidad': [valor: number | null]
}>()

// F7: se teclea la cantidad y el siguiente producto que se escanee se multiplica por ella.
const editando = ref(false)
const cantTexto = ref('')
const cantInput = ref<HTMLInputElement | null>(null)

async function pedirCantidad() {
  cantTexto.value = props.cantidad ? String(props.cantidad) : ''
  editando.value = true
  await nextTick()
  cantInput.value?.focus()
  cantInput.value?.select()
}
function confirmarCantidad() {
  const n = Number(cantTexto.value)
  editando.value = false
  if (Number.isInteger(n) && n >= 1) emit('update:cantidad', Math.min(n, 999))
  enfocar()
}
function cancelarCantidad() {
  editando.value = false
  emit('update:cantidad', null)
  enfocar()
}
function soloDigitos() {
  cantTexto.value = cantTexto.value.replace(/\D/g, '').slice(0, 3)
}

const { texto, resultados, limpiar } = useBuscador()
const entrada = ref<{ $el: HTMLInputElement } | null>(null)

/** Un lector USB escribe el código y presiona Enter: números largos o folios tipo P-0001. */
const pareceCodigo = (t: string) => /^\d{6,}$/.test(t) || /^[A-Za-z]-\d{3,}$/.test(t)

function enter() {
  const t = texto.value.trim()
  if (!t) return
  if (pareceCodigo(t)) {
    emit('codigo', t)
    limpiar()
  } else if (resultados.value.length === 1) {
    emit('elegir', resultados.value[0])
    limpiar()
  }
}

function elegir(p: Producto) {
  emit('elegir', p)
  limpiar()
  enfocar()
}

function enfocar() {
  entrada.value?.$el.focus()
}

defineExpose({ enfocar, pedirCantidad })
</script>

<template>
  <div class="barra">
    <div class="fila">
      <div class="campo">
        <i class="pi pi-search lupa" />
        <InputText
          ref="entrada"
          v-model="texto"
          class="entrada"
          :placeholder="cantidad ? `Escanea el producto (se agregan ${cantidad})…` : 'Escanea código de barras o busca por nombre…'"
          fluid
          autofocus
          autocomplete="off"
          @keydown.enter.prevent="enter"
        />
        <kbd>F2</kbd>
      </div>
      <div v-if="editando" class="cant editando">
        <span class="x">×</span>
        <input
          ref="cantInput"
          v-model="cantTexto"
          inputmode="numeric"
          placeholder="Cant."
          aria-label="Cantidad"
          @input="soloDigitos"
          @keydown.enter.prevent.stop="confirmarCantidad"
          @keydown.esc.prevent.stop="cancelarCantidad"
          @blur="editando = false"
        />
        <kbd class="fijo">Enter</kbd>
      </div>
      <div v-else-if="cantidad" class="cant fija">
        <span class="x">×</span><strong>{{ cantidad }}</strong>
        <button type="button" aria-label="Quitar cantidad" @click="cancelarCantidad"><i class="pi pi-times" /></button>
      </div>
      <button v-else class="camara f7" type="button" title="Agregar por cantidad (F7)" @click="pedirCantidad">
        <i class="pi pi-clone" /> <span>Cantidad</span> <span class="tecla">F7</span>
      </button>
      <button class="camara" type="button" @click="emit('camara')">
        <i class="pi pi-camera" /> <span>Cámara</span>
      </button>
    </div>

    <ul v-if="resultados.length" class="resultados">
      <li v-for="p in resultados" :key="p.id" @click="elegir(p)">
        <span>
          <strong>{{ p.nombre }}</strong>
          <small class="muted"> · {{ p.codigos[0] }}</small>
        </span>
        <span class="dinero">{{ formatear(p.precioCentavos) }}{{ p.unidad === 'kg' ? ' /kg' : '' }}</span>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.barra {
  position: relative;
}
.campo {
  position: relative;
  flex: 1;
}
.lupa {
  position: absolute;
  left: 0.95rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--p-surface-400);
  z-index: 1;
}
:deep(.entrada) {
  padding: 0.8rem 3.5rem 0.8rem 2.7rem;
  font-size: 0.9rem;
  font-weight: 500;
  border-radius: 0.75rem;
  border-color: var(--p-surface-300);
  box-shadow: 0 1px 3px rgb(0 0 0 / 5%);
}
kbd {
  position: absolute;
  right: 0.65rem;
  top: 50%;
  transform: translateY(-50%);
  font: 600 0.62rem ui-monospace, Consolas, monospace;
  padding: 0.15rem 0.4rem;
  color: var(--p-surface-500);
  background: var(--p-surface-100);
  border: 1px solid var(--p-surface-200);
  border-radius: 0.3rem;
}
.camara {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.8rem 1rem;
  font: inherit;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--p-surface-700);
  background: #fff;
  border: 1px solid var(--p-surface-300);
  border-radius: 0.75rem;
  box-shadow: 0 1px 3px rgb(0 0 0 / 5%);
  cursor: pointer;
  flex-shrink: 0;
}
.camara:hover {
  color: var(--p-primary-600);
  border-color: var(--p-primary-500);
}
.cant {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0 0.7rem;
  flex-shrink: 0;
  color: #065f46;
  background: var(--p-primary-50);
  border: 1px solid var(--p-primary-200);
  border-radius: 0.75rem;
  box-shadow: 0 1px 3px rgb(0 0 0 / 5%);
}
.cant .x {
  font-weight: 700;
  color: var(--p-primary-600);
}
.cant input {
  width: 4rem;
  padding: 0.8rem 0;
  font: 700 1.05rem ui-monospace, Consolas, monospace;
  color: #064e3b;
  background: transparent;
  border: 0;
  outline: none;
}
.cant strong {
  font: 700 1.15rem ui-monospace, Consolas, monospace;
}
.cant button {
  display: grid;
  place-items: center;
  width: 1.6rem;
  height: 1.6rem;
  color: #065f46;
  background: none;
  border: 0;
  border-radius: 50%;
  cursor: pointer;
}
.cant button:hover {
  background: var(--p-primary-200);
}
.cant .fijo {
  position: static;
  transform: none;
}
.camara.f7 .tecla {
  padding: 0.1rem 0.35rem;
  font: 600 0.6rem ui-monospace, Consolas, monospace;
  color: var(--p-surface-500);
  background: var(--p-surface-100);
  border: 1px solid var(--p-surface-200);
  border-radius: 0.3rem;
}
.resultados {
  position: absolute;
  z-index: 20;
  left: 0;
  right: 0;
  margin: 0.25rem 0 0;
  padding: 0.25rem;
  list-style: none;
  background: #fff;
  border: 1px solid var(--p-surface-200);
  border-radius: 0.75rem;
  box-shadow: 0 8px 24px rgb(0 0 0 / 12%);
}
.resultados li {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.6rem 0.75rem;
  border-radius: 0.5rem;
  cursor: pointer;
}
.resultados li:hover {
  background: var(--p-primary-50);
}
</style>
