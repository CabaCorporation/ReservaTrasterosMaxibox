import { useState, useCallback } from 'react'
import { Button } from './Button'
import type { StorageUnit } from '../types'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

interface FormularioReservaProps {
  selectedUnit: StorageUnit | null
  tenantSlug: string
  onSuccess: () => void
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
  selectedUnit,
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
  const [errors, setErrors] = useState<FormErrors>({})
  const [loading, setLoading] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const validate = useCallback((): boolean => {
    const next: FormErrors = {}
    if (!form.firstName.trim()) next.firstName = 'Nombre obligatorio'
    if (!form.lastName.trim()) next.lastName = 'Apellidos obligatorios'
    if (!form.email.trim()) next.email = 'Email obligatorio'
    else if (!EMAIL_REGEX.test(form.email)) next.email = 'Email no válido'
    if (!form.phone.trim()) next.phone = 'Teléfono obligatorio'
    setErrors(next)
    return Object.keys(next).length === 0
  }, [form])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError(null)
    if (!validate() || !selectedUnit) return
    setLoading(true)
    try {
      const { createReservation } = await import('../services/api')
      await createReservation({
        tenantSlug,
        storageUnitId: selectedUnit.id,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
      })
      setForm({ firstName: '', lastName: '', email: '', phone: '' })
      setErrors({})
      onSuccess()
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Error al enviar la reserva')
    } finally {
      setLoading(false)
    }
  }

  const update = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }))
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  if (!selectedUnit) return null

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3 transition-all duration-200"
    >
      <p className="text-sm font-medium text-gray-700">
        Reservar trastero #{selectedUnit.number} · {selectedUnit.dimensionsLabel} ({selectedUnit.dimensions} m²) · {selectedUnit.price} €/mes
      </p>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Nombre</label>
        <input
          type="text"
          value={form.firstName}
          onChange={update('firstName')}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Nombre"
        />
        {errors.firstName && (
          <p className="mt-0.5 text-xs text-red-600">{errors.firstName}</p>
        )}
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
        {errors.lastName && (
          <p className="mt-0.5 text-xs text-red-600">{errors.lastName}</p>
        )}
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
        {errors.email && (
          <p className="mt-0.5 text-xs text-red-600">{errors.email}</p>
        )}
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
        {errors.phone && (
          <p className="mt-0.5 text-xs text-red-600">{errors.phone}</p>
        )}
      </div>
      {submitError && (
        <p className="text-sm text-red-600">{submitError}</p>
      )}
      <div className="flex gap-2 pt-1">
        <Button type="submit" loading={loading} className="flex-1">
          Confirmar reserva
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
