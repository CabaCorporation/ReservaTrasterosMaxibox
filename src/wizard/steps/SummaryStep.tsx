import { useState } from 'react'
import { useWizard } from '../WizardContext'
import { Button } from '../../components/Button'
import { PriceSummaryCard } from '../components/PriceSummaryCard'
import { confirmFullReservation } from '../../services/api'
import { getStartDate, formatDate, formatEuros, calcProportionalPayment } from '../utils'
import type { PortalCredentials } from '../../types'

const PAYMENT_LABELS: Record<string, string> = {
  card:     'Tarjeta bancaria',
  transfer: 'Transferencia bancaria',
  cash:     'Efectivo',
}

const START_MODE_LABELS: Record<string, string> = {
  immediate:   'Pago proporcional hoy — cobro el día 1 de cada mes',
  anniversary: 'Sin pago hoy — cobro el mismo día del mes en que contratas',
}

// ─── Pantalla de éxito ────────────────────────────────────────────────

function CredentialRow({ label, value, copy }: { label: string; value: string; copy?: boolean }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  return (
    <div className="flex items-center justify-between bg-white rounded-xl px-4 py-2.5 border border-blue-100 gap-2">
      <span className="text-gray-500 text-sm shrink-0">{label}</span>
      <div className="flex items-center gap-2 min-w-0">
        <span className="font-mono font-semibold text-gray-900 text-sm truncate">{value}</span>
        {copy && (
          <button
            type="button"
            onClick={handleCopy}
            className="shrink-0 text-xs text-blue-500 hover:text-blue-700 transition-colors"
            title="Copiar"
          >
            {copied ? (
              <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            )}
          </button>
        )}
      </div>
    </div>
  )
}

