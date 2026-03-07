import { useState, useCallback, useRef } from 'react'
import { useWizard } from '../WizardContext'
import { Button } from '../../components/Button'
import { PriceSummaryCard } from '../components/PriceSummaryCard'
import { createLead, uploadDniPhoto } from '../../services/api'
import type { CustomerData, TenantExtra, TenantExtraGroup, SelectedExtra } from '../../types'

const formatEuros = (n: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n)

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const DNI_RE   = /^[0-9]{8}[A-Za-z]$|^[XYZxyz][0-9]{7}[A-Za-z]$/
const POSTAL_RE = /^[0-9]{4,6}$/

type FormErrors = Partial<Record<keyof CustomerData | 'dniPhoto', string>>

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

function validate(f: CustomerData, requireDni: boolean): FormErrors {
  const e: FormErrors = {}
  if (!f.firstName.trim())   e.firstName   = 'El nombre es obligatorio'
  if (!f.lastName.trim())    e.lastName    = 'Los apellidos son obligatorios'
  if (!f.dni.trim())         e.dni         = 'El DNI/NIE es obligatorio'
  else if (!DNI_RE.test(f.dni.trim())) e.dni = 'DNI no válido (8 dígitos + letra, o NIE)'
  if (!f.phone.trim())       e.phone       = 'El teléfono es obligatorio'
  if (!f.email.trim())       e.email       = 'El email es obligatorio'
  else if (!EMAIL_RE.test(f.email.trim())) e.email = 'Email no válido'
  if (!f.address.trim())     e.address     = 'La dirección es obligatoria'
  if (!f.city.trim())        e.city        = 'La ciudad es obligatoria'
  if (!f.postalCode.trim())  e.postalCode  = 'El código postal es obligatorio'
  else if (!POSTAL_RE.test(f.postalCode.trim())) e.postalCode = 'Código postal no válido'
  if (requireDni) {
    // La validación del archivo se hace por separado
  }
  return e
}

// ─── Subcomponentes ───────────────────────────────────────────────────

