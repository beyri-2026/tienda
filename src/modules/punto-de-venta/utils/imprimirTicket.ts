import { svgCode128 } from '@/core/utils/code128'
import { formatear } from '@/core/utils/dinero'
import { fechaCorta, horaCompleta } from '@/core/utils/fechas'
import { imprimirHtml } from '@/core/utils/imprimir'
import { formatearKg } from '@/core/utils/peso'
import type { Configuracion } from '@/modules/catalogo/types/producto.types'
import { ETIQUETA_METODO, type LineaVenta, type Venta } from '../types/venta.types'

const esc = (t: string | number | undefined | null) =>
  String(t ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** Código de barras Code 128 real del folio: se escanea en Historial para encontrar la venta. */
const barras = (folio: string) => svgCode128(folio, 200, 40)

function detalle(l: LineaVenta): string {
  if (l.tipo === 'peso' || l.tipo === 'etiqueta') return `${formatearKg(l.pesoGramos ?? 0)} kg`
  if (l.precioAnteriorCentavos) return `Promo · antes ${formatear(l.precioAnteriorCentavos)}`
  return `${l.cantidad} × ${formatear(l.precioUnitarioCentavos)}`
}

const CSS = `
  * { box-sizing: border-box; }
  .t { width: 72mm; font: 11px/1.3 Arial, Helvetica, sans-serif; color: #000; }
  .mono { font-family: "Courier New", monospace; }
  .c { text-align: center; }
  .sep { border-top: 1px dashed #000; margin: 6px 0; }
  .aviso { text-align: center; font-weight: 700; letter-spacing: .08em; margin-bottom: 4px; }
  .neg h1 { margin: 0; font-size: 14px; font-weight: 800; text-transform: uppercase; letter-spacing: .06em; }
  .neg p { margin: 1px 0 0; font-size: 10px; }
  .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 3px 6px; font-size: 10px; }
  .meta small { display: block; font: 700 8px Arial, sans-serif; text-transform: uppercase; }
  .meta .d { text-align: right; }
  .enc, .fila { display: flex; justify-content: space-between; align-items: baseline; gap: 6px; }
  .enc { font: 700 9px Arial, sans-serif; text-transform: uppercase; letter-spacing: .06em; border-bottom: 1px solid #000; padding-bottom: 2px; margin-bottom: 2px; }
  .lin { padding: 2px 0; }
  .lin .n { font-weight: 700; font-size: 11px; }
  .lin .dt { font-size: 9px; }
  .lin b.im { font-family: "Courier New", monospace; font-size: 11px; white-space: nowrap; }
  .tot .fila { font-family: "Courier New", monospace; font-size: 10.5px; padding: 1px 0; }
  .grande { border-top: 1px solid #000; margin-top: 3px; padding-top: 3px; font: 800 15px Arial, sans-serif !important; }
  .pago { border: 1px solid #000; border-radius: 4px; padding: 4px 6px; margin: 6px 0; font-family: "Courier New", monospace; font-size: 10.5px; }
  .pago .sub { font-size: 9px; padding-left: 6px; }
  .cambio { border-top: 1px solid #000; margin-top: 3px; padding-top: 3px; font-weight: 700; font-size: 12px; }
  .pie { text-align: center; margin-top: 4px; }
  .pie .folio { font: 700 10px "Courier New", monospace; letter-spacing: .2em; }
  .pie .gracias { font-weight: 700; margin: 4px 0 0; }
`

/** Ticket de venta para la impresora térmica de 80 mm (mismo diseño que el de pantalla, en blanco y negro). */
export function imprimirVenta(v: Venta, cfg: Configuracion, copia = false): void {
  const articulos = v.lineas.reduce((n, l) => n + (l.tipo === 'producto' ? l.cantidad : 1), 0)
  const lineas = v.lineas
    .map(
      (l) => `<div class="lin fila"><div><div class="n">${esc(l.nombre)}</div><div class="dt mono">${esc(detalle(l))}</div></div><b class="im">${formatear(l.importeCentavos)}</b></div>`,
    )
    .join('')
  const pagos = v.pagos
    .map((p) => {
      const monto = p.metodo === 'efectivo' ? (p.recibidoCentavos ?? p.montoCentavos) : p.montoCentavos
      return (
        `<div class="fila"><span>${esc(ETIQUETA_METODO[p.metodo])}:</span><b>${formatear(monto)}</b></div>` +
        (p.tarjeta ? `<div class="sub">${esc(p.tarjeta.marca)} ****${esc(p.tarjeta.ultimos4)} · Aut: ${esc(p.tarjeta.autorizacion)}</div>` : '')
      )
    })
    .join('')
  const devs = v.devoluciones.length
    ? `<div class="sep"></div><div class="tot"><div class="enc"><span>Devoluciones</span><span></span></div>${v.devoluciones
        .map((d) => `<div class="fila"><span>${fechaCorta(d.fecha)}</span><span>-${formatear(d.totalCentavos)}</span></div>`)
        .join('')}</div>`
    : ''

  const html = `<div class="t">
    ${copia ? '<div class="aviso">*** COPIA ***</div>' : ''}
    ${v.estado === 'cancelada' ? '<div class="aviso">*** VENTA CANCELADA ***</div>' : ''}
    <div class="neg c"><h1>${esc(cfg.negocioNombre)}</h1><p>${esc(v.sucursalNombre)}</p><p>${esc(cfg.direccion)}</p><p class="mono">Tel: ${esc(cfg.telefono)}</p></div>
    <div class="sep"></div>
    <div class="meta mono">
      <div><small>Folio:</small><b>${esc(v.folio)}</b></div>
      <div class="d"><small>Caja:</small><b>${esc(v.cajaNombre)}</b></div>
      <div><small>Fecha y hora:</small>${fechaCorta(v.fecha)} ${horaCompleta(v.fecha)}</div>
      <div class="d"><small>Cajero:</small>${esc(v.cajeroNombre)}</div>
    </div>
    <div class="sep"></div>
    <div class="enc"><span>Descripción</span><span>Importe</span></div>
    ${lineas}
    <div class="sep"></div>
    <div class="tot">
      <div class="fila"><span>Artículos:</span><span>${articulos}</span></div>
      <div class="fila"><span>Subtotal (sin imp.):</span><span>${formatear(v.subtotalCentavos)}</span></div>
      <div class="fila"><span>IVA:</span><span>${formatear(v.ivaCentavos)}</span></div>
      ${v.redondeoCentavos !== 0 ? `<div class="fila"><span>Redondeo:</span><span>${formatear(v.redondeoCentavos)}</span></div>` : ''}
      <div class="fila grande"><span>TOTAL</span><span>${formatear(v.totalCentavos)} MXN</span></div>
    </div>
    <div class="pago">${pagos}${v.cambioCentavos > 0 ? `<div class="fila cambio"><span>Cambio devuelto:</span><span>${formatear(v.cambioCentavos)}</span></div>` : ''}</div>
    ${devs}
    <div class="pie">
      ${barras(v.folio)}
      <div class="folio">${esc(v.folio)}</div>
      ${v.ahorroCentavos > 0 ? `<div>Ahorraste ${formatear(v.ahorroCentavos)} en promos</div>` : ''}
      <p class="gracias">${esc(cfg.mensajeTicket)}</p>
    </div>
  </div>`
  imprimirHtml(html, CSS)
}
