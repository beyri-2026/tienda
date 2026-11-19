import { computed, ref } from 'vue'
import { uid } from '@/core/utils/texto'
import { precioPorPeso } from '@/core/utils/peso'
import { diasParaFecha } from '@/core/utils/fechas'
import type { Producto } from '@/modules/catalogo/types/producto.types'
import { resolverCodigo } from '../../api/codigos.api'
import { calcularTotales } from '../../utils/totales'
import type { LineaVenta } from '../../types/venta.types'

/** Error esperado de la caja (código no registrado, folio usado…): se muestra como aviso. */
export class ErrorCaja extends Error {}

export interface VentaEnEspera {
  id: string
  creadaEn: string
  lineas: LineaVenta[]
}

export interface ResultadoAgregar {
  mensaje: string
  /** Si el producto se vende por peso, la pantalla debe pedir el peso. */
  requierePeso?: Producto
  /** Se pidió una cantidad pero el código no es un producto normal (folio, etiqueta, peso): no se multiplicó. */
  cantidadIgnorada?: boolean
}

// Estado de la cuenta: vive a nivel de módulo para no perderse al cambiar de pantalla.
const lineas = ref<LineaVenta[]>([])
const espera = ref<VentaEnEspera[]>([])

const totales = computed(() => calcularTotales(lineas.value))

function codigosEnUso(): Set<string> {
  const usados = new Set<string>()
  for (const l of lineas.value) if (l.codigoFolio) usados.add(l.codigoFolio)
  for (const e of espera.value) for (const l of e.lineas) if (l.codigoFolio) usados.add(l.codigoFolio)
  return usados
}

function agregarProducto(p: Producto, cantidad = 1) {
  const existente = lineas.value.find((l) => l.tipo === 'producto' && l.productoId === p.id)
  if (existente) {
    existente.cantidad += cantidad
    existente.importeCentavos = existente.precioUnitarioCentavos * existente.cantidad
    return
  }
  lineas.value.push({
    id: uid('l'),
    tipo: 'producto',
    productoId: p.id,
    nombre: p.nombre,
    cantidad,
    precioUnitarioCentavos: p.precioCentavos,
    importeCentavos: p.precioCentavos * cantidad,
    iva: p.iva,
  })
}

function agregarPeso(p: Producto, gramos: number) {
  lineas.value.push({
    id: uid('l'),
    tipo: 'peso',
    productoId: p.id,
    nombre: p.nombre,
    cantidad: 1,
    pesoGramos: gramos,
    precioUnitarioCentavos: p.precioCentavos,
    importeCentavos: precioPorPeso(gramos, p.precioCentavos),
    iva: p.iva,
  })
}

