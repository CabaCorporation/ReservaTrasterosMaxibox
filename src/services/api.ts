import { API_BASE } from '../config/api'
import type {
  PlanResponse,
  RawStorageUnit,
  StorageUnit,
  ReservationPayload,
  ReservationSuccess,
  FullReservationPayload,
  TenantSettings,
  CreateLeadPayload,
  CreateLeadResponse,
  ConfirmFullReservationPayload,
  ConfirmFullReservationResponse,
  UploadDniPhotoResponse,
  TenantExtrasResponse,
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
      if (json.message) message = Array.isArray(json.message) ? json.message.join(', ') : json.message
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

function parseDimensionsString(raw: string): number {
  const match = raw.match(/^(\d+(?:[.,]\d+)?)\s*[xX×*]\s*(\d+(?:[.,]\d+)?)$/)
  if (match) {
    const a = parseFloat(match[1].replace(',', '.'))
    const b = parseFloat(match[2].replace(',', '.'))
    if (!isNaN(a) && !isNaN(b) && a > 0 && b > 0) return a * b
  }
  const num = parseFloat(raw.replace(',', '.'))
  if (!isNaN(num) && num > 0) return num
  return 0
}

function computeDimensions(raw: RawStorageUnit): number {
  if (typeof raw.dimensions === 'string' && raw.dimensions.length > 0) {
    const parsed = parseDimensionsString(raw.dimensions)
    if (parsed > 0) return parsed
  }
  if (typeof raw.dimensions === 'number' && raw.dimensions > 0) return raw.dimensions
  if (typeof raw.area === 'number' && raw.area > 0) return raw.area
  if (typeof raw.width === 'number' && raw.width > 0) {
    if (typeof raw.height === 'number' && raw.height > 0) return raw.width * raw.height
    if (typeof raw.length === 'number' && raw.length > 0) return raw.width * raw.length
  }
  console.warn(`[API] No se pudo calcular dimensions para trastero #${raw.number}`)
  return 0
}

function getDimensionsLabel(raw: RawStorageUnit): string {
  if (typeof raw.dimensions === 'string' && raw.dimensions.length > 0) return raw.dimensions
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

interface GetPlanOptions {
  requireSvgUrl?: boolean
}

export async function getPlan(
  tenantSlug: string,
  options?: GetPlanOptions
): Promise<EnrichedPlanData> {
  if (!tenantSlug || typeof tenantSlug !== 'string') {
    throw new Error('tenantSlug es obligatorio para cargar el plan')
  }
  const requireSvgUrl = options?.requireSvgUrl ?? true

  const data = await fetchApi<PlanResponse>(
    `/api/public/plan/${encodeURIComponent(tenantSlug)}`
  )

  if (requireSvgUrl && (!data.svgUrl || typeof data.svgUrl !== 'string')) {
    throw new Error(`El backend no devolvió una URL de plano válida. svgUrl: ${JSON.stringify(data.svgUrl)}`)
  }
  if (!Array.isArray(data.storageUnits)) {
    throw new Error('El backend no devolvió un array de trasteros')
  }

  const enriched = data.storageUnits.map(enrichUnit)
  return { svgUrl: typeof data.svgUrl === 'string' ? data.svgUrl : '', storageUnits: enriched }
}

/** Carga la configuración del tenant para el wizard de reservas. */
export async function getTenantSettings(tenantSlug: string): Promise<TenantSettings> {
  return fetchApi<TenantSettings>(
    `/api/public/reservations/settings/${encodeURIComponent(tenantSlug)}`
  )
}

/** Carga los extras configurables del tenant para mostrar en el wizard. */
export async function getTenantExtras(tenantSlug: string): Promise<TenantExtrasResponse> {
  return fetchApi<TenantExtrasResponse>(
    `/api/public/reservations/extras/${encodeURIComponent(tenantSlug)}`
  )
}

/** Crea un lead (PotentialClient) cuando el cliente rellena sus datos. */
export async function createLead(
  payload: CreateLeadPayload
): Promise<CreateLeadResponse> {
  return fetchApi<CreateLeadResponse>('/api/public/reservations/leads', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

/** Marca un lead como abandonado en el paso indicado. */
export async function abandonLead(
  leadId: string,
  tenantSlug: string,
  abandonedStep: string
): Promise<void> {
  try {
    await fetchApi(`/api/public/reservations/leads/${encodeURIComponent(leadId)}/abandon`, {
      method: 'PATCH',
      body: JSON.stringify({ tenantSlug, abandonedStep }),
    })
  } catch (err) {
    console.warn('[API] No se pudo marcar el lead como abandonado:', err)
  }
}

/**
 * Confirma la reserva completa tras firma y selección de pago.
 * Crea el Cliente + Contrato, pone el trastero OCCUPIED.
 */
export async function confirmFullReservation(
  payload: ConfirmFullReservationPayload
): Promise<ConfirmFullReservationResponse> {
  return fetchApi<ConfirmFullReservationResponse>('/api/public/reservations/confirm-full', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

/** Sube la foto del DNI. Devuelve la ruta pública del archivo. */
export async function uploadDniPhoto(
  file: File,
  tenantSlug: string
): Promise<UploadDniPhotoResponse> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('tenantSlug', tenantSlug)

  const fullUrl = `${API_BASE}/api/public/uploads/dni`
  const res = await fetch(fullUrl, {
    method: 'POST',
    cache: 'no-store',
    headers: NO_CACHE_HEADERS,
    body: formData,
  })

  if (!res.ok) {
    const text = await res.text()
    let message = `Error ${res.status}`
    try {
      const json = JSON.parse(text)
      if (json.message) message = Array.isArray(json.message) ? json.message.join(', ') : json.message
    } catch { /* */ }
    throw new Error(message)
  }

  return res.json() as Promise<UploadDniPhotoResponse>
}

// ── Funciones legacy (se mantienen por compatibilidad) ────────────────

export async function createReservation(
  payload: ReservationPayload
): Promise<ReservationSuccess> {
  return fetchApi<ReservationSuccess>('/api/public/reservations', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function createFullReservation(
  tenantId: string,
  payload: FullReservationPayload
): Promise<{ id?: string; message?: string }> {
  return fetchApi('/api/public/reservations', {
    method: 'POST',
    headers: { 'x-tenant-id': tenantId },
    body: JSON.stringify(payload),
  })
}

export async function getAvailableUnits(
  tenantId: string,
  filters?: { squareMeters?: number; maxMonthlyPrice?: number }
): Promise<StorageUnit[]> {
  const params = new URLSearchParams()
  if (filters?.squareMeters != null) params.set('squareMeters', String(filters.squareMeters))
  if (filters?.maxMonthlyPrice != null) params.set('maxMonthlyPrice', String(filters.maxMonthlyPrice))
  const qs = params.toString()
  const data = await fetchApi<RawStorageUnit[]>(
    `/api/storage-units/available${qs ? `?${qs}` : ''}`,
    { headers: { 'x-tenant-id': tenantId } }
  )
  return Array.isArray(data) ? data.map(enrichUnit) : []
}

export function getSvgFullUrl(svgUrl: string): string {
  if (!svgUrl || typeof svgUrl !== 'string') {
    throw new Error('La URL del plano SVG no es válida')
  }
  if (svgUrl.startsWith('http')) return svgUrl
  const path = svgUrl.startsWith('/') ? svgUrl : `/${svgUrl}`
  if (!path.startsWith('/planos/')) return path
  return API_BASE ? `${API_BASE}${path}` : path
}
