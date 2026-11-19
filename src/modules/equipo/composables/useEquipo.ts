import { computed, ref } from 'vue'
import * as api from '../api/equipo.api'
import type { CajaEstado, EstadoEquipo } from '../api/equipo.api'
import type { Operador } from '@/modules/punto-de-venta/api/turnos.api'
import type { Autorizacion } from '@/modules/punto-de-venta/types/venta.types'

// Estado a nivel de módulo: encabezado, apertura de turno y la pantalla de configuración lo comparten.
const estado = ref<EstadoEquipo | null>(null)
const cajas = ref<CajaEstado[]>([])
const cargado = ref(false)

export function useEquipo() {
  async function cargar() {
    const [e, c] = await Promise.all([api.estadoEquipo(), api.listarCajas()])
    estado.value = e
    cajas.value = c
    cargado.value = true
  }

  const caja = computed(() => estado.value?.caja ?? null)
  const vinculada = computed(() => !!estado.value?.caja)

  async function vincular(cajaId: string, operador: Operador, aut: Autorizacion) {
    await api.vincularEquipo(cajaId, operador, aut)
    await cargar()
  }
  async function desvincular(operador: Operador, aut: Autorizacion) {
    await api.desvincularEquipo(operador, aut)
    await cargar()
  }
  async function agregarCaja(nombre: string, operador: Operador) {
    await api.agregarCaja(nombre, operador)
    await cargar()
  }

  return { estado, cajas, cargado, caja, vinculada, cargar, vincular, desvincular, agregarCaja }
}
