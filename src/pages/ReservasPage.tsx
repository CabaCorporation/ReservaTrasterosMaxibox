import { useState, useEffect, useCallback } from 'react'
import { PlanoSVG } from '../components/PlanoSVG'
import { PanelLateral } from '../components/PanelLateral'
import { getPlan } from '../services/api'
import type { StorageUnit, UnitType } from '../types'

const DEFAULT_TENANT = 'maxibox'

function getTenantSlug(): string {
  const params = new URLSearchParams(window.location.search)
  return params.get('tenant') || DEFAULT_TENANT
}

export function ReservasPage() {
  const tenantSlug = getTenantSlug()
  const [plan, setPlan] = useState<{ svgUrl: string; storageUnits: StorageUnit[] } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterByType, setFilterByType] = useState<UnitType | null>(null)
  const [selectedUnit, setSelectedUnit] = useState<StorageUnit | null>(null)

  const loadPlan = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getPlan(tenantSlug)
      setPlan({ svgUrl: data.svgUrl, storageUnits: data.storageUnits })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar el plano')
    } finally {
      setLoading(false)
    }
  }, [tenantSlug])

  useEffect(() => {
    loadPlan()
  }, [loadPlan])

  const handleReservationSuccess = useCallback(() => {
    if (!plan || !selectedUnit) return
    setPlan((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        storageUnits: prev.storageUnits.map((u) =>
          u.id === selectedUnit.id ? { ...u, status: 'RESERVED' as const } : u
        ),
      }
    })
    setSelectedUnit(null)
  }, [plan, selectedUnit])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Cargando…</p>
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
            filterByType={filterByType}
            selectedUnit={selectedUnit}
            onSelectUnit={setSelectedUnit}
          />
        </div>
      </main>
      <PanelLateral
        storageUnits={plan.storageUnits}
        filterByType={filterByType}
        onFilterChange={setFilterByType}
        selectedUnit={selectedUnit}
        tenantSlug={tenantSlug}
        onReservationSuccess={handleReservationSuccess}
        onClearSelection={() => setSelectedUnit(null)}
      />
    </div>
  )
}
