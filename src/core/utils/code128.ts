/**
 * Código de barras Code 128 (juego B) real, legible por cualquier lector.
 * Devuelve las barras como rectángulos en "módulos" (cada módulo = 1 unidad de ancho).
 */
const PATRONES = [
  '212222','222122','222221','121223','121322','131222','122213','122312','132212','221213',
  '221312','231212','112232','122132','122231','113222','123122','123221','223211','221132',
  '221231','213212','223112','312131','311222','321122','321221','312212','322112','322211',
  '212123','212321','232121','111323','131123','131321','112313','132113','132311','211313',
  '231113','231311','112133','112331','132131','113123','113321','133121','313121','211331',
  '231131','213113','213311','213131','311123','311321','331121','312113','312311','332111',
  '314111','221411','431111','111224','111422','121124','121421','141122','141221','112214',
  '112412','122114','122411','142112','142211','241211','221114','413111','241112','134111',
  '111242','121142','121241','114212','124112','124211','411212','421112','421211','212141',
  '214121','412121','111143','111341','131141','114113','114311','411113','411311','113141',
  '114131','311141','411131','211412','211214','211232','2331112',
]
const INICIO_B = 104
const FIN = 106

export interface BarraCodigo {
  x: number
  w: number
}

export function code128(texto: string): { barras: BarraCodigo[]; ancho: number } {
  const valores = [INICIO_B]
  for (const c of texto) {
    const v = c.charCodeAt(0) - 32
    valores.push(v >= 0 && v <= 95 ? v : 0)
  }
  const suma = valores.reduce((s, v, i) => s + v * (i === 0 ? 1 : i), 0)
  valores.push(suma % 103, FIN)

  const barras: BarraCodigo[] = []
  let x = 10 // zona de silencio
  for (const v of valores) {
    const anchos = PATRONES[v].split('').map(Number)
    anchos.forEach((w, i) => {
      if (i % 2 === 0) barras.push({ x, w })
      x += w
    })
  }
  return { barras, ancho: x + 10 }
}

/** SVG listo para insertar (tinta negra, alto en unidades de viewBox). */
export function svgCode128(texto: string, ancho: number, alto: number): string {
  const { barras, ancho: total } = code128(texto)
  const rects = barras.map((b) => `<rect x="${b.x}" y="0" width="${b.w}" height="${alto}"/>`).join('')
  return `<svg viewBox="0 0 ${total} ${alto}" width="${ancho}" height="${alto}" preserveAspectRatio="none" fill="#000" shape-rendering="crispEdges">${rects}</svg>`
}
