'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Role, Widget } from '@/lib/supabase/types'
import { Plus, Trash2, Pencil, Check, X, LayoutGrid, ChevronDown, ChevronRight } from 'lucide-react'

const EMOJI_OPTIONS = ['👤', '🏢', '🔒', '📊', '💼', '🛡️', '🔑', '📋', '🏗️', '⚙️']

interface Props {
  verticalId: string
  initialRoles: Role[]
  allWidgets: Pick<Widget, 'id' | 'name' | 'screenshot_url' | 'masked_url'>[]
  onRolesChange: (roles: Role[]) => void
}

interface EditState {
  title: string
  blurb: string
  avatar_emoji: string
}

export default function RolesManager({ verticalId, initialRoles, allWidgets, onRolesChange }: Props) {
  const supabase = createClient()
  const [roles, setRoles] = useState<Role[]>(initialRoles)
  const [newRole, setNewRole] = useState<EditState>({ title: '', blurb: '', avatar_emoji: '👤' })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editState, setEditState] = useState<EditState>({ title: '', blurb: '', avatar_emoji: '👤' })
  const [showAddForm, setShowAddForm] = useState(false)

  // Widget assignment state: roleId → Set of assigned widget IDs
  const [assignedWidgets, setAssignedWidgets] = useState<Record<string, Set<string>>>({})
  const [expandedWidgetsRoleId, setExpandedWidgetsRoleId] = useState<string | null>(null)
  const [loadingWidgets, setLoadingWidgets] = useState<string | null>(null)

  function updateRoles(updated: Role[]) {
    setRoles(updated)
    onRolesChange(updated)
  }

  async function addRole() {
    if (!newRole.title.trim()) return
    const { data, error } = await supabase
      .from('roles')
      .insert({ vertical_id: verticalId, ...newRole, title: newRole.title.trim() })
      .select()
      .single()
    if (error) { alert(error.message); return }
    updateRoles([...roles, data])
    setNewRole({ title: '', blurb: '', avatar_emoji: '👤' })
    setShowAddForm(false)
  }

  async function deleteRole(id: string) {
    if (!confirm('Delete this role?')) return
    const { error } = await supabase.from('roles').delete().eq('id', id)
    if (error) { alert(error.message); return }
    updateRoles(roles.filter(r => r.id !== id))
  }

  async function saveEdit(id: string) {
    const { error } = await supabase.from('roles').update(editState).eq('id', id)
    if (error) { alert(error.message); return }
    updateRoles(roles.map(r => r.id === id ? { ...r, ...editState } : r))
    setEditingId(null)
  }

  async function toggleWidgets(roleId: string) {
    if (expandedWidgetsRoleId === roleId) {
      setExpandedWidgetsRoleId(null)
      return
    }
    // Load existing assignments if not yet loaded
    if (!assignedWidgets[roleId]) {
      setLoadingWidgets(roleId)
      const { data } = await supabase
        .from('role_widgets')
        .select('widget_id')
        .eq('role_id', roleId)
      setAssignedWidgets(prev => ({
        ...prev,
        [roleId]: new Set((data ?? []).map(r => r.widget_id)),
      }))
      setLoadingWidgets(null)
    }
    setExpandedWidgetsRoleId(roleId)
  }

  async function toggleWidget(roleId: string, widgetId: string) {
    const current = assignedWidgets[roleId] ?? new Set<string>()
    if (current.has(widgetId)) {
      // Remove
      await supabase
        .from('role_widgets')
        .delete()
        .eq('role_id', roleId)
        .eq('widget_id', widgetId)
      const next = new Set(current)
      next.delete(widgetId)
      setAssignedWidgets(prev => ({ ...prev, [roleId]: next }))
    } else {
      // Add
      const position = current.size
      await supabase
        .from('role_widgets')
        .insert({ role_id: roleId, widget_id: widgetId, position })
      const next = new Set(current)
      next.add(widgetId)
      setAssignedWidgets(prev => ({ ...prev, [roleId]: next }))
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Roles</span>
        <button
          onClick={() => setShowAddForm(v => !v)}
          className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
        >
          <Plus className="w-3.5 h-3.5" /> Add role
        </button>
      </div>

      {/* Add role form */}
      {showAddForm && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 space-y-2">
          <div className="flex gap-2">
            <select
              value={newRole.avatar_emoji}
              onChange={e => setNewRole(s => ({ ...s, avatar_emoji: e.target.value }))}
              className="rounded border border-gray-300 px-2 py-1 text-sm"
            >
              {EMOJI_OPTIONS.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
            <input
              value={newRole.title}
              onChange={e => setNewRole(s => ({ ...s, title: e.target.value }))}
              placeholder="Role title (e.g. Security Director)"
              className="flex-1 rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <textarea
            value={newRole.blurb}
            onChange={e => setNewRole(s => ({ ...s, blurb: e.target.value }))}
            placeholder="Short blurb describing this role's use case…"
            rows={2}
            className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowAddForm(false)} className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1">
              Cancel
            </button>
            <button
              onClick={addRole}
              disabled={!newRole.title.trim()}
              className="rounded bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Save Role
            </button>
          </div>
        </div>
      )}

      {/* Role list */}
      {roles.map(role => (
        <div key={role.id} className="rounded-lg border border-gray-200 bg-white overflow-hidden">
          {editingId === role.id ? (
            <div className="p-3 space-y-2">
              <div className="flex gap-2">
                <select
                  value={editState.avatar_emoji}
                  onChange={e => setEditState(s => ({ ...s, avatar_emoji: e.target.value }))}
                  className="rounded border border-gray-300 px-2 py-1 text-sm"
                >
                  {EMOJI_OPTIONS.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
                <input
                  value={editState.title}
                  onChange={e => setEditState(s => ({ ...s, title: e.target.value }))}
                  className="flex-1 rounded border border-blue-400 px-2 py-1 text-sm focus:outline-none"
                />
              </div>
              <textarea
                value={editState.blurb}
                onChange={e => setEditState(s => ({ ...s, blurb: e.target.value }))}
                rows={2}
                className="w-full rounded border border-blue-400 px-2 py-1 text-sm focus:outline-none"
              />
              <div className="flex gap-2 justify-end">
                <button onClick={() => setEditingId(null)} className="p-1 rounded text-gray-400 hover:text-gray-700">
                  <X className="w-4 h-4" />
                </button>
                <button onClick={() => saveEdit(role.id)} className="p-1 rounded text-green-600 hover:text-green-700">
                  <Check className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Role header row */}
              <div className="flex items-start gap-2 px-3 py-2">
                <span className="text-lg leading-none mt-0.5">{role.avatar_emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{role.title}</p>
                  {role.blurb && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{role.blurb}</p>}
                </div>
                <button
                  onClick={() => { setEditingId(role.id); setEditState({ title: role.title, blurb: role.blurb, avatar_emoji: role.avatar_emoji }) }}
                  className="p-1 text-gray-400 hover:text-gray-700"
                  title="Edit role"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => deleteRole(role.id)} className="p-1 text-gray-400 hover:text-red-600" title="Delete role">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Assign widgets toggle */}
              <button
                onClick={() => toggleWidgets(role.id)}
                className="w-full flex items-center gap-1.5 border-t border-gray-100 px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-50 hover:text-blue-600"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>
                  {assignedWidgets[role.id]
                    ? `${assignedWidgets[role.id].size} widget${assignedWidgets[role.id].size !== 1 ? 's' : ''} assigned`
                    : 'Assign widgets'}
                </span>
                {loadingWidgets === role.id
                  ? <span className="ml-auto text-gray-400">Loading…</span>
                  : expandedWidgetsRoleId === role.id
                    ? <ChevronDown className="w-3.5 h-3.5 ml-auto" />
                    : <ChevronRight className="w-3.5 h-3.5 ml-auto" />}
              </button>

              {/* Widget checklist */}
              {expandedWidgetsRoleId === role.id && assignedWidgets[role.id] && (
                <div className="border-t border-gray-100 bg-gray-50 px-3 py-2 space-y-1">
                  {allWidgets.length === 0 ? (
                    <p className="text-xs text-gray-400 py-1">No widgets yet — add some in the Widgets tab.</p>
                  ) : allWidgets.map(widget => {
                    const checked = assignedWidgets[role.id].has(widget.id)
                    return (
                      <label key={widget.id} className="flex items-center gap-2 cursor-pointer rounded px-1 py-1 hover:bg-gray-100">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleWidget(role.id, widget.id)}
                          className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-xs text-gray-700">{widget.name}</span>
                        {checked && (
                          <span className="ml-auto text-xs text-green-600 font-medium">✓</span>
                        )}
                      </label>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>
      ))}

      {roles.length === 0 && !showAddForm && (
        <p className="text-xs text-gray-400 text-center py-3">No roles yet.</p>
      )}
    </div>
  )
}
