import { describe, expect, it } from 'vitest'
import { aCentavos, formatear, formatearConSigno, sumar } from './dinero'
import { desglosarIva } from './impuestos'
import { redondearEfectivo } from './redondeo'
import { evaluarTolerancia, pesoObjetivoGramos, precioPorPeso } from './peso'

describe('dinero', () => {
  it('convierte pesos a centavos sin errores de flotante', () => {
    expect(aCentavos(17.4)).toBe(1740)
    expect(aCentavos(0.1 + 0.2)).toBe(30)
    expect(sumar([1740, 1740, 1500])).toBe(4980)
  })
  it('formatea', () => {
    expect(formatear(12345)).toBe('$123.45')
    expect(formatearConSigno(20)).toBe('+$0.20')
    expect(formatearConSigno(-20)).toBe('-$0.20')
  })
})

describe('IVA incluido en el precio', () => {
  it('desglosa el ejemplo del ticket ($120 con $40 gravados al 16 %)', () => {
    const d = desglosarIva([
      { importeCentavos: 8000, iva: 'iva0' },
      { importeCentavos: 2200, iva: 'iva16' },
      { importeCentavos: 1800, iva: 'iva16' },
    ])
    expect(d.totalCentavos).toBe(12000)
    expect(d.ivaCentavos).toBe(552)
    expect(d.subtotalCentavos).toBe(11448)
    expect(d.subtotalCentavos + d.ivaCentavos).toBe(d.totalCentavos)
  })
  it('sin productos gravados no hay IVA', () => {
    const d = desglosarIva([{ importeCentavos: 4000, iva: 'iva0' }])
    expect(d.ivaCentavos).toBe(0)
    expect(d.subtotalCentavos).toBe(4000)
  })
})

describe('redondeo de efectivo a $0.50', () => {
  it.each([
    [7780, 7800, 20],
    [7720, 7700, -20],
    [7740, 7750, 10],
    [7724, 7700, -24],
    [7725, 7750, 25],
    [7774, 7750, -24],
    [7775, 7800, 25],
    [7750, 7750, 0],
    [10000, 10000, 0],
  ])('%i → %i (ajuste %i)', (entrada, esperado, ajuste) => {
    const r = redondearEfectivo(entrada)
    expect(r.totalCentavos).toBe(esperado)
    expect(r.ajusteCentavos).toBe(ajuste)
  })
})

describe('mostrador: peso y tolerancia', () => {
  it('"dame $15" de jamón a $160/kg ≈ 93.75 g', () => {
    expect(pesoObjetivoGramos(1500, 16000)).toBeCloseTo(93.75, 2)
  })
  it('calcula el precio de un peso real', () => {
    expect(precioPorPeso(94, 16000)).toBe(1504)
    expect(precioPorPeso(215, 18000)).toBe(3870)
  })
  it('respeta la tolerancia del 5 %', () => {
    const objetivo = pesoObjetivoGramos(1500, 16000)
    expect(evaluarTolerancia(objetivo, 98, 0.05).dentro).toBe(true)
    expect(evaluarTolerancia(objetivo, 89.5, 0.05).dentro).toBe(true)
    expect(evaluarTolerancia(objetivo, 110, 0.05).dentro).toBe(false)
    expect(evaluarTolerancia(objetivo, 80, 0.05).dentro).toBe(false)
  })
})
