import { ANCHO_TERMICO, centrar, envolver, izqDer } from '@/core/utils/anchoFijo'
import { formatear, formatearConSigno, sumar } from '@/core/utils/dinero'
import { fechaCorta, fechaHora, horaCompleta } from '@/core/utils/fechas'
import { formatearKg } from '@/core/utils/peso'
import type { Configuracion } from '@/modules/catalogo/types/producto.types'
import type { LineaVenta, Venta } from '../types/venta.types'
import type { MovimientoEfectivo, ResumenTurno, TramoCorte } from '../types/turno.types'

/** Ticket térmico de 80 mm: ~32 caracteres por línea. */
export const ANCHO_TICKET = ANCHO_TERMICO
const SEP = '-'.repeat(ANCHO_TICKET)

function encabezado(cfg: Configuracion): string[] {
  return [
    centrar(cfg.negocioNombre),
    centrar(cfg.sucursalNombre),
    ...envolver(cfg.direccion).map(centrar),
    centrar(`Tel: ${cfg.telefono}`),
    SEP,
  ]
}

function lineaDeProducto(l: LineaVenta): string[] {
  const importe = formatear(l.importeCentavos)
  const salida: string[] = []

  if (l.tipo === 'peso' || l.tipo === 'etiqueta') {
    const texto = `${l.nombre} ${formatearKg(l.pesoGramos ?? 0)}kg`
    if (texto.length + importe.length + 1 <= ANCHO_TICKET) salida.push(izqDer(texto, importe))
    else {
      salida.push(texto.slice(0, ANCHO_TICKET))
      salida.push(izqDer('', importe))
    }
    return salida
  }

  const cant = String(l.cantidad)
  if (l.nombre.length <= 17) {
    salida.push(l.nombre.padEnd(17) + cant.padStart(3) + importe.padStart(12))
  } else {
    salida.push(l.nombre.slice(0, ANCHO_TICKET))
    salida.push(' '.repeat(17) + cant.padStart(3) + importe.padStart(12))
  }
  if (l.precioAnteriorCentavos) salida.push(` PROMO · antes ${formatear(l.precioAnteriorCentavos)}`)
  else if (l.cantidad > 1) salida.push(` ${formatear(l.precioUnitarioCentavos)} c/u`)
  return salida
}

function bloqueDePago(v: Venta): string[] {
  const L: string[] = ['FORMA DE PAGO']
  const mostrado = (p: Venta['pagos'][number]) =>
    p.metodo === 'efectivo' ? (p.recibidoCentavos ?? p.montoCentavos) : p.montoCentavos

  for (const p of v.pagos) {
    if (p.metodo === 'efectivo') L.push(izqDer('Efectivo', formatear(mostrado(p))))
    else if (p.metodo === 'tarjeta') {
      L.push(izqDer(`Tarjeta ${p.tarjeta?.tipo === 'credito' ? 'crédito' : 'débito'}`, formatear(mostrado(p))))
      L.push(`  ${p.tarjeta?.marca ?? ''} ****${p.tarjeta?.ultimos4 ?? ''}`)
      L.push(`  Aut: ${p.tarjeta?.autorizacion ?? ''}`)
    }
  }
  const hayEfectivo = v.pagos.some((p) => p.metodo === 'efectivo')
  if (v.pagos.length > 1) {
    L.push(SEP)
    L.push(izqDer('Total pagado', formatear(sumar(v.pagos.map(mostrado)))))
    L.push(izqDer('Cambio', formatear(v.cambioCentavos)))
  } else if (hayEfectivo) {
    L.push(izqDer('Cambio', formatear(v.cambioCentavos)))
  }
  return L
}

/** Ticket completo de una venta. `copia` marca la reimpresión. */
export function construirTicket(v: Venta, cfg: Configuracion, copia = false): string {
  const L: string[] = []
  if (copia) L.push(centrar('*** COPIA ***'))
  if (v.estado === 'cancelada') L.push(centrar('*** VENTA CANCELADA ***'))
  L.push(...encabezado(cfg))
  L.push(izqDer(`Folio: ${v.folio}`, v.cajaNombre))
  L.push(izqDer(fechaCorta(v.fecha), horaCompleta(v.fecha)))
  L.push(`Cajero: ${v.cajeroNombre}`)
  L.push(SEP)

  for (const l of v.lineas) L.push(...lineaDeProducto(l))
  L.push(SEP)

  const articulos = v.lineas.reduce((n, l) => n + (l.tipo === 'producto' ? l.cantidad : 1), 0)
  L.push(`Artículos: ${articulos}`)
  L.push(izqDer('Subtotal', formatear(v.subtotalCentavos)))
  L.push(izqDer('IVA', formatear(v.ivaCentavos)))
  if (v.redondeoCentavos !== 0) L.push(izqDer('Redondeo', formatearConSigno(v.redondeoCentavos)))
  L.push(izqDer('TOTAL', formatear(v.totalCentavos)))
  L.push(SEP)
  L.push(...bloqueDePago(v))

  if (v.devoluciones.length) {
    L.push(SEP, 'DEVOLUCIONES')
    for (const d of v.devoluciones) L.push(izqDer(fechaCorta(d.fecha), `-${formatear(d.totalCentavos)}`))
  }

  L.push(SEP)
  if (v.ahorroCentavos > 0) L.push(centrar(`Ahorraste ${formatear(v.ahorroCentavos)} en promos`))
  L.push(centrar(cfg.mensajeTicket))
  L.push(centrar('[código de barras]'))
  L.push(centrar(v.folio))
  return L.join('\n')
}

