'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Role } from '@/lib/supabase/types'
import { Plus, Trash2, Pencil, Check, X } from 'lucide-react'

const EMOJI_OPTIONS = ['👤', '🏢', '🔒', '📊', '💼', '🛡️', '🔑', '📋', '🏗️', '⚙️']

interface Props {
  verticalId: string
  initialRoles: Role[]
  onRolesChange: (roles: Role[]) => void
}

interface EditState {
  title: string
  blurb: string
  avatar_emoji: string
}

export default function RolesManager({ verticalId, initialRoles, onRolesChange }: Props) {
  const supabase = createClient()
  const [roles, setRoles] = useState<Role[]>(initialRoles)
  const [newRole, setNewRole] = useState<EditState>({ title: '', blurb: '', avatar_emoji: '👤' })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editState, setEditState] = useState<EditState>({ title: '', blurb: '', avatar_emoji: '👤' })
  const [showAddForm, setShowAddForm] = useState(false)

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
        <div key={role.id} className="rounded-lg border border-gray-200 bg-white px-3 py-2">
          {editingId === role.id ? (
            <div className="space-y-2">
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
            <div className="flex items-start gap-2">
              <span className="text-lg leading-none mt-0.5">{role.avatar_emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{role.title}</p>
                {role.blurb && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{role.blurb}</p>}
              </div>
              <button
                onClick={() => { setEditingId(role.id); setEditState({ title: role.title, blurb: role.blurb, avatar_emoji: role.avatar_emoji }) }}
                className="p-1 text-gray-400 hover:text-gray-700"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => deleteRole(role.id)} className="p-1 text-gray-400 hover:text-red-600">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      ))}

      {roles.length === 0 && !showAddForm && (
        <p className="text-xs text-gray-400 text-center py-3">No roles yet.</p>
      )}
    </div>
  )
}
