<script setup lang="ts">
import { vFoco } from '@/core/utils/foco'
import { computed, onMounted, ref } from 'vue'
import { useToast } from 'primevue/usetoast'
import { usePermisos } from '@/core/auth/usePermisos'
import { formatear } from '@/core/utils/dinero'
import { diasParaFecha, fechaCorta, fechaDesdeDia } from '@/core/utils/fechas'
import { formatearKg } from '@/core/utils/peso'
import PantallaVacia from '@/shared/components/PantallaVacia.vue'
import TextoImprimibleDialog from '@/shared/components/TextoImprimibleDialog.vue'
import { useMostrador } from '../composables/useMostrador'
import type { EtiquetaMostrador } from '../types/mostrador.types'
import { construirEtiqueta } from '../utils/etiqueta'

const toast = useToast()
const { puede } = usePermisos()
const m = useMostrador()
const {
  configuracion, productos, etiquetas, productoId, producto, modo, montoPesos, pesoGramos,
  objetivoGramos, evaluacion, precioPesoReal, cobraMontoPedido, precioFinal, caducaEl,
  puedeImprimir, guardando,
} = m

const modos = [
  { label: 'Por monto ("dame $15")', value: 'monto' },
  { label: 'Por peso', value: 'peso' },
]

const opcionesProducto = computed(() =>
  productos.value.map((p) => ({ id: p.id, etiqueta: `${p.nombre} · ${formatear(p.precioCentavos)}/kg` })),
)

const vista = ref({ visible: false, texto: '' })
const mermaVisible = ref(false)
const mermaCodigo = ref('')
const mermaMotivo = ref<string | null>(null)
const mermaOtro = ref('')
const motivosMerma = ['Se echó a perder', 'Se cayó o se dañó', 'El cliente no lo quiso', 'Otro']
const motivoFinal = computed(() => (mermaMotivo.value === 'Otro' ? mermaOtro.value.trim() : (mermaMotivo.value ?? '')))

onMounted(m.cargar)

function mostrarEtiqueta(e: EtiquetaMostrador) {
  if (!configuracion.value) return
  vista.value = { visible: true, texto: construirEtiqueta(e, m.precioKgDe(e.productoId), configuracion.value) }
}

async function imprimir() {
  try {
    const e = await m.imprimir()
    toast.add({ severity: 'success', summary: `Etiqueta ${e.codigo} creada`, life: 2500 })
    mostrarEtiqueta(e)
  } catch (err) {
    toast.add({ severity: 'error', summary: 'No se pudo crear la etiqueta', detail: err instanceof Error ? err.message : '', life: 4000 })
  }
}

function pedirMerma(codigo: string) {
  mermaCodigo.value = codigo
  mermaMotivo.value = null
  mermaOtro.value = ''
  mermaVisible.value = true
}

async function confirmarMerma() {
  try {
    await m.merma(mermaCodigo.value, motivoFinal.value)
    toast.add({ severity: 'success', summary: 'Merma registrada', life: 2500 })
    mermaVisible.value = false
  } catch (err) {
    toast.add({ severity: 'error', summary: 'No se pudo registrar la merma', detail: err instanceof Error ? err.message : '', life: 4000 })
  }
}

async function copiar(codigo: string) {
  try {
    await navigator.clipboard.writeText(codigo)
    toast.add({ severity: 'info', summary: `Código ${codigo} copiado`, life: 1500 })
  } catch {
    toast.add({ severity: 'warn', summary: 'No se pudo copiar', detail: codigo, life: 3000 })
  }
}

function estadoDe(e: EtiquetaMostrador): { texto: string; severidad: 'success' | 'danger' | 'secondary' | 'warn' } {
  if (e.estado === 'vendida') return { texto: 'Vendida', severidad: 'secondary' }
  if (e.estado === 'merma') return { texto: 'Merma', severidad: 'danger' }
  if (diasParaFecha(e.caducaEl) < 0) return { texto: 'Vencida', severidad: 'danger' }
  return { texto: 'Disponible', severidad: 'success' }
}
</script>

