<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useToast } from 'primevue/usetoast'
import { vFoco } from '@/core/utils/foco'
import { fechaCorta, horaCompleta } from '@/core/utils/fechas'
import { useOperador } from '@/core/auth/useOperador'
import AutorizacionDialog from '@/modules/punto-de-venta/components/AutorizacionDialog.vue'
import type { Autorizacion } from '@/modules/punto-de-venta/types/venta.types'
import type { CajaEstado } from '../api/equipo.api'
import { useEquipo } from '../composables/useEquipo'

const toast = useToast()
const { operador } = useOperador()
const { estado, cajas, caja, cargar, vincular, desvincular, agregarCaja } = useEquipo()

type Accion = { tipo: 'vincular'; caja: CajaEstado } | { tipo: 'desvincular' }
const accion = ref<Accion | null>(null)
const autorizando = ref(false)
const nombreNueva = ref('')

onMounted(cargar)

const idCorto = computed(() => (estado.value?.equipoId ?? '').slice(-8).toUpperCase())

function pedirVincular(c: CajaEstado) {
  accion.value = { tipo: 'vincular', caja: c }
  autorizando.value = true
}
function pedirDesvincular() {
  accion.value = { tipo: 'desvincular' }
  autorizando.value = true
}

async function autorizado(aut: Autorizacion) {
  const a = accion.value
  if (!a) return
  try {
    if (a.tipo === 'vincular') {
      await vincular(a.caja.id, operador.value, aut)
      toast.add({ severity: 'success', summary: `Esta computadora quedó asignada a ${a.caja.nombre}`, life: 3500 })
    } else {
      await desvincular(operador.value, aut)
      toast.add({ severity: 'success', summary: 'Esta computadora ya no tiene caja asignada', life: 3500 })
    }
  } catch (e) {
    toast.add({ severity: 'error', summary: 'No se pudo completar', detail: e instanceof Error ? e.message : '', life: 5000 })
  } finally {
    accion.value = null
  }
}

const descripcion = computed(() => {
  const a = accion.value
  if (!a) return ''
  return a.tipo === 'vincular' ? `Asignar esta computadora a ${a.caja.nombre}` : `Quitar la caja de esta computadora (${caja.value?.nombre})`
})

async function crear() {
  try {
    await agregarCaja(nombreNueva.value, operador.value)
    toast.add({ severity: 'success', summary: `Caja "${nombreNueva.value.trim()}" agregada`, life: 2500 })
    nombreNueva.value = ''
  } catch (e) {
    toast.add({ severity: 'error', summary: 'No se pudo agregar', detail: e instanceof Error ? e.message : '', life: 4000 })
  }
}
</script>

<template>
  <div class="pagina">
    <div class="titulo">
      <div>
        <h2>Esta computadora</h2>
        <p>Cada computadora trabaja siempre en una sola caja. Se configura una vez y la cajera ya no elige nada.</p>
      </div>
    </div>

    <section class="hero" :class="{ sin: !caja }">
      <div class="hero-icono"><i class="pi pi-desktop" /></div>
      <div class="hero-texto">
        <small>Esta computadora trabaja en</small>
        <strong v-if="caja">{{ caja.nombre }} <i class="pi pi-lock" /></strong>
        <strong v-else>Ninguna caja</strong>
        <span v-if="caja && estado?.vinculadoEn">
          Asignada por {{ estado.vinculadoPorNombre }} · {{ fechaCorta(estado.vinculadoEn) }} {{ horaCompleta(estado.vinculadoEn) }}
        </span>
        <span v-else>Mientras no tenga caja, aquí no se puede abrir turno ni vender.</span>
      </div>
      <div class="hero-lado">
        <span class="id mono" title="Identificador de este equipo">Equipo {{ idCorto }}</span>
        <button v-if="caja" class="quitar" @click="pedirDesvincular"><i class="pi pi-link" /> Quitar caja</button>
      </div>
    </section>

    <section class="panel">
      <header class="panel-cab">
        <h3>Cajas de la tienda</h3>
        <span class="n">{{ cajas.length }}</span>
      </header>
      <ul class="lista">
        <li v-for="c in cajas" :key="c.id" :class="{ esta: c.situacion === 'esta' }">
          <div class="info">
            <span class="ico"><i class="pi pi-calculator" /></span>
            <div>
              <b>{{ c.nombre }}</b>
              <small v-if="c.situacion === 'esta'">Esta computadora</small>
              <small v-else-if="c.situacion === 'otra'">Ya tiene su computadora ({{ c.equipoNombre }})</small>
              <small v-else>Sin computadora asignada</small>
            </div>
          </div>
          <div class="estados">
            <span v-if="c.turnoCajero" class="etq turno"><span class="punto" /> Turno abierto · {{ c.turnoCajero }}</span>
            <span v-else class="etq libre">Sin turno</span>
            <span v-if="c.situacion === 'esta'" class="etq esta"><i class="pi pi-check" /> Asignada aquí</span>
            <button v-else class="vincular" @click="pedirVincular(c)">
              <i class="pi pi-link" /> {{ c.situacion === 'otra' ? 'Asignar aquí (reemplaza)' : 'Asignar a esta computadora' }}
            </button>
          </div>
        </li>
      </ul>
      <form class="nueva" @submit.prevent="crear">
        <InputText v-model="nombreNueva" placeholder="Nombre de una caja nueva (ej. Caja 3)" fluid v-foco />
        <button type="submit" :disabled="!nombreNueva.trim()"><i class="pi pi-plus" /> Agregar caja</button>
      </form>
    </section>

    <p class="nota">
      <i class="pi pi-info-circle" />
      Cada venta, retiro y corte queda registrado con la caja donde se hizo, sin importar qué usuario haya entrado.
      Para cambiar una computadora de caja hay que cerrar antes el turno abierto.
    </p>
  </div>

  <AutorizacionDialog
    v-model:visible="autorizando"
    titulo="Autorizar cambio de caja"
    :descripcion="descripcion"
    permiso="equipo.configurar"
    :motivos="['Instalación de equipo', 'Cambio de equipo', 'Reparación o reemplazo']"
    @autorizado="autorizado"
  />
