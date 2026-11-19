import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    component: () => import('./views/LoginView.vue'),
    meta: { publica: true, titulo: 'Iniciar sesión' },
  },
]

export default routes