<template>
  <div class="mostrador">
    <section class="tarjeta columna">
      <h2><i class="pi pi-tag" /> Mostrador</h2>

      <label class="columna">
        Producto
        <Select v-model="productoId" :options="opcionesProducto" option-label="etiqueta" option-value="id" />
      </label>

      <SelectButton v-model="modo" :options="modos" option-label="label" option-value="value" :allow-empty="false" />

      <label v-if="modo === 'monto'" class="columna">
        ¿Cuánto pidió el cliente?
        <InputNumber v-model="montoPesos" mode="currency" currency="MXN" locale="es-MX" :min="0" fluid v-foco input-class="entrada-grande" />
      </label>

      <div v-if="objetivoGramos" class="objetivo">
        Corta aproximadamente <strong>{{ objetivoGramos.toFixed(1) }} g</strong>
        <small class="muted">
          (tolerancia {{ Math.round((configuracion?.toleranciaPeso ?? 0) * 100) }} %:
          {{ (objetivoGramos * (1 - (configuracion?.toleranciaPeso ?? 0))).toFixed(1) }}
          – {{ (objetivoGramos * (1 + (configuracion?.toleranciaPeso ?? 0))).toFixed(1) }} g)
        </small>
      </div>

      <div class="columna">
        <span>Báscula <small class="muted">(simulada)</small></span>
        <InputNumber v-model="pesoGramos" suffix=" g" :min="0" :max-fraction-digits="0" fluid input-class="entrada-grande" placeholder="Peso en gramos" />
        <div class="fila">
          <Button label="−10" size="small" severity="secondary" @click="m.ajustarPeso(-10)" />
          <Button label="−1" size="small" severity="secondary" @click="m.ajustarPeso(-1)" />
          <Button label="+1" size="small" severity="secondary" @click="m.ajustarPeso(1)" />
          <Button label="+10" size="small" severity="secondary" @click="m.ajustarPeso(10)" />
          <Button label="Simular corte" icon="pi pi-bolt" size="small" outlined @click="m.simularCorte()" />
        </div>
      </div>

      <Message v-if="evaluacion && !evaluacion.dentro" severity="warn" :closable="false">
        {{ (pesoGramos ?? 0) > evaluacion.maxGramos ? 'Te pasaste de la tolerancia.' : 'Te faltó producto.' }}
        Quita o agrega jamón hasta quedar entre {{ evaluacion.minGramos.toFixed(1) }} y {{ evaluacion.maxGramos.toFixed(1) }} g,
        o cobra el peso real ({{ formatear(precioPesoReal) }}).
      </Message>
      <Message v-else-if="evaluacion?.dentro" severity="success" :closable="false">
        Dentro de la tolerancia: se cobra exactamente {{ formatear(precioFinal) }}.
      </Message>

      <div class="resultado">
        <div class="fila-entre"><span class="muted">Peso real</span><strong>{{ pesoGramos ? formatearKg(pesoGramos) + ' kg' : '—' }}</strong></div>
        <div class="fila-entre"><span class="muted">Caduca</span><strong>{{ caducaEl ? fechaDesdeDia(caducaEl) : '—' }}</strong></div>
        <div class="fila-entre total">
          <span>{{ cobraMontoPedido ? 'Se cobra (monto pedido)' : 'Se cobra (peso real)' }}</span>
          <strong class="dinero">{{ formatear(precioFinal) }}</strong>
        </div>
      </div>

      <Button label="Imprimir etiqueta" icon="pi pi-print" size="large" :disabled="!puedeImprimir" :loading="guardando" @click="imprimir" />
      <small v-if="producto" class="muted">
        Cada producto define cuántos días dura una vez cortado ({{ producto.nombre }}: {{ producto.diasVidaCortado ?? 5 }} días).
      </small>
    </section>

    <section class="tarjeta columna">
      <h3>Etiquetas del mostrador</h3>
      <PantallaVacia v-if="etiquetas.length === 0" icono="pi pi-tag" titulo="Aún no hay etiquetas" />
      <table v-else>
        <thead><tr><th>Folio</th><th>Producto</th><th>Peso</th><th class="derecha">Precio</th><th>Caduca</th><th>Estado</th><th /></tr></thead>
        <tbody>
          <tr v-for="e in etiquetas" :key="e.codigo">
            <td><code>{{ e.codigo }}</code></td>
            <td>{{ e.nombre }}</td>
            <td>{{ e.pesoGramos }} g</td>
            <td class="derecha dinero">{{ formatear(e.precioCentavos) }}</td>
            <td>{{ fechaDesdeDia(e.caducaEl) }}</td>
            <td><Tag :value="estadoDe(e).texto" :severity="estadoDe(e).severidad" /></td>
            <td class="acciones">
              <Button icon="pi pi-copy" text rounded size="small" aria-label="Copiar código" title="Copiar código (para escanearlo en caja)" @click="copiar(e.codigo)" />
              <Button icon="pi pi-eye" text rounded size="small" aria-label="Ver etiqueta" @click="mostrarEtiqueta(e)" />
              <Button
                v-if="e.estado === 'disponible' && puede('mostrador.merma')"
                icon="pi pi-trash"
                text
                rounded
                size="small"
                severity="danger"
                aria-label="Registrar merma"
                @click="pedirMerma(e.codigo)"
              />
            </td>
          </tr>
        </tbody>
      </table>
      <small class="muted">
        Cada folio se cobra una sola vez. En Caja, usa "Códigos de prueba" para escanearlos.
        Última actualización: {{ fechaCorta(new Date()) }}.
      </small>
    </section>
  </div>

  <TextoImprimibleDialog :visible="vista.visible" titulo="Etiqueta" :texto="vista.texto" @update:visible="vista.visible = $event" />

  <Dialog v-model:visible="mermaVisible" header="Registrar merma" modal :style="{ width: '24rem' }">
    <div class="columna">
      <p class="muted" style="margin: 0">Etiqueta {{ mermaCodigo }}. El motivo es obligatorio y queda en bitácora.</p>
      <Select v-model="mermaMotivo" :options="motivosMerma" placeholder="Elige un motivo" />
      <InputText v-if="mermaMotivo === 'Otro'" v-model="mermaOtro" placeholder="Escribe el motivo" />
      <Button label="Registrar merma" icon="pi pi-check" severity="danger" :disabled="!motivoFinal" @click="confirmarMerma" />
    </div>
  </Dialog>
