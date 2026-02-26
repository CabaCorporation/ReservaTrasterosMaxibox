import { useEffect, useRef, useState } from 'react'
import { getSvgFullUrl } from '../services/api'
import type { StorageUnit } from '../types'

// ─── Colores ─────────────────────────────────────────────────────────

const COLOR_AVAILABLE = '#D19E02' // ámbar dorado  → disponible
const COLOR_SELECTED  = '#89D102' // verde lima    → seleccionado
const COLOR_OCCUPIED  = '#D14402' // naranja-rojo  → ocupado / reservado
const COLOR_FILTERED  = '#A17902' // ámbar oscuro  → fuera del filtro

function getFill(
  unit: StorageUnit,
  filterByDimensions: number | null,
  selectedIds: Set<string>,
  maxPrice: number | null,
): string {
  if (selectedIds.has(unit.id)) return COLOR_SELECTED
  if (unit.status !== 'AVAILABLE') return COLOR_OCCUPIED
  if (filterByDimensions !== null && unit.dimensions !== filterByDimensions) return COLOR_FILTERED
  if (maxPrice !== null && unit.price > maxPrice) return COLOR_FILTERED
  return COLOR_AVAILABLE
}

function isClickable(
  unit: StorageUnit,
  filterByDimensions: number | null,
  maxPrice: number | null,
): boolean {
  if (unit.status !== 'AVAILABLE') return false
  if (filterByDimensions !== null && unit.dimensions !== filterByDimensions) return false
  if (maxPrice !== null && unit.price > maxPrice) return false
  return true
}

// ─── Helpers SVG ────────────────────────────────────────────────────

function getShapeIdVariants(shapeId: string): string[] {
  const raw = shapeId.trim()
  if (!raw) return []
  const variants = new Set<string>()
  variants.add(raw)
  variants.add(raw.toUpperCase())
  const match = raw.match(/^([a-zA-Z]+)\s*0*(\d+)$/)
  if (match) {
    const prefix = match[1].toUpperCase()
    const n = Number(match[2])
    if (Number.isFinite(n)) {
      variants.add(`${prefix}${n}`)
      variants.add(`${prefix}${String(n).padStart(2, '0')}`)
      variants.add(`${prefix}${String(n).padStart(3, '0')}`)
    }
  }
  return [...variants]
}

function findSvgElement(svgEl: Element, shapeId: string): SVGElement | null {
  for (const v of getShapeIdVariants(shapeId)) {
    const el = svgEl.querySelector(`[id="${v}"]`) as SVGElement | null
    if (el) return el
  }
  return null
}

// ─── Props ───────────────────────────────────────────────────────────

interface PlanoSVGProps {
  svgUrl: string
  storageUnits: StorageUnit[]
  filterByDimensions: number | null
  maxPrice?: number | null
  selectedUnits: StorageUnit[]
  onToggleUnit: (unit: StorageUnit) => void
  /** Height in px of the scrollable container. Auto-fit scale is computed to fill it. */
  containerHeight?: number
}

// ─── Componente ──────────────────────────────────────────────────────

