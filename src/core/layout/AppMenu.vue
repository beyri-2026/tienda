<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { usePermisos } from '@/core/auth/usePermisos'
import { MENU } from './menu'

const { puede } = usePermisos()
const route = useRoute()

const grupos = computed(() =>
  MENU.map((g) => ({ ...g, hijos: g.hijos.filter((o) => puede(o.permiso)) })).filter((g) => g.hijos.length > 0),
)

const abiertos = ref<Set<string>>(new Set())

function alternar(texto: string) {
  const nuevo = new Set(abiertos.value)
  if (nuevo.has(texto)) nuevo.delete(texto)
  else nuevo.add(texto)
  abiertos.value = nuevo
}

// El grupo de la pantalla actual siempre se muestra abierto.
watch(
  () => [route.path, grupos.value],
  () => {
    const g = grupos.value.find((x) => x.hijos.some((h) => h.ruta === route.path))
    if (g && !abiertos.value.has(g.texto)) abiertos.value = new Set([...abiertos.value, g.texto])
  },
  { immediate: true },
)
</script>

<template>
  <nav class="menu">
    <div v-for="g in grupos" :key="g.texto" class="grupo">
      <button class="cabecera" :aria-expanded="abiertos.has(g.texto)" @click="alternar(g.texto)">
        <i :class="g.icono" />
        <span>{{ g.texto }}</span>
        <i class="pi flecha" :class="abiertos.has(g.texto) ? 'pi-chevron-up' : 'pi-chevron-down'" />
      </button>
      <div v-show="abiertos.has(g.texto)" class="hijos">
        <RouterLink v-for="o in g.hijos" :key="o.ruta" :to="o.ruta" class="opcion" active-class="activa">
          <i :class="o.icono" />
          <span>{{ o.texto }}</span>
        </RouterLink>
      </div>
    </div>
  </nav>
</template>

<style scoped>
.menu {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 1rem 0.75rem;
}
.cabecera {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  padding: 0.6rem 0.75rem;
  border: 0;
  border-radius: 0.75rem;
  background: transparent;
  color: var(--p-surface-400);
  font: inherit;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  cursor: pointer;
}
.cabecera:hover {
  background: var(--p-surface-50);
  color: var(--p-surface-600);
}
.flecha {
  margin-left: auto;
  font-size: 0.7rem;
}
.hijos {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  padding-bottom: 0.5rem;
}
.opcion {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.65rem 0.75rem;
  border: 1px solid transparent;
  border-radius: 0.75rem;
  color: var(--p-surface-600);
  text-decoration: none;
  font-size: 0.8rem;
  font-weight: 500;
  transition: background 0.15s;
}
.opcion i {
  color: var(--p-surface-400);
  font-size: 1.05rem;
}
.opcion:hover {
  background: var(--p-surface-50);
  color: var(--p-surface-900);
}
.opcion.activa {
  background: var(--p-primary-50);
  border-color: var(--p-primary-200);
  color: var(--p-primary-700);
  font-weight: 600;
}
.opcion.activa i {
  color: var(--p-primary-600);
}
</style>
