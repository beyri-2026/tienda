import { onBeforeUnmount, ref } from 'vue'

interface DetectorCodigos {
  detect(fuente: HTMLVideoElement): Promise<{ rawValue: string }[]>
}
type ConstructorDetector = new (opciones?: { formats?: string[] }) => DetectorCodigos

/**
 * Escaneo con la cámara del equipo o del celular (demo).
 * Usa la API BarcodeDetector del navegador; si no existe, avisa.
 * Con un lector USB no hace falta nada de esto: el lector escribe el código como teclado.
 */
export function useEscaner() {
  const activo = ref(false)
  const error = ref('')
  let flujo: MediaStream | null = null
  let temporizador: ReturnType<typeof setInterval> | undefined
  let ultimoCodigo = ''
  let ultimoMomento = 0

  const Detector = (window as unknown as { BarcodeDetector?: ConstructorDetector }).BarcodeDetector
  const soportado = !!Detector && !!navigator.mediaDevices?.getUserMedia

  async function iniciar(video: HTMLVideoElement, alLeer: (codigo: string) => void) {
    error.value = ''
    if (!Detector || !soportado) {
      error.value = 'Este navegador no puede leer códigos con la cámara. Prueba con Chrome en el celular, o usa el lector USB.'
      return
    }
    try {
      flujo = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      video.srcObject = flujo
      await video.play()
      activo.value = true
      const detector = new Detector({ formats: ['ean_13', 'ean_8', 'upc_a', 'code_128', 'code_39', 'qr_code'] })
      temporizador = setInterval(async () => {
        try {
          const codigos = await detector.detect(video)
          const valor = codigos[0]?.rawValue
          const ahora = Date.now()
          // Evita repetir el mismo código mientras sigue frente a la cámara
          if (valor && (valor !== ultimoCodigo || ahora - ultimoMomento > 2500)) {
            ultimoCodigo = valor
            ultimoMomento = ahora
            alLeer(valor)
          }
        } catch {
          /* un cuadro sin código no es un error */
        }
      }, 300)
    } catch {
      error.value = 'No se pudo abrir la cámara. Revisa los permisos del navegador.'
    }
  }

  function detener() {
    clearInterval(temporizador)
    flujo?.getTracks().forEach((t) => t.stop())
    flujo = null
    activo.value = false
  }

  onBeforeUnmount(detener)

  return { soportado, activo, error, iniciar, detener }
}
