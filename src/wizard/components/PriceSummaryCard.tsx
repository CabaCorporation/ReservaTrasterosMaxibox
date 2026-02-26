import { formatEuros, calcProportionalPayment } from '../utils'
import type { StorageUnit, PaymentMethod, StartMode, CustomerData } from '../../types'

interface PriceSummaryCardProps {
  units: StorageUnit[]
  startMode: StartMode | null
  customer?: CustomerData | null
  paymentMethod?: PaymentMethod | null
  promotionId?: string | null
  compact?: boolean
}

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  card:     'Tarjeta bancaria',
  transfer: 'Transferencia bancaria',
  cash:     'Efectivo',
}

export function PriceSummaryCard({
  units,
  startMode,
  customer,
  paymentMethod,
  promotionId,
  compact = false,
}: PriceSummaryCardProps) {
  const totalMonthly = units.reduce((s, u) => s + u.price, 0)
  const proportional = startMode === 'immediate' ? calcProportionalPayment(totalMonthly) : 0
  const todayPayment = startMode === 'immediate' ? proportional : 0

  const hasExtras = customer && (customer.shelfIncluded || customer.premiumInsurance || customer.goldInsurance)

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 bg-gray-50 border-b border-gray-200">
        <p className="text-sm font-semibold text-gray-700">Resumen del pedido</p>
      </div>

      <div className="px-5 py-4 space-y-3">
        {/* Units */}
        {units.length === 0 ? (
          <p className="text-sm text-gray-400 italic">Ningún trastero seleccionado</p>
        ) : (
          <div className="space-y-2">
            {units.map(u => (
              <div key={u.id} className="flex justify-between items-center text-sm">
                <span className="text-gray-600">
                  Trastero #{u.number}
                  {!compact && <span className="text-gray-400"> · {u.dimensionsLabel}</span>}
                </span>
                <span className="font-medium text-gray-900">{formatEuros(u.price)}/mes</span>
              </div>
            ))}
          </div>
        )}

        {/* Extras */}
        {hasExtras && (
          <div className="pt-2 border-t border-gray-100 space-y-1">
            {customer.shelfIncluded && (
              <div className="flex justify-between text-sm text-gray-600">
                <span>Estantería incluida</span>
                <span className="text-green-600 font-medium">Incluido</span>
              </div>
            )}
            {customer.premiumInsurance && (
              <div className="flex justify-between text-sm text-gray-600">
                <span>Seguro premium</span>
                <span className="text-green-600 font-medium">Incluido</span>
              </div>
            )}
            {customer.goldInsurance && (
              <div className="flex justify-between text-sm text-gray-600">
                <span>Seguro gold</span>
                <span className="text-green-600 font-medium">Incluido</span>
              </div>
            )}
          </div>
        )}

        {/* Promo */}
        {promotionId && (
          <div className="flex justify-between text-sm text-green-700 bg-green-50 rounded-xl px-3 py-2">
            <span>Código: <span className="font-mono font-semibold">{promotionId}</span></span>
            <span>Aplicado ✓</span>
          </div>
        )}

        {/* Totals */}
        <div className="pt-2 border-t border-gray-200 space-y-1.5">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Mensualidad</span>
            <span className="font-semibold text-gray-900">{formatEuros(totalMonthly)}/mes</span>
          </div>
          {startMode === 'immediate' && (
            <div className="flex justify-between text-sm text-gray-600">
              <span>Pago hoy (proporcional)</span>
              <span className="font-semibold text-gray-900">{formatEuros(todayPayment)}</span>
            </div>
          )}
          {startMode === 'next_month' && (
            <div className="flex justify-between text-sm text-gray-600">
              <span>Pago hoy</span>
              <span className="font-semibold text-green-600">0,00 €</span>
            </div>
          )}
        </div>

        {/* Payment method */}
        {paymentMethod && (
          <div className="pt-2 border-t border-gray-200">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Método de pago</span>
              <span className="font-medium text-gray-900">{PAYMENT_LABELS[paymentMethod]}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
