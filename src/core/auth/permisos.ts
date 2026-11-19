export type Rol = 'dueno' | 'gerente' | 'cajero' | 'mostrador' | 'almacenista' | 'consulta'

export const ETIQUETA_ROL: Record<Rol, string> = {
  dueno: 'Dueño',
  gerente: 'Gerente',
  cajero: 'Cajero',
  mostrador: 'Mostrador',
  almacenista: 'Almacenista',
  consulta: 'Consulta',
}

const TODOS: readonly Rol[] = ['dueno', 'gerente', 'cajero', 'mostrador', 'almacenista', 'consulta']

/**
 * Mapa de permisos (propuesta inicial; configurable por sucursal más adelante).
 * Los permisos "pos.cancelar / devolver / retirar / saltarTope" son los de QUIEN AUTORIZA:
 * el cajero pide la acción y una persona con el permiso la autoriza con su PIN.
 */
export const PERMISOS = {
  'pos.cobrar': ['dueno', 'gerente', 'cajero'],
  'pos.turno': ['dueno', 'gerente', 'cajero'],
  'pos.consultar': ['dueno', 'gerente', 'cajero', 'consulta'],
  'pos.cancelar': ['dueno', 'gerente'],
  'pos.devolver': ['dueno', 'gerente'],
  'pos.retirar': ['dueno', 'gerente'],
  'pos.saltarTope': ['dueno'],
  /** Recibir el efectivo al cierre de turno (teclea su PIN). */
  'pos.recibirCorte': ['dueno', 'gerente'],
  /** Ver el detalle de los cortes (ventas, esperado y diferencia). El cajero cierra a ciegas. */
  'pos.verCorte': ['dueno', 'gerente'],
  /** Vincular esta computadora a una caja (y administrar las cajas de la tienda). */
  'equipo.configurar': ['dueno', 'gerente'],
  'mostrador.usar': ['dueno', 'gerente', 'mostrador'],
  'mostrador.merma': ['dueno', 'gerente', 'mostrador', 'almacenista'],
  'precios.editar': ['dueno'],
  'costos.ver': ['dueno', 'gerente'],
  miCuenta: TODOS,
} as const satisfies Record<string, readonly Rol[]>

export type Permiso = keyof typeof PERMISOS

export const puede = (rol: Rol | null | undefined, permiso: Permiso): boolean =>
  !!rol && (PERMISOS[permiso] as readonly Rol[]).includes(rol)

/** Pantalla de inicio después del login, según el rol. */
export function inicioDeRol(rol: Rol | null): string {
  if (rol === 'cajero' || rol === 'gerente' || rol === 'dueno') return '/caja'
  if (rol === 'mostrador') return '/mostrador'
  if (rol === 'consulta') return '/ventas'
  return '/inicio'
}
