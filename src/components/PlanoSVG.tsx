import { useEffect, useRef, useState, useCallback } from 'react'
import { getSvgFullUrl } from '../services/api'
import type { StorageUnit } from '../types'

// ─── Lógica de colores ────────────────────────────────────────────────

function getFill(
  unit: StorageUnit,
  filterByDimensions: number | null,
  selectedId: string | null
): string {
  if (selectedId === unit.id) return '#22c55e'       // verde → seleccionado
  if (unit.status !== 'AVAILABLE') return '#ef4444'   // rojo  → no disponible
  if (filterByDimensions !== null && unit.dimensions !== filterByDimensions) return '#9ca3af'
  return '#3b82f6'                                    // azul  → disponible
}

function isClickable(
  unit: StorageUnit,
  filterByDimensions: number | null
): boolean {
  if (unit.status !== 'AVAILABLE') return false
  if (filterByDimensions !== null && unit.dimensions !== filterByDimensions) return false
  return true
}

// ─── Props ────────────────────────────────────────────────────────────

interface PlanoSVGProps {
  svgUrl: string
  storageUnits: StorageUnit[]
  filterByDimensions: number | null
  selectedUnit: StorageUnit | null
  onSelectUnit: (unit: StorageUnit | null) => void
}

// ─── Componente ───────────────────────────────────────────────────────

export function PlanoSVG({
  svgUrl,
  storageUnits,
  filterByDimensions,
  selectedUnit,
  onSelectUnit,
}: PlanoSVGProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  const [svgContent, setSvgContent] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [matchWarning, setMatchWarning] = useState<string | null>(null)
  const [tooltip, setTooltip] = useState<{
    unit: StorageUnit
    x: number
    y: number
  } | null>(null)
  const [scale, setScale] = useState(1)

  // Refs para acceder a valores actualizados dentro de callbacks
  const filterRef = useRef(filterByDimensions)
  const selectedUnitRef = useRef(selectedUnit)
  const onSelectUnitRef = useRef(onSelectUnit)

  filterRef.current = filterByDimensions
  selectedUnitRef.current = selectedUnit
  onSelectUnitRef.current = onSelectUnit

  // Map shapeId → StorageUnit
  const unitsByShapeId = useRef(new Map<string, StorageUnit>())
  useEffect(() => {
    unitsByShapeId.current = new Map(storageUnits.map((u) => [u.shapeId, u]))
  }, [storageUnits])

  // ── Cargar SVG ──
  useEffect(() => {
    setLoadError(null)
    setMatchWarning(null)
    setSvgContent(null)

    let url: string
    try {
      url = getSvgFullUrl(svgUrl)
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'URL de plano inválida')
      return
    }

    let cancelled = false
    fetch(url, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
      },
    })
      .then((r) => {
        if (r.status === 304) throw new Error('SVG en caché (304)')
        if (!r.ok) throw new Error(`SVG HTTP ${r.status}`)
        return r.text()
      })
      .then((text) => {
        if (cancelled) return
        if (!text || !text.includes('<svg')) {
          throw new Error('La respuesta no contiene un SVG válido')
        }
        setSvgContent(text)
      })
      .catch((err) => {
        if (cancelled) return
        setLoadError(err instanceof Error ? err.message : 'No se pudo cargar el plano')
      })

    return () => { cancelled = true }
  }, [svgUrl])

  // ── Aplicar colores + eventos directos en cada elemento ──
  const applyColorsAndEvents = useCallback(() => {
    const root = innerRef.current
    if (!root) return
    const svgEl = root.querySelector('svg')
    if (!svgEl) return

    const selectedId = selectedUnitRef.current?.id ?? null
    const currentFilter = filterRef.current
    const map = unitsByShapeId.current
    let matched = 0
    const missing: string[] = []

    map.forEach((unit, shapeId) => {
      const el = svgEl.querySelector(`[id="${shapeId}"]`) as SVGElement | null
      if (!el) {
        missing.push(shapeId)
        return
      }
      matched++

      const fill = getFill(unit, currentFilter, selectedId)
      const clickable = isClickable(unit, currentFilter)

      // Colores y estilos
      el.setAttribute('fill', fill)
      el.style.fill = fill
      el.style.transition = 'fill 0.2s ease'
      el.style.cursor = clickable ? 'pointer' : 'default'

      // ── Eventos DIRECTOS en el elemento ──
      // Usar propiedades .onclick, .onmouseenter, etc. reemplaza automáticamente
      // el handler anterior sin necesidad de removeEventListener

      el.onclick = (ev: MouseEvent) => {
        ev.stopPropagation()
        const u = unitsByShapeId.current.get(shapeId)
        if (!u || !isClickable(u, filterRef.current)) return
        const sel = selectedUnitRef.current
        onSelectUnitRef.current(sel?.id === u.id ? null : u)
      }

      el.onmouseenter = (ev: MouseEvent) => {
        const u = unitsByShapeId.current.get(shapeId)
        if (u) setTooltip({ unit: u, x: ev.clientX, y: ev.clientY })
      }

      el.onmousemove = (ev: MouseEvent) => {
        setTooltip((prev) => prev ? { ...prev, x: ev.clientX, y: ev.clientY } : null)
      }

      el.onmouseleave = () => {
        setTooltip(null)
      }
    })

    if (map.size > 0 && matched === 0) {
      setMatchWarning(
        `Plano cargado pero ningún trastero coincide. shapeIds esperados: ${[...map.keys()].slice(0, 10).join(', ')}`
      )
    } else if (missing.length > 0) {
      setMatchWarning(`${missing.length} trastero(s) sin correspondencia: ${missing.slice(0, 5).join(', ')}`)
    } else {
      setMatchWarning(null)
    }
  }, [storageUnits])

  // Re-aplicar cuando cambia filtro, selección, o SVG
  useEffect(() => {
    if (!svgContent) return
    const frame = requestAnimationFrame(() => applyColorsAndEvents())
    return () => cancelAnimationFrame(frame)
  }, [svgContent, applyColorsAndEvents, filterByDimensions, selectedUnit])

  // ── Zoom con Ctrl+scroll ──
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return
      e.preventDefault()
      setScale((s) => Math.min(3, Math.max(0.3, s + (e.deltaY > 0 ? -0.1 : 0.1))))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  // ── Render ──

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-red-50 rounded-xl text-red-600 p-4">
        <p className="font-medium mb-1">Error al cargar el plano</p>
        <p className="text-sm">{loadError}</p>
      </div>
    )
  }

  if (!svgContent) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-100 rounded-xl">
        <div className="text-center">
          <span className="inline-block w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-2" />
          <p className="text-gray-500 text-sm">Cargando plano…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {matchWarning && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-3 py-2 rounded-lg text-xs">
          {matchWarning}
        </div>
      )}

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

      {/* Tooltip flotante */}
      {tooltip && (
        <div
          className="fixed z-50 pointer-events-none px-3 py-2 text-sm text-white bg-gray-900 rounded-lg shadow-lg max-w-[220px]"
          style={{ left: tooltip.x + 12, top: tooltip.y + 12 }}
        >
          <p className="font-medium">Trastero #{tooltip.unit.number}</p>
          <p className="text-gray-300 text-xs mt-0.5">
            {tooltip.unit.dimensionsLabel} ({tooltip.unit.dimensions} m²) · {tooltip.unit.price} €/mes
          </p>
          <p className="text-gray-400 text-xs mt-0.5">
            {tooltip.unit.status === 'AVAILABLE' ? 'Disponible' : tooltip.unit.status}
          </p>
        </div>
      )}
    </div>
  )
}
