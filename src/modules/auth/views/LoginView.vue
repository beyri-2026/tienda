<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ETIQUETA_ROL, inicioDeRol } from '@/core/auth/permisos'
import { useSesion } from '@/core/auth/sesion.store'
import { login, usuariosDeAyuda, type UsuarioDeAyuda } from '../api/auth.api'

const sesion = useSesion()
const router = useRouter()
const route = useRoute()

const usuario = ref('')
const password = ref('')
const error = ref('')
const cargando = ref(false)
const ayuda = ref<UsuarioDeAyuda[]>([])

onMounted(async () => {
  ayuda.value = await usuariosDeAyuda()
})

function llenar(u: UsuarioDeAyuda) {
  usuario.value = u.usuario
  password.value = u.password
  error.value = ''
}

async function entrar() {
  error.value = ''
  cargando.value = true
  try {
    const r = await login(usuario.value, password.value)
    sesion.iniciar(r.token, r.usuario)
    const destino = typeof route.query.redirect === 'string' ? route.query.redirect : inicioDeRol(r.usuario.rol)
    router.push(destino)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'No se pudo iniciar sesión'
  } finally {
    cargando.value = false
  }
}
</script>

<template>
  <div class="pantalla">
    <div class="tarjeta caja">
      <h2><i class="pi pi-shop" /> Punto de Venta</h2>
      <p class="muted">Inicia sesión para continuar</p>

      <form class="columna" @submit.prevent="entrar">
        <label class="columna">
          Usuario
          <InputText v-model="usuario" autocomplete="username" autofocus />
        </label>
        <label class="columna">
          Contraseña
          <Password v-model="password" :feedback="false" toggle-mask fluid input-class="w-full" autocomplete="current-password" />
        </label>
        <Message v-if="error" severity="error" :closable="false">{{ error }}</Message>
        <Button type="submit" label="Entrar" icon="pi pi-sign-in" :loading="cargando" :disabled="!usuario || !password" />
      </form>

      <div class="ayuda">
        <strong>Usuarios de prueba</strong>
        <span class="muted">Toca uno para llenar el formulario (contraseña: demo123).</span>
        <div class="lista">
          <Button
            v-for="u in ayuda"
            :key="u.usuario"
            :label="`${u.nombre} · ${ETIQUETA_ROL[u.rol]} · PIN ${u.pin}`"
            severity="secondary"
            size="small"
            text
            class="item"
            @click="llenar(u)"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pantalla {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}
.caja {
  width: 100%;
  max-width: 420px;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.ayuda {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  border-top: 1px solid var(--p-content-border-color);
  padding-top: 0.75rem;
}
.lista {
  display: flex;
  flex-direction: column;
}
.item {
  justify-content: flex-start;
}
</style>
