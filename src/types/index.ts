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
  type: string
  price: number
  dimensions?: string
  width?: number
  height?: number
  length?: number
  area?: number
}

export interface PlanResponse {
  svgUrl: string
  storageUnits: RawStorageUnit[]
  billingMode?: BillingMode
  requireDniUpload?: boolean
}

// ─── Unidad enriquecida en el frontend ────────────────────────────────

export interface StorageUnit {
  id: string
  number: number
  shapeId: string
  status: UnitStatus
  type: string
  price: number
  dimensions: number
  dimensionsLabel: string
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

// ─── Configuración del tenant (CRM) ─────────────────────────────────

/** Modalidad de cobro mensual configurada por el propietario en el CRM */
export type BillingMode = 'SAME_DAY' | 'FIRST_OF_MONTH' | 'BOTH'

/** Configuración pública del tenant para el wizard de reservas */
export interface TenantSettings {
  name: string
  billingMode: BillingMode
  requireDniUpload: boolean
}

// ─── Wizard ───────────────────────────────────────────────────────────

export type PaymentMethod = 'card' | 'transfer' | 'cash'

/** immediate  → paga proporcional hoy, domiciliación el día 1 del mes siguiente (FIRST_OF_MONTH)
 *  anniversary → sin pago hoy, domiciliación el mismo día del mes en que contrata (SAME_DAY) */
export type StartMode = 'immediate' | 'anniversary'

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

// ─── Payloads nuevos ──────────────────────────────────────────────────

export interface CreateLeadPayload {
  tenantSlug: string
  firstName: string
  lastName: string
  email: string
  phone: string
  storageUnitId?: string
  currentStep?: string
}

export interface CreateLeadResponse {
  leadId: string
}

export interface ConfirmFullReservationPayload {
  tenantSlug: string
  storageUnitId: string
  firstName: string
  lastName: string
  dni: string
  phone: string
  email: string
  address: string
  city: string
  postalCode: string
  startMode: StartMode
  shelfIncluded?: boolean
  premiumInsurance?: boolean
  goldInsurance?: boolean
  paymentMethod?: PaymentMethod
  monthlyPrice?: number
  leadId?: string
  dniPhotoPath?: string
  promotionId?: string
  extras?: SelectedExtra[]
}

// ─── Extras configurables ─────────────────────────────────────────

export type ExtraBillingType = 'ONE_TIME' | 'MONTHLY'

export interface TenantExtra {
  id: string
  name: string
  description?: string
  price: number
  billingType: ExtraBillingType
  required: boolean
  maxQuantity: number
}

export interface TenantExtraGroup {
  id: string
  name: string
  description?: string
  selectionType: 'SINGLE' | 'MULTIPLE'
  extras: TenantExtra[]
}

export interface TenantExtrasResponse {
  groups: TenantExtraGroup[]
  ungrouped: TenantExtra[]
}

export interface SelectedExtra {
  extraId: string
  quantity: number
}

// ─── Credenciales del portal ──────────────────────────────────────

export interface PortalCredentials {
  username: string
  temporaryPassword: string
}

export interface ConfirmFullReservationResponse {
  success: boolean
  message: string
  portalCredentials?: PortalCredentials
}

export interface UploadDniPhotoResponse {
  success: boolean
  filePath: string
  originalName: string
  size: number
}
