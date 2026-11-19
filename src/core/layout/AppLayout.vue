<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ETIQUETA_ROL } from '@/core/auth/permisos'
import { useSesion } from '@/core/auth/sesion.store'
import { useEquipo } from '@/modules/equipo/composables/useEquipo'
import AppMenu from './AppMenu.vue'

const sesion = useSesion()
const equipo = useEquipo()
const router = useRouter()

const CLAVE_MENU = 'tiendas.menu.visible'
const menuVisible = ref(true)
try {
  menuVisible.value = localStorage.getItem(CLAVE_MENU) !== '0'
} catch {
  /* sin storage: queda visible */
}
watch(menuVisible, (v) => {
  try {
    localStorage.setItem(CLAVE_MENU, v ? '1' : '0')
  } catch {
    /* ignorar */
  }
})

const enLinea = ref(navigator.onLine)
const actualizarRed = () => (enLinea.value = navigator.onLine)
onMounted(() => {
  equipo.cargar()
  window.addEventListener('online', actualizarRed)
  window.addEventListener('offline', actualizarRed)
})
onBeforeUnmount(() => {
  window.removeEventListener('online', actualizarRed)
  window.removeEventListener('offline', actualizarRed)
})

const iniciales = computed(() =>
  (sesion.usuario?.nombre ?? '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase(),
)

function salir() {
  sesion.cerrar()
  router.push('/login')
}
</script>

<template>
  <div class="app">
    <header class="encabezado">
      <div class="izq">
        <button class="hamburguesa" :aria-label="menuVisible ? 'Ocultar menú' : 'Mostrar menú'" @click="menuVisible = !menuVisible">
          <i :class="menuVisible ? 'pi pi-times' : 'pi pi-bars'" />
        </button>
        <div class="logo"><i class="pi pi-shop" /></div>
        <div class="marca">
          Punto de Venta
          <span class="pos">POS</span>
        </div>
        <div class="separador" />
        <div class="insignias">
          <span class="insignia fuerte"><i class="pi pi-map-marker" /> {{ sesion.usuario?.sucursalNombre }}</span>
          <span
            v-if="equipo.caja.value"
            class="insignia"
            title="Esta computadora está vinculada a esta caja"
          ><i class="pi pi-desktop" /> {{ equipo.caja.value.nombre }} <i class="pi pi-lock candado" /></span>
          <span v-else-if="equipo.cargado.value" class="insignia sin-caja" title="Pide al gerente que la configure">
            <i class="pi pi-exclamation-triangle" /> Sin caja asignada
          </span>
          <span class="estado" :class="{ fuera: !enLinea }">
            <span class="punto pulso" /> {{ enLinea ? 'En línea' : 'Sin conexión' }}
          </span>
        </div>
      </div>

      <div class="atajos">
        <span><kbd>F2</kbd> Buscar</span>
        <span><kbd>F4</kbd> Cobrar</span>
        <span><kbd>F7</kbd> Cantidad</span>
        <span><kbd>F8</kbd> En espera</span>
      </div>

      <div class="der">
        <div class="avatar">{{ iniciales }}</div>
        <div class="datos">
          <strong>{{ sesion.usuario?.nombre }}</strong>
          <small>{{ sesion.rol ? ETIQUETA_ROL[sesion.rol] : '' }}</small>
        </div>
        <div class="separador corto" />
        <button class="salir" title="Cerrar sesión" @click="salir"><i class="pi pi-sign-out" /> <span>Salir</span></button>
      </div>
    </header>

    <div class="cuerpo">
      <aside v-show="menuVisible" class="lateral"><AppMenu /></aside>
      <main class="contenido"><RouterView /></main>
    </div>
  </div>
</template>

<style scoped>
.app {
  display: flex;
  flex-direction: column;
  height: 100vh;
}
.encabezado {
  height: 4rem;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0 1.25rem;
  background: #fff;
  border-bottom: 1px solid var(--p-surface-200);
  z-index: 30;
}
.izq,
.der {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
.hamburguesa {
  border: 0;
  background: transparent;
  color: var(--p-surface-500);
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 0.6rem;
  cursor: pointer;
}
.hamburguesa:hover {
  background: var(--p-surface-100);
}
.logo {
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 0.75rem;
  display: grid;
  place-items: center;
  color: #fff;
  background: linear-gradient(to top right, var(--p-primary-700), var(--p-primary-500));
  box-shadow: 0 4px 10px rgb(16 185 129 / 25%);
}
.marca {
  font-weight: 700;
  font-size: 1rem;
  letter-spacing: -0.01em;
  color: var(--p-surface-900);
}
.pos {
  margin-left: 0.35rem;
  padding: 0.1rem 0.4rem;
  font-size: 0.65rem;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--p-primary-600);
  background: var(--p-primary-50);
  border: 1px solid var(--p-primary-100);
  border-radius: 0.3rem;
}
.separador {
  width: 1px;
  height: 1.5rem;
  background: var(--p-surface-200);
}
.insignias {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.insignia {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.25rem 0.7rem;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--p-surface-600);
  background: var(--p-surface-100);
  border: 1px solid var(--p-surface-200);
  border-radius: 0.5rem;
}
.insignia .candado {
  font-size: 0.6rem;
  opacity: 0.55;
}
.insignia.sin-caja {
  color: #b45309;
  background: #fffbeb;
  border-color: #fde68a;
}
.insignia.fuerte {
  font-weight: 600;
  color: var(--p-surface-700);
}
.punto {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  background: var(--p-primary-500);
}
.estado {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.2rem 0.65rem;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--p-primary-700);
  background: var(--p-primary-50);
  border: 1px solid var(--p-primary-200);
  border-radius: 999px;
}
.estado.fuera {
  color: var(--p-red-700);
  background: var(--p-red-50);
  border-color: var(--p-red-200);
}
.estado.fuera .punto {
  background: var(--p-red-500);
}
.pulso {
  width: 0.4rem;
  height: 0.4rem;
  animation: pulso 1.6s ease-in-out infinite;
}
@keyframes pulso {
  50% {
    opacity: 0.35;
  }
}
.atajos {
  display: none;
  gap: 0.75rem;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--p-surface-500);
}
.atajos span {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.25rem 0.5rem;
  background: var(--p-surface-50);
  border: 1px solid var(--p-surface-200);
  border-radius: 0.4rem;
}
kbd {
  font: 600 0.62rem ui-monospace, Consolas, monospace;
  padding: 0 0.3rem;
  color: var(--p-surface-700);
  background: #fff;
  border: 1px solid var(--p-surface-300);
  border-radius: 0.25rem;
}
@media (min-width: 1280px) {
  .atajos {
    display: flex;
  }
}
.avatar {
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  color: var(--p-surface-700);
  background: var(--p-surface-100);
  border: 1px solid var(--p-surface-200);
  box-shadow: 0 0 0 2px rgb(16 185 129 / 20%);
}
.datos {
  display: none;
  flex-direction: column;
  line-height: 1.2;
}
.datos strong {
  font-size: 0.75rem;
  color: var(--p-surface-900);
}
.datos small {
  font-size: 0.7rem;
  color: var(--p-surface-500);
}
@media (min-width: 768px) {
  .datos {
    display: flex;
  }
}
.separador.corto {
  display: none;
}
@media (min-width: 640px) {
  .separador.corto {
    display: block;
  }
}
.salir {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.4rem 0.75rem;
  font: inherit;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--p-surface-600);
  background: transparent;
  border: 1px solid transparent;
  border-radius: 0.5rem;
  cursor: pointer;
}
.salir:hover {
  color: var(--p-red-600);
  background: var(--p-red-50);
  border-color: var(--p-red-100);
}
.cuerpo {
  flex: 1;
  display: flex;
  min-height: 0;
}
.lateral {
  width: 14.5rem;
  flex-shrink: 0;
  overflow-y: auto;
  background: #fff;
  border-right: 1px solid var(--p-surface-200);
}
.contenido {
  flex: 1;
  min-width: 0;
  overflow: auto;
  padding: 1rem 1.25rem;
}
</style>
