import { ref } from 'vue'
import { obtenerConfiguracion } from '../api/configuracion.api'
import type { Configuracion } from '../types/producto.types'

// Caché en memoria: se pide una sola vez (igual que los catálogos de la guía).
const configuracion = ref<Configuracion | null>(null)
let pendiente: Promise<void> | null = null

export function useConfiguracion() {
  async function cargar() {
    if (configuracion.value) return
    pendiente ??= obtenerConfiguracion().then((c) => {
      configuracion.value = c
    })
    await pendiente
  }
  return { configuracion, cargar }
}
