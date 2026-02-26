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

export function StorageSelectionStep() {
  const { state, dispatch } = useWizard()
  const { tenant, selectedUnits, startMode } = state

  const [svgUrl, setSvgUrl]             = useState<string | null>(null)
  const [storageUnits, setStorageUnits] = useState<StorageUnit[]>([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState<string | null>(null)

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
    <div className="max-w-7xl mx-auto px-4 py-6 flex flex-col gap-5">

      {/* Main layout: plan (60%) + filters (40%) */}
      <div className="flex flex-col lg:flex-row gap-5">

        {/* ── Left: SVG Plan (60%) ──────────────────────────────────── */}
        <div className="lg:w-[60%] min-w-0">
          <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-4 flex flex-col gap-3">

            <h2 className="text-base font-semibold text-gray-900">
              Selecciona uno o varios trasteros
            </h2>

            {/* Legend — horizontal strip above the map */}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 px-1 py-2 bg-gray-50 rounded-2xl border border-gray-100">
              {LEGEND.map(([color, label]) => (
                <div key={label} className="flex items-center gap-1.5 text-xs text-gray-600">
                  <span
                    className="w-3 h-3 rounded shrink-0 inline-block"
                    style={{ backgroundColor: color }}
                  />
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
                containerHeight={360}
              />
            )}
          </div>
        </div>

        {/* ── Right: Filters (40%) ─────────────────────────────────── */}
        <div className="lg:w-[40%] shrink-0 space-y-4">
          <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-5 space-y-5">

            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Filtros</h3>
              {hasFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-xs text-blue-500 hover:text-blue-700 font-medium transition-colors"
                >
                  Limpiar filtros
                </button>
              )}
            </div>

            {/* Size filter */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2.5">
                Tamaño
              </p>
              <div className="flex flex-wrap gap-2">
                {dimensionGroups.map(g => (
                  <button
                    key={g.dimensions}
                    type="button"
                    onClick={() =>
                      setFilterByDimensions(filterByDimensions === g.dimensions ? null : g.dimensions)
                    }
                    className={`px-3 py-1.5 rounded-xl text-sm font-medium border transition-all duration-150 ${
                      filterByDimensions === g.dimensions
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300 hover:text-blue-600'
                    }`}
                  >
                    {g.dimensions} m²
                    <span className="ml-1.5 opacity-70 text-xs">({g.available})</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Price filter — text input */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2.5">
                Precio máximo
              </p>
              <div className="relative">
                <input
                  type="number"
                  min={0}
                  placeholder="Sin límite"
                  value={maxPriceInput}
                  onChange={e => setMaxPriceInput(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 pr-14 text-sm outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-400 pointer-events-none select-none">
                  €/mes
                </span>
              </div>
              {maxPrice !== null && (
                <p className="mt-1.5 text-xs text-gray-500">
                  Mostrando trasteros hasta <span className="font-semibold text-gray-700">{maxPrice} €/mes</span>
                </p>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* Selection summary */}
      {selectedUnits.length > 0 && (
        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 mb-2">
                {selectedUnits.length} trastero{selectedUnits.length > 1 ? 's' : ''} seleccionado{selectedUnits.length > 1 ? 's' : ''}
              </p>
              <div className="flex flex-wrap gap-2">
                {selectedUnits.map(u => (
                  <span
                    key={u.id}
                    className="inline-flex items-center gap-1.5 text-xs bg-green-50 text-green-700 border border-green-200 px-2.5 py-1 rounded-full font-medium"
                  >
                    #{u.number} · {u.dimensionsLabel} · {u.price} €/mes
                    <button
                      type="button"
                      onClick={() => dispatch({ type: 'TOGGLE_UNIT', unit: u })}
                      className="ml-0.5 text-green-500 hover:text-red-500 transition-colors"
                      aria-label={`Deseleccionar trastero #${u.number}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs text-gray-500 mb-0.5">Mensualidad</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatEuros(totalMonthly)}
                <span className="text-sm font-normal text-gray-500">/mes</span>
              </p>
              {startMode === 'immediate' && (
                <p className="text-xs text-gray-500 mt-0.5">
                  Hoy (proporcional):
                  <span className="font-semibold text-gray-700 ml-1">{formatEuros(proportional)}</span>
                </p>
              )}
            </div>
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