function SuccessScreen({
  credentials,
}: {
  credentials: PortalCredentials | null
}) {
  const [showPassword, setShowPassword] = useState(false)

  return (
    <div className="flex flex-col items-center justify-center min-h-[65vh] px-4 py-16 text-center space-y-6">
      <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center shadow-lg shadow-green-100">
        <svg className="w-12 h-12 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <div className="space-y-2">
        <h2 className="text-3xl font-bold text-gray-900">¡Reserva confirmada!</h2>
        <p className="text-gray-500 text-lg max-w-md mx-auto">
          Tu trastero queda reservado. El contrato está activo y tienes acceso desde ahora.
        </p>
      </div>

      {/* Credenciales del portal */}
      <div className="bg-blue-50 border border-blue-200 rounded-3xl p-6 text-left max-w-sm w-full space-y-3">
        <p className="text-sm font-semibold text-blue-800 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
          </svg>
          Tus credenciales de acceso al Área Cliente
        </p>
        {credentials ? (
          <>
            <div className="space-y-2">
              <CredentialRow label="Usuario" value={credentials.username} copy />
              <div className="flex items-center justify-between bg-white rounded-xl px-4 py-2.5 border border-blue-100 gap-2">
                <span className="text-gray-500 text-sm shrink-0">Contraseña</span>
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-mono font-semibold text-gray-900 text-sm tracking-wider">
                    {showPassword ? credentials.temporaryPassword : '••••••••'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="shrink-0 text-blue-500 hover:text-blue-700 transition-colors"
                    title={showPassword ? 'Ocultar' : 'Mostrar'}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      {showPassword ? (
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      )}
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
              Anota estas credenciales. Podrás cambiar la contraseña una vez dentro del Área Cliente.
            </p>
          </>
        ) : (
          <p className="text-sm text-blue-600">
            Recibirás un correo con los datos de acceso al área de cliente.
          </p>
        )}
      </div>

      <div className="bg-gray-50 rounded-3xl border border-gray-200 p-6 text-left max-w-sm w-full space-y-2.5">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Próximos pasos</p>
        <ul className="text-sm text-gray-700 space-y-2">
          <li className="flex gap-2.5">
            <svg className="w-4 h-4 mt-0.5 text-blue-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14" />
            </svg>
            <span>Accede al Área Cliente con las credenciales anteriores</span>
          </li>
          <li className="flex gap-2.5">
            <svg className="w-4 h-4 mt-0.5 text-blue-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span>Cambia la contraseña en tu perfil por seguridad</span>
          </li>
          <li className="flex gap-2.5">
            <svg className="w-4 h-4 mt-0.5 text-blue-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <span>Ya puedes acceder a tu trastero desde hoy</span>
          </li>
        </ul>
      </div>

      <a
        href="/"
        className="inline-flex items-center gap-2 bg-blue-600 text-white px-10 py-3.5 rounded-2xl font-semibold text-base hover:bg-blue-700 active:scale-95 transition-all shadow-lg shadow-blue-200"
      >
        Ir al área de cliente
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </a>
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────

export function SummaryStep() {
  const { state, dispatch } = useWizard()
  const {
    tenant, selectedUnits, startMode, customer, paymentMethod,
    promotionId, confirmed, leadId, dniPhotoPath, signature,
    selectedExtras, tenantExtras, portalCredentials,
  } = state

  const [promoInput, setPromoInput]   = useState(promotionId ?? '')
  const [promoApplied, setPromoApplied] = useState(Boolean(promotionId))
  const [loading, setLoading]          = useState(false)
  const [submitError, setSubmitError]  = useState<string | null>(null)

  if (confirmed) return <SuccessScreen credentials={portalCredentials} />

  if (!customer || !paymentMethod || !startMode) {
    return (
      <div className="text-center py-20 space-y-4">
        <p className="text-gray-500">Faltan datos. Vuelve al paso anterior.</p>
        <Button variant="secondary" onClick={() => dispatch({ type: 'PREV_STEP' })}>
          Volver
        </Button>
      </div>
    )
  }

  // Verificar que el contrato esté firmado
  if (!signature) {
    return (
      <div className="text-center py-20 space-y-4">
        <p className="text-gray-500">Debes firmar el contrato antes de continuar.</p>
        <Button variant="secondary" onClick={() => dispatch({ type: 'PREV_STEP' })}>
          Volver a firmar
        </Button>
      </div>
    )
  }

  const startDateIso  = getStartDate(startMode)
  const totalMonthly  = selectedUnits.reduce((s, u) => s + u.price, 0)
  const todayPayment  = startMode === 'immediate' ? calcProportionalPayment(totalMonthly) : 0

  const handleApplyPromo = () => {
    const trimmed = promoInput.trim().toUpperCase()
    if (!trimmed) return
    dispatch({ type: 'SET_PROMOTION_ID', id: trimmed })
    setPromoApplied(true)
  }

  const handleRemovePromo = () => {
    dispatch({ type: 'SET_PROMOTION_ID', id: null })
    setPromoInput('')
    setPromoApplied(false)
  }

  /**
   * Confirmar la reserva:
   * Llama a confirmFullReservation por cada trastero seleccionado.
   * Solo cuando el backend confirma → el trastero pasa a OCCUPIED.
   */
  const handleConfirm = async () => {
    setSubmitError(null)
    setLoading(true)

    const failed: number[] = []
    let savedCredentials = portalCredentials

    for (const unit of selectedUnits) {
      try {
        const res = await confirmFullReservation({
          tenantSlug:       tenant,
          storageUnitId:    unit.id,
          firstName:        customer.firstName,
          lastName:         customer.lastName,
          dni:              customer.dni,
          phone:            customer.phone,
          email:            customer.email,
          address:          customer.address,
          city:             customer.city,
          postalCode:       customer.postalCode,
          startMode,
          shelfIncluded:    customer.shelfIncluded,
          premiumInsurance: customer.premiumInsurance,
          goldInsurance:    customer.goldInsurance,
          paymentMethod,
          monthlyPrice:     unit.price,
          leadId:           leadId ?? undefined,
          dniPhotoPath:     dniPhotoPath ?? undefined,
          promotionId:      promotionId ?? undefined,
          extras:           selectedExtras.length > 0 ? selectedExtras : undefined,
        })
        // Guardar credenciales del portal (solo la primera vez)
        if (!savedCredentials && res.portalCredentials) {
          savedCredentials = res.portalCredentials
          dispatch({ type: 'SET_PORTAL_CREDENTIALS', credentials: res.portalCredentials })
        }
      } catch (err) {
        console.error(`[Summary] Error confirmando trastero #${unit.number}:`, err)
        failed.push(unit.number)
      }
    }

    setLoading(false)

    if (failed.length === selectedUnits.length) {
      const errMsg = failed.length === 1
        ? 'No se pudo completar la reserva. El trastero puede haber sido reservado por otra persona. Por favor, selecciona otro trastero.'
        : 'No se pudo completar ninguna reserva. Verifica tu conexión e inténtalo de nuevo.'
      setSubmitError(errMsg)
      return
    }

    if (failed.length > 0) {
      setSubmitError(
        `Se reservaron ${selectedUnits.length - failed.length} de ${selectedUnits.length} trasteros. Error en: #${failed.join(', #')}`
      )
    }

    dispatch({ type: 'CONFIRM' })
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex flex-col lg:flex-row gap-8">

        {/* Main summary */}
        <div className="flex-1 space-y-6">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-1">Resumen de tu reserva</h2>
            <p className="text-gray-500 text-sm">Revisa todos los detalles antes de confirmar</p>
          </div>

          {/* Estado de la firma */}
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-2xl px-4 py-3 text-sm text-green-700">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Contrato firmado correctamente
          </div>

          {/* Trasteros */}
          <SummarySection title="Trasteros seleccionados">
            <div className="space-y-2">
              {selectedUnits.map(u => (
                <div key={u.id} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                  <div>
                    <span className="text-sm font-medium text-gray-800">Trastero #{u.number}</span>
                    <span className="text-xs text-gray-500 ml-2">{u.dimensionsLabel}</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">{formatEuros(u.price)}/mes</span>
                </div>
              ))}
            </div>
          </SummarySection>

          {/* Contrato */}
          <SummarySection title="Contrato">
            <SummaryRow label="Fecha de inicio" value={formatDate(startDateIso)} />
            <SummaryRow label="Modalidad" value={START_MODE_LABELS[startMode]} />
            <SummaryRow label="Mensualidad" value={`${formatEuros(totalMonthly)}/mes`} />
            <SummaryRow
              label="Pago hoy"
              value={todayPayment > 0
                ? `${formatEuros(todayPayment)} (proporcional)`
                : '0,00 € (primer cobro el día 1)'}
            />
          </SummarySection>

          {/* Datos personales */}
          <SummarySection title="Datos personales">
            <SummaryRow label="Nombre" value={`${customer.firstName} ${customer.lastName}`} />
            <SummaryRow label="DNI / NIE" value={customer.dni} />
            <SummaryRow label="Teléfono" value={customer.phone} />
            <SummaryRow label="Email" value={customer.email} />
            <SummaryRow
              label="Dirección"
              value={[customer.address, customer.city, customer.postalCode].filter(Boolean).join(', ')}
            />
          </SummarySection>

          {/* Extras — sistema dinámico o legacy */}
          {selectedExtras.length > 0 && (
            <SummarySection title="Servicios adicionales">
              {selectedExtras.map((se) => {
                const allExtras = [
                  ...(tenantExtras?.ungrouped ?? []),
                  ...(tenantExtras?.groups.flatMap((g) => g.extras) ?? []),
                ]
                const extra = allExtras.find((e) => e.id === se.extraId)
                if (!extra) return null
                const price = se.quantity > 1 ? `${se.quantity} × ${formatEuros(extra.price)}` : formatEuros(extra.price)
                const suffix = extra.billingType === 'MONTHLY' ? '/mes' : ' (único)'
                return (
                  <SummaryRow key={se.extraId} label={extra.name} value={`${price}${suffix}`} />
                )
              })}
            </SummarySection>
          )}
          {selectedExtras.length === 0 && (customer.shelfIncluded || customer.premiumInsurance || customer.goldInsurance) && (
            <SummarySection title="Servicios adicionales">
              {customer.shelfIncluded    && <SummaryRow label="Estantería incluida" value="Sí" />}
              {customer.premiumInsurance && <SummaryRow label="Seguro premium"      value="Sí" />}
              {customer.goldInsurance    && <SummaryRow label="Seguro gold"         value="Sí" />}
            </SummarySection>
          )}

          {/* Método de pago */}
          <SummarySection title="Método de pago">
            <SummaryRow label="Forma de pago" value={PAYMENT_LABELS[paymentMethod] ?? paymentMethod} />
          </SummarySection>

          {/* Código promocional */}
          <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-5">
            <p className="text-sm font-semibold text-gray-900 mb-3">Código promocional</p>
            {promoApplied ? (
              <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-2xl px-4 py-3">
                <span className="text-sm font-semibold text-green-700 font-mono">{promotionId}</span>
                <button
                  type="button"
                  onClick={handleRemovePromo}
                  className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                >
                  Eliminar
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={promoInput}
                  onChange={e => setPromoInput(e.target.value.toUpperCase())}
                  placeholder="CÓDIGO"
                  className="flex-1 rounded-2xl border border-gray-200 px-4 py-2.5 text-sm font-mono uppercase outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                  onKeyDown={e => e.key === 'Enter' && handleApplyPromo()}
                />
                <Button
                  variant="secondary"
                  onClick={handleApplyPromo}
                  disabled={!promoInput.trim()}
                  className="!rounded-2xl !shrink-0"
                >
                  Aplicar
                </Button>
              </div>
            )}
          </div>

          {submitError && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-red-700">
              {submitError}
            </div>
          )}
        </div>

        {/* Sticky price card */}
        <div className="lg:w-72 shrink-0">
          <div className="sticky top-24">
            <PriceSummaryCard
              units={selectedUnits}
              startMode={startMode}
              customer={customer}
              paymentMethod={paymentMethod}
              promotionId={promotionId}
            />
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center mt-8">
        <Button
          variant="secondary"
          onClick={() => dispatch({ type: 'PREV_STEP' })}
          disabled={loading}
          className="!rounded-2xl"
        >
          <svg className="mr-2 w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Volver
        </Button>
        <Button
          onClick={handleConfirm}
          loading={loading}
          className="!px-10 !py-3.5 !rounded-2xl !text-base !font-bold"
        >
          {!loading && (
            <svg className="mr-2 w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
          Confirmar reserva
        </Button>
      </div>
    </div>
  )
}

// ─── Subcomponentes ───────────────────────────────────────────────────

function SummarySection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-5 space-y-2">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">{title}</p>
      {children}
    </div>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-start gap-4 py-1.5 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-500 shrink-0">{label}</span>
      <span className="text-sm font-medium text-gray-900 text-right">{value}</span>
    </div>
  )
}
