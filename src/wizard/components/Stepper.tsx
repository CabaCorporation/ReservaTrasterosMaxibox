import type { WizardState } from '../WizardContext'

const STEPS = [
  { id: 1, label: 'Inicio' },
  { id: 2, label: 'Trastero' },
  { id: 3, label: 'Datos' },
  { id: 4, label: 'Pago' },
  { id: 5, label: 'Confirmación' },
] as const

interface StepperProps {
  currentStep: WizardState['step']
}

export function Stepper({ currentStep }: StepperProps) {
  return (
    <nav className="w-full bg-white/90 backdrop-blur-md border-b border-gray-100 sticky top-0 z-30">
      <div className="max-w-4xl mx-auto px-4 py-3">
        <ol className="flex items-center">
          {STEPS.map((step, i) => {
            const isCompleted = currentStep > step.id
            const isCurrent   = currentStep === step.id
            return (
              <li key={step.id} className="flex items-center flex-1 min-w-0">
                <div className="flex flex-col items-center shrink-0">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                      isCompleted
                        ? 'bg-blue-600 text-white'
                        : isCurrent
                          ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                          : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    {isCompleted ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      step.id
                    )}
                  </div>
                  <span
                    className={`text-xs mt-1 font-medium transition-colors duration-300 hidden sm:block truncate max-w-[5rem] text-center ${
                      isCurrent ? 'text-blue-600' : isCompleted ? 'text-gray-600' : 'text-gray-400'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-2 sm:mx-3 transition-all duration-500 rounded-full ${
                      currentStep > step.id ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  />
                )}
              </li>
            )
          })}
        </ol>
      </div>
    </nav>
  )
}
