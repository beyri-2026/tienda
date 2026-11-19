import { db, registrarBitacora } from '@/mock/db'
import { pausa } from '@/mock/latencia'
import { puede, type Permiso, type Rol } from '@/core/auth/permisos'

const MAX_INTENTOS = 3
const BLOQUEO_MS = 2 * 60 * 1000

let intentos = 0
let bloqueadoHasta = 0

/**
 * Valida el PIN de quien autoriza una acción delicada (cancelar, devolver, retirar…).
 * - El PIN es único por persona y solo vale para quien tenga el permiso.
 * - Quien autoriza no puede ser el mismo cajero que pidió la acción.
 * - 3 fallos seguidos bloquean la autorización 2 minutos y quedan en bitácora.
 */
export async function validarPin(
  pin: string,
  permiso: Permiso,
  solicitante: { id: string; rol: Rol },
): Promise<{ id: string; nombre: string }> {
  await pausa(80)
  const ahora = Date.now()
  if (ahora < bloqueadoHasta) {
    const seg = Math.ceil((bloqueadoHasta - ahora) / 1000)
    throw new Error(`Autorización bloqueada por intentos fallidos. Intenta de nuevo en ${seg} s.`)
  }

  const d = db()
  const u = d.usuarios.find((x) => x.activo && x.pin === pin)
  if (!u || !puede(u.rol, permiso)) {
    intentos += 1
    if (intentos >= MAX_INTENTOS) {
      intentos = 0
      bloqueadoHasta = ahora + BLOQUEO_MS
      registrarBitacora({
        usuarioId: solicitante.id,
        usuarioNombre: solicitante.id,
        accion: 'autorizacion_bloqueada',
        detalle: `3 PIN incorrectos seguidos pidiendo ${permiso}`,
      })
      throw new Error('3 intentos fallidos. La autorización se bloqueó por 2 minutos.')
    }
    throw new Error(`PIN incorrecto o sin permiso. Intentos restantes: ${MAX_INTENTOS - intentos}.`)
  }
  if (u.id === solicitante.id && solicitante.rol === 'cajero') {
    throw new Error('Quien autoriza no puede ser el mismo cajero que pidió la acción.')
  }
  intentos = 0
  return { id: u.id, nombre: u.nombre }
}
