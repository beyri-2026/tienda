/**
 * Imprime un texto en formato térmico de 80 mm usando el navegador.
 * Más adelante se reemplaza por el envío directo a la impresora real
 * (el ticket ya se genera como texto de ancho fijo).
 */
export function imprimirTexto(texto: string): void {
  const seguro = texto.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  imprimirHtml(`<pre>${seguro}</pre>`, 'pre { font: 12px/1.25 "Courier New", monospace; margin: 0; white-space: pre; }')
}

/** Imprime HTML con su propio CSS en papel térmico de 80 mm. */
export function imprimirHtml(cuerpo: string, css: string): void {
  const iframe = document.createElement('iframe')
  iframe.style.position = 'fixed'
  iframe.style.right = '0'
  iframe.style.bottom = '0'
  iframe.style.width = '0'
  iframe.style.height = '0'
  iframe.style.border = '0'
  document.body.appendChild(iframe)

  const doc = iframe.contentWindow?.document
  if (!doc || !iframe.contentWindow) {
    iframe.remove()
    return
  }
  doc.open()
  doc.write(`<!doctype html><html><head><meta charset="utf-8"><style>
    @page { size: 80mm auto; margin: 4mm; }
    body { margin: 0; }
    ${css}
  </style></head><body>${cuerpo}</body></html>`)
  doc.close()

  iframe.contentWindow.focus()
  iframe.contentWindow.print()
  setTimeout(() => iframe.remove(), 1500)
}