export function PlanoSVG({
  svgUrl,
  storageUnits,
  filterByDimensions,
  maxPrice = null,
  selectedUnits,
  onToggleUnit,
  containerHeight,
}: PlanoSVGProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  // svgHostRef: nodo que nunca toca React tras la primera inyección
  const svgHostRef = useRef<HTMLDivElement>(null)

  const [svgContent, setSvgContent]     = useState<string | null>(null)
  const [loadError, setLoadError]       = useState<string | null>(null)
  const [matchWarning, setMatchWarning] = useState<string | null>(null)
  const [tooltip, setTooltip]           = useState<{ unit: StorageUnit; x: number; y: number } | null>(null)
  const [scale, setScale]               = useState(1)
  const [fitScale, setFitScale]         = useState(1)

  // Refs para event handlers — siempre tienen el valor más reciente
  const filterRef        = useRef(filterByDimensions)
  const maxPriceRef      = useRef(maxPrice)
  const selectedUnitsRef = useRef(selectedUnits)
  const onToggleRef      = useRef(onToggleUnit)
  filterRef.current        = filterByDimensions
  maxPriceRef.current      = maxPrice
  selectedUnitsRef.current = selectedUnits
  onToggleRef.current      = onToggleUnit

  // ── 1. Cargar SVG desde URL ─────────────────────────────────────
  useEffect(() => {
    setSvgContent(null)
    setLoadError(null)
    setMatchWarning(null)

    let url: string
    try { url = getSvgFullUrl(svgUrl) }
    catch (e) {
      setLoadError(e instanceof Error ? e.message : 'URL de plano inválida')
      return
    }

    let cancelled = false
    fetch(url, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate', Pragma: 'no-cache' },
    })
      .then(r => {
        if (!r.ok) throw new Error(`SVG HTTP ${r.status}`)
        return r.text()
      })
      .then(text => {
        if (cancelled) return
        if (!text.includes('<svg')) throw new Error('La respuesta no contiene un SVG válido')
        setSvgContent(text)
      })
      .catch(err => {
        if (cancelled) return
        setLoadError(err instanceof Error ? err.message : 'No se pudo cargar el plano')
      })

    return () => { cancelled = true }
  }, [svgUrl])

  // ── 2. Inyectar SVG + auto-fit scale ────────────────────────────
  // React NUNCA vuelve a tocar svgHostRef → los estilos aplicados por JS persisten
  useEffect(() => {
    const host      = svgHostRef.current
    const container = containerRef.current
    if (!host || !svgContent) return
    host.innerHTML = svgContent

    // Compute scale so the SVG fits exactly inside the container
    requestAnimationFrame(() => {
      const svgEl = host.querySelector('svg') as SVGSVGElement | null
      if (!svgEl || !container) return

      const vb   = svgEl.viewBox?.baseVal
      const svgW = (vb && vb.width  > 0) ? vb.width  : parseFloat(svgEl.getAttribute('width')  ?? '0')
      const svgH = (vb && vb.height > 0) ? vb.height : parseFloat(svgEl.getAttribute('height') ?? '0')

      if (svgW > 0 && svgH > 0) {
        const pad    = 32
        const availW = container.clientWidth  - pad
        const availH = container.clientHeight - pad
        const fit    = Math.min(availW / svgW, availH / svgH) * 0.97 // tiny breathing room
        if (Number.isFinite(fit) && fit > 0) {
          setScale(fit)
          setFitScale(fit)
        }
      }
    })
  }, [svgContent])

  // ── 3. Aplicar colores + asignar eventos ────────────────────────
  // Se ejecuta cada vez que cambia cualquier valor relevante
  useEffect(() => {
    const host = svgHostRef.current
    if (!host || !svgContent) return

    // Pequeño delay para que el browser haya procesado el innerHTML
    const frame = requestAnimationFrame(() => {
      const svgEl = host.querySelector('svg')
      if (!svgEl) return

      const selectedIds = new Set(selectedUnits.map(u => u.id))
      let matched = 0
      const missing: string[] = []

      for (const unit of storageUnits) {
        const el = findSvgElement(svgEl, unit.shapeId)
        if (!el) { missing.push(unit.shapeId); continue }
        matched++

        const fill = getFill(unit, filterByDimensions, selectedIds, maxPrice)
        el.setAttribute('fill', fill)
        el.style.fill = fill
        el.style.transition = 'fill 0.2s ease'
        el.style.cursor = isClickable(unit, filterByDimensions, maxPrice) ? 'pointer' : 'default'

        // Asignación directa → sustituye el handler anterior sin removeEventListener
        el.onclick = (ev: MouseEvent) => {
          ev.stopPropagation()
          const u = unit
          if (!isClickable(u, filterRef.current, maxPriceRef.current)) return
          onToggleRef.current(u)
        }

        el.onmouseenter = (ev: MouseEvent) => {
          setTooltip({ unit, x: ev.clientX, y: ev.clientY })
        }

        el.onmousemove = (ev: MouseEvent) => {
          setTooltip(prev => prev ? { ...prev, x: ev.clientX, y: ev.clientY } : null)
        }

        el.onmouseleave = () => setTooltip(null)
      }

      if (storageUnits.length > 0 && matched === 0) {
        setMatchWarning(
          `Plano cargado pero ningún trastero coincide. IDs esperados: ${storageUnits.slice(0, 5).map(u => u.shapeId).join(', ')}`
        )
      } else if (missing.length > 0) {
        setMatchWarning(`${missing.length} trastero(s) sin correspondencia en el plano`)
      } else {
        setMatchWarning(null)
      }
    })

    return () => cancelAnimationFrame(frame)
  }, [svgContent, storageUnits, filterByDimensions, maxPrice, selectedUnits])

  // ── 4. Zoom Ctrl+scroll ─────────────────────────────────────────
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return
      e.preventDefault()
      setScale(s => Math.min(3, Math.max(0.3, s + (e.deltaY > 0 ? -0.1 : 0.1))))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  // ── Render ──────────────────────────────────────────────────────

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
          onClick={() => setScale(s => Math.max(0.1, s - 0.15))}
          className="rounded-lg border border-gray-300 px-2 py-1 text-sm hover:bg-gray-100"
          title="Reducir zoom"
        >−</button>
        <span className="text-sm text-gray-600 min-w-[3rem] text-center">
          {Math.round(scale * 100)}%
        </span>
        <button
          type="button"
          onClick={() => setScale(s => Math.min(4, s + 0.15))}
          className="rounded-lg border border-gray-300 px-2 py-1 text-sm hover:bg-gray-100"
          title="Ampliar zoom"
        >+</button>
        <button
          type="button"
          onClick={() => setScale(fitScale)}
          className="rounded-lg border border-gray-300 px-2 py-1 text-sm hover:bg-gray-100"
          title="Ajustar al contenedor"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
        </button>
      </div>

      <div
        ref={containerRef}
        className="overflow-auto bg-gray-100 rounded-xl flex items-start justify-center p-4"
        style={{
          touchAction: 'manipulation',
          height: containerHeight ? `${containerHeight}px` : '420px',
        }}
      >
        {/*
          svgHostRef apunta a este div.
          React NO renderiza nada dentro → innerHTML lo gestiona exclusivamente
          el useEffect de inyección. Así los estilos aplicados por JS nunca
          son borrados por el reconciliador de React.
        */}
        <div
          ref={svgHostRef}
          className="inline-block min-w-0 transition-transform duration-200 origin-center"
          style={{ transform: `scale(${scale})` }}
        />
      </div>

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
