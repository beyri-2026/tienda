<template>
  <div class="vacio">
    <i class="pi pi-lock" />
    <h2>Sin permiso</h2>
    <p>Tu rol no tiene acceso a esta pantalla.</p>
    <RouterLink to="/inicio"><Button label="Ir al inicio" /></RouterLink>
  </div>
</template>

<style scoped>
.vacio {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 3rem 1rem;
  text-align: center;
  color: var(--p-text-muted-color);
}
.vacio i {
  font-size: 2.5rem;
}
</style>
