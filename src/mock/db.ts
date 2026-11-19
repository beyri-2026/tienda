import { uid } from '@/core/utils/texto'
import { cajasIniciales, crearSemilla, equiposIniciales, USUARIO_CAJERO2, VERSION_BD, type BaseDatos, type RegistroBitacora } from './semilla'

/**
 * BASE DE DATOS SIMULADA (solo para la demo).
 * Vive en memoria y se guarda en localStorage. Las APIs de cada módulo son las
 * ÚNICAS que la tocan; cuando exista el backend real, se reemplazan por llamadas HTTP
 * y esta carpeta se elimina sin tocar vistas ni composables.
 */
const CLAVE = 'tiendas.demo.bd'

function cargar(): BaseDatos {
  try {
    const crudo = localStorage.getItem(CLAVE)
    if (crudo) {
      const datos = JSON.parse(crudo) as BaseDatos
      if (datos.version === VERSION_BD) {
        // Migración suave: datos guardados antes de existir cajas y equipos.
        if (!datos.usuarios.some((u) => u.usuario === USUARIO_CAJERO2.usuario)) datos.usuarios.push({ ...USUARIO_CAJERO2 })
        datos.cajas ??= cajasIniciales()
        datos.equipos ??= equiposIniciales(new Date().toISOString())
        return datos
      }
    }
  } catch {
    /* si falla, se arranca con datos de prueba nuevos */
  }
  return crearSemilla()
}

let datos: BaseDatos = cargar()

export const db = (): BaseDatos => datos

export function guardar(): void {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(datos))
  } catch {
    /* sin almacenamiento: la demo sigue en memoria */
  }
}

export function reiniciar(): void {
  datos = crearSemilla()
  guardar()
}

export const clonar = <T>(valor: T): T => JSON.parse(JSON.stringify(valor)) as T

export function registrarBitacora(entrada: Omit<RegistroBitacora, 'id' | 'fecha'>): void {
  datos.bitacora.push({ id: uid('bit'), fecha: new Date().toISOString(), ...entrada })
  guardar()
}

export function siguienteFolioVenta(): string {
  datos.contadores.venta += 1
  return String(datos.contadores.venta).padStart(6, '0')
}

export function siguienteCodigoEtiqueta(): string {
  datos.contadores.etiqueta += 1
  return `M-${String(datos.contadores.etiqueta).padStart(6, '0')}`
}
