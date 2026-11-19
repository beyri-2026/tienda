import { clonar, db, guardar, registrarBitacora } from '@/mock/db'
import { cajaDeEstaComputadora, turnoAbiertoDeEstaCaja } from '@/mock/equipo'
import { pausa } from '@/mock/latencia'
import { uid } from '@/core/utils/texto'
import { sumar, type Centavos } from '@/core/utils/dinero'
import type { Autorizacion, MetodoPago } from '../types/venta.types'
import type { CorteParcial, ResumenTurno, TramoCorte, Turno } from '../types/turno.types'

export interface Operador {
  id: string
  nombre: string
}

/** Totales del turno entre dos instantes (desde exclusivo, hasta inclusivo). */
function calcularTramos(turno: Turno): TramoCorte[] {
  const d = db()
  const ventas = d.ventas.filter((v) => v.turnoId === turno.id && v.estado !== 'cancelada')
  const devs = d.ventas.flatMap((v) => v.devoluciones).filter((x) => x.turnoId === turno.id)
  const parciales = turno.cortesParciales ?? []
  const fin = turno.cierre?.cerradoEn ?? new Date().toISOString()
  const limites = [turno.abiertoEn, ...parciales.map((c) => c.fecha), fin]
  const dentro = (f: string, a: string, b: string, primero: boolean) =>
    (primero ? Date.parse(f) >= Date.parse(a) : Date.parse(f) > Date.parse(a)) && Date.parse(f) <= Date.parse(b)

  return limites.slice(0, -1).map((desde, i) => {
    const hasta = limites[i + 1]!
    const final = i === parciales.length
    const vs = ventas.filter((v) => dentro(v.fecha, desde, hasta, i === 0))
    const monto = (m: MetodoPago) => sumar(vs.flatMap((v) => v.pagos.filter((p) => p.metodo === m).map((p) => p.montoCentavos)))
    const dv = (m: MetodoPago) =>
      sumar(devs.filter((x) => x.metodo === m && dentro(x.fecha, desde, hasta, i === 0)).map((x) => x.totalCentavos))
    return {
      numero: i + 1,
      tipo: final ? 'final' : 'parcial',
      desde,
      hasta,
      operadorNombre: final ? (turno.cierre?.operadorNombre ?? turno.cajeroNombre) : (parciales[i]?.operadorNombre ?? ''),
      ventasCobradas: vs.length,
      efectivoVentasCentavos: monto('efectivo'),
      efectivoDevolucionesCentavos: dv('efectivo'),
      retirosCentavos: sumar(
        turno.movimientos.filter((m) => m.tipo === 'retiro' && dentro(m.fecha, desde, hasta, i === 0)).map((m) => m.montoCentavos),
      ),
      tarjetaNetoCentavos: monto('tarjeta') - dv('tarjeta'),
    }
  })
}

function calcularResumen(turno: Turno): ResumenTurno {
  const d = db()
  const delTurno = d.ventas.filter((v) => v.turnoId === turno.id)
  const cobradas = delTurno.filter((v) => v.estado !== 'cancelada')
  const canceladas = delTurno.filter((v) => v.estado === 'cancelada')

  const ventasPor = (m: MetodoPago): Centavos =>
    sumar(cobradas.flatMap((v) => v.pagos.filter((p) => p.metodo === m).map((p) => p.montoCentavos)))

  const devoluciones = d.ventas.flatMap((v) => v.devoluciones).filter((x) => x.turnoId === turno.id)
  const devPor = (m: MetodoPago): Centavos =>
    sumar(devoluciones.filter((x) => x.metodo === m).map((x) => x.totalCentavos))

  const retiros = sumar(turno.movimientos.filter((m) => m.tipo === 'retiro').map((m) => m.montoCentavos))

  const efVentas = ventasPor('efectivo')
  const efDev = devPor('efectivo')

  return {
    turno: clonar(turno),
    ventasCobradas: cobradas.length,
    ventasCanceladas: canceladas.length,
    totalVendidoCentavos: sumar(cobradas.map((v) => v.totalCentavos)),
    redondeoCentavos: sumar(cobradas.map((v) => v.redondeoCentavos)),
    efectivo: {
      fondoCentavos: turno.fondoCentavos,
      ventasCentavos: efVentas,
      devolucionesCentavos: efDev,
      retirosCentavos: retiros,
      // fondo + ventas − devoluciones − retiros
      esperadoCentavos: turno.fondoCentavos + efVentas - efDev - retiros,
    },
    tarjeta: {
      ventasCentavos: ventasPor('tarjeta'),
      devolucionesCentavos: devPor('tarjeta'),
      netoCentavos: ventasPor('tarjeta') - devPor('tarjeta'),
    },
    tramos: calcularTramos(turno),
  }
}

export async function turnoAbierto(): Promise<Turno | null> {
  await pausa(20)
  const t = turnoAbiertoDeEstaCaja(db())
  return t ? clonar(t) : null
}

export async function abrirTurno(fondoCentavos: Centavos, operador: Operador): Promise<Turno> {
  await pausa(60)
  const d = db()
  if (fondoCentavos < 0) throw new Error('El fondo de caja no puede ser negativo')
  const caja = cajaDeEstaComputadora(d)
  if (!caja) throw new Error('Esta computadora no está vinculada a una caja. Pide al gerente que la configure.')
  const abierto = d.turnos.find((t) => t.estado === 'abierto' && t.cajaId === caja.id)
  if (abierto) throw new Error(`${caja.nombre} ya tiene un turno abierto (${abierto.cajeroNombre}). Hay que cerrarlo primero.`)
  const turno: Turno = {
    id: uid('turno'),
    sucursalId: d.configuracion.sucursalId,
    cajaId: caja.id,
    cajaNombre: caja.nombre,
    cajeroId: operador.id,
    cajeroNombre: operador.nombre,
    abiertoEn: new Date().toISOString(),
    fondoCentavos,
    estado: 'abierto',
    movimientos: [],
  }
  d.turnos.push(turno)
  registrarBitacora({
    usuarioId: operador.id,
    usuarioNombre: operador.nombre,
    accion: 'turno_abierto',
    detalle: `Fondo de caja ${fondoCentavos / 100}`,
  })
  guardar()
  return clonar(turno)
}

