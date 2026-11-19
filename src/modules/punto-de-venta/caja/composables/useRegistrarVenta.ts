import { ref } from 'vue'
import { useOperador } from '@/core/auth/useOperador'
import { registrarVenta } from '../../api/ventas.api'
import type { Pago, Venta } from '../../types/venta.types'
import { useTurno } from '../../turno/composables/useTurno'
import { useCarrito } from './useCarrito'

/** Cierra la venta: la guarda, vacía la cuenta y refresca el efectivo del turno. */
export function useRegistrarVenta() {
  const guardando = ref(false)
  const { operador } = useOperador()
  const { lineas, vaciar } = useCarrito()
  const { recargar, consumirSaltoTope } = useTurno()

  async function registrar(pagos: Pago[]): Promise<Venta> {
    guardando.value = true
    try {
      const venta = await registrarVenta({ lineas: lineas.value, pagos }, operador.value)
      vaciar()
      consumirSaltoTope()
      await recargar()
      return venta
    } finally {
      guardando.value = false
    }
  }

  return { guardando, registrar }
}
