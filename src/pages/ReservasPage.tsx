import { useState, useEffect, useCallback, useMemo } from 'react'
import { PlanoSVG } from '../components/PlanoSVG'
import { PanelLateral } from '../components/PanelLateral'
import { getPlan } from '../services/api'
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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterByDimensions, setFilterByDimensions] = useState<number | null>(null)
  const [selectedUnit, setSelectedUnit] = useState<StorageUnit | null>(null)

  const loadPlan = useCallback(async () => {
    setLoading(true)
    setError(null)
    console.debug('[ReservasPage] Cargando plan para tenant:', tenantSlug)
    try {
      const data = await getPlan(tenantSlug)
      console.debug('[ReservasPage] Respuesta del plan:', {
        svgUrl: data.svgUrl,
        storageUnitsCount: data.storageUnits?.length ?? 0,
      })

      if (!data.svgUrl || typeof data.svgUrl !== 'string') {
        throw new Error('El backend no devolvió una URL de plano válida (svgUrl)')
      }
      if (!Array.isArray(data.storageUnits)) {
        throw new Error('El backend no devolvió un array de trasteros (storageUnits)')
      }
      if (data.storageUnits.length === 0) {
        console.warn('[ReservasPage] El plan no contiene trasteros')
      }

      setPlan({ svgUrl: data.svgUrl, storageUnits: data.storageUnits })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al cargar el plano'
      console.error('[ReservasPage] Error cargando plan:', msg)
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [tenantSlug])

  useEffect(() => {
    loadPlan()
  }, [loadPlan])

  const handleReservationSuccess = useCallback(
    (reservedUnitId: string) => {
      setPlan((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          storageUnits: prev.storageUnits.map((u) =>
            u.id === reservedUnitId
              ? { ...u, status: 'RESERVED' as const }
              : u
          ),
        }
      })
      setSelectedUnit(null)
    },
    []
  )

  const onReservationSuccess = useCallback(() => {
    if (!selectedUnit) return
    handleReservationSuccess(selectedUnit.id)
  }, [selectedUnit, handleReservationSuccess])

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
            Selecciona un tamaño en el panel y luego un trastero en el plano
          </p>
        </header>
        <div className="flex-1 min-h-0">
          <PlanoSVG
            svgUrl={plan.svgUrl}
            storageUnits={plan.storageUnits}
            filterByDimensions={filterByDimensions}
            selectedUnit={selectedUnit}
            onSelectUnit={setSelectedUnit}
          />
        </div>
      </main>
      <PanelLateral
        storageUnits={plan.storageUnits}
        filterByDimensions={filterByDimensions}
        onFilterChange={setFilterByDimensions}
        selectedUnit={selectedUnit}
        tenantSlug={tenantSlug}
        onReservationSuccess={onReservationSuccess}
        onClearSelection={() => setSelectedUnit(null)}
      />
    </div>
  )
}
