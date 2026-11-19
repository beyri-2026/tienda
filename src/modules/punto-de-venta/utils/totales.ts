import type { Centavos } from '@/core/utils/dinero'
import { desglosarIva } from '@/core/utils/impuestos'
import type { LineaVenta } from '../types/venta.types'

export interface TotalesCuenta {
  articulos: number
  /** Total sin IVA */
  subtotalCentavos: Centavos
  ivaCentavos: Centavos
  /** Suma de importes (los precios ya incluyen impuestos), sin redondeo */
  totalCentavos: Centavos
  ahorroCentavos: Centavos
}

export function calcularTotales(lineas: LineaVenta[]): TotalesCuenta {
  const d = desglosarIva(lineas.map((l) => ({ importeCentavos: l.importeCentavos, iva: l.iva })))
  return {
    articulos: lineas.reduce((n, l) => n + (l.tipo === 'producto' ? l.cantidad : 1), 0),
    subtotalCentavos: d.subtotalCentavos,
    ivaCentavos: d.ivaCentavos,
    totalCentavos: d.totalCentavos,
    ahorroCentavos: lineas.reduce(
      (a, l) => a + (l.precioAnteriorCentavos ? (l.precioAnteriorCentavos - l.precioUnitarioCentavos) * l.cantidad : 0),
      0,
    ),
  }
}
