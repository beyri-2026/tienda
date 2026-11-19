import type { Centavos } from './dinero'

/**
 * Los precios que ve el cliente YA incluyen impuestos.
 * El desglose separa cuánto del total es IVA.
 * [CONFIRMAR con el contador] tasas por producto e IEPS (aún no se calcula).
 */
export type TipoIva = 'iva16' | 'iva0' | 'exento'

export const TASA_IVA: Record<TipoIva, number> = { iva16: 0.16, iva0: 0, exento: 0 }
export const ETIQUETA_IVA: Record<TipoIva, string> = {
  iva16: 'IVA 16%',
  iva0: 'Tasa 0%',
  exento: 'Exento',
}

export interface LineaFiscal {
  importeCentavos: Centavos
  iva: TipoIva
}

export interface DesgloseIva {
  /** Suma de importes (ya con impuestos incluidos) */
  totalCentavos: Centavos
  /** Total sin IVA */
  subtotalCentavos: Centavos
  ivaCentavos: Centavos
  base16Centavos: Centavos
  base0Centavos: Centavos
  baseExentoCentavos: Centavos
}

/**
 * Desglosa el IVA agrupando por tasa (una sola regla de redondeo por grupo).
 * Ejemplo: $40.00 con IVA 16% → base $34.48 + IVA $5.52.
 */
export function desglosarIva(lineas: LineaFiscal[]): DesgloseIva {
  let con16 = 0
  let con0 = 0
  let exento = 0
  for (const l of lineas) {
    if (l.iva === 'iva16') con16 += l.importeCentavos
    else if (l.iva === 'iva0') con0 += l.importeCentavos
    else exento += l.importeCentavos
  }
  const base16 = Math.round(con16 / (1 + TASA_IVA.iva16))
  const iva = con16 - base16
  const total = con16 + con0 + exento
  return {
    totalCentavos: total,
    ivaCentavos: iva,
    subtotalCentavos: total - iva,
    base16Centavos: base16,
    base0Centavos: con0,
    baseExentoCentavos: exento,
  }
}
