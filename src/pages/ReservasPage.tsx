import { useState, useEffect, useCallback, useMemo } from 'react'
import { PlanoSVG } from '../components/PlanoSVG'
import { PanelLateral } from '../components/PanelLateral'
import { getPlan } from '../services/api'
import { getLocalPlanSvgUrl } from '../config/localPlans'
import type { StorageUnit } from '../types'

const DEFAULT_TENANT = 'maxibox'

function readTenantSlug(): string {
  const params = new URLSearchParams(window.location.search)
  return params.get('tenant') || DEFAULT_TENANT
}

export function ReservasPage() {
  const tenantSlug = useMemo(() => {
    const slug = readTenantSlug()
    console.debug('[ReservasPage] tenantSlug leído:', slug)
    return slug
  }, [])

  const [plan, setPlan] = useState<{
    svgUrl: string
    storageUnits: StorageUnit[]
  } | null>(null)
  const [loading, setLoading]                   = useState(true)
  const [error, setError]                       = useState<string | null>(null)
  const [filterByDimensions, setFilterByDimensions] = useState<number | null>(null)
  const [selectedUnits, setSelectedUnits]       = useState<StorageUnit[]>([])

  const loadPlan = useCallback(async () => {
    setLoading(true)
    setError(null)
    console.debug('[ReservasPage] Cargando plan para tenant:', tenantSlug)
    try {
      const localSvgUrl = getLocalPlanSvgUrl(tenantSlug)
      const data = await getPlan(tenantSlug, { requireSvgUrl: !localSvgUrl })
      const resolvedSvgUrl = localSvgUrl ?? data.svgUrl

      if (!resolvedSvgUrl) throw new Error('No se pudo resolver una URL de plano válida')
      if (!Array.isArray(data.storageUnits)) throw new Error('El backend no devolvió un array de trasteros')

      setPlan({ svgUrl: resolvedSvgUrl, storageUnits: data.storageUnits })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al cargar el plano'
      console.error('[ReservasPage] Error cargando plan:', msg)
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [tenantSlug])

  useEffect(() => { loadPlan() }, [loadPlan])

  // Añade o quita una unidad del array de seleccionadas
  const handleToggleUnit = useCallback((unit: StorageUnit) => {
    setSelectedUnits(prev => {
      const already = prev.some(u => u.id === unit.id)
      return already ? prev.filter(u => u.id !== unit.id) : [...prev, unit]
    })
  }, [])

  // Marca todas las unidades reservadas como RESERVED y limpia la selección
  const handleReservationSuccess = useCallback((reservedIds: string[]) => {
    const ids = new Set(reservedIds)
    setPlan(prev => {
      if (!prev) return prev
      return {
        ...prev,
        storageUnits: prev.storageUnits.map(u =>
          ids.has(u.id) ? { ...u, status: 'RESERVED' as const } : u
        ),
      }
    })
    setSelectedUnits([])
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <span className="inline-block w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-2" />
          <p className="text-gray-500">Cargando plano…</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <p className="text-red-600 mb-4">{error}</p>
        <button
          type="button"
          onClick={loadPlan}
          className="rounded-lg bg-blue-600 text-white px-4 py-2 hover:bg-blue-700"
        >
          Reintentar
        </button>
      </div>
    )
  }

  if (!plan) return null

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-gray-50">
      <main className="flex-1 min-w-0 p-4 lg:p-6 flex flex-col">
        <header className="mb-4">
          <h1 className="text-xl font-semibold text-gray-900">
            Reserva de trasteros
          </h1>
          <p className="text-sm text-gray-500">
            Selecciona uno o varios trasteros en el plano y rellena el formulario
          </p>
        </header>
        <div className="flex-1 min-h-0">
          <PlanoSVG
            svgUrl={plan.svgUrl}
            storageUnits={plan.storageUnits}
            filterByDimensions={filterByDimensions}
            selectedUnits={selectedUnits}
            onToggleUnit={handleToggleUnit}
          />
        </div>
      </main>
      <PanelLateral
        storageUnits={plan.storageUnits}
        filterByDimensions={filterByDimensions}
        onFilterChange={setFilterByDimensions}
        selectedUnits={selectedUnits}
        tenantSlug={tenantSlug}
        onReservationSuccess={handleReservationSuccess}
        onClearSelection={() => setSelectedUnits([])}
      />
    </div>
  )
}
