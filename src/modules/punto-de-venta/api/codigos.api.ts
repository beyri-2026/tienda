import { clonar, db } from '@/mock/db'
import { pausa } from '@/mock/latencia'
import type { Producto } from '@/modules/catalogo/types/producto.types'
import type { EtiquetaMostrador } from '@/modules/mostrador/types/mostrador.types'
import type { CodigoResuelto, FolioPromo } from '../types/venta.types'

/**
 * Reconoce qué es un código escaneado: folio de promoción/paquete, etiqueta de
 * mostrador o producto normal. En el backend real esto lo resuelve el servidor.
 */
export async function resolverCodigo(codigoBruto: string): Promise<CodigoResuelto> {
  await pausa(20)
  const codigo = codigoBruto.trim().toUpperCase()
  const d = db()

  const folio = d.folios.find((f) => f.codigo === codigo)
  if (folio) return { tipo: 'folio', folio: clonar(folio) }

  const etiqueta = d.etiquetas.find((e) => e.codigo === codigo)
  if (etiqueta) return { tipo: 'etiqueta', etiqueta: clonar(etiqueta) }

  const producto = d.productos.find((p) => p.activo && p.codigos.includes(codigoBruto.trim()))
  if (producto) return { tipo: 'producto', producto: clonar(producto) }

  return { tipo: 'desconocido' }
}

export interface CodigosDePrueba {
  productos: { nombre: string; codigo: string; unidad: Producto['unidad'] }[]
  folios: FolioPromo[]
  etiquetas: EtiquetaMostrador[]
}

/** Solo demo: códigos para "escanear" sin lector físico. */
export async function codigosDePrueba(): Promise<CodigosDePrueba> {
  await pausa(20)
  const d = db()
  return clonar({
    productos: d.productos
      .filter((p) => p.activo)
      .map((p) => ({ nombre: p.nombre, codigo: p.codigos[0], unidad: p.unidad })),
    folios: d.folios,
    etiquetas: d.etiquetas.filter((e) => e.estado === 'disponible'),
  })
}
