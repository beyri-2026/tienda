/** Utilidades de texto de ancho fijo (tickets y etiquetas térmicas de 80 mm: ~32 caracteres). */
export const ANCHO_TERMICO = 32

export function centrar(texto: string, ancho = ANCHO_TERMICO): string {
  const s = texto.slice(0, ancho)
  return ' '.repeat(Math.floor((ancho - s.length) / 2)) + s
}

/** Texto a la izquierda y a la derecha de la misma línea. */
export function izqDer(izq: string, der: string, ancho = ANCHO_TERMICO): string {
  const espacio = ancho - izq.length - der.length
  if (espacio < 1) return `${izq.slice(0, Math.max(0, ancho - der.length - 1))} ${der}`
  return izq + ' '.repeat(espacio) + der
}

/** Parte un texto largo en renglones de ancho fijo, sin cortar palabras. */
export function envolver(texto: string, ancho = ANCHO_TERMICO): string[] {
  const salida: string[] = []
  let actual = ''
  for (const palabra of texto.split(/\s+/)) {
    if (!actual) actual = palabra
    else if ((actual + ' ' + palabra).length <= ancho) actual += ' ' + palabra
    else {
      salida.push(actual)
      actual = palabra
    }
  }
  if (actual) salida.push(actual)
  return salida
}
