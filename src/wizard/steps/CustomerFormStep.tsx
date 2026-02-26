import { useState, useCallback } from 'react'
import { useWizard } from '../WizardContext'
import { Button } from '../../components/Button'
import { PriceSummaryCard } from '../components/PriceSummaryCard'
import type { CustomerData } from '../../types'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const DNI_RE   = /^[0-9]{8}[A-Za-z]$|^[XYZxyz][0-9]{7}[A-Za-z]$/

type FormErrors = Partial<Record<keyof CustomerData, string>>

const EMPTY: CustomerData = {
  firstName: '',
  lastName: '',
  dni: '',
  phone: '',
  email: '',
  address: '',
  city: '',
  postalCode: '',
  shelfIncluded: false,
  premiumInsurance: false,
  goldInsurance: false,
}

function validate(f: CustomerData): FormErrors {
  const e: FormErrors = {}
  if (!f.firstName.trim())  e.firstName  = 'El nombre es obligatorio'
  if (!f.lastName.trim())   e.lastName   = 'Los apellidos son obligatorios'
  if (!f.dni.trim())        e.dni        = 'El DNI es obligatorio'
  else if (!DNI_RE.test(f.dni.trim())) e.dni = 'DNI no válido (8 dígitos + letra)'
  if (!f.phone.trim())      e.phone      = 'El teléfono es obligatorio'
  if (f.email.trim() && !EMAIL_RE.test(f.email.trim()))
    e.email = 'Email no válido'
  return e
}

function FieldInput({
  label,
  value,
  onChange,
  error,
  type = 'text',
  placeholder,
  required,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  error?: string
  type?: string
  placeholder?: string
  required?: boolean
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full rounded-2xl border px-4 py-2.5 text-sm outline-none transition-all duration-150 ${
          error
            ? 'border-red-300 bg-red-50 focus:ring-2 focus:ring-red-200'
            : 'border-gray-200 bg-white focus:ring-2 focus:ring-blue-200 focus:border-blue-400'
        }`}
      />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  )
}

function CheckboxCard({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  description: string
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`w-full text-left p-4 rounded-2xl border-2 transition-all duration-150 ${
        checked
          ? 'border-blue-500 bg-blue-50'
          : 'border-gray-200 bg-white hover:border-gray-300'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
          checked ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
        }`}>
          {checked && (
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
        <div>
          <p className={`text-sm font-semibold ${checked ? 'text-blue-700' : 'text-gray-800'}`}>{label}</p>
          <p className="text-xs text-gray-500 mt-0.5">{description}</p>
        </div>
      </div>
    </button>
  )
}

export function CustomerFormStep() {
  const { state, dispatch } = useWizard()
  const initialData = state.customer ?? EMPTY

  const [form, setForm]     = useState<CustomerData>(initialData)
  const [errors, setErrors] = useState<FormErrors>({})

  const update = useCallback(
    <K extends keyof CustomerData>(field: K, value: CustomerData[K]) => {
      setForm(prev => ({ ...prev, [field]: value }))
      setErrors(prev => ({ ...prev, [field]: undefined }))
    },
    []
  )

  const handleContinue = () => {
    const errs = validate(form)
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    dispatch({ type: 'SET_CUSTOMER', customer: form })
    dispatch({ type: 'NEXT_STEP' })
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex flex-col lg:flex-row gap-8">

        {/* Form */}
        <div className="flex-1 space-y-6">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-1">Tus datos personales</h2>
            <p className="text-gray-500 text-sm">Los campos marcados con * son obligatorios</p>
          </div>

          {/* Required */}
          <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6 space-y-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Datos obligatorios
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FieldInput
                label="Nombre" required
                value={form.firstName}
                onChange={v => update('firstName', v)}
                error={errors.firstName}
                placeholder="Ana"
              />
              <FieldInput
                label="Apellidos" required
                value={form.lastName}
                onChange={v => update('lastName', v)}
                error={errors.lastName}
                placeholder="García López"
              />
              <FieldInput
                label="DNI / NIE" required
                value={form.dni}
                onChange={v => update('dni', v.toUpperCase())}
                error={errors.dni}
                placeholder="12345678A"
              />
              <FieldInput
                label="Teléfono" required
                type="tel"
                value={form.phone}
                onChange={v => update('phone', v)}
                error={errors.phone}
                placeholder="600 000 000"
              />
            </div>
          </div>

          {/* Contact */}
          <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6 space-y-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Contacto y dirección
            </p>
            <FieldInput
              label="Email"
              type="email"
              value={form.email}
              onChange={v => update('email', v)}
              error={errors.email}
              placeholder="ana@ejemplo.com"
            />
            <FieldInput
              label="Dirección"
              value={form.address}
              onChange={v => update('address', v)}
              placeholder="Calle Mayor 1, 2º A"
            />
            <div className="grid grid-cols-2 gap-4">
              <FieldInput
                label="Ciudad"
                value={form.city}
                onChange={v => update('city', v)}
                placeholder="Madrid"
              />
              <FieldInput
                label="Código postal"
                value={form.postalCode}
                onChange={v => update('postalCode', v)}
                placeholder="28001"
              />
            </div>
          </div>

          {/* Extras */}
          <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6 space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Servicios adicionales
            </p>
            <CheckboxCard
              checked={form.shelfIncluded}
              onChange={v => update('shelfIncluded', v)}
              label="Estantería incluida"
              description="Añade una estantería metálica a tu trastero para aprovechar mejor el espacio"
            />
            <CheckboxCard
              checked={form.premiumInsurance}
              onChange={v => update('premiumInsurance', v)}
              label="Seguro premium"
              description="Protección ampliada de tus objetos almacenados hasta 3.000 €"
            />
            <CheckboxCard
              checked={form.goldInsurance}
              onChange={v => update('goldInsurance', v)}
              label="Seguro gold"
              description="Protección máxima de tus objetos almacenados hasta 10.000 €"
            />
          </div>
        </div>

        {/* Price summary sidebar */}
        <div className="lg:w-72 shrink-0">
          <div className="sticky top-24 space-y-4">
            <PriceSummaryCard
              units={state.selectedUnits}
              startMode={state.startMode}
              customer={form}
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
          onClick={handleContinue}
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
