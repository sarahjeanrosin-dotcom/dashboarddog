'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import Image from 'next/image'
import { useBuilderStore } from '@/store/builderStore'
import type { WidgetLayout } from '@/lib/supabase/types'
import { LayoutDashboard, BarChart2, Map, Bell, Settings, Search, ChevronDown } from 'lucide-react'

function loadGoogleFont(fontFamily: string) {
  const id = `gfont-${fontFamily.replace(/\s+/g, '-')}`
  if (document.getElementById(id)) return
  const link = document.createElement('link')
  link.id = id
  link.rel = 'stylesheet'
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontFamily)}:wght@400;600;700&display=swap`
  document.head.appendChild(link)
}

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

// Nav items that appear in the mock product sidebar
const PRODUCT_NAV = [
  { icon: LayoutDashboard, label: 'Dashboard' },
  { icon: BarChart2, label: 'Analytics' },
  { icon: Map, label: 'Portfolio' },
  { icon: Bell, label: 'Alerts' },
  { icon: Settings, label: 'Settings' },
]

export default function DashboardCanvas() {
  const { widgets, layout, updateWidgetPosition, branding, selectedRole, selectedVertical } = useBuilderStore()
  const widgetAreaRef = useRef<HTMLDivElement>(null)

  const [dragging, setDragging] = useState<DragState | null>(null)
  const [resizing, setResizing] = useState<ResizeState | null>(null)

  const primaryColor = branding?.primary_color ?? '#1a56db'
  const accentColor = branding?.accent_color ?? '#e3a008'
  const fontFamily = branding?.font_family ?? 'Inter'
  const frameUrl = (branding as (typeof branding & { frame_url?: string | null }))?.frame_url ?? null

  // Load the selected font
  useEffect(() => { loadGoogleFont(fontFamily) }, [fontFamily])

  function getWidgetAreaRect() {
    const el = widgetAreaRef.current
    if (!el) return { width: 1, height: 1 }
    const rect = el.getBoundingClientRect()
    return { width: rect.width, height: rect.height }
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
    const { width, height } = getWidgetAreaRect()
    if (dragging) {
      const dx = (e.clientX - dragging.startMouseX) / width
      const dy = (e.clientY - dragging.startMouseY) / height
      const item = layout.find(l => l.widget_id === dragging.widgetId)!
      updateWidgetPosition(dragging.widgetId, {
        x: Math.max(0, Math.min(1 - item.w, dragging.startX + dx)),
        y: Math.max(0, Math.min(1 - item.h, dragging.startY + dy)),
      })
    }
    if (resizing) {
      const dx = (e.clientX - resizing.startMouseX) / width
      const dy = (e.clientY - resizing.startMouseY) / height
      updateWidgetPosition(resizing.widgetId, {
        w: Math.max(0.1, Math.min(1 - resizing.startX, resizing.startW + dx)),
        h: Math.max(0.1, Math.min(1 - resizing.startY, resizing.startH + dy)),
      })
    }
  }, [dragging, resizing, layout, updateWidgetPosition])

  const onMouseUp = useCallback(() => {
    setDragging(null)
    setResizing(null)
  }, [])

  // Darken primary color slightly for nav hover states
  const darkPrimary = primaryColor + 'cc'

  return (
    <div className="space-y-2" onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}>
      {/* Outer slide frame — 16:9 */}
      <div
        id="dashboard-canvas"
        className="relative w-full overflow-hidden rounded-xl border border-gray-300 shadow-lg select-none"
        style={{ aspectRatio: '16/9', fontFamily, userSelect: 'none' }}
      >
        {/* ── LEFT: Branded export sidebar (20%) ── */}
        <div
          className="absolute left-0 top-0 h-full w-[20%] flex flex-col p-[3%] z-10"
          style={{ backgroundColor: primaryColor }}
        >
          {branding?.logo_url ? (
            <div className="relative h-[10%] w-full mb-[6%]">
              <Image src={branding.logo_url} alt="logo" fill className="object-contain object-left" />
            </div>
          ) : (
            <div className="text-white font-bold text-[1.4cqw] mb-[6%] opacity-90">Your Logo</div>
          )}

          <div className="flex-1" />

          <div className="space-y-[4%]">
            <p className="text-[0.8cqw] font-semibold uppercase tracking-widest text-white opacity-60">
              {selectedVertical?.name}
            </p>
            <p className="text-[1.6cqw] font-bold leading-tight text-white">
              {selectedRole?.avatar_emoji} {selectedRole?.title}
            </p>
            {selectedRole?.blurb && (
              <p className="text-[0.85cqw] text-white opacity-70 leading-snug">
                {selectedRole.blurb}
              </p>
            )}
          </div>

          <div className="mt-[6%] h-[0.4%] rounded-full w-[30%]" style={{ backgroundColor: accentColor }} />
        </div>

        {/* ── RIGHT: Product dashboard frame (80%) ── */}
        <div className="absolute left-[20%] top-0 right-0 bottom-0 flex flex-col bg-[#f0f2f5]">

          {frameUrl ? (
            // Custom frame image — widgets overlay on top
            <div className="relative flex-1">
              <Image src={frameUrl} alt="dashboard frame" fill className="object-cover object-top-left" draggable={false} />
              {/* Widget overlay area */}
              <div ref={widgetAreaRef} className="absolute inset-0" style={{ cursor: dragging || resizing ? 'grabbing' : 'default' }}>
                {renderWidgets({ layout, widgets, dragging, resizing, accentColor, onWidgetMouseDown, onResizeMouseDown })}
              </div>
            </div>
          ) : (
            // CSS mock dashboard frame
            <>
              {/* Product top bar */}
              <div className="flex items-center gap-[1.5%] px-[2%] shrink-0 bg-white border-b border-gray-200" style={{ height: '10%' }}>
                <div
                  className="text-white text-[1cqw] font-bold px-[1.5%] py-[0.8%] rounded"
                  style={{ backgroundColor: primaryColor }}
                >
                  product
                </div>
                <div className="flex items-center gap-[1%] bg-gray-100 rounded px-[1.5%] py-[0.5%] flex-1 max-w-[30%]">
                  <Search className="shrink-0 text-gray-400" style={{ width: '1.2cqw', height: '1.2cqw' }} />
                  <span className="text-[0.8cqw] text-gray-400">Search…</span>
                </div>
                <div className="ml-auto flex items-center gap-[1.5%]">
                  <Bell style={{ width: '1.3cqw', height: '1.3cqw' }} className="text-gray-400" />
                  <div className="flex items-center gap-[0.5%]">
                    <div className="rounded-full bg-gray-300 flex items-center justify-center text-[0.7cqw] font-bold text-white" style={{ width: '2cqw', height: '2cqw', backgroundColor: primaryColor }}>
                      {selectedRole?.avatar_emoji ?? 'U'}
                    </div>
                    <ChevronDown style={{ width: '1cqw', height: '1cqw' }} className="text-gray-400" />
                  </div>
                </div>
              </div>

              {/* Body: product sidebar + content */}
              <div className="flex flex-1 overflow-hidden">
                {/* Product left nav */}
                <div className="flex flex-col py-[2%] bg-white border-r border-gray-200" style={{ width: '12%' }}>
                  {PRODUCT_NAV.map(({ icon: Icon, label }, i) => (
                    <div
                      key={label}
                      className="flex items-center gap-[8%] px-[12%] py-[6%] mx-[8%] rounded cursor-pointer"
                      style={i === 0 ? { backgroundColor: primaryColor + '18', color: primaryColor } : { color: '#6b7280' }}
                    >
                      <Icon style={{ width: '1.2cqw', height: '1.2cqw', flexShrink: 0 }} />
                      <span className="text-[0.75cqw] font-medium truncate">{label}</span>
                    </div>
                  ))}
                </div>

                {/* Widget content area */}
                <div
                  ref={widgetAreaRef}
                  className="relative flex-1 p-[1.5%]"
                  style={{ cursor: dragging || resizing ? 'grabbing' : 'default' }}
                >
                  {renderWidgets({ layout, widgets, dragging, resizing, accentColor, onWidgetMouseDown, onResizeMouseDown })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <p className="text-xs text-gray-400 text-center">
        Drag widgets to reposition · Drag the corner handle to resize · Save layout when done
      </p>
    </div>
  )
}

// Extracted so it works for both frame modes
function renderWidgets({
  layout, widgets, dragging, resizing, accentColor, onWidgetMouseDown, onResizeMouseDown,
}: {
  layout: WidgetLayout[]
  widgets: ReturnType<typeof useBuilderStore.getState>['widgets']
  dragging: DragState | null
  resizing: ResizeState | null
  accentColor: string
  onWidgetMouseDown: (e: React.MouseEvent, id: string) => void
  onResizeMouseDown: (e: React.MouseEvent, id: string) => void
}) {
  return layout.map(item => {
    const widget = widgets.find(w => w.id === item.widget_id)
    if (!widget) return null
    const imgSrc = widget.masked_url ?? widget.screenshot_url
    const isActive = dragging?.widgetId === item.widget_id || resizing?.widgetId === item.widget_id

    return (
      <div
        key={item.widget_id}
        className="absolute rounded-lg overflow-hidden border border-gray-200 bg-white shadow-md group"
        style={{
          left: `${item.x * 100}%`,
          top: `${item.y * 100}%`,
          width: `${item.w * 100}%`,
          height: `${item.h * 100}%`,
          cursor: 'grab',
          zIndex: isActive ? 20 : 1,
          boxShadow: isActive ? `0 0 0 2px ${accentColor}` : undefined,
        }}
        onMouseDown={e => onWidgetMouseDown(e, item.widget_id)}
      >
        {imgSrc ? (
          <Image src={imgSrc} alt={widget.name} fill className="object-cover" draggable={false} />
        ) : (
          <div className="flex items-center justify-center h-full bg-gray-100 text-gray-400 p-2 text-center" style={{ fontSize: '0.75cqw' }}>
            {widget.name}
          </div>
        )}

        {/* Label on hover */}
        <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity truncate" style={{ fontSize: '0.65cqw' }}>
          {widget.name}
        </div>

        {/* Resize handle */}
        <div
          className="absolute bottom-0 right-0 opacity-0 group-hover:opacity-100 cursor-se-resize"
          style={{ width: '1.2cqw', height: '1.2cqw', backgroundColor: accentColor }}
          onMouseDown={e => onResizeMouseDown(e, item.widget_id)}
        />
      </div>
    )
  })
}
