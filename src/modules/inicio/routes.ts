import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/inicio',
    component: () => import('./views/InicioView.vue'),
    meta: { titulo: 'Inicio', permiso: 'miCuenta' },
  },
]

export default routes
