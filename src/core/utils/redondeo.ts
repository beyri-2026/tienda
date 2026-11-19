import type { Centavos } from './dinero'

export interface ResultadoRedondeo {
  totalCentavos: Centavos
  ajusteCentavos: Centavos
}

/**
 * Redondeo del efectivo a múltiplos de $0.50 (al más cercano; el empate sube).
 *  .01–.24 → baja a .00 · .25–.74 → .50 · .75–.99 → sube al peso siguiente
 * Se aplica al TOTAL de la venta y solo cuando se paga 100 % en efectivo.
 * [CONFIRMAR con el contador] que la regla sea válida y cómo mostrarla.
 */
export function redondearEfectivo(totalCentavos: Centavos): ResultadoRedondeo {
  const resto = ((totalCentavos % 100) + 100) % 100
  let ajuste: number
  if (resto < 25) ajuste = 0 - resto // (0 - 0 evita el "-0" cuando el total ya es exacto)
  else if (resto < 75) ajuste = 50 - resto
  else ajuste = 100 - resto
  return { totalCentavos: totalCentavos + ajuste, ajusteCentavos: ajuste }
}
