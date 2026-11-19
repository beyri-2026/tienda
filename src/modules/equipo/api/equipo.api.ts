import { clonar, db, guardar, registrarBitacora } from '@/mock/db'
import { cajaDeEstaComputadora, equipoActual, idEquipo } from '@/mock/equipo'
import { pausa } from '@/mock/latencia'
import { uid } from '@/core/utils/texto'
import type { Autorizacion } from '@/modules/punto-de-venta/types/venta.types'
import type { Operador } from '@/modules/punto-de-venta/api/turnos.api'

export interface CajaDeEquipo {
  id: string
  nombre: string
}

export interface EstadoEquipo {
  equipoId: string
  caja: CajaDeEquipo | null
  vinculadoPorNombre?: string
  vinculadoEn?: string
}

export type SituacionCaja = 'esta' | 'otra' | 'libre'

export interface CajaEstado extends CajaDeEquipo {
  situacion: SituacionCaja
  /** Nombre de la computadora vinculada (si hay) */
  equipoNombre?: string
  /** Cajero con turno abierto en esa caja */
  turnoCajero?: string
}

/** Qué caja tiene esta computadora (la identidad del equipo la maneja el backend). */
export async function estadoEquipo(): Promise<EstadoEquipo> {
  await pausa(20)
  const d = db()
  const eq = equipoActual(d)
  const caja = cajaDeEstaComputadora(d)
  return {
    equipoId: idEquipo(),
    caja: caja ? clonar(caja) : null,
    vinculadoPorNombre: eq?.vinculadoPorNombre,
    vinculadoEn: eq?.vinculadoEn,
  }
}

export async function listarCajas(): Promise<CajaEstado[]> {
  await pausa(20)
  const d = db()
  return d.cajas.map((c) => {
    const eq = d.equipos.find((e) => e.cajaId === c.id)
    return {
      ...c,
      situacion: !eq ? 'libre' : eq.id === idEquipo() ? 'esta' : 'otra',
      equipoNombre: eq?.nombre,
      turnoCajero: d.turnos.find((t) => t.estado === 'abierto' && t.cajaId === c.id)?.cajeroNombre,
    }
  })
}

function turnoAbiertoEn(cajaId: string) {
  return db().turnos.find((t) => t.estado === 'abierto' && t.cajaId === cajaId)
}

/** Una computadora ↔ una caja. Requiere autorización (PIN de gerente o dueño). */
export async function vincularEquipo(cajaId: string, operador: Operador, aut: Autorizacion): Promise<void> {
  await pausa(80)
  const d = db()
  const caja = d.cajas.find((c) => c.id === cajaId)
  if (!caja) throw new Error('La caja no existe')
  const actual = cajaDeEstaComputadora(d)
  if (actual && turnoAbiertoEn(actual.id)) throw new Error(`${actual.nombre} tiene un turno abierto. Ciérralo antes de cambiar esta computadora.`)
  if (turnoAbiertoEn(caja.id)) throw new Error(`${caja.nombre} tiene un turno abierto. Ciérralo antes de vincularla a otra computadora.`)

  // Una caja solo puede tener una computadora: la anterior deja de poder abrir turno.
  d.equipos = d.equipos.filter((e) => e.id !== idEquipo() && e.cajaId !== caja.id)
  d.equipos.push({
    id: idEquipo(),
    nombre: `Computadora de ${caja.nombre}`,
    cajaId: caja.id,
    vinculadoPorNombre: aut.autorizoNombre,
    vinculadoEn: new Date().toISOString(),
  })
  registrarBitacora({
    usuarioId: operador.id,
    usuarioNombre: operador.nombre,
    accion: 'equipo_vinculado',
    detalle: `Computadora vinculada a ${caja.nombre}`,
    autorizoId: aut.autorizoId,
    autorizoNombre: aut.autorizoNombre,
    motivo: aut.motivo,
  })
  guardar()
}

export async function desvincularEquipo(operador: Operador, aut: Autorizacion): Promise<void> {
  await pausa(60)
  const d = db()
  const caja = cajaDeEstaComputadora(d)
  if (!caja) return
  if (turnoAbiertoEn(caja.id)) throw new Error(`${caja.nombre} tiene un turno abierto. Ciérralo antes de desvincular.`)
  d.equipos = d.equipos.filter((e) => e.id !== idEquipo())
  registrarBitacora({
    usuarioId: operador.id,
    usuarioNombre: operador.nombre,
    accion: 'equipo_desvinculado',
    detalle: `Computadora desvinculada de ${caja.nombre}`,
    autorizoId: aut.autorizoId,
    autorizoNombre: aut.autorizoNombre,
    motivo: aut.motivo,
  })
  guardar()
}

export async function agregarCaja(nombre: string, operador: Operador): Promise<void> {
  await pausa(60)
  const d = db()
  const limpio = nombre.trim()
  if (!limpio) throw new Error('Escribe el nombre de la caja')
  if (d.cajas.some((c) => c.nombre.toLowerCase() === limpio.toLowerCase())) throw new Error('Ya existe una caja con ese nombre')
  d.cajas.push({ id: uid('caja'), nombre: limpio })
  registrarBitacora({ usuarioId: operador.id, usuarioNombre: operador.nombre, accion: 'caja_creada', detalle: `Caja "${limpio}"` })
  guardar()
}
