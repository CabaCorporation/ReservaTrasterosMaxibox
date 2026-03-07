import { useRef, useState, useEffect, useCallback } from 'react'
import { useWizard } from '../WizardContext'
import { Button } from '../../components/Button'
import { formatEuros, formatDate, getStartDate, calcProportionalPayment, getBillingDescription } from '../utils'

// ─── Contract text helpers ────────────────────────────────────────────

function todayFormatted() {
  return new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
}

// ─── PDF generation (lazy-loaded to keep initial bundle small) ────────

async function generateAndDownloadPdf(params: {
  tenant: string
  customer: NonNullable<ReturnType<typeof useWizardParams>['customer']>
  selectedUnits: ReturnType<typeof useWizardParams>['selectedUnits']
  startMode: NonNullable<ReturnType<typeof useWizardParams>['startMode']>
  signatureDataUrl: string
}) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const L = 20   // left margin
  const W = 170  // text width
  let y = 20

  const line = (text: string, size = 11, bold = false, color = '#111111') => {
    doc.setFontSize(size)
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    doc.setTextColor(color)
    const lines = doc.splitTextToSize(text, W) as string[]
    lines.forEach((l: string) => {
      if (y > 270) { doc.addPage(); y = 20 }
      doc.text(l, L, y)
      y += size * 0.45
    })
    y += 2
  }

  const separator = () => {
    if (y > 270) { doc.addPage(); y = 20 }
    doc.setDrawColor('#dddddd')
    doc.line(L, y, L + W, y)
    y += 5
  }

  // ── Header ──
  line('CONTRATO DE RESERVA DE TRASTERO', 18, true)
  line(`Referencia: ${params.tenant.toUpperCase()}-${Date.now().toString(36).toUpperCase()}`, 9, false, '#666666')
  line(`Fecha de firma: ${todayFormatted()}`, 9, false, '#666666')
  y += 4
  separator()

  // ── Partes ──
  line('1. PARTES CONTRATANTES', 13, true)
  y += 2
  line('ARRENDADOR', 10, true, '#444444')
  line(`Empresa: ${params.tenant.charAt(0).toUpperCase() + params.tenant.slice(1)} Trasteros S.L.`)
  line('Actividad: Alquiler de espacio de almacenamiento')
  y += 3
  line('ARRENDATARIO', 10, true, '#444444')
  line(`Nombre: ${params.customer.firstName} ${params.customer.lastName}`)
  line(`DNI/NIE: ${params.customer.dni}`)
  line(`Teléfono: ${params.customer.phone}`)
  line(`Email: ${params.customer.email}`)
  if (params.customer.address) line(`Dirección: ${params.customer.address}, ${params.customer.city} ${params.customer.postalCode}`)
  y += 4
  separator()

  // ── Objeto ──
  line('2. OBJETO DEL CONTRATO', 13, true)
  y += 2
  line('El arrendador cede en régimen de alquiler los siguientes trasteros:')
  y += 2
  params.selectedUnits.forEach(u => {
    line(`  • Trastero #${u.number} — ${u.dimensionsLabel} m² — ${formatEuros(u.price)}/mes`, 10)
  })
  y += 2
  const totalMonthly = params.selectedUnits.reduce((s, u) => s + u.price, 0)
  line(`Total mensual: ${formatEuros(totalMonthly)}`, 11, true)
  y += 4
  separator()

  // ── Condiciones económicas ──
  line('3. CONDICIONES ECONÓMICAS', 13, true)
  y += 2
  line(`Fecha de inicio: ${formatDate(getStartDate(params.startMode))}`)
  line(`Domiciliación: ${getBillingDescription(params.startMode)}`)
  if (params.startMode === 'immediate') {
    const prop = calcProportionalPayment(totalMonthly)
    line(`Pago proporcional hoy: ${formatEuros(prop)}`)
  } else {
    line('Pago hoy: 0,00 € (sin cargo inicial)')
  }
  y += 4
  separator()

  // ── Condiciones generales ──
  line('4. CONDICIONES GENERALES DE USO', 13, true)
  y += 2
  const clauses = [
    '4.1. El arrendatario se compromete a utilizar el espacio exclusivamente para almacenamiento de bienes propios, excluyendo sustancias peligrosas, inflamables o ilegales.',
    '4.2. El arrendatario es responsable de asegurar sus bienes almacenados. El arrendador no se hace responsable de pérdidas, robos o daños salvo negligencia probada.',
    '4.3. El acceso a las instalaciones se limita al horario establecido. El uso fuera de horario requerirá autorización expresa.',
    '4.4. El contrato se renueva automáticamente cada mes. Para cancelarlo, se requiere aviso con 15 días de antelación.',
    '4.5. El impago de dos mensualidades consecutivas faculta al arrendador para resolver el contrato y proceder al desahucio conforme a la legislación vigente.',
    '4.6. Los datos personales del arrendatario serán tratados conforme al RGPD (UE 2016/679) y la LOPDGDD, exclusivamente para la gestión del contrato.',
    '4.7. El presente contrato se rige por la legislación española. Para cualquier litigio, las partes se someten a los juzgados y tribunales del lugar donde radican las instalaciones.',
  ]
  clauses.forEach(c => { line(c, 10); y += 1 })
  y += 4
  separator()

  // ── Firma ──
  line('5. FIRMA DEL ARRENDATARIO', 13, true)
  y += 3
  line(`Firmado digitalmente el ${todayFormatted()} por ${params.customer.firstName} ${params.customer.lastName} (${params.customer.dni})`)
  y += 4

  if (y + 35 > 270) { doc.addPage(); y = 20 }
  try {
    doc.addImage(params.signatureDataUrl, 'PNG', L, y, 70, 28)
  } catch { /* imagen no añadida si falla */ }
  y += 32
  doc.setDrawColor('#888888')
  doc.line(L, y, L + 70, y)
  y += 4
  line('Firma del arrendatario', 9, false, '#888888')

  doc.save(`contrato-trastero-${params.tenant}-${Date.now()}.pdf`)
}