export interface EntradaMovimiento {
  tipo: 'retiro'
  montoCentavos: Centavos
  motivo: string
}

export async function registrarMovimiento(
  turnoId: string,
  mov: EntradaMovimiento,
  operador: Operador,
  autorizacion?: Autorizacion,
): Promise<void> {
  await pausa(60)
  const d = db()
  const turno = d.turnos.find((t) => t.id === turnoId && t.estado === 'abierto')
  if (!turno) throw new Error('El turno no está abierto')
  if (mov.montoCentavos <= 0) throw new Error('El monto debe ser mayor a cero')
  if (!mov.motivo.trim()) throw new Error('El motivo es obligatorio')
  // Mensaje deliberadamente sin cifras: la cajera no debe enterarse de cuánto hay en caja.
  if (mov.montoCentavos > calcularResumen(turno).efectivo.esperadoCentavos) throw new Error('No hay esa cantidad en esta caja')
  turno.movimientos.push({
    id: uid('mov'),
    tipo: mov.tipo,
    montoCentavos: mov.montoCentavos,
    motivo: mov.motivo.trim(),
    fecha: new Date().toISOString(),
    autorizoId: autorizacion?.autorizoId,
    autorizoNombre: autorizacion?.autorizoNombre,
  })
  registrarBitacora({
    usuarioId: operador.id,
    usuarioNombre: operador.nombre,
    accion: 'retiro_efectivo',
    detalle: `${mov.tipo} de ${mov.montoCentavos / 100}`,
    autorizoId: autorizacion?.autorizoId,
    autorizoNombre: autorizacion?.autorizoNombre,
    motivo: mov.motivo.trim(),
  })
  guardar()
}

/** Marca un corte parcial: el turno sigue abierto y el siguiente tramo empieza aquí. */
export async function registrarCorteParcial(turnoId: string, operador: Operador): Promise<CorteParcial> {
  await pausa(60)
  const turno = db().turnos.find((t) => t.id === turnoId && t.estado === 'abierto')
  if (!turno) throw new Error('El turno no está abierto')
  const lista = (turno.cortesParciales ??= [])
  const corte: CorteParcial = {
    id: uid('corte'),
    numero: lista.length + 1,
    fecha: new Date().toISOString(),
    operadorNombre: operador.nombre,
  }
  lista.push(corte)
  registrarBitacora({
    usuarioId: operador.id,
    usuarioNombre: operador.nombre,
    accion: 'corte_parcial',
    detalle: `Corte parcial ${corte.numero}`,
  })
  guardar()
  return clonar(corte)
}

export async function resumenTurno(turnoId: string): Promise<ResumenTurno> {
  await pausa(30)
  const turno = db().turnos.find((t) => t.id === turnoId)
  if (!turno) throw new Error('Turno no encontrado')
  return calcularResumen(turno)
}

export async function cerrarTurno(
  turnoId: string,
  contadoEfectivoCentavos: Centavos,
  operador: Operador,
  receptor: { id: string; nombre: string },
): Promise<ResumenTurno> {
  await pausa(80)
  const turno = db().turnos.find((t) => t.id === turnoId && t.estado === 'abierto')
  if (!turno) throw new Error('El turno no está abierto')
  if (contadoEfectivoCentavos < 0) throw new Error('El efectivo contado no puede ser negativo')

  const esperado = calcularResumen(turno).efectivo.esperadoCentavos
  turno.estado = 'cerrado'
  turno.cierre = {
    cerradoEn: new Date().toISOString(),
    operadorNombre: operador.nombre,
    recibioId: receptor.id,
    recibioNombre: receptor.nombre,
    contadoEfectivoCentavos,
    esperadoEfectivoCentavos: esperado,
    diferenciaCentavos: contadoEfectivoCentavos - esperado,
  }
  registrarBitacora({
    usuarioId: operador.id,
    usuarioNombre: operador.nombre,
    accion: 'turno_cerrado',
    detalle: `Entregó ${contadoEfectivoCentavos / 100}; diferencia de caja ${(contadoEfectivoCentavos - esperado) / 100}`,
    autorizoId: receptor.id,
    autorizoNombre: receptor.nombre,
    motivo: 'Recepción de efectivo al cierre',
  })
  guardar()
  return calcularResumen(turno)
}

/** Deja constancia de que la cajera vio el aviso de tope alcanzado y qué decidió. */
export async function registrarAvisoTope(turnoId: string, decision: 'retiro' | 'despues', operador: Operador): Promise<void> {
  await pausa(20)
  const d = db()
  const turno = d.turnos.find((t) => t.id === turnoId)
  registrarBitacora({
    usuarioId: operador.id,
    usuarioNombre: operador.nombre,
    accion: 'aviso_tope_visto',
    detalle: `${turno?.cajaNombre ?? 'Caja'}: vio el aviso de tope alcanzado y decidió ${decision === 'retiro' ? 'hacer el retiro' : 'dejarlo para después'}`,
  })
}
