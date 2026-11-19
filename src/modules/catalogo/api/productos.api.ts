import { clonar, db } from '@/mock/db'
import { pausa } from '@/mock/latencia'
import { normalizar } from '@/core/utils/texto'
import type { Producto } from '../types/producto.types'

/** Búsqueda por nombre o por código de barras (máximo 8 resultados). */
export async function buscarProductos(texto: string): Promise<Producto[]> {
  await pausa(20)
  const q = normalizar(texto)
  if (q.length < 2) return []
  return clonar(
    db()
      .productos.filter(
        (p) => p.activo && (normalizar(p.nombre).includes(q) || p.codigos.some((c) => c.includes(q))),
      )
      .slice(0, 8),
  )
}

export async function listarProductos(): Promise<Producto[]> {
  await pausa(20)
  return clonar(db().productos.filter((p) => p.activo))
}
