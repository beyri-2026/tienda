import { ref } from 'vue'
import { codigosDePrueba, type CodigosDePrueba } from '../../api/codigos.api'

/** Solo demo: códigos para "escanear" sin lector físico. */
export function useCodigosPrueba() {
  const codigos = ref<CodigosDePrueba | null>(null)
  async function cargar() {
    codigos.value = await codigosDePrueba()
  }
  return { codigos, cargar }
}
