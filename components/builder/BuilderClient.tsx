'use client'

import { useEffect, useState } from 'react'
import { useBuilderStore } from '@/store/builderStore'
import { createClient } from '@/lib/supabase/client'
import type { Branding, VerticalWithRoles, Widget, WidgetLayout, RoleWidget } from '@/lib/supabase/types'
import VerticalRoleSelector from './VerticalRoleSelector'
import DashboardCanvas from './DashboardCanvas'
import ExportPanel from './ExportPanel'
import { ZoomIn, ZoomOut, Maximize2, Sparkles, Loader2 } from 'lucide-react'
import type { LayoutSuggestion } from '@/app/api/suggest-layout/route'

const ZOOM_STEPS = [0.4, 0.5, 0.6, 0.75, 0.9, 1.0]

interface Props {
  verticals: VerticalWithRoles[]
  branding: Branding | null
}

// Fallback grid layout used when no AI and no saved layout
function defaultLayout(widgets: Widget[]): WidgetLayout[] {
  const cols = widgets.length <= 2 ? widgets.length : widgets.length <= 4 ? 2 : 3
  return widgets.map((w, i) => {
    const col = i % cols
    const row = Math.floor(i / cols)
    const gap = 0.01
    const itemW = (1 - gap * (cols + 1)) / cols
    const itemH = Math.min(0.45, (1 - gap * 3) / Math.ceil(widgets.length / cols))
    return {
      widget_id: w.id,
      x: gap + col * (itemW + gap),
      y: gap + row * (itemH + gap),
      w: itemW,
      h: itemH,
    }
  })
}