</template>

<style scoped>
.mostrador {
  display: grid;
  grid-template-columns: minmax(0, 420px) minmax(0, 1fr);
  gap: 1rem;
  align-items: start;
}
.objetivo {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  padding: 0.6rem 0.9rem;
  border-radius: 0.6rem;
  background: var(--p-blue-50);
  color: var(--p-blue-800);
}
.resultado {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  padding: 0.75rem;
  border: 1px solid var(--p-content-border-color);
  border-radius: 0.6rem;
}
.total {
  border-top: 1px dashed var(--p-surface-300);
  padding-top: 0.4rem;
  font-size: 1.3rem;
}
table {
  width: 100%;
  border-collapse: collapse;
}
th {
  text-align: left;
  font-size: 0.8rem;
  color: var(--p-text-muted-color);
  padding: 0.4rem 0.5rem;
  border-bottom: 1px solid var(--p-content-border-color);
}
td {
  padding: 0.45rem 0.5rem;
  border-bottom: 1px solid var(--p-surface-100);
}
.derecha {
  text-align: right;
}
.acciones {
  white-space: nowrap;
  text-align: right;
}
:deep(.entrada-grande) {
  font-size: 1.5rem;
  font-weight: 600;
}
@media (max-width: 1000px) {
  .mostrador {
    grid-template-columns: 1fr;
  }
}
</style>
