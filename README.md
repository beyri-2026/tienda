# Tiendas · Frontend (Vue 3)

Punto de venta del mini súper, con **backend simulado** (sin servidor ni base de datos).

## Arrancar

```
npm install
npm run dev      # http://localhost:5173
npm run test     # pruebas de dinero, IVA, redondeo, peso y ticket
npm run build
```

## Usuarios de demo (contraseña `demo123`)

| Usuario | Rol | PIN |
|---|---|---|
| dueno | Dueño | 1111 |
| gerente | Gerente | 2222 |
| cajero | Cajero | 3333 |
| mostrador | Mostrador | 4444 |
| almacen | Almacenista | 5555 |
| consulta | Consulta | 6666 |

El PIN sirve para autorizar cancelaciones, devoluciones, retiros y excepciones de tope.

## Estructura (misma arquitectura que la Guía de Frontend)

```
src/
  core/        auth (permisos, sesión), router, layout, utils (dinero, IVA, redondeo, peso, tickets)
  shared/      componentes reutilizables
  mock/        backend simulado (localStorage "tiendas.demo.bd")
  modules/
    auth/ inicio/ catalogo/ mostrador/
    punto-de-venta/  caja/ · turno/ · consulta/
```

Regla: `views → composables → api`. Solo los archivos `api/*.ts` tocan `src/mock/`;
cuando exista backend real solo se reemplazan por llamadas HTTP con la misma forma.

## Qué está simulado

Base de datos y servidor, terminal de tarjeta (adaptador `TerminalPago`), báscula, impresora
(vista previa + impresión del navegador) y escáner (cámara con BarcodeDetector o "Códigos de prueba").
Para reiniciar los datos de demo, borra `tiendas.demo.bd` del localStorage.

## Nota de licencia

Se usa PrimeVue 4 (MIT). PrimeVue 5 requiere licencia comercial.
