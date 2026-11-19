import type { Directive } from 'vue'

/**
 * v-foco: al aparecer el campo (por ejemplo al abrir un diálogo) el cursor queda dentro
 * y el texto seleccionado, para escribir de inmediato sin dar clic.
 * Funciona sobre <input> o sobre componentes que contienen uno (InputNumber, InputText).
 *
 * El diálogo de PrimeVue enfoca por su cuenta el botón de cerrar al terminar su animación;
 * por eso se marca el input con `autofocus` (lo respeta) y se reintenta unos instantes.
 */
export const vFoco: Directive<HTMLElement> = {
  mounted(el) {
    const campo = el instanceof HTMLInputElement ? el : el.querySelector('input')
    if (!campo) return
    campo.setAttribute('autofocus', '')

    const enfocar = () => {
      if (!campo.isConnected) return
      const activo = document.activeElement
      if (activo === campo) return
      // No quitarle el foco a otro campo de texto (si la persona ya hizo clic en uno).
      if (activo instanceof HTMLInputElement || activo instanceof HTMLTextAreaElement) {
        if (activo !== campo && activo.closest('.p-dialog') === campo.closest('.p-dialog') && activo.value !== '') return
      }
      try {
        campo.focus()
        campo.select()
      } catch {
        /* el campo se desmontó justo ahora (diálogo cerrado muy rápido): no pasa nada */
      }
    }
    for (const ms of [0, 120, 300, 600]) setTimeout(enfocar, ms)
  },
}
