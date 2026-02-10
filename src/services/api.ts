import { API_BASE } from '../config/api'
import type {
  PlanResponse,
  RawStorageUnit,
  StorageUnit,
  ReservationPayload,
  ReservationSuccess,
} from '../types'

// ─── Anti-cache ───────────────────────────────────────────────────────

const NO_CACHE_HEADERS: Record<string, string> = {
  'Cache-Control': 'no-cache, no-store, must-revalidate',
  'Pragma': 'no-cache',
}

// ─── Fetch genérico ───────────────────────────────────────────────────

async function fetchApi<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const fullUrl = `${API_BASE}${url}`
  console.debug('[API] fetch:', options?.method ?? 'GET', fullUrl)

  let res: Response
  try {
    res = await fetch(fullUrl, {
      ...options,
      cache: 'no-store',
      headers: {
        ...NO_CACHE_HEADERS,
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    })
  } catch (networkErr) {
    console.error('[API] Error de red:', networkErr)
    throw new Error(
      'No se pudo conectar con el servidor. Comprueba tu conexión o que el backend está activo.'
    )
  }

  console.debug('[API] Respuesta status:', res.status, 'ok:', res.ok)

  if (res.status === 304) {
    throw new Error('El servidor devolvió una respuesta en caché (304). Recarga la página.')
  }

  if (!res.ok) {
    const text = await res.text()
    let message = `Error ${res.status}`
    try {
      const json = JSON.parse(text)
      if (json.message) message = json.message
      else if (json.error) message = json.error
    } catch {
      if (text) message = text
    }
    console.error('[API] Respuesta no-OK:', res.status, message)
    throw new Error(message)
  }

  const contentType = res.headers.get('content-type') ?? ''
  if (!contentType.includes('application/json')) {
    const text = await res.text()
    console.error('[API] Respuesta no es JSON. Content-Type:', contentType, 'Body:', text.substring(0, 200))
    throw new Error(`El servidor devolvió una respuesta no-JSON (Content-Type: ${contentType})`)
  }

  return res.json() as Promise<T>
}

// ─── Parseo de dimensions ─────────────────────────────────────────────
// El backend envía dimensions como string: "2x1", "3x1", "5x1", etc.
// Formato: "AnchoxAlto" → area = Ancho * Alto

function parseDimensionsString(raw: string): number {
  // Intentar formato "NxM" (con x, X, × o *)
  const match = raw.match(/^(\d+(?:[.,]\d+)?)\s*[xX×*]\s*(\d+(?:[.,]\d+)?)$/)
  if (match) {
    const a = parseFloat(match[1].replace(',', '.'))
    const b = parseFloat(match[2].replace(',', '.'))
    if (!isNaN(a) && !isNaN(b) && a > 0 && b > 0) {
      return a * b
    }
  }
  // Intentar como número directo ("6", "10.5")
  const num = parseFloat(raw.replace(',', '.'))
  if (!isNaN(num) && num > 0) {
    return num
  }
  return 0
}

function computeDimensions(raw: RawStorageUnit): number {
  // 1. Si dimensions es string (formato del backend: "2x1", "3x1", etc.)
  if (typeof raw.dimensions === 'string' && raw.dimensions.length > 0) {
    const parsed = parseDimensionsString(raw.dimensions)
    if (parsed > 0) return parsed
  }
  // 2. Si dimensions es número directo
  if (typeof raw.dimensions === 'number' && raw.dimensions > 0) {
    return raw.dimensions
  }
  // 3. Si envía area
  if (typeof raw.area === 'number' && raw.area > 0) {
    return raw.area
  }
  // 4. Si envía width + height
  if (typeof raw.width === 'number' && raw.width > 0) {
    if (typeof raw.height === 'number' && raw.height > 0) {
      return raw.width * raw.height
    }
    if (typeof raw.length === 'number' && raw.length > 0) {
      return raw.width * raw.length
    }
  }
  // 5. No se pudo calcular
  console.warn(`[API] No se pudo calcular dimensions para trastero #${raw.number} (dimensions: ${JSON.stringify(raw.dimensions)}, type: ${raw.type})`)
  return 0
}

function getDimensionsLabel(raw: RawStorageUnit): string {
  if (typeof raw.dimensions === 'string' && raw.dimensions.length > 0) {
    return raw.dimensions
  }
  return `${computeDimensions(raw)} m²`
}

function enrichUnit(raw: RawStorageUnit): StorageUnit {
  return {
    id: raw.id,
    number: raw.number,
    shapeId: raw.shapeId,
    status: raw.status,
    type: raw.type,
    price: raw.price,
    dimensions: computeDimensions(raw),
    dimensionsLabel: getDimensionsLabel(raw),
  }
}

// ─── Endpoints ────────────────────────────────────────────────────────

export interface EnrichedPlanData {
  svgUrl: string
  storageUnits: StorageUnit[]
}

export async function getPlan(tenantSlug: string): Promise<EnrichedPlanData> {
  if (!tenantSlug || typeof tenantSlug !== 'string') {
    throw new Error('tenantSlug es obligatorio para cargar el plan')
  }

  const data = await fetchApi<PlanResponse>(
    `/api/public/plan/${encodeURIComponent(tenantSlug)}`
  )

  if (!data.svgUrl || typeof data.svgUrl !== 'string') {
    throw new Error(`El backend no devolvió una URL de plano válida. svgUrl: ${JSON.stringify(data.svgUrl)}`)
  }
  if (!Array.isArray(data.storageUnits)) {
    throw new Error('El backend no devolvió un array de trasteros')
  }

  const enriched = data.storageUnits.map(enrichUnit)

  console.debug('[API] getPlan resultado:', {
    svgUrl: data.svgUrl,
    totalUnits: enriched.length,
    dimensionsDistribution: [...new Set(enriched.map((u) => u.dimensions))].sort((a, b) => a - b),
    sample: enriched.slice(0, 3).map((u) => ({
      number: u.number,
      shapeId: u.shapeId,
      dimensions: u.dimensions,
      dimensionsLabel: u.dimensionsLabel,
      status: u.status,
    })),
  })

  return { svgUrl: data.svgUrl, storageUnits: enriched }
}

export async function createReservation(
  payload: ReservationPayload
): Promise<ReservationSuccess> {
  return fetchApi<ReservationSuccess>('/api/public/reservations', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function getSvgFullUrl(svgUrl: string): string {
  if (!svgUrl || typeof svgUrl !== 'string') {
    throw new Error('La URL del plano SVG no es válida')
  }
  if (svgUrl.startsWith('http')) return svgUrl
  const path = svgUrl.startsWith('/') ? svgUrl : `/${svgUrl}`
  return API_BASE ? `${API_BASE}${path}` : path
}
