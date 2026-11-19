import { ref, watch } from 'vue'
import { buscarProductos } from '@/modules/catalogo/api/productos.api'
import type { Producto } from '@/modules/catalogo/types/producto.types'

/** Búsqueda de productos por nombre o código mientras se escribe. */
export function useBuscador() {
  const texto = ref('')
  const resultados = ref<Producto[]>([])
  let temporizador: ReturnType<typeof setTimeout> | undefined
  let ultima = 0

  watch(texto, (valor) => {
    clearTimeout(temporizador)
    if (valor.trim().length < 2) {
      resultados.value = []
      return
    }
    temporizador = setTimeout(async () => {
      const id = ++ultima
      const r = await buscarProductos(valor)
      if (id === ultima) resultados.value = r // ignora respuestas viejas
    }, 120)
  })

  function limpiar() {
    clearTimeout(temporizador)
    texto.value = ''
    resultados.value = []
  }

  return { texto, resultados, limpiar }
}
