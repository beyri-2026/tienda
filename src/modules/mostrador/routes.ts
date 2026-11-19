import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/mostrador',
    component: () => import('./views/MostradorView.vue'),
    meta: { permiso: 'mostrador.usar', titulo: 'Mostrador' },
  },
]

export default routes
