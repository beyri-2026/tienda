import { computed, ref } from 'vue'
import { useOperador } from '@/core/auth/useOperador'
import { aCentavos } from '@/core/utils/dinero'
import { diasDesdeHoy } from '@/core/utils/fechas'
import { evaluarTolerancia, pesoObjetivoGramos, precioPorPeso } from '@/core/utils/peso'
import { useConfiguracion } from '@/modules/catalogo/composables/useConfiguracion'
import type { Producto } from '@/modules/catalogo/types/producto.types'
import * as api from '../api/mostrador.api'
import type { EtiquetaMostrador } from '../types/mostrador.types'

export type ModoPedido = 'peso' | 'monto'

/**
 * Mostrador de jamón y quesos: pedido por peso o por monto ("dame $15"),
 * tolerancia de peso configurable y etiqueta con folio único.
 */
export function useMostrador() {
  const { configuracion, cargar: cargarConfiguracion } = useConfiguracion()
  const { operador } = useOperador()

  const productos = ref<Producto[]>([])
  const etiquetas = ref<EtiquetaMostrador[]>([])
  const productoId = ref<string | null>(null)
  const modo = ref<ModoPedido>('monto')
  const montoPesos = ref<number | null>(null)
  const pesoGramos = ref<number | null>(null)
  const guardando = ref(false)

  const producto = computed(() => productos.value.find((p) => p.id === productoId.value) ?? null)
  const montoCentavos = computed(() => aCentavos(montoPesos.value ?? 0))

  /** "Dame $15": cuántos gramos hay que cortar. */
  const objetivoGramos = computed(() =>
    producto.value && modo.value === 'monto' && montoCentavos.value > 0
      ? pesoObjetivoGramos(montoCentavos.value, producto.value.precioCentavos)
      : null,
  )

  const evaluacion = computed(() =>
    objetivoGramos.value && pesoGramos.value && configuracion.value
      ? evaluarTolerancia(objetivoGramos.value, pesoGramos.value, configuracion.value.toleranciaPeso)
      : null,
  )

  const precioPesoReal = computed(() =>
    producto.value && pesoGramos.value ? precioPorPeso(pesoGramos.value, producto.value.precioCentavos) : 0,
  )

  /** Dentro de la tolerancia se cobra EXACTAMENTE el monto pedido; fuera, el peso real. */
  const cobraMontoPedido = computed(() => modo.value === 'monto' && !!evaluacion.value?.dentro)
  const precioFinal = computed(() => (cobraMontoPedido.value ? montoCentavos.value : precioPesoReal.value))

  const caducaEl = computed(() => (producto.value ? diasDesdeHoy(producto.value.diasVidaCortado ?? 5) : null))

  const puedeImprimir = computed(
    () =>
      !!producto.value &&
      !!pesoGramos.value &&
      pesoGramos.value > 0 &&
      precioFinal.value > 0 &&
      (modo.value === 'peso' || montoCentavos.value > 0),
  )

  async function cargar() {
    await cargarConfiguracion()
    productos.value = await api.productosDeMostrador()
    etiquetas.value = await api.listarEtiquetas()
    if (!productoId.value) productoId.value = productos.value[0]?.id ?? null
  }

  /** Simula la báscula: un corte cercano al objetivo (hasta ±8 %). */
  function simularCorte() {
    if (objetivoGramos.value) {
      pesoGramos.value = Math.round(objetivoGramos.value * (1 + (Math.random() * 2 - 1) * 0.08))
    } else {
      pesoGramos.value = Math.round(60 + Math.random() * 240)
    }
  }

  function ajustarPeso(delta: number) {
    pesoGramos.value = Math.max(0, (pesoGramos.value ?? 0) + delta)
  }

  async function imprimir(): Promise<EtiquetaMostrador> {
    if (!producto.value || !pesoGramos.value) throw new Error('Falta el peso')
    guardando.value = true
    try {
      const e = await api.crearEtiqueta(
        { productoId: producto.value.id, pesoGramos: Math.round(pesoGramos.value), precioCentavos: precioFinal.value },
        operador.value,
      )
      pesoGramos.value = null
      montoPesos.value = null
      await cargar()
      return e
    } finally {
      guardando.value = false
    }
  }

  async function merma(codigo: string, motivo: string) {
    await api.registrarMerma(codigo, motivo, operador.value)
    await cargar()
  }

  const precioKgDe = (id: string) => productos.value.find((p) => p.id === id)?.precioCentavos ?? 0

  return {
    configuracion,
    productos,
    etiquetas,
    productoId,
    producto,
    modo,
    montoPesos,
    montoCentavos,
    pesoGramos,
    objetivoGramos,
    evaluacion,
    precioPesoReal,
    cobraMontoPedido,
    precioFinal,
    caducaEl,
    puedeImprimir,
    guardando,
    cargar,
    simularCorte,
    ajustarPeso,
    imprimir,
    merma,
    precioKgDe,
  }
}
