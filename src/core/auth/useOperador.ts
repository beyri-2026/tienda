import { computed } from 'vue'
import { useSesion } from './sesion.store'

/** Quién está operando la caja: es lo que se manda a las APIs para la bitácora. */
export function useOperador() {
  const sesion = useSesion()
  const operador = computed(() => ({
    id: sesion.usuario?.id ?? '',
    nombre: sesion.usuario?.nombre ?? '',
  }))
  return { operador }
}
