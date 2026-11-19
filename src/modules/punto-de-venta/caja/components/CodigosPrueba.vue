<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { diasParaFecha } from '@/core/utils/fechas'
import type { FolioPromo } from '../../types/venta.types'
import { useCodigosPrueba } from '../composables/useCodigosPrueba'

/** SOLO DEMO: "escanear" sin lector físico tocando un código. */
const emit = defineEmits<{ escanear: [codigo: string] }>()

const abierto = ref(false)
const { codigos, cargar } = useCodigosPrueba()
onMounted(cargar)

function severidad(f: FolioPromo): 'success' | 'secondary' | 'danger' {
  if (f.estado === 'activo' && diasParaFecha(f.caducaEl) >= 0) return 'success'
  if (f.estado === 'inactivo') return 'secondary'
  return 'danger'
}
</script>

<template>
  <div class="prueba tarjeta">
    <button class="titulo" @click="abierto = !abierto; if (abierto) cargar()">
      <i :class="abierto ? 'pi pi-chevron-down' : 'pi pi-chevron-right'" />
      <strong>Códigos de prueba</strong>
      <small class="muted">(demo: toca un código para "escanearlo")</small>
    </button>

    <div v-if="abierto && codigos" class="contenido">
      <div>
        <small class="muted">Productos</small>
        <div class="chips">
          <Button
            v-for="p in codigos.productos"
            :key="p.codigo"
            :label="p.nombre + (p.unidad === 'kg' ? ' (kg)' : '')"
            size="small"
            severity="secondary"
            outlined
            @click="emit('escanear', p.codigo)"
          />
        </div>
      </div>
      <div>
        <small class="muted">Folios de promoción y paquetes (un solo uso)</small>
        <div class="chips">
          <Button
            v-for="f in codigos.folios"
            :key="f.codigo"
            :label="`${f.codigo} · ${f.estado}`"
            size="small"
            :severity="severidad(f)"
            outlined
            @click="emit('escanear', f.codigo)"
          />
        </div>
      </div>
      <div>
        <small class="muted">Etiquetas del mostrador disponibles</small>
        <div class="chips">
          <Button
            v-for="e in codigos.etiquetas"
            :key="e.codigo"
            :label="`${e.codigo} · ${e.nombre} ${e.pesoGramos} g`"
            size="small"
            severity="info"
            outlined
            @click="emit('escanear', e.codigo)"
          />
          <small v-if="codigos.etiquetas.length === 0" class="muted">Crea etiquetas en Mostrador.</small>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.prueba {
  padding: 0.5rem 0.75rem;
}
.titulo {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  background: none;
  border: 0;
  cursor: pointer;
  padding: 0.25rem 0;
  font: inherit;
  color: inherit;
}
.contenido {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  margin-top: 0.5rem;
}
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin-top: 0.25rem;
}
</style>
