/** Simula el tiempo de respuesta de un servidor real. */
export const pausa = (ms = 40): Promise<void> => new Promise((r) => setTimeout(r, ms))
