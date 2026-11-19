import { clonar, db, guardar, registrarBitacora, siguienteCodigoEtiqueta } from '@/mock/db'
import { pausa } from '@/mock/latencia'
import { diasDesdeHoy } from '@/core/utils/fechas'
import type { Centavos } from '@/core/utils/dinero'
import type { Producto } from '@/modules/catalogo/types/producto.types'
import type { EtiquetaMostrador } from '../types/mostrador.types'

export interface Operador {
  id: string
  nombre: string
}

/** Productos que se venden por peso en el mostrador. */
export async function productosDeMostrador(): Promise<Producto[]> {
  await pausa(20)
  return clonar(db().productos.filter((p) => p.activo && p.unidad === 'kg'))
}

export async function listarEtiquetas(): Promise<EtiquetaMostrador[]> {
  await pausa(20)
  return clonar([...db().etiquetas].sort((a, b) => b.fechaCorte.localeCompare(a.fechaCorte)))
}

export interface EntradaEtiqueta {
  productoId: string
  pesoGramos: number
  precioCentavos: Centavos
}

/**
 * Crea la etiqueta (folio único de un solo uso). El peso sale del lote a granel
 * y pasa a "empacado"; la caducidad = fecha de corte + días de vida del producto.
 */
export async function crearEtiqueta(entrada: EntradaEtiqueta, operador: Operador): Promise<EtiquetaMostrador> {
  await pausa(80)
  const d = db()
  const prod = d.productos.find((p) => p.id === entrada.productoId && p.unidad === 'kg')
  if (!prod) throw new Error('Producto de mostrador no encontrado')
  if (entrada.pesoGramos <= 0) throw new Error('El peso debe ser mayor a cero')
  if (entrada.precioCentavos <= 0) throw new Error('El precio debe ser mayor a cero')
  if (prod.controlaInventario && entrada.pesoGramos > prod.stock) {
    throw new Error(`Solo hay ${prod.stock} g de ${prod.nombre} en el sistema`)
  }
  if (prod.controlaInventario) prod.stock -= entrada.pesoGramos

  const etiqueta: EtiquetaMostrador = {
    codigo: siguienteCodigoEtiqueta(),
    productoId: prod.id,
    nombre: prod.nombre,
    pesoGramos: entrada.pesoGramos,
    precioCentavos: entrada.precioCentavos,
    iva: prod.iva,
    fechaCorte: new Date().toISOString(),
    caducaEl: diasDesdeHoy(prod.diasVidaCortado ?? 5),
    estado: 'disponible',
  }
  d.etiquetas.push(etiqueta)
  registrarBitacora({
    usuarioId: operador.id,
    usuarioNombre: operador.nombre,
    accion: 'etiqueta_creada',
    detalle: `${etiqueta.codigo} · ${prod.nombre} ${entrada.pesoGramos} g`,
  })
  guardar()
  return clonar(etiqueta)
}

/** Merma de una etiqueta (se echó a perder, se rompió o el cliente no la tomó). Motivo obligatorio. */
export async function registrarMerma(codigo: string, motivo: string, operador: Operador): Promise<void> {
  await pausa(60)
  const d = db()
  const e = d.etiquetas.find((x) => x.codigo === codigo)
  if (!e) throw new Error('Etiqueta no encontrada')
  if (e.estado !== 'disponible') throw new Error('Solo se puede registrar merma de etiquetas disponibles')
  if (!motivo.trim()) throw new Error('El motivo es obligatorio')
  e.estado = 'merma'
  e.motivoMerma = motivo.trim()
  registrarBitacora({
    usuarioId: operador.id,
    usuarioNombre: operador.nombre,
    accion: 'merma_etiqueta',
    detalle: `${e.codigo} · ${e.nombre} ${e.pesoGramos} g`,
    motivo: motivo.trim(),
  })
  guardar()
}
