import { diasDesdeHoy } from '@/core/utils/fechas'
import type { Rol } from '@/core/auth/permisos'
import type { Configuracion, Producto } from '@/modules/catalogo/types/producto.types'
import type { EtiquetaMostrador } from '@/modules/mostrador/types/mostrador.types'
import type { FolioPromo, Venta } from '@/modules/punto-de-venta/types/venta.types'
import type { Turno } from '@/modules/punto-de-venta/types/turno.types'

/** Solo para la demo: contraseñas y PIN en texto plano. El backend real los guarda cifrados. */
export interface UsuarioDemo {
  id: string
  usuario: string
  password: string
  pin: string
  nombre: string
  rol: Rol
  activo: boolean
}

export interface RegistroBitacora {
  id: string
  fecha: string
  usuarioId: string
  usuarioNombre: string
  accion: string
  detalle: string
  autorizoId?: string
  autorizoNombre?: string
  motivo?: string
}

export interface Caja {
  id: string
  nombre: string
}

/** Computadora vinculada a una caja (en el backend real: identificador del equipo registrado). */
export interface Equipo {
  id: string
  nombre: string
  cajaId: string
  vinculadoPorNombre: string
  vinculadoEn: string
}

export interface BaseDatos {
  version: number
  usuarios: UsuarioDemo[]
  productos: Producto[]
  folios: FolioPromo[]
  etiquetas: EtiquetaMostrador[]
  ventas: Venta[]
  turnos: Turno[]
  cajas: Caja[]
  equipos: Equipo[]
  bitacora: RegistroBitacora[]
  contadores: { venta: number; etiqueta: number }
  configuracion: Configuracion
}

export const VERSION_BD = 1

const producto = (p: Omit<Producto, 'activo' | 'controlaInventario'> & Partial<Producto>): Producto => ({
  activo: true,
  controlaInventario: true,
  ...p,
})

/** Segunda cajera de prueba (para probar cambios de turno y varias cajas). */
export const USUARIO_CAJERO2: UsuarioDemo = {
  id: 'u-cajero2',
  usuario: 'cajero2',
  password: 'demo123',
  pin: '3434',
  nombre: 'Laura Pérez',
  rol: 'cajero',
  activo: true,
}

export const cajasIniciales = (): Caja[] => [
  { id: 'caja-1', nombre: 'Caja 1' },
  { id: 'caja-2', nombre: 'Caja 2' },
]

/** Demo: la Caja 2 ya tiene "su" computadora (otra), para ver la regla de una computadora por caja. */
export const equiposIniciales = (ahora: string): Equipo[] => [
  { id: 'eq-demo-caja2', nombre: 'Computadora de Caja 2', cajaId: 'caja-2', vinculadoPorNombre: 'Dueño', vinculadoEn: ahora },
]

