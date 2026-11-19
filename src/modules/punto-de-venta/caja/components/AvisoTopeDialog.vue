<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'

/**
 * Aviso a pantalla completa cuando una venta deja la caja en el tope de efectivo.
 * No se cierra con Esc ni al hacer clic fuera: la cajera tiene que elegir un botón,
 * y esa decisión queda en la bitácora (así no se puede decir que no se vio).
 */
const props = defineProps<{ visible: boolean }>()
const emit = defineEmits<{ retirar: []; entendido: [] }>()

const botonRetiro = ref<HTMLButtonElement | null>(null)
let escuchando: ReturnType<typeof setTimeout> | undefined

/** Enter funciona aunque el foco esté en otro lado (p. ej. la barra de búsqueda). */
function alTeclear(e: KeyboardEvent) {
  if (e.key !== 'Enter' || e.repeat) return
  e.preventDefault()
  e.stopPropagation()
  emit('retirar')
}

watch(
  () => props.visible,
  async (v) => {
    clearTimeout(escuchando)
    window.removeEventListener('keydown', alTeclear, true)
    if (!v) return
    await nextTick()
    setTimeout(() => botonRetiro.value?.focus(), 150)
    // Pequeña espera para no tomar el mismo Enter que cerró el ticket anterior.
    escuchando = setTimeout(() => window.addEventListener('keydown', alTeclear, true), 300)
  },
)
onBeforeUnmount(() => {
  clearTimeout(escuchando)
  window.removeEventListener('keydown', alTeclear, true)
})
</script>

<template>
  <Dialog
    :visible="visible"
    modal
    :closable="false"
    :close-on-escape="false"
    :dismissable-mask="false"
    class="dialogo-moderno"
    :style="{ width: '30rem', maxWidth: '96vw' }"
  >
    <template #container>
      <div class="aviso" role="alertdialog" aria-labelledby="aviso-tope-titulo">
        <div class="icono"><i class="pi pi-exclamation-triangle" /></div>
        <h2 id="aviso-tope-titulo">Tope de efectivo alcanzado</h2>
        <p>
          Ya se llegó al límite de efectivo en la caja. Para seguir vendiendo es necesario
          <b>hacer un retiro</b>.
        </p>
        <div class="botones">
          <button ref="botonRetiro" class="principal" @click="emit('retirar')">
            <i class="pi pi-arrow-up-right" /> <span>Hacer retiro ahora</span> <kbd>↵ Enter</kbd>
          </button>
          <button class="secundario" @click="emit('entendido')">Entendido, lo haré después</button>
        </div>
        <small>Mientras no se haga el retiro, las ventas nuevas quedan bloqueadas. Esta confirmación queda registrada.</small>
      </div>
    </template>
  </Dialog>
</template>

<style scoped>
.aviso {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 2rem 2rem 1.5rem;
  text-align: center;
  background: #fff;
  border-radius: 1.25rem;
}
.icono {
  width: 4rem;
  height: 4rem;
  display: grid;
  place-items: center;
  font-size: 1.8rem;
  color: #dc2626;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 1.2rem;
}
h2 {
  margin: 0.25rem 0 0;
  font-size: 1.5rem;
  font-weight: 800;
  letter-spacing: -0.01em;
  color: var(--p-surface-900);
}
p {
  margin: 0;
  font-size: 1rem;
  line-height: 1.5;
  color: var(--p-surface-600);
}
.botones {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  margin-top: 0.75rem;
}
.principal,
.secundario {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  padding: 0.95rem 1.25rem;
  font: 700 1rem system-ui, sans-serif;
  border-radius: 0.85rem;
  cursor: pointer;
}
.principal {
  color: #fff;
  background: var(--p-primary-500);
  border: 0;
  box-shadow: 0 10px 15px -3px rgb(16 185 129 / 25%);
}
.principal:hover {
  background: var(--p-primary-600);
}
.principal kbd {
  padding: 0.1rem 0.5rem;
  font: 400 0.72rem ui-monospace, Consolas, monospace;
  color: var(--p-primary-100);
  background: rgb(0 0 0 / 15%);
  border-radius: 0.3rem;
}
.secundario {
  font-weight: 600;
  color: var(--p-surface-600);
  background: #fff;
  border: 1px solid var(--p-surface-200);
}
.secundario:hover {
  background: var(--p-surface-50);
}
small {
  font-size: 0.75rem;
  color: var(--p-surface-400);
}
</style>
