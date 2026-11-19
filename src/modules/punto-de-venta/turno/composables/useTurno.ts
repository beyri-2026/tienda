import { computed, ref } from 'vue'
import { puede } from '@/core/auth/permisos'
import { useSesion } from '@/core/auth/sesion.store'
import type { Centavos } from '@/core/utils/dinero'
import { useConfiguracion } from '@/modules/catalogo/composables/useConfiguracion'
import * as api from '../../api/turnos.api'
import type { Operador, EntradaMovimiento } from '../../api/turnos.api'
import type { Autorizacion } from '../../types/venta.types'
import type { CorteParcial, MovimientoEfectivo, ResumenTurno, Turno } from '../../types/turno.types'

export type NivelTope = 'normal' | 'aviso' | 'bloqueado'

// Estado a nivel de módulo: Caja y Turno comparten el mismo turno.
const turno = ref<Turno | null>(null)
const resumen = ref<ResumenTurno | null>(null)
const cargado = ref(false)
/** El dueño autorizó seguir vendiendo aunque se pasó el tope (hasta el próximo retiro o venta). */
const topeSaltado = ref(false)

export function useTurno() {
  const { configuracion, cargar: cargarConfiguracion } = useConfiguracion()

  async function recargar() {
    await cargarConfiguracion()
    turno.value = await api.turnoAbierto()
    resumen.value = turno.value ? await api.resumenTurno(turno.value.id) : null
    cargado.value = true
  }

  const efectivoEnCaja = computed<Centavos>(() => resumen.value?.efectivo.esperadoCentavos ?? 0)

  const porcentajeTope = computed(() => {
    const tope = configuracion.value?.topeEfectivoCentavos
    return tope ? Math.min(100, Math.round((efectivoEnCaja.value / tope) * 100)) : 0
  })

  const nivelTope = computed<NivelTope>(() => {
    const cfg = configuracion.value
    if (!cfg || !turno.value) return 'normal'
    if (efectivoEnCaja.value >= cfg.topeEfectivoCentavos) return topeSaltado.value ? 'aviso' : 'bloqueado'
    if (efectivoEnCaja.value >= cfg.topeEfectivoCentavos * cfg.avisoTopePorc) return 'aviso'
    return 'normal'
  })

  /**
   * Corte a ciegas: la cajera NUNCA ve cuánto debería haber en caja (ni al llegar al tope);
   * así tiene que contar y declarar lo real. Solo dueño y gerente ven la cifra.
   */
  const verEfectivo = computed(() => puede(useSesion().rol, 'pos.verCorte'))

  async function avisoTopeVisto(decision: 'retiro' | 'despues', operador: Operador) {
    if (turno.value) await api.registrarAvisoTope(turno.value.id, decision, operador)
  }

  async function abrir(fondoCentavos: Centavos, operador: Operador) {
    await api.abrirTurno(fondoCentavos, operador)
    await recargar()
  }

  /** Registra un retiro y devuelve el movimiento creado (para el comprobante). */
  async function registrarMovimiento(
    mov: EntradaMovimiento,
    operador: Operador,
    autorizacion?: Autorizacion,
  ): Promise<MovimientoEfectivo | undefined> {
    if (!turno.value) throw new Error('No hay un turno abierto')
    await api.registrarMovimiento(turno.value.id, mov, operador, autorizacion)
    if (mov.tipo === 'retiro') topeSaltado.value = false
    await recargar()
    return turno.value?.movimientos.at(-1)
  }

  /** Registra un corte parcial (el turno sigue abierto). */
  async function cortarParcial(operador: Operador): Promise<CorteParcial> {
    if (!turno.value) throw new Error('No hay un turno abierto')
    const c = await api.registrarCorteParcial(turno.value.id, operador)
    await recargar()
    return c
  }

  async function cerrar(
    contadoEfectivoCentavos: Centavos,
    operador: Operador,
    receptor: { id: string; nombre: string },
  ): Promise<ResumenTurno> {
    if (!turno.value) throw new Error('No hay un turno abierto')
    const r = await api.cerrarTurno(turno.value.id, contadoEfectivoCentavos, operador, receptor)
    topeSaltado.value = false
    await recargar()
    return r
  }

  const saltarTope = () => {
    topeSaltado.value = true
  }
  const consumirSaltoTope = () => {
    topeSaltado.value = false
  }

  return {
    turno,
    resumen,
    cargado,
    configuracion,
    efectivoEnCaja,
    porcentajeTope,
    nivelTope,
    verEfectivo,
    recargar,
    abrir,
    registrarMovimiento,
    cortarParcial,
    avisoTopeVisto,
    cerrar,
    saltarTope,
    consumirSaltoTope,
  }
}
