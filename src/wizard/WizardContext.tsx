import { createContext, useContext, useReducer, type ReactNode } from 'react'
import type {
  StorageUnit,
  CustomerData,
  PaymentMethod,
  StartMode,
  TenantSettings,
  TenantExtrasResponse,
  SelectedExtra,
  PortalCredentials,
} from '../types'

// ─── State ────────────────────────────────────────────────────────────

export interface WizardState {
  tenant: string
  step: 1 | 2 | 3 | 4 | 5 | 6
  startMode: StartMode | null
  selectedUnits: StorageUnit[]
  customer: CustomerData | null
  signature: string | null   // dataURL PNG de la firma manuscrita
  paymentMethod: PaymentMethod | null
  promotionId: string | null
  confirmed: boolean

  // ── Nuevos campos ────────────────────────────────────────────────
  /** Configuración del tenant cargada al inicio (billingMode, requireDniUpload) */
  tenantSettings: TenantSettings | null
  /** ID del lead (PotentialClient) creado cuando el cliente rellena el formulario */
  leadId: string | null
  /** Archivo de la foto del DNI seleccionado por el cliente */
  dniPhotoFile: File | null
  /** Ruta en el servidor de la foto del DNI una vez subida */
  dniPhotoPath: string | null
  /** Extras configurables del tenant cargados al inicio */
  tenantExtras: TenantExtrasResponse | null
  /** Extras seleccionados por el cliente (nuevo sistema configurable) */
  selectedExtras: SelectedExtra[]
  /** Credenciales del portal generadas tras confirmar la reserva */
  portalCredentials: PortalCredentials | null
}

// ─── Actions ──────────────────────────────────────────────────────────

type WizardAction =
  | { type: 'NEXT_STEP' }
  | { type: 'PREV_STEP' }
  | { type: 'GO_STEP'; step: WizardState['step'] }
  | { type: 'SET_START_MODE'; mode: StartMode }
  | { type: 'TOGGLE_UNIT'; unit: StorageUnit }
  | { type: 'CLEAR_UNITS' }
  | { type: 'SET_CUSTOMER'; customer: CustomerData }
  | { type: 'SET_SIGNATURE'; signature: string }
  | { type: 'SET_PAYMENT_METHOD'; method: PaymentMethod }
  | { type: 'SET_PROMOTION_ID'; id: string | null }
  | { type: 'CONFIRM' }
  | { type: 'RESET' }
  | { type: 'SET_TENANT_SETTINGS'; settings: TenantSettings }
  | { type: 'SET_LEAD_ID'; leadId: string }
  | { type: 'SET_DNI_PHOTO_FILE'; file: File | null }
  | { type: 'SET_DNI_PHOTO_PATH'; path: string | null }
  /**
   * Aplica la configuración del tenant: si billingMode no es BOTH,
   * fuerza el startMode correspondiente y salta al paso 2.
   */
  | { type: 'APPLY_BILLING_MODE' }
  | { type: 'SET_TENANT_EXTRAS'; extras: TenantExtrasResponse }
  | { type: 'SET_SELECTED_EXTRAS'; extras: SelectedExtra[] }
  | { type: 'TOGGLE_EXTRA'; extra: SelectedExtra }
  | { type: 'SET_PORTAL_CREDENTIALS'; credentials: PortalCredentials }

// ─── Reducer ──────────────────────────────────────────────────────────

function createInitialState(tenant: string): WizardState {
  return {
    tenant,
    step: 1,
    startMode: null,
    selectedUnits: [],
    customer: null,
    signature: null,
    paymentMethod: null,
    promotionId: null,
    confirmed: false,
    tenantSettings: null,
    leadId: null,
    dniPhotoFile: null,
    dniPhotoPath: null,
    tenantExtras: null,
    selectedExtras: [],
    portalCredentials: null,
  }
}

function reducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case 'NEXT_STEP':
      return { ...state, step: Math.min(6, state.step + 1) as WizardState['step'] }
    case 'PREV_STEP':
      return { ...state, step: Math.max(1, state.step - 1) as WizardState['step'] }
    case 'GO_STEP':
      return { ...state, step: action.step }
    case 'SET_START_MODE':
      return { ...state, startMode: action.mode }
    case 'TOGGLE_UNIT': {
      const already = state.selectedUnits.some(u => u.id === action.unit.id)
      return {
        ...state,
        selectedUnits: already
          ? state.selectedUnits.filter(u => u.id !== action.unit.id)
          : [...state.selectedUnits, action.unit],
      }
    }
    case 'CLEAR_UNITS':
      return { ...state, selectedUnits: [] }
    case 'SET_CUSTOMER':
      return { ...state, customer: action.customer }
    case 'SET_SIGNATURE':
      return { ...state, signature: action.signature }
    case 'SET_PAYMENT_METHOD':
      return { ...state, paymentMethod: action.method }
    case 'SET_PROMOTION_ID':
      return { ...state, promotionId: action.id }
    case 'CONFIRM':
      return { ...state, confirmed: true }
    case 'RESET':
      return createInitialState(state.tenant)
    case 'SET_TENANT_SETTINGS':
      return { ...state, tenantSettings: action.settings }
    case 'SET_LEAD_ID':
      return { ...state, leadId: action.leadId }
    case 'SET_DNI_PHOTO_FILE':
      return { ...state, dniPhotoFile: action.file }
    case 'SET_DNI_PHOTO_PATH':
      return { ...state, dniPhotoPath: action.path }
    case 'APPLY_BILLING_MODE': {
      const bm = state.tenantSettings?.billingMode
      if (!bm || bm === 'BOTH') return state
      const forced: StartMode = bm === 'SAME_DAY' ? 'anniversary' : 'immediate'
      return { ...state, startMode: forced, step: 2 }
    }
    case 'SET_TENANT_EXTRAS':
      return { ...state, tenantExtras: action.extras }
    case 'SET_SELECTED_EXTRAS':
      return { ...state, selectedExtras: action.extras }
    case 'TOGGLE_EXTRA': {
      const exists = state.selectedExtras.find((e) => e.extraId === action.extra.extraId)
      return {
        ...state,
        selectedExtras: exists
          ? state.selectedExtras.filter((e) => e.extraId !== action.extra.extraId)
          : [...state.selectedExtras, action.extra],
      }
    }
    case 'SET_PORTAL_CREDENTIALS':
      return { ...state, portalCredentials: action.credentials }
    default:
      return state
  }
}

// ─── Context ──────────────────────────────────────────────────────────

interface WizardContextValue {
  state: WizardState
  dispatch: React.Dispatch<WizardAction>
}

const WizardContext = createContext<WizardContextValue | null>(null)

export function WizardProvider({
  tenant,
  children,
}: {
  tenant: string
  children: ReactNode
}) {
  const [state, dispatch] = useReducer(reducer, tenant, createInitialState)
  return (
    <WizardContext.Provider value={{ state, dispatch }}>
      {children}
    </WizardContext.Provider>
  )
}

export function useWizard() {
  const ctx = useContext(WizardContext)
  if (!ctx) throw new Error('useWizard must be used inside WizardProvider')
  return ctx
}