// Helper para extraer params del wizard (solo para tipado del generador)
function useWizardParams() {
  const { state } = useWizard()
  return state
}

// ─── Signature canvas ─────────────────────────────────────────────────

interface SignaturePadProps {
  onSigned: (isEmpty: boolean) => void
  canvasRef: React.RefObject<HTMLCanvasElement | null>
}

function SignaturePad({ onSigned, canvasRef }: SignaturePadProps) {
  const isDrawingRef = useRef(false)
  const lastRef = useRef({ x: 0, y: 0 })

  const getPos = (e: MouseEvent | TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    if ('touches' in e && e.touches.length > 0) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top)  * scaleY,
      }
    }
    return {
      x: ((e as MouseEvent).clientX - rect.left) * scaleX,
      y: ((e as MouseEvent).clientY - rect.top)  * scaleY,
    }
  }

  const checkEmpty = useCallback((canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d')!
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] > 0) { onSigned(false); return }
    }
    onSigned(true)
  }, [onSigned])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Set internal resolution
    canvas.width  = canvas.offsetWidth  * window.devicePixelRatio
    canvas.height = canvas.offsetHeight * window.devicePixelRatio
    const ctx = canvas.getContext('2d')!
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
    ctx.strokeStyle = '#1a1a1a'
    ctx.lineWidth   = 2.5
    ctx.lineCap     = 'round'
    ctx.lineJoin    = 'round'

    const start = (e: MouseEvent | TouchEvent) => {
      e.preventDefault()
      isDrawingRef.current = true
      const pos = getPos(e, canvas)
      lastRef.current = pos
      ctx.beginPath()
      ctx.moveTo(pos.x / window.devicePixelRatio, pos.y / window.devicePixelRatio)
    }
    const move = (e: MouseEvent | TouchEvent) => {
      if (!isDrawingRef.current) return
      e.preventDefault()
      const pos = getPos(e, canvas)
      ctx.lineTo(pos.x / window.devicePixelRatio, pos.y / window.devicePixelRatio)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(pos.x / window.devicePixelRatio, pos.y / window.devicePixelRatio)
      lastRef.current = pos
    }
    const end = () => {
      if (!isDrawingRef.current) return
      isDrawingRef.current = false
      checkEmpty(canvas)
    }

    canvas.addEventListener('mousedown',  start, { passive: false })
    canvas.addEventListener('mousemove',  move,  { passive: false })
    canvas.addEventListener('mouseup',    end)
    canvas.addEventListener('mouseleave', end)
    canvas.addEventListener('touchstart', start, { passive: false })
    canvas.addEventListener('touchmove',  move,  { passive: false })
    canvas.addEventListener('touchend',   end)

    return () => {
      canvas.removeEventListener('mousedown',  start)
      canvas.removeEventListener('mousemove',  move)
      canvas.removeEventListener('mouseup',    end)
      canvas.removeEventListener('mouseleave', end)
      canvas.removeEventListener('touchstart', start)
      canvas.removeEventListener('touchmove',  move)
      canvas.removeEventListener('touchend',   end)
    }
  }, [canvasRef, checkEmpty])

  return null
}

