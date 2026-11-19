import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/equipo',
    component: () => import('./views/EquipoView.vue'),
    meta: { permiso: 'equipo.configurar', titulo: 'Esta computadora' },
  },
]

export default routes
