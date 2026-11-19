<script setup lang="ts">
import { computed } from 'vue'
import { ETIQUETA_ROL } from '@/core/auth/permisos'
import { useSesion } from '@/core/auth/sesion.store'
import { usePermisos } from '@/core/auth/usePermisos'
import { MENU } from '@/core/layout/menu'
import { useConfirm } from 'primevue/useconfirm'
import { reiniciarDatosDemo } from '../api/demo.api'

const sesion = useSesion()
const { puede } = usePermisos()
const confirmar = useConfirm()

const accesos = computed(() => MENU.flatMap((g) => g.hijos).filter((o) => puede(o.permiso)))

function reiniciar() {
  confirmar.require({
    header: 'Reiniciar datos de prueba',
    message: 'Se borrarán ventas, turnos y etiquetas creadas, y se restauran los datos de ejemplo.',
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: 'Reiniciar',
    rejectLabel: 'Cancelar',
    accept: async () => {
      await reiniciarDatosDemo()
      window.location.reload()
    },
  })
}
</script>

<template>
  <div class="columna" style="max-width: 720px">
    <h2>Hola, {{ sesion.usuario?.nombre }}</h2>
    <p class="muted">{{ sesion.rol ? ETIQUETA_ROL[sesion.rol] : '' }} · {{ sesion.usuario?.sucursalNombre }}</p>

    <div v-if="accesos.length" class="accesos">
      <RouterLink v-for="a in accesos" :key="a.ruta" :to="a.ruta" class="acceso tarjeta">
        <i :class="a.icono" />
        <strong>{{ a.texto }}</strong>
      </RouterLink>
    </div>
    <div v-else class="tarjeta">Tu rol todavía no tiene pantallas en esta versión de la demo.</div>

    <div class="tarjeta fila-entre">
      <span class="muted">Los datos son de prueba y se guardan en este navegador.</span>
      <Button label="Reiniciar datos" icon="pi pi-refresh" severity="secondary" size="small" @click="reiniciar" />
    </div>
  </div>
</template>

<style scoped>
.accesos {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 0.75rem;
}
.acceso {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 1.5rem 1rem;
  text-decoration: none;
  color: var(--p-text-color);
}
.acceso:hover {
  border-color: var(--p-primary-color);
}
.acceso i {
  font-size: 1.8rem;
  color: var(--p-primary-color);
}
</style>
