import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import AppLayout from '@/core/layout/AppLayout.vue'
import authRoutes from '@/modules/auth/routes'
import inicioRoutes from '@/modules/inicio/routes'
import posRoutes from '@/modules/punto-de-venta/routes'
import equipoRoutes from '@/modules/equipo/routes'
import mostradorRoutes from '@/modules/mostrador/routes'
import { instalarGuard } from './guard'

const rutas: RouteRecordRaw[] = [
  ...authRoutes,
  {
    path: '/',
    component: AppLayout,
    children: [
      { path: '', redirect: '/inicio' },
      ...inicioRoutes,
      ...posRoutes,
      ...mostradorRoutes,
      ...equipoRoutes,
      {
        path: '/sin-permiso',
        component: () => import('@/shared/components/SinPermiso.vue'),
        meta: { titulo: 'Sin permiso' },
      },
      {
        path: '/:pathMatch(.*)*',
        component: () => import('@/shared/components/NoEncontrado.vue'),
        meta: { titulo: 'No encontrado' },
      },
    ],
  },
]

const router = createRouter({ history: createWebHistory(), routes: rutas })
instalarGuard(router)

export default router
