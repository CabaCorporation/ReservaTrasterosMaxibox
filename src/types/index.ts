// ─── Estados y tipos base ─────────────────────────────────────────────

export type UnitStatus =
  | 'AVAILABLE'
  | 'OCCUPIED'
  | 'RESERVED'
  | 'MAINTENANCE'

// ─── Lo que devuelve el backend (sin enrichment) ──────────────────────

export interface RawStorageUnit {
  id: string
  number: number
  shapeId: string
  status: UnitStatus
  type: string           // "STANDARD", "PREMIUM", etc. — varía por empresa
  price: number
  dimensions?: string    // "2x1", "3x1", "5x1" — formato "AnchoxAlto"
  width?: number
  height?: number
  length?: number
  area?: number
}

export interface PlanResponse {
  svgUrl: string
  storageUnits: RawStorageUnit[]
}

// ─── Unidad enriquecida en el frontend ────────────────────────────────

export interface StorageUnit {
  id: string
  number: number
  shapeId: string
  status: UnitStatus
  type: string
  price: number
  dimensions: number       // m² — calculado en frontend desde "2x1" → 2
  dimensionsLabel: string  // "2x1" — texto original para mostrar
}

// ─── Reservas (API pública simple) ───────────────────────────────────

export interface ReservationPayload {
  tenantSlug: string
  storageUnitId: string
  firstName: string
  lastName: string
  email: string
  phone: string
}

export interface ReservationSuccess {
  id?: string
  storageUnitId: string
  message?: string
}

// ─── Wizard ───────────────────────────────────────────────────────────

export type PaymentMethod = 'card' | 'transfer' | 'cash'

export type StartMode = 'immediate' | 'next_month'

export interface CustomerData {
  firstName: string
  lastName: string
  dni: string
  phone: string
  email: string
  address: string
  city: string
  postalCode: string
  shelfIncluded: boolean
  premiumInsurance: boolean
  goldInsurance: boolean
}

export interface FullReservationPayload {
  customer: Omit<CustomerData, 'shelfIncluded' | 'premiumInsurance' | 'goldInsurance'>
  contract: {
    storageUnitId: string
    monthlyPrice: number
    startDate: string
    shelfIncluded: boolean
    premiumInsurance: boolean
    goldInsurance: boolean
    promotionId?: string
  }
  payment: {
    paymentMethod: PaymentMethod
  }
}
