import { createContext, useContext, useReducer, type ReactNode } from 'react'
import type { StorageUnit, CustomerData, PaymentMethod, StartMode } from '../types'

// ─── State ────────────────────────────────────────────────────────────

export interface WizardState {
  tenant: string
  step: 1 | 2 | 3 | 4 | 5
  startMode: StartMode | null
  selectedUnits: StorageUnit[]
  customer: CustomerData | null
  paymentMethod: PaymentMethod | null
  promotionId: string | null
  confirmed: boolean
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
  | { type: 'SET_PAYMENT_METHOD'; method: PaymentMethod }
  | { type: 'SET_PROMOTION_ID'; id: string | null }
  | { type: 'CONFIRM' }
  | { type: 'RESET' }

// ─── Reducer ──────────────────────────────────────────────────────────

function createInitialState(tenant: string): WizardState {
  return {
    tenant,
    step: 1,
    startMode: null,
    selectedUnits: [],
    customer: null,
    paymentMethod: null,
    promotionId: null,
    confirmed: false,
  }
}

function reducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case 'NEXT_STEP':
      return { ...state, step: Math.min(5, state.step + 1) as WizardState['step'] }
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
    case 'SET_PAYMENT_METHOD':
      return { ...state, paymentMethod: action.method }
    case 'SET_PROMOTION_ID':
      return { ...state, promotionId: action.id }
    case 'CONFIRM':
      return { ...state, confirmed: true }
    case 'RESET':
      return createInitialState(state.tenant)
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
