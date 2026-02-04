# Reserva de trasteros (micro-frontend)

Micro-frontend en React + TypeScript + TailwindCSS para reservas de trasteros. Consume la API pública del backend MaxiBox.

## Requisitos

- Node.js 18+
- Backend API en `http://localhost:3001` (o configurable vía variable de entorno)

## Desarrollo

```bash
npm install
npm run dev
```

La app se sirve en `http://localhost:5173`. Las peticiones a `/api` y `/planos` se redirigen al backend en el puerto 3001 (proxy en `vite.config.ts`).

### Parámetro de tenant

Por defecto se usa el tenant `maxibox`. Para otro tenant:

```
http://localhost:5173?tenant=mi-tenant
```

## Producción

```bash
npm run build
```

La salida está en `dist/`. Despliega ese contenido en cualquier estático o integra el build en la web del cliente.

Para apuntar a un backend distinto en producción, define la variable de entorno en el build:

```bash
VITE_API_BASE=https://api.tudominio.com npm run build
```

O crea un `.env` con:

```
VITE_API_BASE=https://api.tudominio.com
```

## Estructura

- `src/components/` — Tooltip, Button, PanelLateral, FormularioReserva, PlanoSVG
- `src/services/api.ts` — Llamadas a la API (plan, reservas)
- `src/types/` — Tipos TypeScript (StorageUnit, Plan, etc.)
- `src/pages/ReservasPage.tsx` — Página principal de reservas
- `src/config/api.ts` — Base URL del backend

## API utilizada

- **GET** `/api/public/plan/:tenantSlug` — Devuelve `svgUrl` y `storageUnits` (id, number, shapeId, status, type, price).
- **POST** `/api/public/reservations` — Cuerpo: `tenantSlug`, `storageUnitId`, `firstName`, `lastName`, `email`, `phone`.

El SVG del plano debe tener elementos con `id` coincidentes con `shapeId` de cada trastero (ej. `T12`).
# ReservaTrasterosMaxibox
# ReservaTrasterosMaxibox
