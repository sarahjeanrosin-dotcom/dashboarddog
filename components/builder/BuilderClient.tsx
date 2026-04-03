'use client'

import { useEffect, useState, useRef } from 'react'
import { useBuilderStore } from '@/store/builderStore'
import { createClient } from '@/lib/supabase/client'
import type { Branding, VerticalWithRoles, Widget, WidgetLayout, RoleWidget } from '@/lib/supabase/types'
import VerticalRoleSelector from './VerticalRoleSelector'
import DashboardCanvas from './DashboardCanvas'
import ExportPanel from './ExportPanel'
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react'

const ZOOM_STEPS = [0.4, 0.5, 0.6, 0.75, 0.9, 1.0]

interface Props {
  verticals: VerticalWithRoles[]
  branding: Branding | null
}

// Default AI-suggested grid layout for up to 5 widgets
function suggestLayout(widgets: Widget[]): WidgetLayout[] {
  const placements: Omit<WidgetLayout, 'widget_id'>[] = [
    { x: 0.02, y: 0.02, w: 0.46, h: 0.46 },
    { x: 0.52, y: 0.02, w: 0.46, h: 0.46 },
    { x: 0.02, y: 0.52, w: 0.30, h: 0.44 },
    { x: 0.35, y: 0.52, w: 0.30, h: 0.44 },
    { x: 0.68, y: 0.52, w: 0.30, h: 0.44 },
  ]
  return widgets.slice(0, 5).map((w, i) => ({
    widget_id: w.id,
    ...(placements[i] ?? { x: 0.1 * i, y: 0.1 * i, w: 0.3, h: 0.3 }),
  }))
}

export default function BuilderClient({ verticals, branding }: Props) {
  const supabase = createClient()
  const {
    selectedVertical, selectedRole,
    widgets, layout,
    setWidgets, setLayout, setBranding,
  } = useBuilderStore()

  const [loadingWidgets, setLoadingWidgets] = useState(false)
  const [savingLayout, setSavingLayout] = useState(false)
  const [savedMsg, setSavedMsg] = useState(false)
  const [zoom, setZoom] = useState(1.0)
  const canvasWrapperRef = useRef<HTMLDivElement>(null)

  function zoomOut() {
    setZoom(z => {
      const idx = ZOOM_STEPS.indexOf(z)
      return idx > 0 ? ZOOM_STEPS[idx - 1] : z
    })
  }
  function zoomIn() {
    setZoom(z => {
      const idx = ZOOM_STEPS.indexOf(z)
      return idx < ZOOM_STEPS.length - 1 ? ZOOM_STEPS[idx + 1] : z
    })
  }

  useEffect(() => {
    setBranding(branding)
  }, [branding, setBranding])

  // Load widgets + saved layout whenever role changes
  useEffect(() => {
    if (!selectedRole || !selectedVertical) { setWidgets([]); setLayout([]); return }

    async function load() {
      setLoadingWidgets(true)
      const [{ data: roleWidgetsData }, layoutResult] = await Promise.all([
        supabase
          .from('role_widgets')
          .select('*, widget:widgets(*)')
          .eq('role_id', selectedRole!.id)
          .order('position'),
        supabase
          .from('dashboard_layouts')
          .select('layout_json')
          .eq('vertical_id', selectedVertical!.id)
          .eq('role_id', selectedRole!.id)
          .maybeSingle() as Promise<{ data: { layout_json: unknown } | null, error: unknown }>,
      ])
      setLoadingWidgets(false)

      const rw = (roleWidgetsData ?? []) as (RoleWidget & { widget: Widget })[]
      const widgetList = rw.map(r => r.widget)
      setWidgets(widgetList)

      const savedJson = (layoutResult.data as { layout_json: unknown } | null)?.layout_json
      if (savedJson && Array.isArray(savedJson) && savedJson.length > 0) {
        setLayout(savedJson as WidgetLayout[])
      } else {
        setLayout(suggestLayout(widgetList))
      }
    }

    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRole?.id])

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
              <button
                onClick={zoomOut}
                disabled={zoom === ZOOM_STEPS[0]}
                className="p-1.5 rounded text-gray-500 hover:text-gray-900 disabled:opacity-30"
                title="Zoom out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                onClick={() => setZoom(1.0)}
                className="px-2 text-xs font-mono text-gray-600 hover:text-gray-900 min-w-[3rem] text-center"
                title="Reset zoom"
              >
                {Math.round(zoom * 100)}%
              </button>
              <button
                onClick={zoomIn}
                disabled={zoom === ZOOM_STEPS[ZOOM_STEPS.length - 1]}
                className="p-1.5 rounded text-gray-500 hover:text-gray-900 disabled:opacity-30"
                title="Zoom in"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={() => setZoom(0.5)}
                className="p-1.5 rounded text-gray-500 hover:text-gray-900"
                title="Fit to screen"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>

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
          /* Zoom wrapper — scales canvas visually without affecting drag coordinates */
          <div
            ref={canvasWrapperRef}
            className="overflow-hidden rounded-xl"
            style={{ height: `calc(${zoom} * (100vw - 3rem) / (16/9) * 0.82)` }}
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
