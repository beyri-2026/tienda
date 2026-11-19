import { uid } from '@/core/utils/texto'
import type { BaseDatos, Caja, Equipo } from './semilla'

/**
 * Identidad de ESTA computadora (demo). En el backend real el equipo se registra una vez
 * y el servidor lo reconoce por su identificador; aquí se guarda en el navegador.
 */
const CLAVE = 'tiendas.equipo.id'
let enMemoria: string | null = null

export function idEquipo(): string {
  if (enMemoria) return enMemoria
  try {
    enMemoria = localStorage.getItem(CLAVE)
    if (!enMemoria) {
      enMemoria = uid('eq')
      localStorage.setItem(CLAVE, enMemoria)
    }
  } catch {
    enMemoria ??= uid('eq')
  }
  return enMemoria
}

export const equipoActual = (d: BaseDatos): Equipo | null => d.equipos.find((e) => e.id === idEquipo()) ?? null

export function cajaDeEstaComputadora(d: BaseDatos): Caja | null {
  const eq = equipoActual(d)
  return eq ? (d.cajas.find((c) => c.id === eq.cajaId) ?? null) : null
}

/** El turno abierto de la caja a la que está vinculada esta computadora. */
export function turnoAbiertoDeEstaCaja(d: BaseDatos) {
  const caja = cajaDeEstaComputadora(d)
  return caja ? d.turnos.find((t) => t.estado === 'abierto' && t.cajaId === caja.id) : undefined
}
