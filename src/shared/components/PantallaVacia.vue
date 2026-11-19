<script setup lang="ts">
defineProps<{ icono?: string; titulo: string; texto?: string }>()
</script>

<template>
  <div class="vacio">
    <i :class="icono ?? 'pi pi-inbox'" />
    <strong>{{ titulo }}</strong>
    <span v-if="texto">{{ texto }}</span>
    <slot />
  </div>
</template>

<style scoped>
.vacio {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.35rem;
  padding: 2rem 1rem;
  text-align: center;
  color: var(--p-text-muted-color);
}
.vacio i {
  font-size: 2rem;
}
</style>
