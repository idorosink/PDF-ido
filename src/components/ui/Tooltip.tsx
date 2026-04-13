import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { clsx } from 'clsx'

interface TooltipProps {
  content: string
  side?: 'top' | 'bottom' | 'left' | 'right' | 'start' | 'end'
  delay?: number
  children: React.ReactElement
}

export function Tooltip({ content, side = 'right', delay = 400, children }: TooltipProps) {
  const [visible, setVisible] = useState(false)
  const [coords, setCoords] = useState({ x: 0, y: 0 })
  const triggerRef = useRef<HTMLElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout>>()

  const show = () => {
    timerRef.current = setTimeout(() => {
      const el = triggerRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const offset = 8
      let x = 0, y = 0
      if (side === 'right' || side === 'end') { x = rect.right + offset; y = rect.top + rect.height / 2 }
      else if (side === 'left' || side === 'start') { x = rect.left - offset; y = rect.top + rect.height / 2 }
      else if (side === 'top') { x = rect.left + rect.width / 2; y = rect.top - offset }
      else { x = rect.left + rect.width / 2; y = rect.bottom + offset }
      setCoords({ x, y })
      setVisible(true)
    }, delay)
  }

  const hide = () => {
    clearTimeout(timerRef.current)
    setVisible(false)
  }

  useEffect(() => () => clearTimeout(timerRef.current), [])

  const child = React.cloneElement(children, {
    ref: triggerRef,
    onMouseEnter: (e: React.MouseEvent) => { children.props.onMouseEnter?.(e); show() },
    onMouseLeave: (e: React.MouseEvent) => { children.props.onMouseLeave?.(e); hide() },
    onFocus: (e: React.FocusEvent) => { children.props.onFocus?.(e); show() },
    onBlur: (e: React.FocusEvent) => { children.props.onBlur?.(e); hide() },
  })

  const positionClasses = {
    right: '-translate-y-1/2',
    end: '-translate-y-1/2',
    left: '-translate-y-1/2 -translate-x-full',
    start: '-translate-y-1/2 -translate-x-full',
    top: '-translate-x-1/2 -translate-y-full',
    bottom: '-translate-x-1/2',
  }

  return (
    <>
      {child}
      {visible &&
        createPortal(
          <div
            className={clsx(
              'fixed z-[9999] px-2 py-1 rounded-md text-xs font-medium',
              'bg-gray-900 dark:bg-gray-700 text-white shadow-lg',
              'pointer-events-none animate-fade-in whitespace-nowrap',
              positionClasses[side]
            )}
            style={{ left: coords.x, top: coords.y }}
          >
            {content}
          </div>,
          document.body
        )}
    </>
  )
}
