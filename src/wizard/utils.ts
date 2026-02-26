import type { StartMode } from '../types'

export function calcProportionalPayment(monthlyPrice: number): number {
  const today = new Date()
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
  const daysRemaining = daysInMonth - today.getDate() + 1
  return Math.round((monthlyPrice / daysInMonth) * daysRemaining * 100) / 100
}

export function getStartDate(startMode: StartMode): string {
  const today = new Date()
  if (startMode === 'immediate') {
    return today.toISOString().split('T')[0]
  }
  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1)
  return nextMonth.toISOString().split('T')[0]
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
