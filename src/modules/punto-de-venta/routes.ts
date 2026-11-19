import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/caja',
    component: () => import('./caja/views/CajaView.vue'),
    meta: { permiso: 'pos.cobrar', titulo: 'Caja' },
  },
  {
    path: '/turno',
    component: () => import('./turno/views/TurnoView.vue'),
    meta: { permiso: 'pos.turno', titulo: 'Turno y corte' },
  },
  {
    path: '/ventas',
    component: () => import('./consulta/views/VentasView.vue'),
    meta: { permiso: 'pos.consultar', titulo: 'Ventas' },
  },
]

export default routes
