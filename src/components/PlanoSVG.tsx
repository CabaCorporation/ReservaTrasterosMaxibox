import { useEffect, useRef, useState, useCallback } from 'react'
import { Tooltip } from './Tooltip'
import { getSvgFullUrl } from '../services/api'
import { UNIT_TYPE_LABELS } from '../types'
import type { StorageUnit, UnitType } from '../types'

function getFill(
  unit: StorageUnit,
  filterByType: UnitType | null,
  selectedId: string | null
): string {
  if (selectedId === unit.id) return '#22c55e'
  if (unit.status !== 'AVAILABLE') return '#ef4444'
  if (filterByType !== null && unit.type !== filterByType) return '#9ca3af'
  return '#3b82f6'
}

function isClickable(
  unit: StorageUnit,
  filterByType: UnitType | null
): boolean {
  if (unit.status !== 'AVAILABLE') return false
  if (filterByType !== null && unit.type !== filterByType) return false
  return true
}

interface PlanoSVGProps {
  svgUrl: string
  storageUnits: StorageUnit[]
  filterByType: UnitType | null
  selectedUnit: StorageUnit | null
  onSelectUnit: (unit: StorageUnit | null) => void
}

export function PlanoSVG({
  svgUrl,
  storageUnits,
  filterByType,
  selectedUnit,
  onSelectUnit,
}: PlanoSVGProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  const [svgContent, setSvgContent] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [tooltip, setTooltip] = useState<{
    unit: StorageUnit
    x: number
    y: number
  } | null>(null)
  const [scale, setScale] = useState(1)
  const unitsByShapeIdRef = useRef<Map<string, StorageUnit>>(new Map())

  useEffect(() => {
    unitsByShapeIdRef.current = new Map(
      storageUnits.map((u) => [u.shapeId, u])
    )
  }, [storageUnits])

  useEffect(() => {
    const url = getSvgFullUrl(svgUrl)
    setLoadError(null)
    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`SVG: ${r.status}`)
        return r.text()
      })
      .then(setSvgContent)
      .catch(() => setLoadError('No se pudo cargar el plano'))
  }, [svgUrl])

  const applyColors = useCallback(() => {
    const root = innerRef.current ?? containerRef.current
    const doc = root?.querySelector('svg')
    if (!doc) return
    const selectedId = selectedUnit?.id ?? null
    unitsByShapeIdRef.current.forEach((unit, shapeId) => {
      const el = doc.querySelector(`[id="${shapeId}"]`) as SVGElement | null
      if (!el) return
      el.style.fill = getFill(unit, filterByType, selectedId)
      el.style.transition = 'fill 0.2s ease'
      el.style.cursor = isClickable(unit, filterByType) ? 'pointer' : 'default'
      el.style.pointerEvents = 'auto'
    })
  }, [storageUnits, filterByType, selectedUnit])

  useEffect(() => {
    if (!svgContent) return
    const t = setTimeout(applyColors, 50)
    return () => clearTimeout(t)
  }, [svgContent, applyColors])

  useEffect(() => {
    const inner = innerRef.current
    if (!inner || !svgContent) return
    const svg = inner.querySelector('svg')
    if (!svg) return
    const g = svg.querySelector('g') || svg

    const handleClick = (ev: MouseEvent) => {
      const target = (ev.target as SVGElement).closest('[id]') as SVGElement | null
      const shapeId = (ev.target as SVGElement).id || target?.id
      if (!shapeId) return
      const unit = unitsByShapeIdRef.current.get(shapeId)
      if (!unit || !isClickable(unit, filterByType)) return
      onSelectUnit(selectedUnit?.id === unit.id ? null : unit)
    }

    const handleMouseEnter = (ev: MouseEvent) => {
      const target = (ev.target as SVGElement).closest('[id]') as SVGElement | null
      const shapeId = (ev.target as SVGElement).id || target?.id
      if (!shapeId) return
      const unit = unitsByShapeIdRef.current.get(shapeId)
      if (unit) setTooltip({ unit, x: ev.clientX, y: ev.clientY })
    }

    const handleMouseMove = (ev: MouseEvent) => {
      setTooltip((prev) =>
        prev ? { ...prev, x: ev.clientX, y: ev.clientY } : null
      )
    }

    const handleMouseLeave = () => setTooltip(null)

    g.addEventListener('click', handleClick)
    g.addEventListener('mouseenter', handleMouseEnter, true)
    g.addEventListener('mouseleave', handleMouseLeave, true)
    g.addEventListener('mousemove', handleMouseMove, true)
    return () => {
      g.removeEventListener('click', handleClick)
      g.removeEventListener('mouseenter', handleMouseEnter, true)
      g.removeEventListener('mouseleave', handleMouseLeave, true)
      g.removeEventListener('mousemove', handleMouseMove, true)
    }
  }, [svgContent, filterByType, selectedUnit, onSelectUnit])

  useEffect(() => {
    if (!containerRef.current) return
    const el = containerRef.current
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return
      e.preventDefault()
      setScale((s) => Math.min(3, Math.max(0.3, s + (e.deltaY > 0 ? -0.1 : 0.1))))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  if (loadError) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-100 rounded-xl text-gray-500">
        {loadError}
      </div>
    )
  }

  if (!svgContent) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-100 rounded-xl">
        <span className="text-gray-500">Cargando plano…</span>
      </div>
    )
  }

  return (
    <Tooltip
      visible={!!tooltip}
      x={tooltip?.x ?? 0}
      y={tooltip?.y ?? 0}
      content={
        tooltip ? (
          <div>
            <p className="font-medium">Trastero #{tooltip.unit.number}</p>
            <p className="text-gray-300 text-xs mt-0.5">
              {UNIT_TYPE_LABELS[tooltip.unit.type]} · {tooltip.unit.price} €/mes
            </p>
          </div>
        ) : null
      }
    >
      <div className="space-y-2">
        <div className="flex items-center gap-2 justify-end">
          <button
            type="button"
            onClick={() => setScale((s) => Math.max(0.3, s - 0.2))}
            className="rounded-lg border border-gray-300 px-2 py-1 text-sm hover:bg-gray-100"
          >
            −
          </button>
          <span className="text-sm text-gray-600 min-w-[3rem] text-center">
            {Math.round(scale * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setScale((s) => Math.min(3, s + 0.2))}
            className="rounded-lg border border-gray-300 px-2 py-1 text-sm hover:bg-gray-100"
          >
            +
          </button>
        </div>
        <div
          ref={containerRef}
          className="overflow-auto bg-gray-100 rounded-xl min-h-[300px] flex items-center justify-center p-4"
          style={{ touchAction: 'manipulation' }}
        >
          <div
            ref={innerRef}
            className="inline-block min-w-0 transition-transform duration-200 origin-center"
            style={{ transform: `scale(${scale})` }}
            dangerouslySetInnerHTML={{ __html: svgContent }}
          />
        </div>
      </div>
    </Tooltip>
  )
}
