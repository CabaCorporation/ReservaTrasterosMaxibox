import { FormularioReserva } from './FormularioReserva'
import {
  UNIT_TYPE_LABELS,
  UNIT_TYPE_ORDER,
  type StorageUnit,
  type UnitType,
} from '../types'

interface PanelLateralProps {
  storageUnits: StorageUnit[]
  filterByType: UnitType | null
  onFilterChange: (type: UnitType | null) => void
  selectedUnit: StorageUnit | null
  tenantSlug: string
  onReservationSuccess: () => void
  onClearSelection?: () => void
}

function getAvailableCount(units: StorageUnit[], type: UnitType): number {
  return units.filter(
    (u) => u.type === type && u.status === 'AVAILABLE'
  ).length
}

export function PanelLateral({
  storageUnits,
  filterByType,
  onFilterChange,
  selectedUnit,
  tenantSlug,
  onReservationSuccess,
  onClearSelection,
}: PanelLateralProps) {
  return (
    <aside className="w-full lg:w-80 shrink-0 bg-white border-l border-gray-200 flex flex-col overflow-hidden">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Trasteros</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Elige tamaño y luego un trastero en el plano
        </p>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {UNIT_TYPE_ORDER.map((type) => {
          const count = getAvailableCount(storageUnits, type)
          const isActive = filterByType === type
          return (
            <button
              key={type}
              type="button"
              onClick={() => onFilterChange(isActive ? null : type)}
              className={`w-full text-left px-4 py-3 rounded-xl border transition-all duration-200 ${
                isActive
                  ? 'border-blue-500 bg-blue-50 text-blue-800'
                  : 'border-gray-200 bg-gray-50/80 text-gray-700 hover:border-gray-300 hover:bg-gray-100'
              }`}
            >
              <span className="font-medium">{UNIT_TYPE_LABELS[type]}</span>
              <span className="ml-2 text-sm opacity-90">
                × {count} disponibles
              </span>
            </button>
          )
        })}
        {filterByType && (
          <button
            type="button"
            onClick={() => onFilterChange(null)}
            className="w-full text-left px-4 py-2 text-sm text-gray-500 hover:text-gray-700"
          >
            Quitar filtro
          </button>
        )}
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
