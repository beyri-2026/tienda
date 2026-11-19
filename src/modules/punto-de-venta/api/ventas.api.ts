import { clonar, db, guardar, registrarBitacora, siguienteFolioVenta } from '@/mock/db'
import { turnoAbiertoDeEstaCaja } from '@/mock/equipo'
import { pausa } from '@/mock/latencia'
import { uid } from '@/core/utils/texto'
import { sumar, type Centavos } from '@/core/utils/dinero'
import { desglosarIva } from '@/core/utils/impuestos'
import { redondearEfectivo } from '@/core/utils/redondeo'
import { precioPorPeso } from '@/core/utils/peso'
import { diasParaFecha } from '@/core/utils/fechas'
import type { Autorizacion, Devolucion, LineaVenta, MetodoPago, Pago, Venta } from '../types/venta.types'
import type { Operador } from './turnos.api'

export interface EntradaVenta {
  lineas: LineaVenta[]
  pagos: Pago[]
}

/**
 * Registra una venta. El "servidor" recalcula precios, totales, IVA y redondeo
 * y valida los folios: nunca confía en lo que mande la pantalla.
 */
export async function registrarVenta(entrada: EntradaVenta, operador: Operador): Promise<Venta> {
  await pausa(80)
  const d = db()
  const turno = turnoAbiertoDeEstaCaja(d)
  if (!turno) throw new Error('No hay un turno abierto')
  if (entrada.lineas.length === 0) throw new Error('La cuenta está vacía')

  // 1) Validar y recalcular cada línea con los datos del servidor
  const vistos = new Set<string>()
  const lineas: LineaVenta[] = entrada.lineas.map((l) => {
    const linea: LineaVenta = { ...clonar(l), devuelta: 0 }

    if (linea.codigoFolio) {
      if (vistos.has(linea.codigoFolio)) throw new Error(`El código ${linea.codigoFolio} está repetido en la cuenta`)
      vistos.add(linea.codigoFolio)
    }

    if (linea.tipo === 'etiqueta') {
      const e = d.etiquetas.find((x) => x.codigo === linea.codigoFolio)
      if (!e || e.estado !== 'disponible') throw new Error(`La etiqueta ${linea.codigoFolio} ya no está disponible`)
      if (diasParaFecha(e.caducaEl) < 0) throw new Error(`La etiqueta ${e.codigo} está vencida`)
      linea.nombre = e.nombre
      linea.cantidad = 1
      linea.pesoGramos = e.pesoGramos
      linea.precioUnitarioCentavos = e.precioCentavos
      linea.importeCentavos = e.precioCentavos
      linea.iva = e.iva
    } else if (linea.tipo === 'promo' || linea.tipo === 'paquete') {
      const f = d.folios.find((x) => x.codigo === linea.codigoFolio)
      if (!f || f.estado !== 'activo') throw new Error(`El folio ${linea.codigoFolio} ya no es válido`)
      if (diasParaFecha(f.caducaEl) < 0) throw new Error(`El folio ${f.codigo} está vencido`)
      linea.nombre = f.nombre
      linea.cantidad = 1
      linea.precioUnitarioCentavos = f.precioCentavos
      linea.precioAnteriorCentavos = f.precioAnteriorCentavos
      linea.importeCentavos = f.precioCentavos
      linea.iva = f.iva
    } else {
      const p = d.productos.find((x) => x.id === linea.productoId && x.activo)
      if (!p) throw new Error(`El producto "${linea.nombre}" no existe`)
      linea.nombre = p.nombre
      linea.iva = p.iva
      if (linea.tipo === 'peso') {
        if (!linea.pesoGramos || linea.pesoGramos <= 0) throw new Error('El peso debe ser mayor a cero')
        linea.cantidad = 1
        linea.precioUnitarioCentavos = p.precioCentavos
        linea.importeCentavos = precioPorPeso(linea.pesoGramos, p.precioCentavos)
      } else {
        if (linea.cantidad <= 0) throw new Error('La cantidad debe ser mayor a cero')
        linea.precioUnitarioCentavos = p.precioCentavos
        linea.importeCentavos = p.precioCentavos * linea.cantidad
      }
    }
    return linea
  })

  // 2) Totales, IVA y redondeo (solo si se paga 100 % en efectivo)
  const desglose = desglosarIva(lineas.map((l) => ({ importeCentavos: l.importeCentavos, iva: l.iva })))
  const soloEfectivo = entrada.pagos.length > 0 && entrada.pagos.every((p) => p.metodo === 'efectivo')
  const redondeo = soloEfectivo ? redondearEfectivo(desglose.totalCentavos).ajusteCentavos : 0
  const totalACobrar = desglose.totalCentavos + redondeo

  // 3) Validar pagos
  const pagos: Pago[] = entrada.pagos.map((p) => {
    const pago = clonar(p)
    if (pago.montoCentavos <= 0) throw new Error('Cada pago debe ser mayor a cero')
    if (pago.metodo === 'efectivo') {
      const recibido = pago.recibidoCentavos ?? pago.montoCentavos
      if (recibido < pago.montoCentavos) throw new Error('El efectivo recibido es menor al monto del pago')
      pago.recibidoCentavos = recibido
      pago.cambioCentavos = recibido - pago.montoCentavos
    }
    if (pago.metodo === 'tarjeta' && !pago.tarjeta) throw new Error('El cobro con tarjeta no tiene aprobación')
    return pago
  })
  if (sumar(pagos.map((p) => p.montoCentavos)) !== totalACobrar) {
    throw new Error('Los pagos no coinciden con el total a cobrar')
  }

  // 4) Aplicar cambios: folios usados e inventario
  const ventaId = uid('venta')
  for (const l of lineas) {
    if (l.tipo === 'etiqueta') {
      const e = d.etiquetas.find((x) => x.codigo === l.codigoFolio)!
      e.estado = 'vendida'
      e.ventaId = ventaId
    } else if (l.tipo === 'promo' || l.tipo === 'paquete') {
      const f = d.folios.find((x) => x.codigo === l.codigoFolio)!
      f.estado = 'usado'
      f.ventaId = ventaId
      const prod = d.productos.find((x) => x.id === f.productoId)
      if (prod?.controlaInventario) prod.stock -= 1
    } else {
      const prod = d.productos.find((x) => x.id === l.productoId)
      if (prod?.controlaInventario) prod.stock -= l.tipo === 'peso' ? (l.pesoGramos ?? 0) : l.cantidad
    }
  }

  const venta: Venta = {
    id: ventaId,
    folio: siguienteFolioVenta(),
    sucursalNombre: d.configuracion.sucursalNombre,
    cajaNombre: turno.cajaNombre,
    turnoId: turno.id,
    cajeroId: operador.id,
    cajeroNombre: operador.nombre,
    fecha: new Date().toISOString(),
    lineas,
    subtotalCentavos: desglose.subtotalCentavos,
    ivaCentavos: desglose.ivaCentavos,
    redondeoCentavos: redondeo,
    totalCentavos: totalACobrar,
    pagos,
    cambioCentavos: sumar(pagos.map((p) => p.cambioCentavos ?? 0)),
    ahorroCentavos: sumar(
      lineas.map((l) => (l.precioAnteriorCentavos ? (l.precioAnteriorCentavos - l.precioUnitarioCentavos) * l.cantidad : 0)),
    ),
    estado: 'cobrada',
    devoluciones: [],
  }
  d.ventas.push(venta)
  guardar()
  return clonar(venta)
}

