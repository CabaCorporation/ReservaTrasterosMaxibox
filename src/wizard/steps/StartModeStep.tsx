import { useWizard } from '../WizardContext'
import { Button } from '../../components/Button'
import type { StartMode } from '../../types'

const OPTIONS: {
  mode: StartMode
  icon: string
  title: string
  subtitle: string
  detail: string
}[] = [
  {
    mode: 'immediate',
    icon: '⚡',
    title: 'Entrar hoy',
    subtitle: 'Pago proporcional + domiciliación mensual',
    detail:
      'Pagas hoy los días que restan del mes en curso, calculado proporcionalmente. La domiciliación mensual completa comienza el día 1 del mes siguiente.',
  },
  {
    mode: 'next_month',
    icon: '📅',
    title: 'Entrar el mes siguiente',
    subtitle: 'Primer cobro el día 1 del próximo mes',
    detail:
      'No pagas nada hoy. El primer cobro mensual se realizará el día 1 del mes que viene. Accedes al trastero desde esa fecha.',
  },
]

export function StartModeStep() {
  const { state, dispatch } = useWizard()

  return (
    <div className="max-w-2xl mx-auto px-4 py-12 space-y-10">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-gray-900">
          ¿Cuándo quieres empezar?
        </h1>
        <p className="text-gray-500 text-lg">
          Elige la fecha de inicio de tu contrato de almacenaje
        </p>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {OPTIONS.map(opt => {
          const isSelected = state.startMode === opt.mode
          return (
            <button
              key={opt.mode}
              type="button"
              onClick={() => dispatch({ type: 'SET_START_MODE', mode: opt.mode })}
              className={`group relative text-left p-7 rounded-3xl border-2 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                isSelected
                  ? 'border-blue-500 bg-blue-50 shadow-lg shadow-blue-100'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
              }`}
            >
              {isSelected && (
                <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center">
                  <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
              <span className="text-3xl mb-4 block">{opt.icon}</span>
              <h3 className={`text-xl font-semibold mb-1.5 ${isSelected ? 'text-blue-700' : 'text-gray-900'}`}>
                {opt.title}
              </h3>
              <p className={`text-sm font-medium mb-3 ${isSelected ? 'text-blue-500' : 'text-gray-500'}`}>
                {opt.subtitle}
              </p>
              <p className="text-sm text-gray-500 leading-relaxed">{opt.detail}</p>
            </button>
          )
        })}
      </div>

      {/* Navigation */}
      <div className="flex justify-end pt-2">
        <Button
          disabled={!state.startMode}
          onClick={() => dispatch({ type: 'NEXT_STEP' })}
          className="!px-8 !py-3 !rounded-2xl !text-base !font-semibold"
        >
          Continuar
          <svg className="ml-2 w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </Button>
      </div>
    </div>
  )
}
