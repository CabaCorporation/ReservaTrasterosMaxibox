import { useMemo, useEffect } from 'react'
import { WizardProvider, useWizard } from './WizardContext'
import { Stepper } from './components/Stepper'
import { StartModeStep } from './steps/StartModeStep'
import { StorageSelectionStep } from './steps/StorageSelectionStep'
import { CustomerFormStep } from './steps/CustomerFormStep'
import { ContractStep } from './steps/ContractStep'
import { PaymentStep } from './steps/PaymentStep'
import { SummaryStep } from './steps/SummaryStep'
import { getTenantSettings, getTenantExtras } from '../services/api'

function readTenant(): string {
  return new URLSearchParams(window.location.search).get('tenant') ?? 'maxibox'
}

// ─── Inner content (has access to context) ───────────────────────────

function WizardContent() {
  const { state, dispatch } = useWizard()

  // Cargar configuración del tenant y extras al montar el wizard
  useEffect(() => {
    let cancelled = false

    Promise.allSettled([
      getTenantSettings(state.tenant),
      getTenantExtras(state.tenant),
    ]).then(([settingsResult, extrasResult]) => {
      if (cancelled) return
      if (settingsResult.status === 'fulfilled') {
        dispatch({ type: 'SET_TENANT_SETTINGS', settings: settingsResult.value })
        dispatch({ type: 'APPLY_BILLING_MODE' })
      } else {
        console.warn('[Wizard] No se pudo cargar la configuración del tenant:', settingsResult.reason)
      }
      if (extrasResult.status === 'fulfilled') {
        dispatch({ type: 'SET_TENANT_EXTRAS', extras: extrasResult.value })
      } else {
        console.warn('[Wizard] No se pudieron cargar los extras del tenant:', extrasResult.reason)
      }
    })

    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.tenant])

  // Scroll to top on each step change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [state.step])

  const stepEl = (() => {
    switch (state.step) {
      case 1: return <StartModeStep />
      case 2: return <StorageSelectionStep />
      case 3: return <CustomerFormStep />
      case 4: return <ContractStep />
      case 5: return <PaymentStep />
      case 6: return <SummaryStep />
    }
  })()

  return (
    <div className="min-h-screen bg-gray-50">
      <Stepper currentStep={state.step} />
      <div key={state.step} className="wizard-step-enter">
        {stepEl}
      </div>
    </div>
  )
}

// ─── Root wrapper ─────────────────────────────────────────────────────

export function ReservationWizard() {
  const tenant = useMemo(readTenant, [])
  return (
    <WizardProvider tenant={tenant}>
      <WizardContent />
    </WizardProvider>
  )
}
