import { useWizard } from '../WizardContext'
import { Button } from '../../components/Button'
import { PriceSummaryCard } from '../components/PriceSummaryCard'
import type { PaymentMethod } from '../../types'

const METHODS: { id: PaymentMethod; icon: string; label: string; description: string }[] = [
  {
    id: 'card',
    icon: '💳',
    label: 'Tarjeta bancaria',
    description: 'Pago seguro mediante tarjeta de débito o crédito',
  },
  {
    id: 'transfer',
    icon: '🏦',
    label: 'Transferencia bancaria',
    description: 'Realiza una transferencia a nuestra cuenta bancaria',
  },
  {
    id: 'cash',
    icon: '💵',
    label: 'Efectivo',
    description: 'Pago en efectivo en nuestras instalaciones',
  },
]

export function PaymentStep() {
  const { state, dispatch } = useWizard()

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex flex-col lg:flex-row gap-8">

        {/* Payment methods */}
        <div className="flex-1 space-y-6">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-1">Método de pago</h2>
            <p className="text-gray-500 text-sm">Elige cómo quieres realizar el pago</p>
          </div>

          <div className="space-y-3">
            {METHODS.map(m => {
              const isSelected = state.paymentMethod === m.id
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => dispatch({ type: 'SET_PAYMENT_METHOD', method: m.id })}
                  className={`w-full text-left p-5 rounded-2xl border-2 transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50 shadow-md shadow-blue-100'
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <span className="text-2xl">{m.icon}</span>
                    <div className="flex-1">
                      <p className={`font-semibold ${isSelected ? 'text-blue-700' : 'text-gray-900'}`}>
                        {m.label}
                      </p>
                      <p className="text-sm text-gray-500 mt-0.5">{m.description}</p>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                      isSelected ? 'border-blue-600 bg-blue-600' : 'border-gray-300'
                    }`}>
                      {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Info callout */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-800">
            <p className="font-semibold mb-1">ℹ️ Información de pago</p>
            <p>
              El cargo se realizará una vez confirmada la reserva. Para domiciliación mensual
              te solicitaremos los datos bancarios tras la contratación.
            </p>
          </div>
        </div>

        {/* Summary sidebar */}
        <div className="lg:w-72 shrink-0">
          <div className="sticky top-24">
            <PriceSummaryCard
              units={state.selectedUnits}
              startMode={state.startMode}
              customer={state.customer}
              paymentMethod={state.paymentMethod}
            />
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center mt-8">
        <Button
          variant="secondary"
          onClick={() => dispatch({ type: 'PREV_STEP' })}
          className="!rounded-2xl"
        >
          <svg className="mr-2 w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Volver
        </Button>
        <Button
          disabled={!state.paymentMethod}
          onClick={() => dispatch({ type: 'NEXT_STEP' })}
          className="!px-8 !py-3 !rounded-2xl !text-base !font-semibold"
        >
          Ver resumen final
          <svg className="ml-2 w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </Button>
      </div>
    </div>
  )
}
