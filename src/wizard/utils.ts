import type { StartMode } from '../types'

export function calcProportionalPayment(monthlyPrice: number): number {
  const today = new Date()
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
  const daysRemaining = daysInMonth - today.getDate() + 1
  return Math.round((monthlyPrice / daysInMonth) * daysRemaining * 100) / 100
}

export function getStartDate(_startMode: StartMode): string {
  // Ambos modos comienzan hoy; la diferencia es sólo el modelo de cobro
  return new Date().toISOString().split('T')[0]
}

export function getBillingDescription(startMode: StartMode): string {
  if (startMode === 'immediate') {
    const next = new Date()
    next.setMonth(next.getMonth() + 1, 1)
    return `El día 1 de cada mes (primer cobro completo el 1 de ${next.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })})`
  }
  const today = new Date()
  return `El día ${today.getDate()} de cada mes (primer cobro el ${today.getDate()} del mes siguiente)`
}

export function formatEuros(amount: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(amount)
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}
