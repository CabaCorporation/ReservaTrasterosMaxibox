import { useMemo } from 'react'
import { FormularioReserva } from './FormularioReserva'
import type { StorageUnit } from '../types'

// ─── Props ────────────────────────────────────────────────────────────

interface PanelLateralProps {
  storageUnits: StorageUnit[]
  filterByDimensions: number | null
  onFilterChange: (dimensions: number | null) => void
  selectedUnits: StorageUnit[]
  tenantSlug: string
  onReservationSuccess: (reservedIds: string[]) => void
  onClearSelection?: () => void
}

interface DimensionGroup {
  dimensions: number
  label: string
  total: number
  available: number
}

// ─── Componente ───────────────────────────────────────────────────────

export function PanelLateral({
  storageUnits,
  filterByDimensions,
  onFilterChange,
  selectedUnits,
  tenantSlug,
  onReservationSuccess,
  onClearSelection,
}: PanelLateralProps) {
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
      .map(([dimensions, counts]) => ({ dimensions, ...counts }))
      .sort((a, b) => a.dimensions - b.dimensions)
  }, [storageUnits])

  const totalAvailable = useMemo(
    () => storageUnits.filter(u => u.status === 'AVAILABLE').length,
    [storageUnits],
  )

  return (
    <aside className="w-full lg:w-80 shrink-0 bg-white border-l border-gray-200 flex flex-col overflow-hidden">
      {/* Cabecera */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Trasteros</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Elige tamaño y selecciona uno o varios trasteros
        </p>
        <p className="text-xs text-gray-400 mt-1">
          {totalAvailable} de {storageUnits.length} disponibles
        </p>
      </div>

      {/* Contenido scrollable */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">

        {/* Filtros por m² */}
        {dimensionGroups.length === 0 && (
          <p className="text-sm text-gray-400 py-2">No hay trasteros disponibles.</p>
        )}
        {dimensionGroups.map(group => {
          const isActive = filterByDimensions === group.dimensions
          return (
            <button
              key={group.dimensions}
              type="button"
              onClick={() => onFilterChange(isActive ? null : group.dimensions)}
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

        {filterByDimensions !== null && (
          <button
            type="button"
            onClick={() => onFilterChange(null)}
            className="w-full text-left px-4 py-2 text-sm text-gray-500 hover:text-gray-700"
          >
            Quitar filtro
          </button>
        )}

        {/* Trasteros seleccionados */}
        {selectedUnits.length > 0 && (
          <div className="pt-3 border-t border-gray-100 mt-2">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-gray-600">
                Seleccionados ({selectedUnits.length})
              </p>
              {onClearSelection && (
                <button
                  type="button"
                  onClick={onClearSelection}
                  className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                >
                  Quitar todos
                </button>
              )}
            </div>
            <ul className="space-y-1">
              {selectedUnits.map(u => (
                <li
                  key={u.id}
                  className="flex items-center justify-between text-xs bg-green-50 border border-green-200 rounded-lg px-3 py-1.5"
                >
                  <span className="font-medium text-green-800">
                    #{u.number} · {u.dimensionsLabel} · {u.price} €/mes
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-gray-500 mt-2 text-right">
              Total: {selectedUnits.reduce((s, u) => s + u.price, 0)} €/mes
            </p>
          </div>
        )}

        {/* Leyenda */}
        <div className="pt-3 border-t border-gray-100 mt-2 space-y-1">
          <p className="text-xs font-medium text-gray-500 mb-1">Leyenda</p>
          {[
            { color: '#D19E02', label: 'Disponible' },
            { color: '#89D102', label: 'Seleccionado' },
            { color: '#D14402', label: 'Ocupado / Reservado' },
            { color: '#A17902', label: 'Fuera de filtro' },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-2 text-xs text-gray-600">
              <span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: color }} />
              {label}
            </div>
          ))}
        </div>

        {/* Formulario de reserva */}
        <FormularioReserva
          selectedUnits={selectedUnits}
          tenantSlug={tenantSlug}
          onSuccess={onReservationSuccess}
          onCancel={onClearSelection}
        />
      </div>
    </aside>
  )
}
