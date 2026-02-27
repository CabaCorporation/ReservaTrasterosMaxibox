import { useState, useEffect, useCallback, useMemo } from 'react'
import { PlanoSVG } from '../../components/PlanoSVG'
import { useWizard } from '../WizardContext'
import { Button } from '../../components/Button'
import { getPlan } from '../../services/api'
import { getLocalPlanSvgUrl } from '../../config/localPlans'
import { calcProportionalPayment, formatEuros } from '../utils'
import type { StorageUnit } from '../../types'

const LEGEND: [string, string][] = [
  ['#D19E02', 'Disponible'],
  ['#89D102', 'Seleccionado'],
  ['#D14402', 'Ocupado / Reservado'],
  ['#A17902', 'Fuera de filtro'],
]

// Breakpoint: el plano pasa a modal cuando la ventana es <= 767px
const MODAL_BREAKPOINT = 767

export function StorageSelectionStep() {
  const { state, dispatch } = useWizard()
  const { tenant, selectedUnits, startMode } = state

  const [svgUrl, setSvgUrl]             = useState<string | null>(null)
  const [storageUnits, setStorageUnits] = useState<StorageUnit[]>([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState<string | null>(null)

  // ── Modal del plano para pantallas pequeñas ─────────────────────────
  const [showMapModal, setShowMapModal] = useState(false)
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth <= MODAL_BREAKPOINT : false,
  )

  useEffect(() => {
    const check = () => {
      const mobile = window.innerWidth <= MODAL_BREAKPOINT
      setIsMobile(mobile)
      // Cerrar modal si el usuario amplía la ventana a desktop
      if (!mobile) setShowMapModal(false)
    }
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Bloquear scroll del body cuando el modal está abierto
  useEffect(() => {
    if (showMapModal) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [showMapModal])

  // ── Filters ────────────────────────────────────────────────────────
  const [filterByDimensions, setFilterByDimensions] = useState<number | null>(null)
  const [maxPriceInput, setMaxPriceInput]           = useState<string>('')   // raw text
  const maxPrice = maxPriceInput.trim() === '' ? null : Number(maxPriceInput)

  const clearFilters = () => {
    setFilterByDimensions(null)
    setMaxPriceInput('')
  }

  const hasFilters = filterByDimensions !== null || maxPriceInput.trim() !== ''

  // ── Plan loading ───────────────────────────────────────────────────
  const loadPlan = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const localSvgUrl = getLocalPlanSvgUrl(tenant)
      const data = await getPlan(tenant, { requireSvgUrl: !localSvgUrl })
      const resolvedSvgUrl = localSvgUrl ?? data.svgUrl
      if (!resolvedSvgUrl) throw new Error('No se pudo resolver la URL del plano')
      setSvgUrl(resolvedSvgUrl)
      setStorageUnits(data.storageUnits)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error cargando el plano')
    } finally {
      setLoading(false)
    }
  }, [tenant])

  useEffect(() => { loadPlan() }, [loadPlan])

  const handleToggle = useCallback(
    (unit: StorageUnit) => dispatch({ type: 'TOGGLE_UNIT', unit }),
    [dispatch]
  )

  const dimensionGroups = useMemo(() => {
    const map = new Map<number, { label: string; available: number }>()
    for (const u of storageUnits) {
      const ex = map.get(u.dimensions)
      if (ex) {
        if (u.status === 'AVAILABLE') ex.available++
      } else {
        map.set(u.dimensions, {
          label: u.dimensionsLabel,
          available: u.status === 'AVAILABLE' ? 1 : 0,
        })
      }
    }
    return [...map.entries()]
      .map(([d, v]) => ({ dimensions: d, ...v }))
      .sort((a, b) => a.dimensions - b.dimensions)
  }, [storageUnits])

  const totalMonthly = selectedUnits.reduce((s, u) => s + u.price, 0)
  const proportional = startMode === 'immediate' ? calcProportionalPayment(totalMonthly) : 0

  // ── Loading / Error ────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <span className="inline-block w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-20 space-y-4">
        <p className="text-red-500 text-sm">{error}</p>
        <Button onClick={loadPlan}>Reintentar</Button>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-5">

      {/* ── Panel de filtros (siempre visible, en columna o fila según breakpoint) */}
      {/* En móvil va arriba del botón; en desktop forma la columna derecha */}

      {/* Mobile: botón para abrir el plano + filtros en fila compacta */}
      {isMobile && (
        <div className="flex flex-col gap-3">
          {/* Botón ver plano */}
          <button
            type="button"
            onClick={() => setShowMapModal(true)}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-semibold rounded-2xl px-4 py-3.5 transition-all shadow-sm"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            Ver plano interactivo
          </button>

          {/* Filtros compactos en fila */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 text-sm">Filtros</h3>
              {hasFilters && (
                <button type="button" onClick={clearFilters}
                  className="text-xs text-blue-500 hover:text-blue-700 font-medium">
                  Limpiar
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {dimensionGroups.map(g => (
                <button key={g.dimensions} type="button"
                  onClick={() => setFilterByDimensions(filterByDimensions === g.dimensions ? null : g.dimensions)}
                  className={`px-3 py-1.5 rounded-xl text-sm font-medium border transition-all ${
                    filterByDimensions === g.dimensions
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300'
                  }`}
                >
                  {g.dimensions} m² <span className="opacity-60 text-xs">({g.available})</span>
                </button>
              ))}
            </div>
            <div className="relative">
              <input type="number" min={0} placeholder="Precio máximo (€/mes)"
                value={maxPriceInput} onChange={e => setMaxPriceInput(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 pr-12 text-sm outline-none focus:ring-2 focus:ring-blue-200 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">€/mes</span>
            </div>
          </div>
        </div>
      )}

      {/* Tablet / Desktop: plano (80%) + filtros (20%) en fila */}
      {!isMobile && (
        <div className="flex flex-col lg:flex-row gap-4 items-start">

          {/* ── Left: SVG Plan — 80% width ─────────────────────────── */}
          <div className="min-w-0 w-full lg:w-[80%]">
            <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-3 flex flex-col gap-2">

              <h2 className="text-base font-semibold text-gray-900">
                Selecciona uno o varios trasteros
              </h2>

              {/* Legend */}
              <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 px-1 py-2 bg-gray-50 rounded-2xl border border-gray-100">
                {LEGEND.map(([color, label]) => (
                  <div key={label} className="flex items-center gap-1.5 text-xs text-gray-600">
                    <span className="w-3 h-3 rounded shrink-0 inline-block" style={{ backgroundColor: color }} />
                    {label}
                  </div>
                ))}
              </div>

              {svgUrl && (
                <PlanoSVG
                  svgUrl={svgUrl}
                  storageUnits={storageUnits}
                  filterByDimensions={filterByDimensions}
                  maxPrice={maxPrice}
                  selectedUnits={selectedUnits}
                  onToggleUnit={handleToggle}
                />
              )}
            </div>
          </div>

          {/* ── Right: Filters — 20% width ──────────────────────────── */}
          <div className="w-full lg:w-[20%] shrink-0">
            <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-4 flex flex-col gap-4">

              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 text-sm">Filtros</h3>
                {hasFilters && (
                  <button type="button" onClick={clearFilters}
                    className="text-xs text-blue-500 hover:text-blue-700 font-medium transition-colors">
                    Limpiar
                  </button>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Tamaño</p>
                {dimensionGroups.map(g => (
                  <button key={g.dimensions} type="button"
                    onClick={() => setFilterByDimensions(filterByDimensions === g.dimensions ? null : g.dimensions)}
                    className={`w-full px-3 py-2 rounded-xl text-sm font-medium border text-left transition-all duration-150 ${
                      filterByDimensions === g.dimensions
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300 hover:text-blue-600'
                    }`}
                  >
                    {g.dimensions} m²
                    <span className="ml-1.5 opacity-60 text-xs">({g.available})</span>
                  </button>
                ))}
              </div>

              <div className="flex flex-col gap-1.5">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Precio máx.</p>
                <div className="relative">
                  <input type="number" min={0} placeholder="Sin límite"
                    value={maxPriceInput} onChange={e => setMaxPriceInput(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 pr-12 text-sm outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none select-none">€/mes</span>
                </div>
                {maxPrice !== null && (
                  <p className="text-xs text-gray-500">
                    Hasta <span className="font-semibold text-gray-700">{maxPrice} €</span>
                  </p>
                )}
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ── Modal fullscreen del plano (móvil) ──────────────────────── */}
      {showMapModal && (
        <div className="fixed inset-0 z-50 flex flex-col bg-white">
          {/* Header del modal */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 shrink-0">
            <div>
              <h2 className="font-semibold text-gray-900 text-base">Plano del almacén</h2>
              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
                {LEGEND.map(([color, label]) => (
                  <div key={label} className="flex items-center gap-1 text-xs text-gray-500">
                    <span className="w-2.5 h-2.5 rounded shrink-0 inline-block" style={{ backgroundColor: color }} />
                    {label}
                  </div>
                ))}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowMapModal(false)}
              className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 shrink-0 ml-3 transition-colors"
              aria-label="Cerrar plano"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Plano a pantalla completa — rotado para aprovechar la pantalla vertical */}
          <div className="flex-1 min-h-0 p-2">
            {svgUrl && (
              <PlanoSVG
                svgUrl={svgUrl}
                storageUnits={storageUnits}
                filterByDimensions={filterByDimensions}
                maxPrice={maxPrice}
                selectedUnits={selectedUnits}
                onToggleUnit={handleToggle}
                fitMode="contain"
                rotated={true}
              />
            )}
          </div>

          {/* Footer del modal: filtros + botón cerrar */}
          <div className="shrink-0 border-t border-gray-100 px-4 py-3 flex flex-col gap-2 bg-white">
            <div className="flex items-center gap-2 flex-wrap">
              {hasFilters && (
                <button type="button" onClick={clearFilters}
                  className="text-xs text-blue-500 font-medium">
                  Limpiar filtros ·
                </button>
              )}
              {dimensionGroups.map(g => (
                <button key={g.dimensions} type="button"
                  onClick={() => setFilterByDimensions(filterByDimensions === g.dimensions ? null : g.dimensions)}
                  className={`px-3 py-1 rounded-xl text-xs font-medium border transition-all ${
                    filterByDimensions === g.dimensions
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-200'
                  }`}
                >
                  {g.dimensions} m²
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setShowMapModal(false)}
              className="w-full bg-gray-900 hover:bg-gray-700 text-white font-semibold rounded-2xl py-3 transition-colors"
            >
              Listo
            </button>
          </div>
        </div>
      )}

      {/* Selected units — elaborate cards */}
      {selectedUnits.length > 0 && (
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between px-1">
            <p className="text-sm font-semibold text-gray-800">
              {selectedUnits.length} trastero{selectedUnits.length > 1 ? 's' : ''} seleccionado{selectedUnits.length > 1 ? 's' : ''}
            </p>
            <div className="text-right">
              <span className="text-xs text-gray-500">Total mensual: </span>
              <span className="text-sm font-bold text-gray-900">{formatEuros(totalMonthly)}/mes</span>
              {startMode === 'immediate' && (
                <span className="ml-2 text-xs text-amber-700 font-semibold">
                  · Hoy: {formatEuros(proportional)}
                </span>
              )}
            </div>
          </div>

          {/* Unit cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {selectedUnits.map(u => {
              const unitProportional = startMode === 'immediate'
                ? calcProportionalPayment(u.price)
                : 0
              return (
                <div
                  key={u.id}
                  className="bg-white rounded-2xl border border-green-200 shadow-sm p-4 relative"
                >
                  {/* Remove button */}
                  <button
                    type="button"
                    onClick={() => dispatch({ type: 'TOGGLE_UNIT', unit: u })}
                    className="absolute top-3 right-3 w-6 h-6 rounded-full bg-gray-100 hover:bg-red-100 hover:text-red-500 text-gray-400 flex items-center justify-center text-base transition-colors"
                    aria-label={`Deseleccionar trastero #${u.number}`}
                  >
                    ×
                  </button>

                  {/* Badge + number */}
                  <div className="flex items-center gap-2 mb-2 pr-7">
                    <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                    <span className="text-sm font-bold text-gray-900">Trastero #{u.number}</span>
                  </div>

                  {/* Dimensions */}
                  <p className="text-xs text-gray-500 mb-3">
                    {u.dimensionsLabel} &nbsp;·&nbsp; <span className="font-medium text-gray-700">{u.dimensions} m²</span>
                  </p>

                  {/* Price rows */}
                  <div className="space-y-1.5 pt-2 border-t border-gray-100">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500">Mensualidad</span>
                      <span className="text-sm font-bold text-gray-900">{formatEuros(u.price)}<span className="text-xs font-normal text-gray-400">/mes</span></span>
                    </div>
                    {startMode === 'immediate' && (
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500">Pago hoy</span>
                        <span className="text-sm font-semibold text-amber-700">{formatEuros(unitProportional)}</span>
                      </div>
                    )}
                    {startMode === 'next_month' && (
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500">Pago hoy</span>
                        <span className="text-sm font-semibold text-green-600">0,00 €</span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between items-center pt-1">
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
          disabled={selectedUnits.length === 0}
          onClick={() => dispatch({ type: 'NEXT_STEP' })}
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
