import { create } from 'zustand'
import type { Vertical, Role, Widget, Branding, WidgetLayout } from '@/lib/supabase/types'

interface BuilderState {
  // Selection
  selectedVertical: Vertical | null
  selectedRole: Role | null

  // Data
  widgets: Widget[]
  layout: WidgetLayout[]
  branding: Branding | null

  // UI
  isExporting: boolean

  // Actions
  setSelectedVertical: (v: Vertical | null) => void
  setSelectedRole: (r: Role | null) => void
  setWidgets: (w: Widget[]) => void
  setLayout: (l: WidgetLayout[]) => void
  updateWidgetPosition: (widgetId: string, pos: Partial<WidgetLayout>) => void
  setBranding: (b: Branding | null) => void
  setIsExporting: (v: boolean) => void
  reset: () => void
}

export const useBuilderStore = create<BuilderState>((set) => ({
  selectedVertical: null,
  selectedRole: null,
  widgets: [],
  layout: [],
  branding: null,
  isExporting: false,

  setSelectedVertical: (v) => set({ selectedVertical: v, selectedRole: null, widgets: [], layout: [] }),
  setSelectedRole: (r) => set({ selectedRole: r }),
  setWidgets: (w) => set({ widgets: w }),
  setLayout: (l) => set({ layout: l }),
  updateWidgetPosition: (widgetId, pos) =>
    set((state) => ({
      layout: state.layout.map((item) =>
        item.widget_id === widgetId ? { ...item, ...pos } : item
      ),
    })),
  setBranding: (b) => set({ branding: b }),
  setIsExporting: (v) => set({ isExporting: v }),
  reset: () => set({
    selectedVertical: null,
    selectedRole: null,
    widgets: [],
    layout: [],
    isExporting: false,
  }),
}))
