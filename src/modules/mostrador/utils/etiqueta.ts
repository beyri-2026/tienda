import { centrar, izqDer } from '@/core/utils/anchoFijo'
import { formatear, type Centavos } from '@/core/utils/dinero'
import { fechaCorta, fechaDesdeDia } from '@/core/utils/fechas'
import { formatearKg } from '@/core/utils/peso'
import type { Configuracion } from '@/modules/catalogo/types/producto.types'
import type { EtiquetaMostrador } from '../types/mostrador.types'

/** Texto de la etiqueta que se pega al paquete (impresora de etiquetas; hoy, vista previa). */
export function construirEtiqueta(e: EtiquetaMostrador, precioKgCentavos: Centavos, cfg: Configuracion): string {
  const hora = new Date(e.fechaCorte).toTimeString().slice(0, 5)
  return [
    centrar(cfg.negocioNombre),
    e.nombre.slice(0, 32),
    izqDer('Peso', `${formatearKg(e.pesoGramos)} kg`),
    izqDer('Precio/kg', formatear(precioKgCentavos)),
    izqDer('TOTAL', formatear(e.precioCentavos)),
    `Cortado: ${fechaCorta(e.fechaCorte)} ${hora}`,
    `Caduca:  ${fechaDesdeDia(e.caducaEl)}`,
    '',
    centrar('[código de barras]'),
    centrar(e.codigo),
  ].join('\n')
}
