import { useState } from 'react'
import { useWizard } from '../WizardContext'
import { Button } from '../../components/Button'
import { PriceSummaryCard } from '../components/PriceSummaryCard'
import { createFullReservation } from '../../services/api'
import { getStartDate, formatDate, formatEuros, calcProportionalPayment } from '../utils'

const PAYMENT_LABELS: Record<string, string> = {
  card:     'Tarjeta bancaria',
  transfer: 'Transferencia bancaria',
  cash:     'Efectivo',
}

const START_MODE_LABELS: Record<string, string> = {
  immediate:  'Hoy',
  next_month: 'Día 1 del mes siguiente',
}

// ─── Success screen ───────────────────────────────────────────────────

function SuccessScreen() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 py-16 text-center space-y-6">
      <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center animate-bounce-once">
        <svg className="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <div className="space-y-2">
        <h2 className="text-3xl font-bold text-gray-900">¡Contrato realizado!</h2>
        <p className="text-gray-500 text-lg max-w-sm mx-auto">
          Tu reserva se ha completado correctamente. En breve recibirás un email de confirmación.
        </p>
      </div>
      <div className="bg-gray-50 rounded-3xl border border-gray-200 p-6 text-left space-y-2 max-w-sm w-full">
        <p className="text-sm text-gray-500">Próximos pasos:</p>
        <ul className="text-sm text-gray-700 space-y-1.5">
          <li className="flex gap-2"><span>📧</span> Comprueba tu correo electrónico</li>
          <li className="flex gap-2"><span>📋</span> Recibirás tu contrato en PDF</li>
          <li className="flex gap-2"><span>🔑</span> Se te informará del acceso al trastero</li>
        </ul>
      </div>
      <a
        href="/"
        className="mt-4 inline-flex items-center gap-2 bg-blue-600 text-white px-8 py-3 rounded-2xl font-semibold text-base hover:bg-blue-700 transition-colors"
      >
        Ir al área de cliente
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </a>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────

export function SummaryStep() {
  const { state, dispatch } = useWizard()
  const { tenant, selectedUnits, startMode, customer, paymentMethod, promotionId, confirmed } = state

  const [promoInput, setPromoInput] = useState(promotionId ?? '')
  const [promoApplied, setPromoApplied] = useState(Boolean(promotionId))
  const [loading, setLoading]           = useState(false)
  const [submitError, setSubmitError]   = useState<string | null>(null)

  if (confirmed) return <SuccessScreen />

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

  const handleConfirm = async () => {
    setSubmitError(null)
    setLoading(true)

    const { firstName, lastName, dni, phone, email, address, city, postalCode,
            shelfIncluded, premiumInsurance, goldInsurance } = customer

    const customerPayload = { firstName, lastName, dni, phone, email, address, city, postalCode }
    const failed: number[] = []

    for (const unit of selectedUnits) {
      try {
        await createFullReservation(tenant, {
          customer: customerPayload,
          contract: {
            storageUnitId:    unit.id,
            monthlyPrice:     unit.price,
            startDate:        startDateIso,
            shelfIncluded,
            premiumInsurance,
            goldInsurance,
            ...(promotionId ? { promotionId } : {}),
          },
          payment: { paymentMethod },
        })
      } catch {
        failed.push(unit.number)
      }
    }

    setLoading(false)

    if (failed.length === selectedUnits.length) {
      setSubmitError(
        `No se pudo completar ninguna reserva. Verifica tu conexión e inténtalo de nuevo.`
      )
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

          {/* Dates & payment */}
          <SummarySection title="Contrato">
            <SummaryRow label="Fecha de inicio" value={formatDate(startDateIso)} />
            <SummaryRow label="Modalidad" value={START_MODE_LABELS[startMode]} />
            <SummaryRow label="Mensualidad" value={`${formatEuros(totalMonthly)}/mes`} />
            <SummaryRow
              label="Pago hoy"
              value={todayPayment > 0 ? `${formatEuros(todayPayment)} (proporcional)` : '0,00 € (primer cobro el día 1)'}
            />
          </SummarySection>

          {/* Customer */}
          <SummarySection title="Datos personales">
            <SummaryRow label="Nombre" value={`${customer.firstName} ${customer.lastName}`} />
            <SummaryRow label="DNI / NIE" value={customer.dni} />
            <SummaryRow label="Teléfono" value={customer.phone} />
            {customer.email && <SummaryRow label="Email" value={customer.email} />}
            {customer.address && (
              <SummaryRow
                label="Dirección"
                value={[customer.address, customer.city, customer.postalCode].filter(Boolean).join(', ')}
              />
            )}
          </SummarySection>

          {/* Extras */}
          {(customer.shelfIncluded || customer.premiumInsurance || customer.goldInsurance) && (
            <SummarySection title="Servicios adicionales">
              {customer.shelfIncluded    && <SummaryRow label="Estantería incluida" value="Sí" />}
              {customer.premiumInsurance && <SummaryRow label="Seguro premium"      value="Sí" />}
              {customer.goldInsurance    && <SummaryRow label="Seguro gold"         value="Sí" />}
            </SummarySection>
          )}

          {/* Payment method */}
          <SummarySection title="Método de pago">
            <SummaryRow label="Forma de pago" value={PAYMENT_LABELS[paymentMethod]} />
          </SummarySection>

          {/* Promo code */}
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
          className="!rounded-2xl"
          disabled={loading}
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
          Finalizar contratación
        </Button>
      </div>
    </div>
  )
}

// ─── Helper sub-components ────────────────────────────────────────────

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
