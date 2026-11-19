import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { Rol } from './permisos'

export interface UsuarioSesion {
  id: string
  nombre: string
  usuario: string
  rol: Rol
  sucursalId: string
  sucursalNombre: string
  cajaId: string
  cajaNombre: string
}

const CLAVE = 'tiendas.sesion.v1'

/** Pinia solo para la sesión (igual que la guía). */
export const useSesion = defineStore('sesion', () => {
  const token = ref<string | null>(null)
  const usuario = ref<UsuarioSesion | null>(null)

  const autenticado = computed(() => !!token.value && !!usuario.value)
  const rol = computed<Rol | null>(() => usuario.value?.rol ?? null)

  function iniciar(t: string, u: UsuarioSesion) {
    token.value = t
    usuario.value = u
    try {
      localStorage.setItem(CLAVE, JSON.stringify({ token: t, usuario: u }))
    } catch {
      /* sin almacenamiento disponible: la sesión vive solo en memoria */
    }
  }

  function cerrar() {
    token.value = null
    usuario.value = null
    try {
      localStorage.removeItem(CLAVE)
    } catch {
      /* nada */
    }
  }

  function cargarDeStorage() {
    try {
      const crudo = localStorage.getItem(CLAVE)
      if (!crudo) return
      const datos = JSON.parse(crudo) as { token: string; usuario: UsuarioSesion }
      token.value = datos.token
      usuario.value = datos.usuario
    } catch {
      cerrar()
    }
  }

  return { token, usuario, autenticado, rol, iniciar, cerrar, cargarDeStorage }
})
