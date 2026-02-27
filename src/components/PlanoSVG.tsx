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
  /**
   * 'width'   → el SVG ocupa todo el ancho, la altura es proporcional.
   * 'contain' → el SVG cabe en ambas dimensiones (modal con altura fija).
   * Default: 'width'
   */
  fitMode?: 'width' | 'contain'
  /**
   * true → gira el plano 90° (portrait) para pantallas estrechas/móvil.
   * El eje largo del SVG pasa a ser la altura, aprovechando mejor la pantalla vertical.
   */
  rotated?: boolean
}

// ─── Componente ──────────────────────────────────────────────────────

export function PlanoSVG({
  svgUrl,
  storageUnits,
  filterByDimensions,
  maxPrice = null,
  selectedUnits,
  onToggleUnit,
  fitMode = 'width',
  rotated = false,
}: PlanoSVGProps) {
  const containerRef  = useRef<HTMLDivElement>(null)
  const svgHostRef    = useRef<HTMLDivElement>(null)
  const svgNaturalRef = useRef<{ w: number; h: number } | null>(null)

  const [svgContent, setSvgContent]     = useState<string | null>(null)
  const [loadError, setLoadError]       = useState<string | null>(null)
  const [matchWarning, setMatchWarning] = useState<string | null>(null)
  const [tooltip, setTooltip]           = useState<{ unit: StorageUnit; x: number; y: number } | null>(null)

  // Refs para event handlers — siempre con el valor más reciente
  const filterRef    = useRef(filterByDimensions)
  const maxPriceRef  = useRef(maxPrice)
  const onToggleRef  = useRef(onToggleUnit)
  const fitModeRef   = useRef(fitMode)
  const rotatedRef   = useRef(rotated)
  filterRef.current   = filterByDimensions
  maxPriceRef.current = maxPrice
  onToggleRef.current = onToggleUnit
  fitModeRef.current  = fitMode
  rotatedRef.current  = rotated

  // ── applyFit ─────────────────────────────────────────────────────
  // Almacenada en ref para que ResizeObserver llame siempre a la versión más reciente.
  const applyFitRef = useRef<() => void>(() => { /* will be set below */ })
  applyFitRef.current = () => {
    const container = containerRef.current
    const host      = svgHostRef.current
    const nat       = svgNaturalRef.current
    if (!container || !host || !nat) return
    const svgEl = host.querySelector('svg') as SVGSVGElement | null
    if (!svgEl) return

    const availW = container.clientWidth
    if (availW <= 0) return

    const mode  = fitModeRef.current
    const isRot = rotatedRef.current

    if (isRot) {
      // ── Girado 90° ──────────────────────────────────────────────
      // El eje corto del SVG (nat.h) pasa a ser el ancho mostrado.
      // El eje largo (nat.w) pasa a ser la altura mostrada.
      const availH = mode === 'contain' ? container.clientHeight : 0
      const scale  = (mode === 'contain' && availH > 0)
        ? Math.min(availW / nat.h, availH / nat.w)
        : availW / nat.h

      // rW = dimensión larga escalada (se convierte en altura visual)
      // rH = dimensión corta escalada (se convierte en ancho visual ≈ availW)
      const rW = Math.round(nat.w * scale)
      const rH = Math.round(nat.h * scale)

      svgEl.setAttribute('width',  String(rW))
      svgEl.setAttribute('height', String(rH))

      // Centering: offset para que el plano quede centrado en el contenedor.
      // El visual tras la rotación ocupa rH de ancho y rW de alto.
      // El host se posiciona absoluto en (offsetX, offsetY).
      // Con transform-origin top-left y rotate(-90deg) translateX(-100%),
      // el contenido visual parte exactamente desde (offsetX, offsetY).
      const offsetX = Math.max(0, Math.round((availW - rH) / 2))
      const offsetY = availH > 0
        ? Math.max(0, Math.round((availH - rW) / 2))
        : 0

      host.style.position        = 'absolute'
      host.style.left            = `${offsetX}px`
      host.style.top             = `${offsetY}px`
      host.style.width           = `${rW}px`
      host.style.height          = `${rH}px`
      host.style.transformOrigin = 'top left'
      host.style.transform       = `rotate(-90deg) translateX(-100%)`

      // En modo width el contenedor necesita altura explícita (rotated content
      // no crea flow height por ser absolute).
      if (mode !== 'contain') container.style.height = `${rW}px`

    } else {
      // ── Sin rotación ─────────────────────────────────────────────
      host.style.position        = ''
      host.style.left            = ''
      host.style.top             = ''
      host.style.transform       = ''
      host.style.transformOrigin = ''
      host.style.width           = ''
      host.style.height          = ''
      if (mode !== 'contain') container.style.height = ''

      const availH = mode === 'contain' ? container.clientHeight : 0
      const scale  = (mode === 'contain' && availH > 0)
        ? Math.min(availW / nat.w, availH / nat.h)
        : availW / nat.w

      svgEl.setAttribute('width',  String(Math.round(nat.w * scale)))
      svgEl.setAttribute('height', String(Math.round(nat.h * scale)))
    }
  }

  // ── 1. Cargar SVG desde URL ──────────────────────────────────────
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

  // ── 2. Inyectar SVG, guardar dimensiones naturales y escalar ────
  useEffect(() => {
    const host      = svgHostRef.current
    const container = containerRef.current
    if (!host || !svgContent) return

    host.innerHTML = svgContent
    svgNaturalRef.current = null

    requestAnimationFrame(() => {
      const svgEl = host.querySelector('svg') as SVGSVGElement | null
      if (!svgEl || !container) return

      // Dimensiones naturales del SVG (viewBox tiene preferencia)
      const vb   = svgEl.viewBox?.baseVal
      const svgW = (vb && vb.width  > 0) ? vb.width  : parseFloat(svgEl.getAttribute('width')  ?? '0')
      const svgH = (vb && vb.height > 0) ? vb.height : parseFloat(svgEl.getAttribute('height') ?? '0')

      if (svgW > 0 && svgH > 0) {
        svgNaturalRef.current = { w: svgW, h: svgH }
        applyFitRef.current()
      }
    })
  }, [svgContent])

  // ── 3. ResizeObserver — reescala el SVG cuando el contenedor cambia de tamaño
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const ro = new ResizeObserver(() => applyFitRef.current())
    ro.observe(container)
    return () => ro.disconnect()
  }, [])

  // ── 3b. Re-aplicar cuando cambia la rotación o el fitMode ────────
  useEffect(() => {
    applyFitRef.current()
  }, [rotated, fitMode])

  // ── 4. Aplicar colores + eventos ────────────────────────────────
  useEffect(() => {
    const host = svgHostRef.current
    if (!host || !svgContent) return

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
        el.style.fill       = fill
        el.style.transition = 'fill 0.2s ease'
        el.style.cursor     = isClickable(unit, filterByDimensions, maxPrice) ? 'pointer' : 'default'

        el.onclick = (ev: MouseEvent) => {
          ev.stopPropagation()
          if (!isClickable(unit, filterRef.current, maxPriceRef.current)) return
          onToggleRef.current(unit)
        }
        el.onmouseenter = (ev: MouseEvent) => setTooltip({ unit, x: ev.clientX, y: ev.clientY })
        el.onmousemove  = (ev: MouseEvent) =>
          setTooltip(prev => prev ? { ...prev, x: ev.clientX, y: ev.clientY } : null)
        el.onmouseleave = () => setTooltip(null)
      }

      if (storageUnits.length > 0 && matched === 0) {
        setMatchWarning(
          `Plano cargado pero ningún trastero coincide. IDs: ${storageUnits.slice(0, 5).map(u => u.shapeId).join(', ')}`
        )
      } else if (missing.length > 0) {
        setMatchWarning(`${missing.length} trastero(s) sin correspondencia en el plano`)
      } else {
        setMatchWarning(null)
      }
    })

    return () => cancelAnimationFrame(frame)
  }, [svgContent, storageUnits, filterByDimensions, maxPrice, selectedUnits])

  // ── Render ──────────────────────────────────────────────────────

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center h-32 bg-red-50 rounded-xl text-red-600 p-4">
        <p className="font-medium mb-1">Error al cargar el plano</p>
        <p className="text-sm">{loadError}</p>
      </div>
    )
  }

  if (!svgContent) {
    return (
      <div className="flex items-center justify-center h-32 bg-gray-100 rounded-xl">
        <div className="text-center">
          <span className="inline-block w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-2" />
          <p className="text-gray-500 text-sm">Cargando plano…</p>
        </div>
      </div>
    )
  }

  return (
    <div className={fitMode === 'contain' ? 'h-full flex flex-col gap-1' : 'space-y-1.5'}>
      {matchWarning && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-3 py-2 rounded-lg text-xs shrink-0">
          {matchWarning}
        </div>
      )}

      {/* Contenedor — sin scroll; en modo contain crece para llenar el padre */}
      <div
        ref={containerRef}
        className={`w-full rounded-xl bg-gray-50 overflow-hidden relative${fitMode === 'contain' ? ' flex-1 min-h-0' : ''}`}
      >
        {/* svgHostRef: React no toca este div; el SVG se inyecta y rota via JS */}
        <div ref={svgHostRef} />
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
