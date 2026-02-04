export type UnitStatus =
  | 'AVAILABLE'
  | 'OCCUPIED'
  | 'RESERVED'
  | 'MAINTENANCE'

export type UnitType = 'SMALL' | 'MEDIUM' | 'LARGE' | 'XL'

export interface StorageUnit {
  id: string
  number: number
  shapeId: string
  status: UnitStatus
  type: UnitType
  price: number
}

export interface PlanResponse {
  svgUrl: string
  storageUnits: StorageUnit[]
}

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

export const UNIT_TYPE_LABELS: Record<UnitType, string> = {
  SMALL: '2 m²',
  MEDIUM: '4 m²',
  LARGE: '6 m²',
  XL: '10 m²',
}

export const UNIT_TYPE_ORDER: UnitType[] = ['SMALL', 'MEDIUM', 'LARGE', 'XL']
