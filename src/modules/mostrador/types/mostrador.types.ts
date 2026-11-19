import type { Centavos } from '@/core/utils/dinero'
import type { TipoIva } from '@/core/utils/impuestos'

export type EstadoEtiqueta = 'disponible' | 'vendida' | 'merma'

/** Etiqueta de mostrador: folio único de un solo uso (jamón, queso, salchicha…). */
export interface EtiquetaMostrador {
  codigo: string
  productoId: string
  nombre: string
  pesoGramos: number
  precioCentavos: Centavos
  iva: TipoIva
  /** ISO del momento del corte */
  fechaCorte: string
  /** yyyy-mm-dd: fecha de corte + días de vida configurados */
  caducaEl: string
  estado: EstadoEtiqueta
  ventaId?: string
  motivoMerma?: string
}
