import type { Permiso } from '@/core/auth/permisos'

export interface OpcionMenu {
  texto: string
  icono: string
  ruta: string
  permiso: Permiso
}

export interface GrupoMenu {
  texto: string
  icono: string
  hijos: OpcionMenu[]
}

/** Grupos desplegables; cada opción lleva su permiso y AppMenu filtra con puede(). */
export const MENU: GrupoMenu[] = [
  {
    texto: 'Ventas',
    icono: 'pi pi-shopping-cart',
    hijos: [
      { texto: 'Caja', icono: 'pi pi-calculator', ruta: '/caja', permiso: 'pos.cobrar' },
      { texto: 'Turno y corte', icono: 'pi pi-wallet', ruta: '/turno', permiso: 'pos.turno' },
      { texto: 'Historial de ventas', icono: 'pi pi-receipt', ruta: '/ventas', permiso: 'pos.consultar' },
    ],
  },
  {
    texto: 'Mostrador',
    icono: 'pi pi-tag',
    hijos: [{ texto: 'Etiquetas y cortes', icono: 'pi pi-tag', ruta: '/mostrador', permiso: 'mostrador.usar' }],
  },
  {
    texto: 'Configuración',
    icono: 'pi pi-cog',
    hijos: [{ texto: 'Esta computadora', icono: 'pi pi-desktop', ruta: '/equipo', permiso: 'equipo.configurar' }],
  },
]
