import { pausa } from '@/mock/latencia'
import type { Centavos } from '@/core/utils/dinero'
import type { DatosTarjeta } from '../types/venta.types'

export type ResultadoSimulado = 'aprobada' | 'rechazada' | 'sin_respuesta'

export interface RespuestaTerminal {
  estado: ResultadoSimulado
  mensaje?: string
  tarjeta?: DatosTarjeta
}

/**
 * Conexión INTERCAMBIABLE con la terminal de tarjeta.
 * Hoy: terminal virtual. Mañana: un adaptador del proveedor real con la misma interfaz;
 * la caja, el corte y el ticket no cambian.
 */
export interface TerminalPago {
  cobrar(
    montoCentavos: Centavos,
    simulacion?: { resultado: ResultadoSimulado; tipo: 'debito' | 'credito' },
  ): Promise<RespuestaTerminal>
}

const MARCAS = ['VISA', 'Mastercard']
const aleatorio = (digitos: number) =>
  Array.from({ length: digitos }, () => Math.floor(Math.random() * 10)).join('')

export const terminalVirtual: TerminalPago = {
  async cobrar(_monto, simulacion = { resultado: 'aprobada', tipo: 'debito' }) {
    if (simulacion.resultado === 'sin_respuesta') {
      await pausa(2500)
      return { estado: 'sin_respuesta', mensaje: 'La terminal no respondió. Verifica y vuelve a intentar.' }
    }
    await pausa(1200)
    if (simulacion.resultado === 'rechazada') {
      return { estado: 'rechazada', mensaje: 'Tarjeta rechazada por el banco.' }
    }
    return {
      estado: 'aprobada',
      tarjeta: {
        tipo: simulacion.tipo,
        marca: MARCAS[Math.floor(Math.random() * MARCAS.length)],
        ultimos4: aleatorio(4),
        autorizacion: aleatorio(6),
      },
    }
  },
}

/** La caja usa esta constante; para la terminal real se cambia aquí. */
export const terminal: TerminalPago = terminalVirtual
