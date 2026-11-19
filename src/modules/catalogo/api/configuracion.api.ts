import { clonar, db } from '@/mock/db'
import { pausa } from '@/mock/latencia'
import type { Configuracion } from '../types/producto.types'

export async function obtenerConfiguracion(): Promise<Configuracion> {
  await pausa(20)
  return clonar(db().configuracion)
}
