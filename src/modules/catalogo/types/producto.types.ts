import type { Centavos } from '@/core/utils/dinero'
import type { TipoIva } from '@/core/utils/impuestos'

export type Unidad = 'pieza' | 'kg'

export interface Producto {
  id: string
  nombre: string
  /** Un producto puede tener varios códigos de barras */
  codigos: string[]
  categoria: string
  unidad: Unidad
  /** Precio por pieza, o por kilo si la unidad es kg */
  precioCentavos: Centavos
  costoCentavos: Centavos
  iva: TipoIva
  /** false para bolsas y otros cargos que no llevan inventario */
  controlaInventario: boolean
  /** Piezas, o gramos si la unidad es kg */
  stock: number
  /** Días de vida una vez cortado (solo productos de mostrador) */
  diasVidaCortado?: number
  activo: boolean
}

export interface Configuracion {
  negocioNombre: string
  sucursalId: string
  sucursalNombre: string
  direccion: string
  telefono: string
  cajaId: string
  cajaNombre: string
  /** Efectivo máximo en caja antes de exigir un retiro */
  topeEfectivoCentavos: Centavos
  /** Porcentaje del tope en que se muestra el aviso (0.8 = 80 %) */
  avisoTopePorc: number
  fondoSugeridoCentavos: Centavos
  /** Tolerancia de peso en el mostrador (0.05 = 5 %) */
  toleranciaPeso: number
  mensajeTicket: string
}
