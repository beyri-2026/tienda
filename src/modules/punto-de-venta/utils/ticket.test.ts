import { describe, expect, it } from 'vitest'
import { ANCHO_TICKET, construirComprobanteCierre, construirComprobanteCorte, construirTicket } from './ticket'
import { calcularTotales } from './totales'
import type { Configuracion } from '@/modules/catalogo/types/producto.types'
import type { LineaVenta, Venta } from '../types/venta.types'
import type { ResumenTurno } from '../types/turno.types'

const cfg: Configuracion = {
  negocioNombre: 'TU TIENDA',
  sucursalId: 's',
  sucursalNombre: 'Sucursal Centro',
  direccion: 'Calle Ejemplo 123, Col. Centro',
  telefono: '000 000 0000',
  cajaId: 'c',
  cajaNombre: 'Caja 1',
  topeEfectivoCentavos: 300000,
  avisoTopePorc: 0.8,
  fondoSugeridoCentavos: 100000,
  toleranciaPeso: 0.05,
  mensajeTicket: '¡Gracias por su compra!',
}

const lineas: LineaVenta[] = [
  { id: '1', tipo: 'producto', productoId: 'a', nombre: 'Leche entera 1L', cantidad: 2, precioUnitarioCentavos: 4000, importeCentavos: 8000, iva: 'iva0' },
  { id: '2', tipo: 'producto', productoId: 'b', nombre: 'Papas fritas 45g', cantidad: 1, precioUnitarioCentavos: 2200, importeCentavos: 2200, iva: 'iva16' },
  { id: '3', tipo: 'producto', productoId: 'c', nombre: 'Refresco 600ml', cantidad: 1, precioUnitarioCentavos: 1800, importeCentavos: 1800, iva: 'iva16' },
  { id: '4', tipo: 'promo', codigoFolio: 'P-0001', nombre: 'Aceite vegetal 1L', cantidad: 1, precioUnitarioCentavos: 3500, precioAnteriorCentavos: 4250, importeCentavos: 3500, iva: 'iva0' },
  { id: '5', tipo: 'etiqueta', codigoFolio: 'M-000001', nombre: 'Jamón de pavo', cantidad: 1, pesoGramos: 94, precioUnitarioCentavos: 1500, importeCentavos: 1500, iva: 'iva16' },
]

function ventaDe(pagos: Venta['pagos'], redondeo = 0): Venta {
  const t = calcularTotales(lineas)
  return {
    id: 'v1',
    folio: '000126',
    sucursalNombre: 'Sucursal Centro',
    cajaNombre: 'Caja 1',
    turnoId: 't',
    cajeroId: 'u',
    cajeroNombre: 'María López',
    fecha: '2026-11-16T18:40:17.000Z',
    lineas,
    subtotalCentavos: t.subtotalCentavos,
    ivaCentavos: t.ivaCentavos,
    redondeoCentavos: redondeo,
    totalCentavos: t.totalCentavos + redondeo,
    pagos,
    cambioCentavos: 0,
    ahorroCentavos: t.ahorroCentavos,
    estado: 'cobrada',
    devoluciones: [],
  }
}