/** Procesa lo escaneado o tecleado: producto, folio de promoción/paquete o etiqueta de mostrador. */
async function agregarPorCodigo(texto: string, cantidad = 1): Promise<ResultadoAgregar> {
  const r = await resolverCodigo(texto)

  if (r.tipo === 'desconocido') throw new ErrorCaja(`El código "${texto.trim()}" no está registrado`)

  if (r.tipo === 'producto') {
    if (r.producto.unidad === 'kg') {
      return { mensaje: `${r.producto.nombre} se vende por peso`, requierePeso: r.producto, cantidadIgnorada: cantidad > 1 }
    }
    agregarProducto(r.producto, cantidad)
    return { mensaje: cantidad > 1 ? `${cantidad} × ${r.producto.nombre} agregados` : `${r.producto.nombre} agregado` }
  }

  if (codigosEnUso().has(texto.trim().toUpperCase())) {
    throw new ErrorCaja(`El código ${texto.trim().toUpperCase()} ya está en la cuenta (o en una venta en espera)`)
  }

  if (r.tipo === 'folio') {
    const f = r.folio
    if (f.estado === 'usado') throw new ErrorCaja(`El folio ${f.codigo} ya se cobró. No se puede reutilizar.`)
    if (f.estado === 'inactivo') throw new ErrorCaja(`El folio ${f.codigo} no está activado. Se activa al pegarlo en la pieza.`)
    if (f.estado === 'vencido' || diasParaFecha(f.caducaEl) < 0) {
      throw new ErrorCaja(`El folio ${f.codigo} está vencido. Retira la etiqueta y el producto.`)
    }
    lineas.value.push({
      id: uid('l'),
      tipo: f.tipo,
      productoId: f.productoId,
      codigoFolio: f.codigo,
      nombre: f.nombre,
      cantidad: 1,
      precioUnitarioCentavos: f.precioCentavos,
      precioAnteriorCentavos: f.precioAnteriorCentavos,
      importeCentavos: f.precioCentavos,
      iva: f.iva,
    })
    return { mensaje: f.tipo === 'promo' ? `PROMO aplicada: ${f.nombre}` : `${f.nombre} agregado`, cantidadIgnorada: cantidad > 1 }
  }

  const e = r.etiqueta
  if (e.estado === 'vendida') throw new ErrorCaja(`La etiqueta ${e.codigo} ya se cobró. No se puede reutilizar.`)
  if (e.estado === 'merma') throw new ErrorCaja(`La etiqueta ${e.codigo} se dio de baja como merma.`)
  if (diasParaFecha(e.caducaEl) < 0) throw new ErrorCaja(`La etiqueta ${e.codigo} está vencida. Registra la merma.`)
  lineas.value.push({
    id: uid('l'),
    tipo: 'etiqueta',
    productoId: e.productoId,
    codigoFolio: e.codigo,
    nombre: e.nombre,
    cantidad: 1,
    pesoGramos: e.pesoGramos,
    precioUnitarioCentavos: e.precioCentavos,
    importeCentavos: e.precioCentavos,
    iva: e.iva,
  })
  return { mensaje: `${e.nombre} (mostrador) agregado`, cantidadIgnorada: cantidad > 1 }
}

function cambiarCantidad(id: string, delta: number) {
  const l = lineas.value.find((x) => x.id === id)
  if (!l || l.tipo !== 'producto') return
  l.cantidad = Math.max(1, l.cantidad + delta)
  l.importeCentavos = l.precioUnitarioCentavos * l.cantidad
}

/** Fija la cantidad exacta (1-999) tecleada en la línea. */
function fijarCantidad(id: string, cantidad: number) {
  const l = lineas.value.find((x) => x.id === id)
  if (!l || l.tipo !== 'producto' || !Number.isFinite(cantidad)) return
  l.cantidad = Math.min(999, Math.max(1, Math.trunc(cantidad)))
  l.importeCentavos = l.precioUnitarioCentavos * l.cantidad
}

const quitar = (id: string) => {
  lineas.value = lineas.value.filter((l) => l.id !== id)
}
const vaciar = () => {
  lineas.value = []
}

function ponerEnEspera() {
  if (lineas.value.length === 0) return
  espera.value.push({ id: uid('esp'), creadaEn: new Date().toISOString(), lineas: lineas.value })
  lineas.value = []
}

function retomar(id: string) {
  if (lineas.value.length > 0) throw new ErrorCaja('Cobra o pon en espera la cuenta actual antes de retomar otra')
  const e = espera.value.find((x) => x.id === id)
  if (!e) return
  lineas.value = e.lineas
  espera.value = espera.value.filter((x) => x.id !== id)
}

const eliminarEspera = (id: string) => {
  espera.value = espera.value.filter((x) => x.id !== id)
}

export function useCarrito() {
  return {
    lineas,
    espera,
    totales,
    agregarPorCodigo,
    agregarProducto,
    agregarPeso,
    cambiarCantidad,
    fijarCantidad,
    quitar,
    vaciar,
    ponerEnEspera,
    retomar,
    eliminarEspera,
  }
}
