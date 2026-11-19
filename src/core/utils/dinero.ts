/**
 * Todo el dinero del sistema se maneja en CENTAVOS ENTEROS.
 * Nunca se usan decimales flotantes para calcular; solo se convierte a pesos al mostrar.
 */
export type Centavos = number

export const aCentavos = (pesos: number): Centavos => Math.round(pesos * 100)
export const aPesos = (c: Centavos): number => c / 100

const formato = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })

/** 12345 → "$123.45" */
export const formatear = (c: Centavos): string => formato.format(c / 100)

/** Para redondeos y diferencias: +$0.20 / -$0.20 */
export const formatearConSigno = (c: Centavos): string =>
  `${c < 0 ? '-' : '+'}${formatear(Math.abs(c))}`

export const sumar = (valores: Centavos[]): Centavos => valores.reduce((a, b) => a + b, 0)
