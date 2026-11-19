import type { Centavos } from '@/core/utils/dinero'

export interface MovimientoEfectivo {
  id: string
  tipo: 'retiro'
  montoCentavos: Centavos
  motivo: string
  fecha: string
  autorizoId?: string
  autorizoNombre?: string
}

/** Marca de un corte parcial: el turno sigue abierto; los totales se calculan por tramos entre cortes. */
export interface CorteParcial {
  id: string
  numero: number
  fecha: string
  operadorNombre: string
}

/** Totales de un tramo del turno (entre dos cortes). */
export interface TramoCorte {
  numero: number
  tipo: 'parcial' | 'final'
  desde: string
  hasta: string
  operadorNombre: string
  ventasCobradas: number
  efectivoVentasCentavos: Centavos
  efectivoDevolucionesCentavos: Centavos
  retirosCentavos: Centavos
  tarjetaNetoCentavos: Centavos
}

export interface CierreTurno {
  cerradoEn: string
  operadorNombre?: string
  /** Quien recibió el efectivo y validó con su PIN */
  recibioId?: string
  recibioNombre?: string
  contadoEfectivoCentavos: Centavos
  esperadoEfectivoCentavos: Centavos
  /** contado − esperado: negativo = faltante, positivo = sobrante */
  diferenciaCentavos: Centavos
}

export interface Turno {
  id: string
  sucursalId: string
  cajaId: string
  cajaNombre: string
  cajeroId: string
  cajeroNombre: string
  abiertoEn: string
  fondoCentavos: Centavos
  estado: 'abierto' | 'cerrado'
  movimientos: MovimientoEfectivo[]
  cortesParciales?: CorteParcial[]
  cierre?: CierreTurno
}

export interface ResumenTurno {
  turno: Turno
  ventasCobradas: number
  ventasCanceladas: number
  totalVendidoCentavos: Centavos
  redondeoCentavos: Centavos
  efectivo: {
    fondoCentavos: Centavos
    ventasCentavos: Centavos
    devolucionesCentavos: Centavos
    retirosCentavos: Centavos
    esperadoCentavos: Centavos
  }
  tarjeta: { ventasCentavos: Centavos; devolucionesCentavos: Centavos; netoCentavos: Centavos }
  /** Un tramo por cada corte parcial y uno final (desde el último corte hasta el cierre o ahora). */
  tramos: TramoCorte[]
}