function FieldInput({
  label, value, onChange, error, type = 'text', placeholder, required,
}: {
  label: string; value: string; onChange: (v: string) => void
  error?: string; type?: string; placeholder?: string; required?: boolean
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
  checked, onChange, label, description,
}: {
  checked: boolean; onChange: (v: boolean) => void; label: string; description: string
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`w-full text-left p-4 rounded-2xl border-2 transition-all duration-150 ${
        checked ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'
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

// ─── Extra card (sistema configurable) ───────────────────────────────

function ExtraCard({
  extra,
  checked,
  onChange,
  isRadio = false,
}: {
  extra: TenantExtra
  checked: boolean
  onChange: (v: boolean) => void
  isRadio?: boolean
}) {
  const billingLabel = extra.billingType === 'MONTHLY' ? '/mes' : ' (pago único)'
  return (
    <button
      type="button"
      onClick={() => !extra.required && onChange(!checked)}
      disabled={extra.required}
      className={`w-full text-left p-4 rounded-2xl border-2 transition-all duration-150 ${
        checked
          ? 'border-blue-500 bg-blue-50'
          : extra.required
          ? 'border-amber-300 bg-amber-50 cursor-default'
          : 'border-gray-200 bg-white hover:border-gray-300'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 flex items-center justify-center shrink-0 transition-all ${
          isRadio
            ? `w-5 h-5 rounded-full border-2 ${checked ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`
            : `w-5 h-5 rounded-md border-2 ${checked ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`
        }`}>
          {checked && !isRadio && (
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
          {checked && isRadio && <div className="w-2 h-2 rounded-full bg-white" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className={`text-sm font-semibold ${
              checked ? 'text-blue-700' : extra.required ? 'text-amber-700' : 'text-gray-800'
            }`}>
              {extra.name}
              {extra.required && <span className="ml-1.5 text-xs font-normal text-amber-600">(obligatorio)</span>}
            </p>
            <span className={`text-sm font-bold shrink-0 ${checked ? 'text-blue-700' : 'text-gray-900'}`}>
              {formatEuros(extra.price)}{billingLabel}
            </span>
          </div>
          {extra.description && (
            <p className="text-xs text-gray-500 mt-0.5">{extra.description}</p>
          )}
        </div>
      </div>
    </button>
  )
}

function DynamicExtrasSection({
  groups,
  ungrouped,
  selected,
  onToggle,
}: {
  groups: TenantExtraGroup[]
  ungrouped: TenantExtra[]
  selected: SelectedExtra[]
  onToggle: (extra: SelectedExtra) => void
}) {
  const isSelected = (id: string) => selected.some((s) => s.extraId === id)

  const handleGroupToggle = (extra: TenantExtra, groupType: string) => {
    if (extra.required) return
    if (groupType === 'SINGLE') {
      // Radio: deselect others in group, then toggle this one
      onToggle({ extraId: extra.id, quantity: 1 })
    } else {
      onToggle({ extraId: extra.id, quantity: 1 })
    }
  }

  return (
    <>
      {groups.map((group) => (
        <div key={group.id} className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6 space-y-3">
          <div className="mb-1">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{group.name}</p>
            {group.description && <p className="text-xs text-gray-400 mt-0.5">{group.description}</p>}
            {group.selectionType === 'SINGLE' && (
              <p className="text-xs text-blue-500 mt-0.5">Selecciona una opción</p>
            )}
          </div>
          {group.extras.map((extra) => (
            <ExtraCard
              key={extra.id}
              extra={extra}
              checked={isSelected(extra.id)}
              onChange={() => handleGroupToggle(extra, group.selectionType)}
              isRadio={group.selectionType === 'SINGLE'}
            />
          ))}
        </div>
      ))}
      {ungrouped.length > 0 && (
        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6 space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
            Servicios adicionales
          </p>
          {ungrouped.map((extra) => (
            <ExtraCard
              key={extra.id}
              extra={extra}
              checked={isSelected(extra.id)}
              onChange={() => onToggle({ extraId: extra.id, quantity: 1 })}
            />
          ))}
        </div>
      )}
    </>
  )
}

// ─── Componente de subida de foto del DNI ─────────────────────────────

function DniPhotoUpload({
  file,
  onChange,
  error,
  uploading,
}: {
  file: File | null
  onChange: (f: File | null) => void
  error?: string
  uploading: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] ?? null
    onChange(selected)
  }

  const preview = file ? URL.createObjectURL(file) : null

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        Foto del DNI / NIE <span className="text-red-500">*</span>
      </label>
      <p className="text-xs text-gray-500 mb-3">
        Sube una foto clara de la parte frontal de tu DNI o NIE. Formatos aceptados: JPG, PNG, WEBP. Máx. 10 MB.
      </p>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        onChange={handleChange}
        className="hidden"
      />

      {file ? (
        <div className="border-2 border-blue-200 rounded-2xl overflow-hidden bg-blue-50">
          {preview && (
            <img
              src={preview}
              alt="Vista previa del DNI"
              className="w-full max-h-48 object-contain"
            />
          )}
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2 min-w-0">
              {uploading ? (
                <svg className="w-4 h-4 text-blue-500 animate-spin shrink-0" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
              <span className="text-xs text-gray-600 truncate">{file.name}</span>
            </div>
            <button
              type="button"
              onClick={() => onChange(null)}
              className="text-xs text-gray-400 hover:text-red-500 transition-colors shrink-0 ml-2"
            >
              Cambiar
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={`w-full border-2 border-dashed rounded-2xl py-6 flex flex-col items-center gap-2 transition-colors ${
            error
              ? 'border-red-300 bg-red-50 text-red-500'
              : 'border-gray-300 bg-gray-50 text-gray-500 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-500'
          }`}
        >
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="text-sm font-medium">Seleccionar foto del DNI</span>
          <span className="text-xs">Haz clic o arrastra aquí</span>
        </button>
      )}

      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────

export function CustomerFormStep() {
  const { state, dispatch } = useWizard()
  const requireDniUpload = state.tenantSettings?.requireDniUpload ?? false
  const initialData = state.customer ?? EMPTY
  const tenantExtras = state.tenantExtras
  const useDynamicExtras = tenantExtras !== null &&
    (tenantExtras.groups.length > 0 || tenantExtras.ungrouped.length > 0)

  const [form, setForm]         = useState<CustomerData>(initialData)
  const [errors, setErrors]     = useState<FormErrors>({})
  const [dniFile, setDniFile]   = useState<File | null>(state.dniPhotoFile)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving]     = useState(false)

  // Para extras dinámicos: gestión de selección con lógica SINGLE/MULTIPLE
  const handleToggleExtra = useCallback((incoming: SelectedExtra) => {
    const group = tenantExtras?.groups.find((g) =>
      g.extras.some((e) => e.id === incoming.extraId)
    )
    const isSingle = group?.selectionType === 'SINGLE'

    if (isSingle && group) {
      // Radio: si ya está seleccionado, deseleccionar; si no, seleccionar solo este
      const alreadySelected = state.selectedExtras.some((s) => s.extraId === incoming.extraId)
      if (alreadySelected) {
        // Deseleccionar
        dispatch({
          type: 'SET_SELECTED_EXTRAS',
          extras: state.selectedExtras.filter((s) => s.extraId !== incoming.extraId),
        })
      } else {
        // Deseleccionar otros del mismo grupo y seleccionar este
        const groupExtraIds = new Set(group.extras.map((e) => e.id))
        dispatch({
          type: 'SET_SELECTED_EXTRAS',
          extras: [
            ...state.selectedExtras.filter((s) => !groupExtraIds.has(s.extraId)),
            incoming,
          ],
        })
      }
    } else {
      dispatch({ type: 'TOGGLE_EXTRA', extra: incoming })
    }
  }, [dispatch, state.selectedExtras, tenantExtras])

  const update = useCallback(
    <K extends keyof CustomerData>(field: K, value: CustomerData[K]) => {
      setForm(prev => ({ ...prev, [field]: value }))
      setErrors(prev => ({ ...prev, [field]: undefined }))
    },
    []
  )

  const handleContinue = async () => {
    // Validar todos los campos
    const errs = validate(form, requireDniUpload)

    if (requireDniUpload && !dniFile) {
      errs.dniPhoto = 'La foto del DNI es obligatoria'
    }

    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }

    setSaving(true)

    try {
      // 1. Subir foto del DNI si es necesario
      let dniPhotoPath: string | null = null
      if (requireDniUpload && dniFile) {
        setUploading(true)
        try {
          const uploadResult = await uploadDniPhoto(dniFile, state.tenant)
          dniPhotoPath = uploadResult.filePath
          dispatch({ type: 'SET_DNI_PHOTO_PATH', path: dniPhotoPath })
        } catch (uploadErr) {
          console.error('[CustomerForm] Error subiendo foto DNI:', uploadErr)
          setErrors(prev => ({
            ...prev,
            dniPhoto: `Error al subir la foto: ${uploadErr instanceof Error ? uploadErr.message : 'Error desconocido'}`,
          }))
          return
        } finally {
          setUploading(false)
        }
      }

      // 2. Guardar el archivo en el contexto (para referencia visual)
      dispatch({ type: 'SET_DNI_PHOTO_FILE', file: dniFile })

      // 3. Guardar datos del cliente en el contexto
      dispatch({ type: 'SET_CUSTOMER', customer: form })

      // 4. Crear lead en el backend (best-effort, no bloquea si falla)
      const firstUnit = state.selectedUnits[0]
      createLead({
        tenantSlug: state.tenant,
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phone: form.phone,
        storageUnitId: firstUnit?.id,
        currentStep: 'FORM',
      })
        .then(res => dispatch({ type: 'SET_LEAD_ID', leadId: res.leadId }))
        .catch(err => console.warn('[CustomerForm] No se pudo crear el lead:', err))

      dispatch({ type: 'NEXT_STEP' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex flex-col lg:flex-row gap-8">

        {/* Form */}
        <div className="flex-1 space-y-6">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-1">Tus datos personales</h2>
            <p className="text-gray-500 text-sm">Todos los campos son obligatorios</p>
          </div>

          {/* Datos obligatorios */}
          <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6 space-y-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Datos personales <span className="text-red-500">*</span>
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

          {/* Contacto y dirección (ahora obligatorios) */}
          <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6 space-y-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Contacto y dirección <span className="text-red-500">*</span>
            </p>
            <FieldInput
              label="Email" required
              type="email"
              value={form.email}
              onChange={v => update('email', v)}
              error={errors.email}
              placeholder="ana@ejemplo.com"
            />
            <FieldInput
              label="Dirección" required
              value={form.address}
              onChange={v => update('address', v)}
              error={errors.address}
              placeholder="Calle Mayor 1, 2º A"
            />
            <div className="grid grid-cols-2 gap-4">
              <FieldInput
                label="Ciudad" required
                value={form.city}
                onChange={v => update('city', v)}
                error={errors.city}
                placeholder="Madrid"
              />
              <FieldInput
                label="Código postal" required
                value={form.postalCode}
                onChange={v => update('postalCode', v)}
                error={errors.postalCode}
                placeholder="28001"
              />
            </div>
          </div>

          {/* Foto del DNI (solo si está habilitado en el CRM) */}
          {requireDniUpload && (
            <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">
                Verificación de identidad <span className="text-red-500">*</span>
              </p>
              <DniPhotoUpload
                file={dniFile}
                onChange={setDniFile}
                error={errors.dniPhoto}
                uploading={uploading}
              />
            </div>
          )}

          {/* Extras — sistema dinámico (si existen) o legacy (hardcoded) */}
          {useDynamicExtras ? (
            <DynamicExtrasSection
              groups={tenantExtras!.groups}
              ungrouped={tenantExtras!.ungrouped}
              selected={state.selectedExtras}
              onToggle={handleToggleExtra}
            />
          ) : (
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
          )}
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
          disabled={saving}
          className="!rounded-2xl"
        >
          <svg className="mr-2 w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Volver
        </Button>
        <Button
          onClick={handleContinue}
          loading={saving}
          className="!px-8 !py-3 !rounded-2xl !text-base !font-semibold"
        >
          {saving ? 'Guardando…' : (
            <>
              Continuar
              <svg className="ml-2 w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