// ─── Main component ───────────────────────────────────────────────────

export function ContractStep() {
  const { state, dispatch } = useWizard()
  const { customer, selectedUnits, startMode, tenant } = state

  const [hasReadContract, setHasReadContract] = useState(false)
  const [signatureEmpty, setSignatureEmpty]   = useState(true)
  const [isGenerating, setIsGenerating]       = useState(false)
  const [showSignature, setShowSignature]     = useState(false)

  const contractRef = useRef<HTMLDivElement>(null)
  const canvasRef   = useRef<HTMLCanvasElement>(null)

  // Scroll tracking
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget
    const isAtBottom = el.scrollHeight - el.scrollTop <= el.clientHeight + 60
    if (isAtBottom) setHasReadContract(true)
  }, [])

  const clearCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setSignatureEmpty(true)
  }

  const handleContinue = async () => {
    const canvas = canvasRef.current
    if (!canvas || signatureEmpty) return
    const dataUrl = canvas.toDataURL('image/png')
    setIsGenerating(true)
    try {
      await generateAndDownloadPdf({
        tenant,
        customer: customer!,
        selectedUnits,
        startMode: startMode!,
        signatureDataUrl: dataUrl,
      })
    } catch (err) {
      console.error('Error generando PDF:', err)
    } finally {
      setIsGenerating(false)
    }
    dispatch({ type: 'SET_SIGNATURE', signature: dataUrl })
    dispatch({ type: 'NEXT_STEP' })
  }

  if (!customer || !startMode) {
    return (
      <div className="text-center py-20 space-y-4">
        <p className="text-gray-500">Faltan datos del cliente. Vuelve al paso anterior.</p>
        <Button variant="secondary" onClick={() => dispatch({ type: 'PREV_STEP' })}>Volver</Button>
      </div>
    )
  }

  const totalMonthly  = selectedUnits.reduce((s, u) => s + u.price, 0)
  const todayPayment  = startMode === 'immediate' ? calcProportionalPayment(totalMonthly) : 0
  const startDateIso  = getStartDate(startMode)

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-semibold text-gray-900">Contrato de reserva</h2>
        <p className="text-gray-500 text-sm">
          Lee el contrato completo hasta el final. Después podrás firmarlo para continuar.
        </p>
      </div>

      {/* Progress indicator */}
      {!hasReadContract && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl px-4 py-3 text-sm">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Desplázate hasta el final del contrato para poder firmarlo
        </div>
      )}
      {hasReadContract && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 rounded-2xl px-4 py-3 text-sm">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          Contrato leído. Ya puedes firmarlo abajo.
        </div>
      )}

      {/* Contract scroll area */}
      <div
        ref={contractRef}
        onScroll={handleScroll}
        className="h-[480px] overflow-y-auto rounded-2xl border border-gray-200 bg-white shadow-sm"
      >
        <div className="p-7 space-y-6 text-sm text-gray-700 leading-relaxed">
          {/* Title */}
          <div className="text-center border-b border-gray-100 pb-5">
            <h3 className="text-xl font-bold text-gray-900 uppercase tracking-wide mb-1">
              Contrato de Reserva de Trastero
            </h3>
            <p className="text-xs text-gray-400">
              Referencia: {tenant.toUpperCase()}-{Date.now().toString(36).toUpperCase()} · {todayFormatted()}
            </p>
          </div>

          {/* 1. Partes */}
          <section>
            <h4 className="font-semibold text-gray-900 text-base mb-3">1. Partes contratantes</h4>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-xl p-4 space-y-1">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Arrendador</p>
                <p><span className="font-medium">Empresa:</span> {tenant.charAt(0).toUpperCase() + tenant.slice(1)} Trasteros S.L.</p>
                <p><span className="font-medium">Actividad:</span> Alquiler de espacio de almacenamiento</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 space-y-1">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Arrendatario</p>
                <p><span className="font-medium">Nombre:</span> {customer.firstName} {customer.lastName}</p>
                <p><span className="font-medium">DNI/NIE:</span> {customer.dni}</p>
                <p><span className="font-medium">Teléfono:</span> {customer.phone}</p>
                <p><span className="font-medium">Email:</span> {customer.email}</p>
                {customer.address && (
                  <p><span className="font-medium">Dirección:</span> {customer.address}, {customer.city} {customer.postalCode}</p>
                )}
              </div>
            </div>
          </section>

          {/* 2. Objeto */}
          <section>
            <h4 className="font-semibold text-gray-900 text-base mb-3">2. Objeto del contrato</h4>
            <p className="mb-3">
              El arrendador cede en régimen de alquiler los siguientes trasteros ubicados en sus instalaciones:
            </p>
            <div className="bg-gray-50 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="text-left px-4 py-2 font-semibold text-gray-600">Trastero</th>
                    <th className="text-left px-4 py-2 font-semibold text-gray-600">Dimensiones</th>
                    <th className="text-right px-4 py-2 font-semibold text-gray-600">Precio/mes</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedUnits.map((u, i) => (
                    <tr key={u.id} className={i % 2 === 0 ? '' : 'bg-gray-50/50'}>
                      <td className="px-4 py-2 font-medium">#{u.number}</td>
                      <td className="px-4 py-2 text-gray-600">{u.dimensionsLabel} m²</td>
                      <td className="px-4 py-2 text-right font-semibold">{formatEuros(u.price)}</td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-gray-200 bg-white">
                    <td colSpan={2} className="px-4 py-2 font-bold text-gray-900">Total mensual</td>
                    <td className="px-4 py-2 text-right font-bold text-gray-900">{formatEuros(totalMonthly)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* 3. Condiciones económicas */}
          <section>
            <h4 className="font-semibold text-gray-900 text-base mb-3">3. Condiciones económicas</h4>
            <div className="bg-gray-50 rounded-xl p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Fecha de inicio</span>
                <span className="font-medium">{formatDate(startDateIso)}</span>
              </div>
              <div className="flex justify-between items-start gap-4">
                <span className="text-gray-600 shrink-0">Domiciliación</span>
                <span className="font-medium text-right">{getBillingDescription(startMode)}</span>
              </div>
              <div className="flex justify-between border-t border-gray-200 pt-2 mt-1">
                <span className="text-gray-600">Pago hoy</span>
                <span className={`font-semibold ${todayPayment > 0 ? 'text-gray-900' : 'text-green-600'}`}>
                  {todayPayment > 0 ? `${formatEuros(todayPayment)} (proporcional)` : '0,00 €'}
                </span>
              </div>
            </div>
          </section>

          {/* 4. Extras */}
          {(customer.shelfIncluded || customer.premiumInsurance || customer.goldInsurance) && (
            <section>
              <h4 className="font-semibold text-gray-900 text-base mb-3">4. Servicios adicionales contratados</h4>
              <ul className="bg-gray-50 rounded-xl p-4 space-y-1.5">
                {customer.shelfIncluded    && <li className="flex items-center gap-2"><span className="text-green-500">✓</span> Estantería incluida</li>}
                {customer.premiumInsurance && <li className="flex items-center gap-2"><span className="text-green-500">✓</span> Seguro premium</li>}
                {customer.goldInsurance    && <li className="flex items-center gap-2"><span className="text-green-500">✓</span> Seguro gold</li>}
              </ul>
            </section>
          )}

          {/* 5. Condiciones generales */}
          <section>
            <h4 className="font-semibold text-gray-900 text-base mb-3">
              {customer.shelfIncluded || customer.premiumInsurance || customer.goldInsurance ? '5' : '4'}. Condiciones generales de uso
            </h4>
            <div className="space-y-3 text-gray-600">
              {[
                ['Uso del espacio', 'El arrendatario se compromete a utilizar el espacio exclusivamente para almacenamiento de bienes propios, quedando expresamente prohibido el almacenamiento de sustancias peligrosas, inflamables, tóxicas, explosivas o ilegales, así como animales vivos o cadáveres.'],
                ['Responsabilidad', 'El arrendatario es el único responsable de los bienes almacenados en el trastero. El arrendador no asume responsabilidad alguna por pérdidas, robos, daños o deterioro de los bienes, salvo que sea consecuencia directa de una negligencia probada del arrendador.'],
                ['Acceso a las instalaciones', 'El acceso al recinto se limita al horario de apertura publicado. Fuera de dicho horario, se requerirá autorización expresa del arrendador. El arrendatario deberá respetar las normas de convivencia y no causar molestias a otros usuarios.'],
                ['Duración y renovación', 'El contrato tiene duración mensual y se renueva automáticamente salvo comunicación expresa de rescisión por cualquiera de las partes con un preaviso mínimo de 15 días naturales. La rescisión deberá comunicarse mediante escrito o correo electrónico al arrendador.'],
                ['Impago', 'El impago de dos mensualidades consecutivas, una vez requerido el pago fehacientemente, facultará al arrendador para resolver el contrato de pleno derecho y proceder al vaciado del trastero, haciéndose cargo el arrendatario de todos los gastos generados.'],
                ['Modificaciones', 'El arrendador se reserva el derecho a modificar las tarifas con un preaviso mínimo de 30 días. Si el arrendatario no aceptara la modificación, podrá resolver el contrato sin penalización dentro del plazo de preaviso.'],
                ['Protección de datos', 'Los datos personales del arrendatario serán tratados conforme al Reglamento General de Protección de Datos (UE 2016/679) y la LOPDGDD, con la finalidad exclusiva de gestionar la relación contractual. El arrendatario puede ejercer sus derechos de acceso, rectificación, supresión, oposición, limitación y portabilidad escribiendo al arrendador.'],
                ['Jurisdicción', 'El presente contrato se rige por la legislación española. Para cualquier controversia derivada de su interpretación o cumplimiento, las partes, con renuncia a su propio fuero, se someten expresamente a los Juzgados y Tribunales del lugar donde radican las instalaciones.'],
              ].map(([title, text]) => (
                <div key={title}>
                  <p className="font-medium text-gray-800 mb-0.5">{title}</p>
                  <p className="leading-relaxed">{text}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Firma placeholder — bottom anchor */}
          <div className="border-t-2 border-gray-200 pt-6 text-center text-gray-400 text-sm pb-4">
            <p className="font-medium text-gray-600 mb-1">Has llegado al final del contrato</p>
            <p>Desplázate hacia abajo para ver el área de firma</p>
          </div>
        </div>
      </div>

      {/* Signature area */}
      {hasReadContract && (
        <div className="space-y-4">
          {!showSignature ? (
            <button
              type="button"
              onClick={() => setShowSignature(true)}
              className="w-full border-2 border-dashed border-blue-300 rounded-2xl py-6 flex flex-col items-center gap-2 text-blue-600 hover:bg-blue-50 transition-colors"
            >
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              <span className="font-semibold text-base">Abrir panel de firma</span>
              <span className="text-sm text-blue-400">Firma con el ratón o con el dedo (móvil)</span>
            </button>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-900">Firma manuscrita</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Dibuja tu firma dentro del recuadro — ratón en escritorio, dedo en móvil
                  </p>
                </div>
                <button
                  type="button"
                  onClick={clearCanvas}
                  className="text-sm text-gray-400 hover:text-red-500 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-50"
                >
                  Borrar
                </button>
              </div>

              <div className="p-4">
                <div className="relative rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 overflow-hidden"
                  style={{ height: 160 }}>
                  {signatureEmpty && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
                      <p className="text-gray-300 text-sm font-medium">Firma aquí</p>
                    </div>
                  )}
                  <canvas
                    ref={canvasRef}
                    className="absolute inset-0 w-full h-full touch-none cursor-crosshair"
                    style={{ touchAction: 'none' }}
                  />
                  <SignaturePad canvasRef={canvasRef} onSigned={(empty) => setSignatureEmpty(empty)} />
                </div>
              </div>

              {!signatureEmpty && (
                <div className="px-5 pb-4">
                  <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-2.5 text-sm text-green-700">
                    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    Firma registrada. Pulsa "Firmar y continuar" para generar el PDF y continuar.
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between items-center pt-2">
        <Button
          variant="secondary"
          onClick={() => dispatch({ type: 'PREV_STEP' })}
          className="!rounded-2xl"
          disabled={isGenerating}
        >
          <svg className="mr-2 w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Volver
        </Button>

        <Button
          onClick={handleContinue}
          disabled={!hasReadContract || signatureEmpty || !showSignature}
          loading={isGenerating}
          className="!px-8 !py-3 !rounded-2xl !text-base !font-semibold"
        >
          {isGenerating ? 'Generando PDF…' : (
            <>
              <svg className="mr-2 w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              Firmar y continuar
            </>
          )}
        </Button>
      </div>

      {isGenerating && (
        <p className="text-center text-sm text-gray-400">
          Generando el contrato en PDF… se descargará automáticamente.
        </p>
      )}
    </div>
  )
}
