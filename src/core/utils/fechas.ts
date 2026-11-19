const dos = (n: number) => String(n).padStart(2, '0')

/** ISO → 16/11/2026 (hora local) */
export function fechaCorta(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso
  return `${dos(d.getDate())}/${dos(d.getMonth() + 1)}/${d.getFullYear()}`
}

/** ISO → 12:15:32 (hora local) */
export function horaCompleta(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso
  return `${dos(d.getHours())}:${dos(d.getMinutes())}:${dos(d.getSeconds())}`
}

export const fechaHora = (iso: string | Date): string => `${fechaCorta(iso)} ${horaCompleta(iso)}`

/** Suma días a hoy y devuelve yyyy-mm-dd */
export function diasDesdeHoy(dias: number): string {
  const d = new Date()
  d.setDate(d.getDate() + dias)
  return `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`
}

/** yyyy-mm-dd → dd/mm/yyyy */
export function fechaDesdeDia(dia: string): string {
  const [a, m, d] = dia.split('-')
  return `${d}/${m}/${a}`
}

/** Días que faltan para una fecha yyyy-mm-dd (negativo si ya pasó). */
export function diasParaFecha(dia: string): number {
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const [a, m, d] = dia.split('-').map(Number)
  const destino = new Date(a, m - 1, d)
  return Math.round((destino.getTime() - hoy.getTime()) / 86_400_000)
}