/** Los datos de prueba son ilustrativos. [CONFIRMAR con el contador] tasas de IVA reales. */
export function crearSemilla(): BaseDatos {
  const ahora = new Date().toISOString()

  const productos: Producto[] = [
    producto({ id: 'p-leche', nombre: 'Leche entera 1L', codigos: ['7501055300075'], categoria: 'Lácteos', unidad: 'pieza', precioCentavos: 4000, costoCentavos: 3000, iva: 'iva0', stock: 20 }),
    producto({ id: 'p-galletas', nombre: 'Galletas surtidas', codigos: ['7501000120011'], categoria: 'Abarrotes', unidad: 'pieza', precioCentavos: 1800, costoCentavos: 1200, iva: 'iva16', stock: 30 }),
    producto({ id: 'p-papas', nombre: 'Papas fritas 45g', codigos: ['7501000130028'], categoria: 'Botanas', unidad: 'pieza', precioCentavos: 2200, costoCentavos: 1500, iva: 'iva16', stock: 25 }),
    producto({ id: 'p-refresco', nombre: 'Refresco 600ml', codigos: ['7501000140035'], categoria: 'Bebidas', unidad: 'pieza', precioCentavos: 1850, costoCentavos: 1300, iva: 'iva16', stock: 40 }),
    producto({ id: 'p-aceite', nombre: 'Aceite vegetal 1L', codigos: ['7501000150042'], categoria: 'Abarrotes', unidad: 'pieza', precioCentavos: 4250, costoCentavos: 3400, iva: 'iva0', stock: 12 }),
    producto({ id: 'p-pan', nombre: 'Pan blanco', codigos: ['7501000160059'], categoria: 'Panadería', unidad: 'pieza', precioCentavos: 1740, costoCentavos: 1300, iva: 'iva0', stock: 15 }),
    producto({ id: 'p-agua', nombre: 'Agua natural 1L', codigos: ['7501000170066'], categoria: 'Bebidas', unidad: 'pieza', precioCentavos: 1200, costoCentavos: 700, iva: 'iva16', stock: 50 }),
    producto({ id: 'p-huevo', nombre: 'Huevo 12 pzas', codigos: ['7501000180073'], categoria: 'Abarrotes', unidad: 'pieza', precioCentavos: 4800, costoCentavos: 4000, iva: 'iva0', stock: 10 }),
    producto({ id: 'p-jamon', nombre: 'Jamón de pavo', codigos: ['7502000100010'], categoria: 'Carnes frías', unidad: 'kg', precioCentavos: 16000, costoCentavos: 11000, iva: 'iva16', stock: 5000, diasVidaCortado: 10 }),
    producto({ id: 'p-queso', nombre: 'Queso Oaxaca', codigos: ['7502000100027'], categoria: 'Lácteos', unidad: 'kg', precioCentavos: 18000, costoCentavos: 13000, iva: 'iva0', stock: 4000, diasVidaCortado: 7 }),
    producto({ id: 'p-salchicha', nombre: 'Salchicha de pavo', codigos: ['7502000100034'], categoria: 'Carnes frías', unidad: 'kg', precioCentavos: 9500, costoCentavos: 6500, iva: 'iva16', stock: 6000, diasVidaCortado: 8 }),
    producto({ id: 'p-bolsa', nombre: 'Bolsa chica', codigos: ['7503000000001'], categoria: 'Cargos', unidad: 'pieza', precioCentavos: 100, costoCentavos: 20, iva: 'iva16', stock: 0, controlaInventario: false }),
  ]

  const promoLeche = (n: number, estado: FolioPromo['estado'], caducaEl: string): FolioPromo => ({
    codigo: `P-${String(n).padStart(4, '0')}`,
    tipo: 'promo',
    productoId: 'p-leche',
    nombre: 'Leche entera 1L',
    precioCentavos: 2800,
    precioAnteriorCentavos: 4000,
    iva: 'iva0',
    caducaEl,
    estado,
  })

  const folios: FolioPromo[] = [
    ...[1, 2, 3, 4, 5].map((n) => promoLeche(n, 'activo', diasDesdeHoy(15))),
    promoLeche(90, 'inactivo', diasDesdeHoy(15)), // impreso pero sin activar al pegarlo
    promoLeche(91, 'vencido', diasDesdeHoy(-1)),
    ...[1, 2, 3].map(
      (n): FolioPromo => ({
        codigo: `K-000${n}`,
        tipo: 'paquete',
        nombre: 'Paquete leche + galletas',
        precioCentavos: 5000,
        precioAnteriorCentavos: 5800,
        iva: 'iva16', // simplificación de la demo: el IVA real se reparte entre componentes
        caducaEl: diasDesdeHoy(20),
        estado: 'activo',
      }),
    ),
  ]

  const etiquetas: EtiquetaMostrador[] = [
    { codigo: 'M-000001', productoId: 'p-jamon', nombre: 'Jamón de pavo', pesoGramos: 94, precioCentavos: 1500, iva: 'iva16', fechaCorte: ahora, caducaEl: diasDesdeHoy(10), estado: 'disponible' },
    { codigo: 'M-000002', productoId: 'p-queso', nombre: 'Queso Oaxaca', pesoGramos: 215, precioCentavos: 3870, iva: 'iva0', fechaCorte: ahora, caducaEl: diasDesdeHoy(7), estado: 'disponible' },
  ]

  return {
    version: VERSION_BD,
    usuarios: [
      { id: 'u-dueno', usuario: 'dueno', password: 'demo123', pin: '1111', nombre: 'Dueño Demo', rol: 'dueno', activo: true },
      { id: 'u-gerente', usuario: 'gerente', password: 'demo123', pin: '2222', nombre: 'Ana Gerente', rol: 'gerente', activo: true },
      { id: 'u-cajero', usuario: 'cajero', password: 'demo123', pin: '3333', nombre: 'María López', rol: 'cajero', activo: true },
      USUARIO_CAJERO2,
      { id: 'u-mostrador', usuario: 'mostrador', password: 'demo123', pin: '4444', nombre: 'Luis Mostrador', rol: 'mostrador', activo: true },
      { id: 'u-almacen', usuario: 'almacen', password: 'demo123', pin: '5555', nombre: 'Pedro Almacén', rol: 'almacenista', activo: true },
      { id: 'u-consulta', usuario: 'consulta', password: 'demo123', pin: '6666', nombre: 'Contador Consulta', rol: 'consulta', activo: true },
    ],
    productos,
    folios,
    etiquetas,
    ventas: [],
    turnos: [],
    cajas: cajasIniciales(),
    equipos: equiposIniciales(ahora),
    bitacora: [],
    contadores: { venta: 0, etiqueta: 2 },
    configuracion: {
      negocioNombre: 'TU TIENDA',
      sucursalId: 'suc-centro',
      sucursalNombre: 'Sucursal Centro',
      direccion: 'Calle Ejemplo 123, Col. Centro',
      telefono: '000 000 0000',
      cajaId: 'caja-1',
      cajaNombre: 'Caja 1',
      topeEfectivoCentavos: 300000,
      avisoTopePorc: 0.8,
      fondoSugeridoCentavos: 100000,
      toleranciaPeso: 0.05,
      mensajeTicket: '¡Gracias por su compra!',
    },
  }
}
