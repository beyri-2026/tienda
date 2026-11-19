import { db } from '@/mock/db'
import { pausa } from '@/mock/latencia'
import type { UsuarioSesion } from '@/core/auth/sesion.store'
import type { Rol } from '@/core/auth/permisos'

export async function login(
  usuario: string,
  password: string,
): Promise<{ token: string; usuario: UsuarioSesion }> {
  await pausa(150)
  const d = db()
  const u = d.usuarios.find(
    (x) => x.activo && x.usuario === usuario.trim().toLowerCase() && x.password === password,
  )
  if (!u) throw new Error('Usuario o contraseña incorrectos')
  const cfg = d.configuracion
  return {
    token: `demo-${u.id}-${Date.now()}`,
    usuario: {
      id: u.id,
      nombre: u.nombre,
      usuario: u.usuario,
      rol: u.rol,
      sucursalId: cfg.sucursalId,
      sucursalNombre: cfg.sucursalNombre,
      cajaId: cfg.cajaId,
      cajaNombre: cfg.cajaNombre,
    },
  }
}

export interface UsuarioDeAyuda {
  usuario: string
  password: string
  pin: string
  nombre: string
  rol: Rol
}

/** Solo para la demo: lista de usuarios de prueba que se muestra en el login. */
export async function usuariosDeAyuda(): Promise<UsuarioDeAyuda[]> {
  return db().usuarios.map((u) => ({
    usuario: u.usuario,
    password: u.password,
    pin: u.pin,
    nombre: u.nombre,
    rol: u.rol,
  }))
}
