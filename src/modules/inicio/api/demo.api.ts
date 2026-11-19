import { reiniciar } from '@/mock/db'

/** Solo demo: vuelve a los datos de prueba originales. */
export async function reiniciarDatosDemo(): Promise<void> {
  reiniciar()
}