</template>

<style scoped>
.pagina {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 62rem;
}
.titulo h2 {
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--p-surface-900);
}
.titulo p {
  margin: 0.2rem 0 0;
  font-size: 0.85rem;
  color: var(--p-surface-500);
}
.mono {
  font-family: ui-monospace, Consolas, monospace;
}
.hero {
  display: flex;
  align-items: center;
  gap: 1.1rem;
  padding: 1.4rem 1.6rem;
  color: #fff;
  background: linear-gradient(120deg, #064e3b, #0f172a);
  border-radius: 1.2rem;
}
.hero.sin {
  background: linear-gradient(120deg, #92400e, #1c1917);
}
.hero-icono {
  width: 3.5rem;
  height: 3.5rem;
  display: grid;
  place-items: center;
  font-size: 1.5rem;
  background: rgb(255 255 255 / 12%);
  border-radius: 1rem;
}
.hero-texto {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 0.15rem;
}
.hero-texto small {
  font-size: 0.72rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  opacity: 0.7;
}
.hero-texto strong {
  font-size: 2rem;
  line-height: 1.1;
}
.hero-texto strong i {
  font-size: 0.9rem;
  opacity: 0.6;
}
.hero-texto span {
  font-size: 0.8rem;
  opacity: 0.75;
}
.hero-lado {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.6rem;
}
.id {
  font-size: 0.7rem;
  opacity: 0.6;
}
.quitar {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 0.9rem;
  font: 600 0.8rem system-ui, sans-serif;
  color: #fff;
  background: rgb(255 255 255 / 12%);
  border: 1px solid rgb(255 255 255 / 25%);
  border-radius: 0.6rem;
  cursor: pointer;
}
.quitar:hover {
  background: rgb(255 255 255 / 22%);
}
.panel {
  overflow: hidden;
  background: #fff;
  border: 1px solid var(--p-surface-200);
  border-radius: 1rem;
}
.panel-cab {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--p-surface-100);
}
.panel-cab h3 {
  font-size: 1rem;
  font-weight: 700;
}
.n {
  padding: 0.05rem 0.5rem;
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--p-surface-600);
  background: var(--p-surface-100);
  border-radius: 1rem;
}
.lista {
  margin: 0;
  padding: 0;
  list-style: none;
}
.lista li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.9rem 1.25rem;
  border-bottom: 1px solid var(--p-surface-100);
}
.lista li.esta {
  background: var(--p-primary-50);
}
.info {
  display: flex;
  align-items: center;
  gap: 0.8rem;
}
.info div {
  display: flex;
  flex-direction: column;
}
.info small {
  font-size: 0.75rem;
  color: var(--p-surface-500);
}
.ico {
  width: 2.4rem;
  height: 2.4rem;
  display: grid;
  place-items: center;
  color: var(--p-surface-600);
  background: var(--p-surface-100);
  border-radius: 0.7rem;
}
.estados {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}
.etq {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.25rem 0.65rem;
  font-size: 0.72rem;
  font-weight: 600;
  border-radius: 1rem;
}
.etq.libre {
  color: var(--p-surface-500);
  background: var(--p-surface-100);
}
.etq.turno {
  color: #047857;
  background: #ecfdf5;
}
.etq.esta {
  color: #fff;
  background: var(--p-primary-500);
}
.punto {
  width: 0.45rem;
  height: 0.45rem;
  background: #10b981;
  border-radius: 50%;
}
.vincular,
.nueva button {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 0.9rem;
  font: 600 0.8rem system-ui, sans-serif;
  color: var(--p-primary-700);
  background: #fff;
  border: 1px solid var(--p-primary-200);
  border-radius: 0.6rem;
  cursor: pointer;
  white-space: nowrap;
}
.vincular:hover,
.nueva button:hover:not(:disabled) {
  background: var(--p-primary-50);
}
.nueva {
  display: flex;
  gap: 0.6rem;
  padding: 1rem 1.25rem;
  background: var(--p-surface-50);
}
.nueva button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.nota {
  display: flex;
  gap: 0.5rem;
  margin: 0;
  font-size: 0.78rem;
  color: var(--p-surface-500);
}
</style>