export async function listarVentas(): Promise<Venta[]> {
  await pausa(30)
  return clonar([...db().ventas].sort((a, b) => b.fecha.localeCompare(a.fecha)))
}

export async function obtenerVenta(id: string): Promise<Venta> {
  await pausa(20)
  const v = db().ventas.find((x) => x.id === id)
  if (!v) throw new Error('Venta no encontrada')
  return clonar(v)
}

function reponerInventario(venta: Venta, lineaId?: string, cantidad?: number) {
  const d = db()
  for (const l of venta.lineas) {
    if (lineaId && l.id !== lineaId) continue
    const prod = d.productos.find((p) => p.id === l.productoId)
    if (!prod?.controlaInventario) continue
    if (l.tipo === 'peso') prod.stock += l.pesoGramos ?? 0
    else if (l.tipo === 'producto') prod.stock += cantidad ?? l.cantidad
    else if (l.tipo === 'promo') prod.stock += 1
  }
}

/** Cancela una venta ya cobrada del turno abierto. Nunca se borra: queda registrada. */
export async function cancelarVenta(
  ventaId: string,
  autorizacion: Autorizacion,
  operador: Operador,
): Promise<Venta> {
  await pausa(80)
  const d = db()
  const venta = d.ventas.find((v) => v.id === ventaId)
  if (!venta) throw new Error('Venta no encontrada')
  if (venta.estado !== 'cobrada') throw new Error('Esta venta ya fue cancelada o tiene devoluciones')
  const turno = turnoAbiertoDeEstaCaja(d)
  if (!turno || turno.id !== venta.turnoId) {
    throw new Error('Solo se pueden cancelar ventas del turno abierto. Usa una devolución.')
  }
  if (!autorizacion.motivo.trim()) throw new Error('El motivo es obligatorio')

  venta.estado = 'cancelada'
  venta.cancelacion = { ...autorizacion, fecha: new Date().toISOString() }
  reponerInventario(venta) // los folios usados NO se reactivan
  registrarBitacora({
    usuarioId: operador.id,
    usuarioNombre: operador.nombre,
    accion: 'venta_cancelada',
    detalle: `Venta ${venta.folio} por ${venta.totalCentavos / 100}`,
    autorizoId: autorizacion.autorizoId,
    autorizoNombre: autorizacion.autorizoNombre,
    motivo: autorizacion.motivo,
  })
  guardar()
  return clonar(venta)
}

