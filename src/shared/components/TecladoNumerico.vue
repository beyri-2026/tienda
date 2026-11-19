<script setup lang="ts">
import { onMounted, ref } from 'vue'

/** Teclado numérico en pantalla (para PIN); también acepta el teclado físico. Sin lógica de negocio. */
const props = withDefaults(defineProps<{ modelValue: string; largo?: number; oculto?: boolean }>(), {
  largo: 6,
  oculto: true,
})
const emit = defineEmits<{ 'update:modelValue': [valor: string]; enter: [] }>()

const raiz = ref<HTMLElement | null>(null)

function pulsar(d: string) {
  if (props.modelValue.length < props.largo) emit('update:modelValue', props.modelValue + d)
}
const borrar = () => emit('update:modelValue', props.modelValue.slice(0, -1))
const limpiar = () => emit('update:modelValue', '')

function teclado(e: KeyboardEvent) {
  if (/^\d$/.test(e.key)) pulsar(e.key)
  else if (e.key === 'Backspace') borrar()
  else if (e.key === 'Enter' && props.modelValue.length >= 4) emit('enter')
  else return
  e.preventDefault()
}

onMounted(() => {
  // El diálogo enfoca el elemento con `autofocus`; se reintenta por si otro control se adelanta.
  raiz.value?.setAttribute('autofocus', '')
  for (const ms of [0, 120, 300, 600]) setTimeout(() => raiz.value?.isConnected && raiz.value.focus(), ms)
})
</script>

<template>
  <div ref="raiz" class="teclado" tabindex="0" @keydown="teclado">
    <div class="visor" aria-live="polite">
      <span
        v-for="n in largo"
        :key="n"
        class="punto"
        :class="{ lleno: n <= modelValue.length, activo: n === modelValue.length + 1 }"
      >
        {{ !oculto && n <= modelValue.length ? modelValue[n - 1] : '' }}
      </span>
    </div>
    <div class="ayuda">
      <span>Ingresados {{ modelValue.length }} de {{ largo }} dígitos</span>
      <button type="button" tabindex="-1" @click="limpiar">Limpiar PIN</button>
    </div>

    <div class="rejilla">
      <button v-for="d in ['1', '2', '3', '4', '5', '6', '7', '8', '9']" :key="d" class="tecla" type="button" tabindex="-1" @click="pulsar(d)">
        {{ d }}
      </button>
      <button class="tecla limpiar" type="button" tabindex="-1" aria-label="Limpiar todo" @click="limpiar"><i class="pi pi-times" /></button>
      <button class="tecla" type="button" tabindex="-1" @click="pulsar('0')">0</button>
      <button class="tecla borrar" type="button" tabindex="-1" aria-label="Borrar último dígito" @click="borrar"><i class="pi pi-delete-left" /></button>
    </div>
  </div>
</template>

<style scoped>
.teclado {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  outline: none;
}
.visor {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.9rem;
  padding: 0.5rem 0;
}
.punto {
  width: 1rem;
  height: 1rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  color: #fff;
  background: rgb(248 250 252 / 80%);
  border: 2px solid var(--p-surface-300);
  border-radius: 50%;
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), background-color 0.2s;
}
.punto.lleno {
  background: var(--p-primary-500);
  border-color: var(--p-primary-500);
  box-shadow: 0 0 0 4px var(--p-primary-100);
}
.punto.activo {
  background: #fff;
  border-color: var(--p-primary-500);
  box-shadow: 0 0 0 4px rgb(16 185 129 / 18%);
  animation: latido 2.5s ease-in-out infinite;
}
@keyframes latido {
  50% {
    opacity: 0.55;
  }
}
.ayuda {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 0.5rem;
  font-size: 0.7rem;
  font-weight: 500;
  color: var(--p-surface-400);
}
.ayuda button {
  padding: 0;
  font: inherit;
  font-weight: 600;
  color: var(--p-primary-700);
  background: none;
  border: 0;
  cursor: pointer;
}
.ayuda button:hover {
  text-decoration: underline;
}
.rejilla {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.6rem;
  max-width: 21rem;
  width: 100%;
  margin: 0.25rem auto 0;
}
.tecla {
  height: 3.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font: 600 1.5rem system-ui, sans-serif;
  color: var(--p-surface-800);
  background: rgb(248 250 252 / 90%);
  border: 1px solid rgb(226 232 240 / 80%);
  border-radius: 1rem;
  box-shadow: 0 2px 0 0 rgb(203 213 225 / 80%), 0 2px 4px 0 rgb(15 23 42 / 4%);
  cursor: pointer;
  user-select: none;
  transition: all 0.12s;
}
.tecla:hover {
  background: var(--p-surface-100);
}
.tecla:active {
  background: var(--p-surface-200);
  box-shadow: inset 0 2px 4px 0 rgb(15 23 42 / 6%);
  transform: scale(0.96) translateY(2px);
}
.tecla.limpiar {
  font-size: 1.3rem;
  color: #e11d48;
  background: rgb(255 241 242 / 70%);
  border-color: rgb(254 205 211 / 70%);
}
.tecla.limpiar:hover {
  background: rgb(255 228 230 / 80%);
}
.tecla.borrar {
  font-size: 1.3rem;
  color: var(--p-surface-700);
  background: var(--p-surface-100);
  border-color: var(--p-surface-200);
}
.tecla.borrar:hover {
  background: rgb(226 232 240 / 90%);
}
</style>
