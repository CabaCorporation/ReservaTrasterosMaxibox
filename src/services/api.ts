import { API_BASE } from '../config/api'
import type { PlanResponse, ReservationPayload, ReservationSuccess } from '../types'

async function fetchApi<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })
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
    throw new Error(message)
  }
  return res.json() as Promise<T>
}

export async function getPlan(tenantSlug: string): Promise<PlanResponse> {
  return fetchApi<PlanResponse>(`/api/public/plan/${encodeURIComponent(tenantSlug)}`)
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
  if (svgUrl.startsWith('http')) return svgUrl
  const path = svgUrl.startsWith('/') ? svgUrl : `/${svgUrl}`
  return API_BASE ? `${API_BASE}${path}` : path
}
