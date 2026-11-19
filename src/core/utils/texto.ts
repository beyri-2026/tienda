/** Minúsculas y sin acentos, para búsquedas. */
export const normalizar = (t: string): string =>
  t
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase()

/** Identificador corto único (suficiente para datos de prueba). */
export const uid = (prefijo = 'id'): string =>
  `${prefijo}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`