/** Parte un nombre en líneas de hasta `n` caracteres (por palabras). */
function partir(texto: string, n: number): string[] {
  const salida: string[] = []
  let actual = ''
  for (const palabra of texto.split(/\s+/).filter(Boolean)) {
    if ((actual + ' ' + palabra).trim().length <= n) actual = (actual + ' ' + palabra).trim()
    else {
      if (actual) salida.push(actual)
      actual = palabra.slice(0, n)
    }
  }
  if (actual) salida.push(actual)
  return salida
}

/** Dos firmas lado a lado: quien entrega y quien recibe. */
function firmasEntregaRecibe(entrega: string, recibe: string): string[] {
  const col = 15
  const a = partir(entrega, col)
  const b = partir(recibe, col)
  const filas = Math.max(a.length, b.length, 1)
  const L = [
    'Entregó'.padEnd(col + 2) + 'Recibió',
    '',
    '',
    '_'.repeat(col) + '  ' + '_'.repeat(col),
  ]
  for (let i = 0; i < filas; i++) L.push((a[i] ?? '').padEnd(col + 2) + (b[i] ?? ''))
  return L
}

/** Comprobante de retiro de efectivo, con dos firmas: entrega y recibe. */
export function construirComprobanteMovimiento(
  mov: MovimientoEfectivo,
  turno: { cajaNombre: string; cajeroNombre: string },
  cfg: Configuracion,
): string {
  return [
    ...encabezado(cfg),
    centrar('RETIRO DE EFECTIVO'),
    SEP,
    izqDer(fechaCorta(mov.fecha), horaCompleta(mov.fecha)),
    `${turno.cajaNombre} · Cajero: ${turno.cajeroNombre}`,
    izqDer('Total retirado', formatear(mov.montoCentavos)),
    `Motivo: ${mov.motivo}`,
    SEP,
    ...firmasEntregaRecibe(turno.cajeroNombre, mov.autorizoNombre ?? ''),
  ].join('\n')
}

/** Motivo de retiro que se reporta aparte en el corte. */
export const MOTIVO_PROVEEDOR = 'Pago a proveedor'

/** Resumen que pide el corte: retiros parciales (sin pagos a proveedor), efectivo, tarjeta y pagos a proveedor. */
export function resumenCorte(r: ResumenTurno) {
  const retiros = r.turno.movimientos.filter((m) => m.tipo === 'retiro')
  const proveedor = retiros.filter((m) => m.motivo === MOTIVO_PROVEEDOR)
  const parciales = retiros.filter((m) => m.motivo !== MOTIVO_PROVEEDOR)
  const suma = (l: typeof retiros) => l.reduce((a, m) => a + m.montoCentavos, 0)
  return {
    nombre: r.turno.cajeroNombre,
    retirosParcialesCentavos: suma(parciales),
    efectivoCentavos: r.efectivo.ventasCentavos - r.efectivo.devolucionesCentavos,
    tarjetaCentavos: r.tarjeta.netoCentavos,
    proveedorCentavos: suma(proveedor),
  }
}