export default function BuilderClient({ verticals, branding }: Props) {
  const supabase = createClient()
  const {
    selectedVertical, selectedRole,
    widgets, layout,
    setWidgets, setLayout, setBranding, setRoleOverlay,
  } = useBuilderStore()

  const [loadingWidgets, setLoadingWidgets] = useState(false)
  const [savingLayout, setSavingLayout] = useState(false)
  const [savedMsg, setSavedMsg] = useState(false)
  const [zoom, setZoom] = useState(0.75)
  const [suggestingLayout, setSuggestingLayout] = useState(false)
  const [suggestError, setSuggestError] = useState<string | null>(null)

  function zoomOut() {
    setZoom(z => { const idx = ZOOM_STEPS.indexOf(z); return idx > 0 ? ZOOM_STEPS[idx - 1] : z })
  }
  function zoomIn() {
    setZoom(z => { const idx = ZOOM_STEPS.indexOf(z); return idx < ZOOM_STEPS.length - 1 ? ZOOM_STEPS[idx + 1] : z })
  }

  useEffect(() => { setBranding(branding) }, [branding, setBranding])

  useEffect(() => {
    if (!selectedRole || !selectedVertical) { setWidgets([]); setLayout([]); return }

    async function load() {
      setLoadingWidgets(true)
      const { data: roleWidgetsData } = await supabase
        .from('role_widgets')
        .select('*, widget:widgets(*)')
        .eq('role_id', selectedRole!.id)
        .order('position')

      const layoutResult = await supabase
        .from('dashboard_layouts')
        .select('layout_json')
        .eq('vertical_id', selectedVertical!.id)
        .eq('role_id', selectedRole!.id)
        .maybeSingle()

      setLoadingWidgets(false)

      const rw = (roleWidgetsData ?? []) as (RoleWidget & { widget: Widget })[]
      const widgetList = rw.map(r => r.widget)
      setWidgets(widgetList)

      const layoutData = layoutResult.data as { layout_json: unknown } | null
      const savedJson = layoutData?.layout_json
      if (savedJson && Array.isArray(savedJson) && savedJson.length > 0) {
        setLayout(savedJson as WidgetLayout[])
      } else {
        setLayout(defaultLayout(widgetList))
      }
    }

    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRole?.id])

  async function suggestLayout() {
    if (widgets.length === 0) return
    setSuggestingLayout(true)
    setSuggestError(null)

    try {
      const frameUrl = (branding as (typeof branding & { frame_url?: string | null }))?.frame_url ?? null

      const res = await fetch('/api/suggest-layout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ frameUrl, widgetCount: widgets.length }),
      })
      const data: LayoutSuggestion = await res.json()
      if (!res.ok) throw new Error('Layout suggestion failed')

      const newLayout: WidgetLayout[] = widgets.map((w, i) => ({
        widget_id: w.id,
        ...(data.widgets[i] ?? { x: 0.01, y: 0.01 + i * 0.5, w: 0.47, h: 0.47 }),
      }))
      setLayout(newLayout)

      if (data.roleOverlay) {
        setRoleOverlay(data.roleOverlay)
      }
    } catch (err) {
      setSuggestError(err instanceof Error ? err.message : 'Failed')
    } finally {
      setSuggestingLayout(false)
    }
  }

  async function saveLayout() {
    if (!selectedVertical || !selectedRole) return
    setSavingLayout(true)
    await supabase.from('dashboard_layouts').upsert({
      vertical_id: selectedVertical.id,
      role_id: selectedRole.id,
      layout_json: layout,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'vertical_id,role_id' })
    setSavingLayout(false)
    setSavedMsg(true)
    setTimeout(() => setSavedMsg(false), 2000)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Dashboard Builder</h1>
          <p className="text-sm text-gray-500 mt-0.5">Select a vertical and role to assemble a dashboard.</p>
        </div>
        {selectedRole && (
          <div className="flex items-center gap-2 flex-wrap">
            {/* Zoom controls */}
            <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-1">
              <button onClick={zoomOut} disabled={zoom === ZOOM_STEPS[0]} className="p-1.5 rounded text-gray-500 hover:text-gray-900 disabled:opacity-30" title="Zoom out">
                <ZoomOut className="w-4 h-4" />
              </button>
              <button onClick={() => setZoom(0.75)} className="px-2 text-xs font-mono text-gray-600 hover:text-gray-900 min-w-[3rem] text-center" title="Reset zoom">
                {Math.round(zoom * 100)}%
              </button>
              <button onClick={zoomIn} disabled={zoom === ZOOM_STEPS[ZOOM_STEPS.length - 1]} className="p-1.5 rounded text-gray-500 hover:text-gray-900 disabled:opacity-30" title="Zoom in">
                <ZoomIn className="w-4 h-4" />
              </button>
              <button onClick={() => setZoom(0.5)} className="p-1.5 rounded text-gray-500 hover:text-gray-900" title="Fit to screen">
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={suggestLayout}
              disabled={suggestingLayout || widgets.length === 0}
              className="flex items-center gap-1.5 rounded-lg border border-purple-200 bg-purple-50 px-3 py-2 text-sm text-purple-700 hover:bg-purple-100 disabled:opacity-50"
              title="Use AI to arrange widgets within the frame"
            >
              {suggestingLayout ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {suggestingLayout ? 'Arranging…' : 'AI Arrange'}
            </button>

            <button
              onClick={saveLayout}
              disabled={savingLayout}
              className="rounded-lg bg-gray-800 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-900 disabled:opacity-50"
            >
              {savingLayout ? 'Saving…' : savedMsg ? 'Saved!' : 'Save Layout'}
            </button>
            <ExportPanel />
          </div>
        )}
      </div>

      {suggestError && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-600">
          AI arrange failed: {suggestError}
        </div>
      )}

      <VerticalRoleSelector verticals={verticals} />

      {selectedRole && (
        loadingWidgets ? (
          <div className="text-center py-16 text-gray-400 text-sm">Loading dashboard…</div>
        ) : widgets.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 py-16 text-center text-sm text-gray-400">
            No widgets assigned to this role yet.
            <br />
            Go to <strong>Verticals</strong> to assign widgets to this role.
          </div>
        ) : (
          /* Zoom wrapper */
          <div
            className="overflow-auto rounded-xl"
            style={{ maxHeight: '80vh' }}
          >
            <div
              style={{
                transform: `scale(${zoom})`,
                transformOrigin: 'top left',
                width: `${100 / zoom}%`,
              }}
            >
              <DashboardCanvas />
            </div>
          </div>
        )
      )}
    </div>
  )
}
