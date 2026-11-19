import type { Router } from 'vue-router'
import { inicioDeRol, puede, type Permiso } from '@/core/auth/permisos'
import { useSesion } from '@/core/auth/sesion.store'

declare module 'vue-router' {
  interface RouteMeta {
    publica?: boolean
    permiso?: Permiso
    titulo?: string
  }
}

export function instalarGuard(router: Router) {
  router.beforeEach((to) => {
    const sesion = useSesion()

    if (to.meta.publica) {
      if (to.path === '/login' && sesion.autenticado) return inicioDeRol(sesion.rol)
      return true
    }
    if (!sesion.autenticado) return { path: '/login', query: { redirect: to.fullPath } }
    if (to.meta.permiso && !puede(sesion.rol, to.meta.permiso)) return '/sin-permiso'
    return true
  })
}
