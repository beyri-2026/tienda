import type { Centavos } from './dinero'

/** Peso (en gramos) que corresponde a un monto: "dame $15 de jamón". */
export const pesoObjetivoGramos = (montoCentavos: Centavos, precioKgCentavos: Centavos): number =>
  (montoCentavos / precioKgCentavos) * 1000

/** Precio de un peso real (en gramos). */
export const precioPorPeso = (gramos: number, precioKgCentavos: Centavos): Centavos =>
  Math.round((gramos * precioKgCentavos) / 1000)

export interface EvaluacionPeso {
  dentro: boolean
  minGramos: number
  maxGramos: number
}

/** ¿El peso real quedó dentro de la tolerancia (por ejemplo 5 %) del peso objetivo? */
export function evaluarTolerancia(
  objetivoGramos: number,
  realGramos: number,
  tolerancia: number,
): EvaluacionPeso {
  const minGramos = objetivoGramos * (1 - tolerancia)
  const maxGramos = objetivoGramos * (1 + tolerancia)
  return { dentro: realGramos >= minGramos && realGramos <= maxGramos, minGramos, maxGramos }
}

export const formatearKg = (gramos: number): string => (gramos / 1000).toFixed(3)