describe('ticket', () => {
  it('ninguna línea excede el ancho de 32 caracteres', () => {
    const v = ventaDe([
      { metodo: 'efectivo', montoCentavos: 5000, recibidoCentavos: 5000, cambioCentavos: 0 },
      { metodo: 'tarjeta', montoCentavos: v0Total() - 5000, tarjeta: { tipo: 'debito', marca: 'Mastercard', ultimos4: '8810', autorizacion: '773102' } },
    ])
    for (const linea of construirTicket(v, cfg).split('\n')) {
      expect(linea.length).toBeLessThanOrEqual(ANCHO_TICKET)
    }
  })

  it('muestra subtotal, IVA y total, y la forma de pago mixta', () => {
    const v = ventaDe([
      { metodo: 'efectivo', montoCentavos: 5000, recibidoCentavos: 5000, cambioCentavos: 0 },
      { metodo: 'tarjeta', montoCentavos: v0Total() - 5000, tarjeta: { tipo: 'debito', marca: 'Mastercard', ultimos4: '8810', autorizacion: '773102' } },
    ])
    const texto = construirTicket(v, cfg)
    expect(texto).toContain('Subtotal')
    expect(texto).toContain('IVA')
    expect(texto).toContain('TOTAL')
    expect(texto).toContain('Mastercard ****8810')
    expect(texto).toContain('Aut: 773102')
    expect(texto).toContain('Total pagado')
    expect(texto).toContain('PROMO')
    expect(texto).toContain('0.094kg')
  })

  it('muestra el redondeo solo cuando existe y marca la copia', () => {
    const sin = construirTicket(ventaDe([{ metodo: 'efectivo', montoCentavos: v0Total(), recibidoCentavos: v0Total(), cambioCentavos: 0 }]), cfg)
    expect(sin).not.toContain('Redondeo')
    expect(sin).not.toContain('COPIA')

    const con = construirTicket(ventaDe([{ metodo: 'efectivo', montoCentavos: v0Total() + 20, recibidoCentavos: 10000, cambioCentavos: 0 }], 20), cfg, true)
    expect(con).toContain('Redondeo')
    expect(con).toContain('+$0.20')
    expect(con).toContain('*** COPIA ***')
  })
})

function v0Total(): number {
  return calcularTotales(lineas).totalCentavos
}

const resumenCerrado: ResumenTurno = {
  turno: {
    id: 't', sucursalId: 's', cajaId: 'c', cajaNombre: 'Caja 1', cajeroId: 'u', cajeroNombre: 'María López',
    abiertoEn: '2026-11-16T14:00:00.000Z', fondoCentavos: 100000, estado: 'cerrado', movimientos: [],
    cierre: { cerradoEn: '2026-11-16T22:00:00.000Z', recibioNombre: 'Ana Gerente', contadoEfectivoCentavos: 95000, esperadoEfectivoCentavos: 100000, diferenciaCentavos: -5000 },
  },
  ventasCobradas: 3, ventasCanceladas: 0, totalVendidoCentavos: 12000, redondeoCentavos: 0,
  efectivo: { fondoCentavos: 100000, ventasCentavos: 8000, devolucionesCentavos: 0, retirosCentavos: 8000, esperadoCentavos: 100000 },
  tarjeta: { ventasCentavos: 4000, devolucionesCentavos: 0, netoCentavos: 4000 },
  tramos: [
    { numero: 1, tipo: 'parcial', desde: '2026-11-16T14:00:00.000Z', hasta: '2026-11-16T18:00:00.000Z', operadorNombre: 'María López', ventasCobradas: 2, efectivoVentasCentavos: 6000, efectivoDevolucionesCentavos: 0, retirosCentavos: 8000, tarjetaNetoCentavos: 0 },
    { numero: 2, tipo: 'final', desde: '2026-11-16T18:00:00.000Z', hasta: '2026-11-16T22:00:00.000Z', operadorNombre: 'María López', ventasCobradas: 1, efectivoVentasCentavos: 2000, efectivoDevolucionesCentavos: 0, retirosCentavos: 0, tarjetaNetoCentavos: 4000 },
  ],
}

describe('corte', () => {
  it('el comprobante completo trae el detalle por cortes y la diferencia', () => {
    const t = construirComprobanteCorte(resumenCerrado, cfg)
    expect(t).toContain('DETALLE POR CORTES')
    expect(t).toContain('CORTE PARCIAL 1')
    expect(t).toContain('TRAMO FINAL')
    expect(t).toContain('FALTANTE')
    expect(t).not.toContain('TRANSFERENCIA')
  })

  it('el comprobante del cajero no muestra esperado, diferencia ni ventas', () => {
    const t = construirComprobanteCierre(resumenCerrado, cfg)
    expect(t).toContain('Efectivo entregado')
    expect(t).toContain('Ana Gerente') // firma de quien recibió
    expect(t).not.toMatch(/FALTANTE|SOBRANTE|Esperado|Total vendido|Tarjeta/i)
  })
})