export interface EntradaDevolucion {
  items: { lineaId: string; cantidad: number }[]
  destino: 'inventario' | 'merma'
  metodo: MetodoPago
  autorizacion: Autorizacion
}

/** Devolución de una venta anterior. Los folios usados NO se reactivan. */
export async function devolver(ventaId: string, entrada: EntradaDevolucion, operador: Operador): Promise<Venta> {
  await pausa(80)
  const d = db()
  const venta = d.ventas.find((v) => v.id === ventaId)
  if (!venta) throw new Error('Venta no encontrada')
  if (venta.estado === 'cancelada' || venta.estado === 'devuelta') throw new Error('Esta venta ya no admite devoluciones')
  const turno = turnoAbiertoDeEstaCaja(d)
  if (!turno) throw new Error('Abre un turno para registrar la devolución')
  if (!entrada.autorizacion.motivo.trim()) throw new Error('El motivo es obligatorio')
  if (!venta.pagos.some((p) => p.metodo === entrada.metodo)) {
    throw new Error('El método de reembolso debe ser uno de los usados en la venta')
  }
  const items = entrada.items.filter((i) => i.cantidad > 0)
  if (items.length === 0) throw new Error('Selecciona al menos un producto a devolver')

  const lineasDev: Devolucion['lineas'] = []
  for (const it of items) {
    const l = venta.lineas.find((x) => x.id === it.lineaId)
    if (!l) throw new Error('Línea de venta no encontrada')
    const disponible = l.cantidad - (l.devuelta ?? 0)
    if (it.cantidad > disponible) throw new Error(`No se puede devolver más de lo vendido de "${l.nombre}"`)
    const importe = Math.round((l.importeCentavos * it.cantidad) / l.cantidad)
    lineasDev.push({ lineaId: l.id, nombre: l.nombre, cantidad: it.cantidad, importeCentavos: importe })
    l.devuelta = (l.devuelta ?? 0) + it.cantidad
    if (entrada.destino === 'inventario') reponerInventario(venta, l.id, it.cantidad)
  }

  const total = sumar(lineasDev.map((x) => x.importeCentavos))
  venta.devoluciones.push({
    id: uid('dev'),
    fecha: new Date().toISOString(),
    turnoId: turno.id,
    autorizoId: entrada.autorizacion.autorizoId,
    autorizoNombre: entrada.autorizacion.autorizoNombre,
    motivo: entrada.autorizacion.motivo,
    destino: entrada.destino,
    metodo: entrada.metodo,
    lineas: lineasDev,
    totalCentavos: total,
  })
  venta.estado = venta.lineas.every((l) => (l.devuelta ?? 0) >= l.cantidad) ? 'devuelta' : 'devolucion_parcial'

  registrarBitacora({
    usuarioId: operador.id,
    usuarioNombre: operador.nombre,
    accion: 'devolucion',
    detalle: `Venta ${venta.folio}: ${(total as Centavos) / 100} a ${entrada.destino}`,
    autorizoId: entrada.autorizacion.autorizoId,
    autorizoNombre: entrada.autorizacion.autorizoNombre,
    motivo: entrada.autorizacion.motivo,
  })
  guardar()
  return clonar(venta)
}
