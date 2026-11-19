import { computed, ref } from 'vue'
import { normalizar } from '@/core/utils/texto'
import * as api from '../../api/ventas.api'
import type { EntradaDevolucion } from '../../api/ventas.api'
import type { Operador } from '../../api/turnos.api'
import type { Autorizacion, EstadoVenta, Venta } from '../../types/venta.types'

export const ETIQUETA_ESTADO: Record<EstadoVenta, string> = {
  cobrada: 'Cobrada',
  cancelada: 'Cancelada',
  devolucion_parcial: 'Devolución parcial',
  devuelta: 'Devuelta',
}

export function useVentas() {
  const ventas = ref<Venta[]>([])
  const cargando = ref(false)
  const busqueda = ref('')
  const estado = ref<EstadoVenta | null>(null)
  const caja = ref<string | null>(null)
  const cajasConVentas = computed(() => [...new Set(ventas.value.map((v) => v.cajaNombre))].sort())

  async function cargar() {
    cargando.value = true
    try {
      ventas.value = await api.listarVentas()
    } finally {
      cargando.value = false
    }
  }

  const filtradas = computed(() => {
    const q = normalizar(busqueda.value)
    return ventas.value.filter((v) => {
      if (estado.value && v.estado !== estado.value) return false
      if (caja.value && v.cajaNombre !== caja.value) return false
      if (!q) return true
      return (
        v.folio.includes(q) ||
        normalizar(v.cajeroNombre).includes(q) ||
        v.lineas.some((l) => normalizar(l.nombre).includes(q))
      )
    })
  })

  async function cancelar(ventaId: string, autorizacion: Autorizacion, operador: Operador) {
    const v = await api.cancelarVenta(ventaId, autorizacion, operador)
    await cargar()
    return v
  }

  async function devolver(ventaId: string, entrada: EntradaDevolucion, operador: Operador) {
    const v = await api.devolver(ventaId, entrada, operador)
    await cargar()
    return v
  }

  return { ventas, filtradas, cargando, busqueda, estado, caja, cajasConVentas, cargar, cancelar, devolver }
}
