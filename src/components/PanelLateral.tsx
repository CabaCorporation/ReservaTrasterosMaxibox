import { useMemo } from 'react'
import { FormularioReserva } from './FormularioReserva'
import type { StorageUnit } from '../types'

// ─── Props ────────────────────────────────────────────────────────────

interface PanelLateralProps {
  storageUnits: StorageUnit[]
  filterByDimensions: number | null
  onFilterChange: (dimensions: number | null) => void
  selectedUnit: StorageUnit | null
  tenantSlug: string
  onReservationSuccess: () => void
  onClearSelection?: () => void
}

// ─── Estructura de un grupo de filtro ─────────────────────────────────

interface DimensionGroup {
  dimensions: number
  label: string     // formato original: "2x1", "3x1", etc.
  total: number
  available: number
}

// ─── Componente ───────────────────────────────────────────────────────

export function PanelLateral({
  storageUnits,
  filterByDimensions,
  onFilterChange,
  selectedUnit,
  tenantSlug,
  onReservationSuccess,
  onClearSelection,
}: PanelLateralProps) {
  // Generar grupos dinámicamente a partir de los dimensions únicos
  const dimensionGroups = useMemo<DimensionGroup[]>(() => {
    const groupMap = new Map<number, { label: string; total: number; available: number }>()
    for (const u of storageUnits) {
      const existing = groupMap.get(u.dimensions)
      if (existing) {
        existing.total++
        if (u.status === 'AVAILABLE') existing.available++
      } else {
        groupMap.set(u.dimensions, {
          label: u.dimensionsLabel,
          total: 1,
          available: u.status === 'AVAILABLE' ? 1 : 0,
        })
      }
    }
    return [...groupMap.entries()]
      .map(([dimensions, counts]) => ({
        dimensions,
        label: counts.label,
        total: counts.total,
        available: counts.available,
      }))
      .sort((a, b) => a.dimensions - b.dimensions)
  }, [storageUnits])

  const totalAvailable = useMemo(
    () => storageUnits.filter((u) => u.status === 'AVAILABLE').length,
    [storageUnits]
  )

  return (
    <aside className="w-full lg:w-80 shrink-0 bg-white border-l border-gray-200 flex flex-col overflow-hidden">
      {/* Cabecera */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Trasteros</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Elige tamaño y luego un trastero en el plano
        </p>
        <p className="text-xs text-gray-400 mt-1">
          {totalAvailable} de {storageUnits.length} disponibles
        </p>
      </div>

      {/* Contenido scrollable */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {/* Filtros dinámicos por m² */}
        {dimensionGroups.length === 0 && (
          <p className="text-sm text-gray-400 py-2">
            No hay trasteros disponibles en este plano.
          </p>
        )}
        {dimensionGroups.map((group) => {
          const isActive = filterByDimensions === group.dimensions
          return (
            <button
              key={group.dimensions}
              type="button"
              onClick={() =>
                onFilterChange(isActive ? null : group.dimensions)
              }
              className={`w-full text-left px-4 py-3 rounded-xl border transition-all duration-200 ${
                isActive
                  ? 'border-blue-500 bg-blue-50 text-blue-800'
                  : 'border-gray-200 bg-gray-50/80 text-gray-700 hover:border-gray-300 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{group.label} ({group.dimensions} m²)</span>
                <span className="text-xs bg-gray-200 text-gray-600 rounded-full px-2 py-0.5">
                  {group.total}
                </span>
              </div>
              <span className="text-sm opacity-90">
                {group.available > 0
                  ? `${group.available} disponible${group.available > 1 ? 's' : ''}`
                  : 'Sin disponibilidad'}
              </span>
            </button>
          )
        })}

        {/* Quitar filtro */}
        {filterByDimensions !== null && (
          <button
            type="button"
            onClick={() => onFilterChange(null)}
            className="w-full text-left px-4 py-2 text-sm text-gray-500 hover:text-gray-700"
          >
            Quitar filtro
          </button>
        )}

        {/* Leyenda de colores */}
        <div className="pt-3 border-t border-gray-100 mt-2 space-y-1">
          <p className="text-xs font-medium text-gray-500 mb-1">Leyenda</p>
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <span className="w-3 h-3 rounded-sm bg-blue-500 inline-block" /> Disponible
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <span className="w-3 h-3 rounded-sm bg-green-500 inline-block" /> Seleccionado
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <span className="w-3 h-3 rounded-sm bg-red-500 inline-block" /> Ocupado / Reservado
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <span className="w-3 h-3 rounded-sm bg-gray-400 inline-block" /> Fuera de filtro
          </div>
        </div>

        {/* Formulario de reserva */}
        <FormularioReserva
          selectedUnit={selectedUnit}
          tenantSlug={tenantSlug}
          onSuccess={onReservationSuccess}
          onCancel={onClearSelection}
        />
      </div>
    </aside>
  )
}
