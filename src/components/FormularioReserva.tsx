import { useState, useCallback } from 'react'
import { Button } from './Button'
import type { StorageUnit } from '../types'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

interface FormularioReservaProps {
  selectedUnits: StorageUnit[]
  tenantSlug: string
  onSuccess: (reservedIds: string[]) => void
  onCancel?: () => void
}

interface FormState {
  firstName: string
  lastName: string
  email: string
  phone: string
}

interface FormErrors {
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
}

export function FormularioReserva({
  selectedUnits,
  tenantSlug,
  onSuccess,
  onCancel,
}: FormularioReservaProps) {
  const [form, setForm] = useState<FormState>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  })
  const [errors, setErrors]         = useState<FormErrors>({})
  const [loading, setLoading]       = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const validate = useCallback((): boolean => {
    const next: FormErrors = {}
    if (!form.firstName.trim()) next.firstName = 'Nombre obligatorio'
    if (!form.lastName.trim())  next.lastName  = 'Apellidos obligatorios'
    if (!form.email.trim())     next.email     = 'Email obligatorio'
    else if (!EMAIL_REGEX.test(form.email)) next.email = 'Email no válido'
    if (!form.phone.trim())     next.phone     = 'Teléfono obligatorio'
    setErrors(next)
    return Object.keys(next).length === 0
  }, [form])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError(null)
    if (!validate() || selectedUnits.length === 0) return

    setLoading(true)
    const { createReservation } = await import('../services/api')
    const reservedIds: string[] = []
    const failedNumbers: number[] = []

    for (const unit of selectedUnits) {
      try {
        await createReservation({
          tenantSlug,
          storageUnitId: unit.id,
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
        })
        reservedIds.push(unit.id)
      } catch {
        failedNumbers.push(unit.number)
      }
    }

    setLoading(false)

    if (failedNumbers.length > 0) {
      setSubmitError(
        `Error al reservar trastero${failedNumbers.length > 1 ? 's' : ''}: #${failedNumbers.join(', #')}. Los demás se reservaron correctamente.`
      )
    }

    if (reservedIds.length > 0) {
      setForm({ firstName: '', lastName: '', email: '', phone: '' })
      setErrors({})
      onSuccess(reservedIds)
    }
  }

  const update = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }))
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: undefined }))
  }

  if (selectedUnits.length === 0) return null

  const totalPrice = selectedUnits.reduce((sum, u) => sum + u.price, 0)

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3"
    >
      {/* Resumen de la selección */}
      <div>
        <p className="text-sm font-medium text-gray-700 mb-1">
          {selectedUnits.length === 1
            ? `Reservar trastero #${selectedUnits[0].number}`
            : `Reservar ${selectedUnits.length} trasteros`}
        </p>
        {selectedUnits.length > 1 && (
          <ul className="text-xs text-gray-500 space-y-0.5 mb-1">
            {selectedUnits.map(u => (
              <li key={u.id}>
                · #{u.number} — {u.dimensionsLabel} — {u.price} €/mes
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs font-semibold text-gray-700">
          Total: {totalPrice} €/mes
        </p>
      </div>

      {/* Campos */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Nombre</label>
        <input
          type="text"
          value={form.firstName}
          onChange={update('firstName')}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Nombre"
        />
        {errors.firstName && <p className="mt-0.5 text-xs text-red-600">{errors.firstName}</p>}
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Apellidos</label>
        <input
          type="text"
          value={form.lastName}
          onChange={update('lastName')}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Apellidos"
        />
        {errors.lastName && <p className="mt-0.5 text-xs text-red-600">{errors.lastName}</p>}
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
        <input
          type="email"
          value={form.email}
          onChange={update('email')}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="email@ejemplo.com"
        />
        {errors.email && <p className="mt-0.5 text-xs text-red-600">{errors.email}</p>}
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Teléfono</label>
        <input
          type="tel"
          value={form.phone}
          onChange={update('phone')}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="600 000 000"
        />
        {errors.phone && <p className="mt-0.5 text-xs text-red-600">{errors.phone}</p>}
      </div>

      {submitError && <p className="text-sm text-red-600">{submitError}</p>}

      <div className="flex gap-2 pt-1">
        <Button type="submit" loading={loading} className="flex-1">
          {loading
            ? 'Enviando…'
            : selectedUnits.length === 1
              ? 'Confirmar reserva'
              : `Confirmar ${selectedUnits.length} reservas`}
        </Button>
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancelar
          </Button>
        )}
      </div>
    </form>
  )
}
