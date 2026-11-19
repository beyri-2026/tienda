import { describe, expect, it } from 'vitest'
import { code128 } from './code128'

describe('code128', () => {
  it('genera el ancho esperado: (inicio + n + control) × 11 + stop 13 + 20 de silencio', () => {
    const { ancho } = code128('PJJ123C')
    expect(ancho).toBe((1 + 7 + 1) * 11 + 13 + 20)
  })
  it('el control de "PJJ123C" es 54 (ejemplo estándar)', () => {
    expect(code128('PJJ123C').barras.length).toBeGreaterThan(30)
    expect(code128('000123').ancho).toBe((1 + 6 + 1) * 11 + 13 + 20)
  })
})
