'use client'

import { useRef, useState, useCallback, useId } from 'react'
import Image from 'next/image'
import { useBuilderStore } from '@/store/builderStore'
import type { WidgetLayout } from '@/lib/supabase/types'

// Fixed frame aspect ratio: 16:9
const FRAME_ASPECT = 16 / 9

interface DragState {
  widgetId: string
  startMouseX: number
  startMouseY: number
  startX: number
  startY: number
}

interface ResizeState extends DragState {
  startW: number
  startH: number
}

export default function DashboardCanvas() {
  const { widgets, layout, updateWidgetPosition, branding, selectedRole, selectedVertical } = useBuilderStore()
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasId = useId()

  const [dragging, setDragging] = useState<DragState | null>(null)
  const [resizing, setResizing] = useState<ResizeState | null>(null)

  function getFrameRect() {
    const el = containerRef.current
    if (!el) return { left: 0, top: 0, width: 1, height: 1 }
    const rect = el.getBoundingClientRect()
    return { left: rect.left, top: rect.top, width: rect.width, height: rect.height }
  }

  const onWidgetMouseDown = useCallback((e: React.MouseEvent, widgetId: string) => {
    e.preventDefault()
    const item = layout.find(l => l.widget_id === widgetId)
    if (!item) return
    setDragging({ widgetId, startMouseX: e.clientX, startMouseY: e.clientY, startX: item.x, startY: item.y })
  }, [layout])

  const onResizeMouseDown = useCallback((e: React.MouseEvent, widgetId: string) => {
    e.preventDefault()
    e.stopPropagation()
    const item = layout.find(l => l.widget_id === widgetId)
    if (!item) return
    setResizing({ widgetId, startMouseX: e.clientX, startMouseY: e.clientY, startX: item.x, startY: item.y, startW: item.w, startH: item.h })
  }, [layout])

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    const frame = getFrameRect()

    if (dragging) {
      const dx = (e.clientX - dragging.startMouseX) / frame.width
      const dy = (e.clientY - dragging.startMouseY) / frame.height
      const item = layout.find(l => l.widget_id === dragging.widgetId)!
      const newX = Math.max(0, Math.min(1 - item.w, dragging.startX + dx))
      const newY = Math.max(0, Math.min(1 - item.h, dragging.startY + dy))
      updateWidgetPosition(dragging.widgetId, { x: newX, y: newY })
    }

    if (resizing) {
      const dx = (e.clientX - resizing.startMouseX) / frame.width
      const dy = (e.clientY - resizing.startMouseY) / frame.height
      const newW = Math.max(0.1, Math.min(1 - resizing.startX, resizing.startW + dx))
      const newH = Math.max(0.1, Math.min(1 - resizing.startY, resizing.startH + dy))
      updateWidgetPosition(resizing.widgetId, { w: newW, h: newH })
    }
  }, [dragging, resizing, layout, updateWidgetPosition])

  const onMouseUp = useCallback(() => {
    setDragging(null)
    setResizing(null)
  }, [])

  const primaryColor = branding?.primary_color ?? '#1a56db'
  const accentColor = branding?.accent_color ?? '#e3a008'
  const fontFamily = branding?.font_family ?? 'Inter'

  return (
    <div className="space-y-2">
      {/* The dashboard frame */}
      <div
        ref={containerRef}
        id={`dashboard-canvas-${canvasId}`}
        className="relative w-full select-none overflow-hidden rounded-xl border border-gray-300 shadow-lg"
        style={{ aspectRatio: FRAME_ASPECT, fontFamily, userSelect: 'none', cursor: dragging || resizing ? 'grabbing' : 'default' }}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      >
        {/* Sidebar panel */}
        <div
          className="absolute left-0 top-0 h-full w-[20%] flex flex-col p-4 gap-3 z-10"
          style={{ backgroundColor: primaryColor }}
        >
          {branding?.logo_url && (
            <div className="relative h-10 w-full">
              <Image src={branding.logo_url} alt="logo" fill className="object-contain object-left" />
            </div>
          )}
          <div className="mt-auto space-y-1">
            <p className="text-xs font-semibold uppercase tracking-widest opacity-70 text-white">
              {selectedVertical?.name}
            </p>
            <p className="text-xl font-bold leading-tight text-white">{selectedRole?.avatar_emoji} {selectedRole?.title}</p>
            {selectedRole?.blurb && (
              <p className="text-xs text-white opacity-75 leading-snug">{selectedRole.blurb}</p>
            )}
          </div>
          <div className="h-1 rounded-full w-12" style={{ backgroundColor: accentColor }} />
        </div>

        {/* Main canvas area */}
        <div className="absolute left-[20%] top-0 right-0 bottom-0 bg-gray-100">
          {layout.map(item => {
            const widget = widgets.find(w => w.id === item.widget_id)
            if (!widget) return null
            const imgSrc = widget.masked_url ?? widget.screenshot_url

            return (
              <div
                key={item.widget_id}
                className="absolute rounded-lg overflow-hidden border border-gray-300 bg-white shadow-sm group"
                style={{
                  left: `${item.x * 100}%`,
                  top: `${item.y * 100}%`,
                  width: `${item.w * 100}%`,
                  height: `${item.h * 100}%`,
                  cursor: 'grab',
                  zIndex: dragging?.widgetId === item.widget_id || resizing?.widgetId === item.widget_id ? 20 : 1,
                }}
                onMouseDown={(e) => onWidgetMouseDown(e, item.widget_id)}
              >
                {imgSrc ? (
                  <Image src={imgSrc} alt={widget.name} fill className="object-cover" draggable={false} />
                ) : (
                  <div className="flex items-center justify-center h-full bg-gray-200 text-xs text-gray-500 p-2 text-center">
                    {widget.name}
                  </div>
                )}

                {/* Widget label on hover */}
                <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity truncate">
                  {widget.name}
                </div>

                {/* Resize handle */}
                <div
                  className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize opacity-0 group-hover:opacity-100"
                  style={{ backgroundColor: accentColor }}
                  onMouseDown={(e) => onResizeMouseDown(e, item.widget_id)}
                />
              </div>
            )
          })}
        </div>
      </div>

      <p className="text-xs text-gray-400 text-center">
        Drag widgets to reposition · Drag corner handle to resize · Save layout when done
      </p>
    </div>
  )
}
