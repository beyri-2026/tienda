import type { Centavos } from '@/core/utils/dinero'
import type { TipoIva } from '@/core/utils/impuestos'
import type { Producto } from '@/modules/catalogo/types/producto.types'
import type { EtiquetaMostrador } from '@/modules/mostrador/types/mostrador.types'

export type MetodoPago = 'efectivo' | 'tarjeta'
export const ETIQUETA_METODO: Record<MetodoPago, string> = {
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta',
}

export interface DatosTarjeta {
  tipo: 'debito' | 'credito'
  marca: string
  ultimos4: string
  autorizacion: string
}

export interface Pago {
  metodo: MetodoPago
  /** Monto aplicado a la venta */
  montoCentavos: Centavos
  /** Solo efectivo: lo que entregó el cliente */
  recibidoCentavos?: Centavos
  cambioCentavos?: Centavos
  tarjeta?: DatosTarjeta
}

/** producto normal · peso capturado a mano · folio de promoción · paquete · etiqueta de mostrador */
export type TipoLinea = 'producto' | 'peso' | 'promo' | 'paquete' | 'etiqueta'

export interface LineaVenta {
  id: string
  tipo: TipoLinea
  productoId?: string
  /** Folio de promoción/paquete o código de etiqueta (un solo uso) */
  codigoFolio?: string
  nombre: string
  cantidad: number
  pesoGramos?: number
  precioUnitarioCentavos: Centavos
  importeCentavos: Centavos
  /** Precio normal por unidad, solo en promociones */
  precioAnteriorCentavos?: Centavos
  iva: TipoIva
  /** Cantidad ya devuelta */
  devuelta?: number
}

export interface Autorizacion {
  autorizoId: string
  autorizoNombre: string
  motivo: string
}

export interface Devolucion {
  id: string
  fecha: string
  turnoId: string
  autorizoId: string
  autorizoNombre: string
  motivo: string
  destino: 'inventario' | 'merma'
  metodo: MetodoPago
  lineas: { lineaId: string; nombre: string; cantidad: number; importeCentavos: Centavos }[]
  totalCentavos: Centavos
}

export type EstadoVenta = 'cobrada' | 'cancelada' | 'devolucion_parcial' | 'devuelta'

export interface Venta {
  id: string
  folio: string
  sucursalNombre: string
  cajaNombre: string
  turnoId: string
  cajeroId: string
  cajeroNombre: string
  /** ISO */
  fecha: string
  lineas: LineaVenta[]
  /** Total sin IVA */
  subtotalCentavos: Centavos
  ivaCentavos: Centavos
  /** Ajuste por redondeo de efectivo (puede ser negativo) */
  redondeoCentavos: Centavos
  /** Total cobrado = subtotal + IVA + redondeo */
  totalCentavos: Centavos
  pagos: Pago[]
  cambioCentavos: Centavos
  /** Lo que ahorró el cliente con promociones */
  ahorroCentavos: Centavos
  estado: EstadoVenta
  cancelacion?: Autorizacion & { fecha: string }
  devoluciones: Devolucion[]
}

/** Folio de promoción (una pieza) o de paquete armado por la tienda. */
export type EstadoFolio = 'inactivo' | 'activo' | 'usado' | 'vencido'

export interface FolioPromo {
  codigo: string
  tipo: 'promo' | 'paquete'
  productoId?: string
  nombre: string
  precioCentavos: Centavos
  precioAnteriorCentavos: Centavos
  iva: TipoIva
  /** yyyy-mm-dd */
  caducaEl: string
  estado: EstadoFolio
  ventaId?: string
}

export type CodigoResuelto =
  | { tipo: 'producto'; producto: Producto }
  | { tipo: 'folio'; folio: FolioPromo }
  | { tipo: 'etiqueta'; etiqueta: EtiquetaMostrador }
  | { tipo: 'desconocido' }
