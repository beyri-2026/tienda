import { computed, ref, type Ref } from 'vue'
import { aCentavos, sumar, type Centavos } from '@/core/utils/dinero'
import { redondearEfectivo } from '@/core/utils/redondeo'
import type { DatosTarjeta, MetodoPago, Pago } from '../../types/venta.types'

export type ModoCobro = 'efectivo' | 'tarjeta' | 'mixto'

/**
 * Lógica del cobro. Recibe el total SIN redondeo de la cuenta.
 * - Efectivo: se redondea a $0.50 (solo si se paga 100 % en efectivo).
 * - Tarjeta: monto exacto.
 * - Mixto: monto exacto repartido entre métodos (sin redondeo; pendiente de definir).
 */
export function useCobro(totalSinRedondeo: Ref<Centavos>) {
  const modo = ref<ModoCobro>('efectivo')
  const recibidoPesos = ref<number | null>(null)

  // Mixto
  const pagosMixto = ref<Pago[]>([])
  const montoMixtoPesos = ref<number | null>(null)

  const redondeo = computed(() =>
    modo.value === 'efectivo' ? redondearEfectivo(totalSinRedondeo.value).ajusteCentavos : 0,
  )
  const totalACobrar = computed(() => totalSinRedondeo.value + redondeo.value)

  // Efectivo
  const recibido = computed(() => aCentavos(recibidoPesos.value ?? 0))
  const cambio = computed(() => Math.max(0, recibido.value - totalACobrar.value))
  const efectivoSuficiente = computed(() => recibido.value >= totalACobrar.value && totalACobrar.value > 0)

  /** Billetes sugeridos: exacto y los siguientes redondos que cubren el total. */
  const sugerencias = computed<Centavos[]>(() => {
    const total = totalACobrar.value
    const lista = new Set<number>([total])
    for (const b of [5000, 10000, 20000, 50000, 100000]) if (b >= total) lista.add(b)
    return [...lista].slice(0, 4)
  })

  // Mixto
  const pagadoMixto = computed(() => sumar(pagosMixto.value.map((p) => p.montoCentavos)))
  const pendienteMixto = computed(() => totalSinRedondeo.value - pagadoMixto.value)
  const hayTarjetaAprobada = computed(() => pagosMixto.value.some((p) => p.metodo === 'tarjeta'))

  function reiniciar() {
    modo.value = 'efectivo'
    recibidoPesos.value = null
    pagosMixto.value = []
    montoMixtoPesos.value = null
  }

  function pagoEfectivoSimple(): Pago {
    return { metodo: 'efectivo', montoCentavos: totalACobrar.value, recibidoCentavos: recibido.value }
  }

  function pagoTarjeta(monto: Centavos, tarjeta: DatosTarjeta): Pago {
    return { metodo: 'tarjeta', montoCentavos: monto, tarjeta }
  }

  /** Monto que se intenta agregar en el mixto (por defecto, lo pendiente). */
  const montoMixtoCentavos = computed(() =>
    montoMixtoPesos.value == null ? pendienteMixto.value : aCentavos(montoMixtoPesos.value),
  )

  function agregarMixto(metodo: MetodoPago, extra?: { tarjeta?: DatosTarjeta }) {
    const pendiente = pendienteMixto.value
    if (pendiente <= 0) return
    const ingresado = montoMixtoCentavos.value
    if (ingresado <= 0) return

    if (metodo === 'efectivo') {
      // Puede entregar más de lo pendiente: la diferencia es cambio
      pagosMixto.value.push({
        metodo,
        montoCentavos: Math.min(ingresado, pendiente),
        recibidoCentavos: ingresado,
      })
    } else if (metodo === 'tarjeta' && extra?.tarjeta) {
      pagosMixto.value.push(pagoTarjeta(Math.min(ingresado, pendiente), extra.tarjeta))
    }
    montoMixtoPesos.value = null
  }

  /** Solo se pueden quitar pagos que no sean tarjeta (una tarjeta aprobada ya se cobró). */
  function quitarMixto(indice: number) {
    if (pagosMixto.value[indice]?.metodo === 'tarjeta') return
    pagosMixto.value.splice(indice, 1)
  }

  return {
    modo,
    recibidoPesos,
    redondeo,
    totalACobrar,
    recibido,
    cambio,
    efectivoSuficiente,
    sugerencias,
    pagosMixto,
    montoMixtoPesos,
    montoMixtoCentavos,
    pagadoMixto,
    pendienteMixto,
    hayTarjetaAprobada,
    reiniciar,
    pagoEfectivoSimple,
    pagoTarjeta,
    agregarMixto,
    quitarMixto,
  }
}
