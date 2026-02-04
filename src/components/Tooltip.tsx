import { type ReactNode } from 'react'

interface TooltipProps {
  children: ReactNode
  content: ReactNode
  visible: boolean
  x: number
  y: number
}

export function Tooltip({ children, content, visible, x, y }: TooltipProps) {
  return (
    <>
      {children}
      {visible && content && (
        <div
          className="fixed z-50 pointer-events-none px-3 py-2 text-sm text-white bg-gray-900 rounded-lg shadow-lg max-w-[220px] transition-opacity duration-150"
          style={{ left: x, top: y, transform: 'translate(8px, 8px)' }}
        >
          {content}
        </div>
      )}
    </>
  )
}