/** Comprobante de corte de caja (separado por método de pago). */
export function construirComprobanteCorte(r: ResumenTurno, cfg: Configuracion): string {
  const t = r.turno
  const L: string[] = [
    ...encabezado(cfg),
    centrar(t.estado === 'cerrado' ? 'CORTE DE CAJA' : 'CORTE PARCIAL (turno abierto)'),
    SEP,
    `${t.cajaNombre} · Cajero: ${t.cajeroNombre}`,
    `Abrió:  ${fechaHora(t.abiertoEn)}`,
  ]
  if (t.cierre) L.push(`Cerró:  ${fechaHora(t.cierre.cerradoEn)}`)
  if (t.cierre?.recibioNombre) L.push(`Recibió efectivo: ${t.cierre.recibioNombre}`)
  const rc = resumenCorte(r)
  L.push(
    SEP,
    'RESUMEN DEL CORTE',
    izqDer('Nombre', rc.nombre),
    izqDer('Retiros parciales', formatear(rc.retirosParcialesCentavos)),
    izqDer('Total efectivo', formatear(rc.efectivoCentavos)),
    izqDer('Total tarjeta', formatear(rc.tarjetaCentavos)),
    izqDer('Pago a proveedores', formatear(rc.proveedorCentavos)),
    SEP,
    izqDer('Ventas cobradas', String(r.ventasCobradas)),
    izqDer('Ventas canceladas', String(r.ventasCanceladas)),
    izqDer('Total vendido', formatear(r.totalVendidoCentavos)),
    izqDer('Redondeo acumulado', formatearConSigno(r.redondeoCentavos)),
    SEP,
    'EFECTIVO',
    izqDer('Fondo', formatear(r.efectivo.fondoCentavos)),
    izqDer('Ventas en efectivo', formatear(r.efectivo.ventasCentavos)),
    izqDer('Devoluciones', `-${formatear(r.efectivo.devolucionesCentavos)}`),
    izqDer('Retiros', `-${formatear(r.efectivo.retirosCentavos)}`),
    izqDer('Esperado en caja', formatear(r.efectivo.esperadoCentavos)),
  )
  if (t.cierre) {
    const dif = t.cierre.diferenciaCentavos
    L.push(
      izqDer('Contado', formatear(t.cierre.contadoEfectivoCentavos)),
      izqDer(dif < 0 ? 'FALTANTE' : dif > 0 ? 'SOBRANTE' : 'Diferencia', formatear(Math.abs(dif))),
    )
  }
  L.push(
    SEP,
    'TARJETA (conciliar con terminal)',
    izqDer('Cobrado', formatear(r.tarjeta.ventasCentavos)),
    izqDer('Devuelto', `-${formatear(r.tarjeta.devolucionesCentavos)}`),
    izqDer('Neto', formatear(r.tarjeta.netoCentavos)),
    SEP,
  )
  if (r.tramos.length > 1) L.push(...lineasTramos(r.tramos))
  return L.join('\n')
}

/** Detalle por tramos: un bloque por cada corte parcial y uno final. */
function lineasTramos(tramos: TramoCorte[]): string[] {
  const hora = (f: string) => horaCompleta(f).slice(0, 5)
  const L: string[] = ['DETALLE POR CORTES']
  for (const t of tramos) {
    L.push(
      SEP,
      t.tipo === 'parcial' ? `CORTE PARCIAL ${t.numero}` : 'TRAMO FINAL (cierre)',
      `${hora(t.desde)} a ${hora(t.hasta)} · ${t.operadorNombre}`,
      izqDer('Ventas', String(t.ventasCobradas)),
      izqDer('Efectivo', formatear(t.efectivoVentasCentavos)),
      izqDer('Devoluciones ef.', `-${formatear(t.efectivoDevolucionesCentavos)}`),
      izqDer('Retiros', `-${formatear(t.retirosCentavos)}`),
      izqDer('Tarjeta neto', formatear(t.tarjetaNetoCentavos)),
    )
  }
  L.push(SEP)
  return L
}

/** Comprobante de cierre para el cajero (a ciegas): sin esperado, sin diferencia y sin ventas. */
export function construirComprobanteCierre(r: ResumenTurno, cfg: Configuracion): string {
  const t = r.turno
  return [
    ...encabezado(cfg),
    centrar('CIERRE DE TURNO'),
    SEP,
    `${t.cajaNombre} · Cajero: ${t.cajeroNombre}`,
    `Abrió:  ${fechaHora(t.abiertoEn)}`,
    t.cierre ? `Cerró:  ${fechaHora(t.cierre.cerradoEn)}` : '',
    SEP,
    izqDer('Efectivo entregado', formatear(t.cierre?.contadoEfectivoCentavos ?? 0)),
    SEP,
    ...firmasEntregaRecibe(t.cajeroNombre, t.cierre?.recibioNombre ?? ''),
  ].join('\n')
}

/** Aviso de corte parcial para el cajero (a ciegas). */
export function construirComprobanteParcialCajero(numero: number, fecha: string, cajero: string, cfg: Configuracion): string {
  return [
    ...encabezado(cfg),
    centrar(`CORTE PARCIAL ${numero}`),
    SEP,
    izqDer(fechaCorta(fecha), horaCompleta(fecha)),
    `Cajero: ${cajero}`,
    SEP,
  ].join('\n')
}
