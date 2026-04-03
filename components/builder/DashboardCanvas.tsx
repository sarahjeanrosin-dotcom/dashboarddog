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

const PRODUCT_NAV = [
  { icon: LayoutDashboard, label: 'Dashboard' },
  { icon: BarChart2, label: 'Analytics' },
  { icon: Map, label: 'Portfolio' },
  { icon: Bell, label: 'Alerts' },
  { icon: Settings, label: 'Settings' },
]

export default function DashboardCanvas() {
  const { widgets, layout, updateWidgetPosition, branding, selectedRole, selectedVertical, roleOverlay } = useBuilderStore()
  const widgetAreaRef = useRef<HTMLDivElement>(null)
  const rightPanelRef = useRef<HTMLDivElement>(null)

  const [dragging, setDragging] = useState<DragState | null>(null)
  const [resizing, setResizing] = useState<ResizeState | null>(null)
  // Natural aspect ratio of the frame image (width/height)
  const [frameAspect, setFrameAspect] = useState<number | null>(null)

  const primaryColor = branding?.primary_color ?? '#1a56db'
  const accentColor = branding?.accent_color ?? '#e3a008'
  const fontFamily = branding?.font_family ?? 'Inter'
  const frameUrl = (branding as (typeof branding & { frame_url?: string | null }))?.frame_url ?? null

  useEffect(() => { loadGoogleFont(fontFamily) }, [fontFamily])

  // Detect natural aspect ratio of the frame image
  useEffect(() => {
    if (!frameUrl) { setFrameAspect(null); return }
    const img = new window.Image()
    img.onload = () => setFrameAspect(img.naturalWidth / img.naturalHeight)
    img.src = frameUrl
  }, [frameUrl])

  // How many "screens tall" the widget content is (1.0 = one viewport, 2.0 = two, etc.)
  const heightMultiplier = Math.max(
    1.0,
    layout.reduce((max, item) => Math.max(max, item.y + item.h), 0) + 0.04
  )

  function getWidgetAreaSize() {
    const el = widgetAreaRef.current
    if (!el) return { width: 1, height: 1 }
    // Use the natural height (scrollHeight / heightMultiplier) as the "one screen" unit
    const width = el.offsetWidth
    const height = el.scrollHeight / heightMultiplier
    return { width, height }
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
    const { width, height } = getWidgetAreaSize()
    if (dragging) {
      const dx = (e.clientX - dragging.startMouseX) / width
      const dy = (e.clientY - dragging.startMouseY) / height
      const item = layout.find(l => l.widget_id === dragging.widgetId)!
      updateWidgetPosition(dragging.widgetId, {
        x: Math.max(0, Math.min(1 - item.w, dragging.startX + dx)),
        y: Math.max(0, dragging.startY + dy),
      })
    }
    if (resizing) {
      const dx = (e.clientX - resizing.startMouseX) / width
      const dy = (e.clientY - resizing.startMouseY) / height
      updateWidgetPosition(resizing.widgetId, {
        w: Math.max(0.1, Math.min(1 - resizing.startX, resizing.startW + dx)),
        h: Math.max(0.1, resizing.startH + dy),
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragging, resizing, layout, updateWidgetPosition])

  const onMouseUp = useCallback(() => {
    setDragging(null)
    setResizing(null)
  }, [])

  // Expose right panel ref for export (multi-slide)
  useEffect(() => {
    const el = rightPanelRef.current
    if (el) (el as HTMLDivElement & { __builderScrollRef?: boolean }).__builderScrollRef = true
  }, [])

  const canvasAspect = frameAspect ?? (16 / 9)

  return (
    <div className="space-y-2" onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}>
      {/* Outer slide frame */}
      <div
        id="dashboard-canvas"
        className="relative w-full rounded-xl border border-gray-300 shadow-lg select-none overflow-hidden"
        style={{ aspectRatio: `${canvasAspect}`, fontFamily, userSelect: 'none' }}
      >
        {/* LEFT: Branded export sidebar */}
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

        {/* RIGHT: Product dashboard (scrollable) */}
        <div
          ref={rightPanelRef}
          id="right-panel"
          className="absolute left-[20%] top-0 right-0 bottom-0 overflow-y-auto overflow-x-hidden"
        >
          {frameUrl ? (
            // Custom frame image — fully visible, widgets overlay on top
            <div
              style={{
                position: 'relative',
                width: '100%',
                height: `${heightMultiplier * 100}%`,
                minHeight: '100%',
              }}
            >
              {/* Frame image stretched to fill exactly (fully visible, no cropping) */}
              <div style={{ position: 'sticky', top: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
                <Image
                  src={frameUrl}
                  alt="dashboard frame"
                  fill
                  style={{ objectFit: 'fill' }}
                  draggable={false}
                />
              </div>

              {/* Widget overlay area */}
              <div
                ref={widgetAreaRef}
                style={{
                  position: 'absolute',
                  inset: 0,
                  cursor: dragging || resizing ? 'grabbing' : 'default',
                }}
              >
                {/* Role text overlay — AI-detected position */}
                {roleOverlay && selectedRole && (
                  <div
                    style={{
                      position: 'absolute',
                      left: `${roleOverlay.x * 100}%`,
                      top: `${roleOverlay.y * 100}%`,
                      width: `${roleOverlay.w * 100}%`,
                      height: `${roleOverlay.h * 100}%`,
                      display: 'flex',
                      alignItems: 'center',
                      fontFamily,
                      color: primaryColor,
                      fontWeight: 700,
                      fontSize: `${roleOverlay.h * 40}cqw`,
                      overflow: 'hidden',
                      pointerEvents: 'none',
                      zIndex: 5,
                    }}
                  >
                    {selectedRole.avatar_emoji} {selectedRole.title}
                  </div>
                )}

                {renderWidgets({ layout, widgets, dragging, resizing, accentColor, heightMultiplier, onWidgetMouseDown, onResizeMouseDown })}
              </div>
            </div>
          ) : (
            // CSS mock dashboard frame
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              {/* Sticky top bar */}
              <div
                className="flex items-center gap-[1.5%] px-[2%] shrink-0 bg-white border-b border-gray-200"
                style={{ height: '10%', position: 'sticky', top: 0, zIndex: 10 }}
              >
                <div className="text-white text-[1cqw] font-bold px-[1.5%] py-[0.8%] rounded" style={{ backgroundColor: primaryColor }}>
                  product
                </div>
                <div className="flex items-center gap-[1%] bg-gray-100 rounded px-[1.5%] py-[0.5%] flex-1 max-w-[30%]">
                  <Search className="shrink-0 text-gray-400" style={{ width: '1.2cqw', height: '1.2cqw' }} />
                  <span className="text-[0.8cqw] text-gray-400">Search…</span>
                </div>
                <div className="ml-auto flex items-center gap-[1.5%]">
                  <Bell style={{ width: '1.3cqw', height: '1.3cqw' }} className="text-gray-400" />
                  <div className="flex items-center gap-[0.5%]">
                    <div className="rounded-full flex items-center justify-center text-[0.7cqw] font-bold text-white" style={{ width: '2cqw', height: '2cqw', backgroundColor: primaryColor }}>
                      {selectedRole?.avatar_emoji ?? 'U'}
                    </div>
                    <ChevronDown style={{ width: '1cqw', height: '1cqw' }} className="text-gray-400" />
                  </div>
                </div>
              </div>

              {/* Body: side nav + widget area */}
              <div style={{ display: 'flex', flex: 1 }}>
                {/* Sticky left nav */}
                <div
                  className="flex flex-col py-[2%] bg-white border-r border-gray-200"
                  style={{ width: '12%', position: 'sticky', top: '10%', alignSelf: 'flex-start', height: '90cqh' }}
                >
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

                {/* Scrollable widget content area */}
                <div
                  ref={widgetAreaRef}
                  className="relative flex-1 bg-[#f0f2f5] p-[1.5%]"
                  style={{
                    height: `${heightMultiplier * 90}%`,
                    minHeight: '90%',
                    cursor: dragging || resizing ? 'grabbing' : 'default',
                  }}
                >
                  {renderWidgets({ layout, widgets, dragging, resizing, accentColor, heightMultiplier, onWidgetMouseDown, onResizeMouseDown })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <p className="text-xs text-gray-400 text-center">
        Drag widgets to reposition · Drag the corner handle to resize · Save layout when done
        {heightMultiplier > 1.05 && (
          <span className="ml-2 text-blue-500">· Scroll the frame to see all widgets ({Math.ceil(heightMultiplier)} pages)</span>
        )}
      </p>
    </div>
  )
}

function renderWidgets({
  layout, widgets, dragging, resizing, accentColor, heightMultiplier, onWidgetMouseDown, onResizeMouseDown,
}: {
  layout: WidgetLayout[]
  widgets: ReturnType<typeof useBuilderStore.getState>['widgets']
  dragging: DragState | null
  resizing: ResizeState | null
  accentColor: string
  heightMultiplier: number
  onWidgetMouseDown: (e: React.MouseEvent, id: string) => void
  onResizeMouseDown: (e: React.MouseEvent, id: string) => void
}) {
  return layout.map(item => {
    const widget = widgets.find(w => w.id === item.widget_id)
    if (!widget) return null
    const imgSrc = widget.masked_url ?? widget.screenshot_url
    const isActive = dragging?.widgetId === item.widget_id || resizing?.widgetId === item.widget_id

    // y/h are fractions of one "screen height"; convert to % of the full scrollable area
    const topPct = (item.y / heightMultiplier) * 100
    const heightPct = (item.h / heightMultiplier) * 100
    const leftPct = item.x * 100
    const widthPct = item.w * 100

    return (
      <div
        key={item.widget_id}
        className="absolute rounded-lg overflow-hidden border border-gray-200 bg-white shadow-md group"
        style={{
          left: `${leftPct}%`,
          top: `${topPct}%`,
          width: `${widthPct}%`,
          height: `${heightPct}%`,
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

        <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity truncate" style={{ fontSize: '0.65cqw' }}>
          {widget.name}
        </div>

        <div
          className="absolute bottom-0 right-0 opacity-0 group-hover:opacity-100 cursor-se-resize"
          style={{ width: '1.2cqw', height: '1.2cqw', backgroundColor: accentColor }}
          onMouseDown={e => onResizeMouseDown(e, item.widget_id)}
        />
      </div>
    )
  })
}
