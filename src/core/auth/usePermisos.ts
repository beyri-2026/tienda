import { computed } from 'vue'
import { puede as puedeRol, type Permiso } from './permisos'
import { useSesion } from './sesion.store'

/** Para usar en las vistas: `puede('pos.cobrar')`. El backend siempre vuelve a validar. */
export function usePermisos() {
  const sesion = useSesion()
  const rol = computed(() => sesion.rol)
  const puede = (permiso: Permiso) => puedeRol(sesion.rol, permiso)
  return { rol, puede }
}
