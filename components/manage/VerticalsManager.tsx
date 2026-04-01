'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { VerticalWithRoles } from '@/lib/supabase/types'
import { Plus, ChevronDown, ChevronRight, Trash2, Pencil } from 'lucide-react'
import RolesManager from './RolesManager'

interface Props {
  initialVerticals: VerticalWithRoles[]
}

function slugify(str: string) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

export default function VerticalsManager({ initialVerticals }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [verticals, setVerticals] = useState<VerticalWithRoles[]>(initialVerticals)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  async function addVertical() {
    if (!newName.trim()) return
    setSaving(true)
    const { data, error } = await supabase
      .from('verticals')
      .insert({ name: newName.trim(), slug: slugify(newName.trim()) })
      .select('*, roles(*)')
      .single()
    setSaving(false)
    if (error) { alert(error.message); return }
    setVerticals([...verticals, data])
    setNewName('')
  }

  async function deleteVertical(id: string) {
    if (!confirm('Delete this vertical and all its roles?')) return
    const { error } = await supabase.from('verticals').delete().eq('id', id)
    if (error) { alert(error.message); return }
    setVerticals(verticals.filter(v => v.id !== id))
    router.refresh()
  }

  async function saveEdit(id: string) {
    const { error } = await supabase
      .from('verticals')
      .update({ name: editName.trim(), slug: slugify(editName.trim()) })
      .eq('id', id)
    if (error) { alert(error.message); return }
    setVerticals(verticals.map(v => v.id === id ? { ...v, name: editName.trim() } : v))
    setEditingId(null)
  }

  return (
    <div className="space-y-4">
      {/* Add new vertical */}
      <div className="flex gap-2">
        <input
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addVertical()}
          placeholder="New vertical name (e.g. CRE)"
          className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={addVertical}
          disabled={saving || !newName.trim()}
          className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          <Plus className="w-4 h-4" /> Add
        </button>
      </div>

      {/* Vertical list */}
      <div className="space-y-2">
        {verticals.map(vertical => (
          <div key={vertical.id} className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            {/* Header row */}
            <div className="flex items-center gap-3 px-4 py-3">
              <button
                onClick={() => setExpandedId(expandedId === vertical.id ? null : vertical.id)}
                className="text-gray-400 hover:text-gray-600"
              >
                {expandedId === vertical.id
                  ? <ChevronDown className="w-4 h-4" />
                  : <ChevronRight className="w-4 h-4" />}
              </button>

              {editingId === vertical.id ? (
                <input
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') saveEdit(vertical.id)
                    if (e.key === 'Escape') setEditingId(null)
                  }}
                  onBlur={() => saveEdit(vertical.id)}
                  autoFocus
                  className="flex-1 rounded border border-blue-400 px-2 py-0.5 text-sm focus:outline-none"
                />
              ) : (
                <span className="flex-1 text-sm font-semibold text-gray-900">{vertical.name}</span>
              )}

              <span className="text-xs text-gray-400">{vertical.roles?.length ?? 0} roles</span>

              <button
                onClick={() => { setEditingId(vertical.id); setEditName(vertical.name) }}
                className="p-1 rounded text-gray-400 hover:text-gray-700"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => deleteVertical(vertical.id)}
                className="p-1 rounded text-gray-400 hover:text-red-600"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Expanded roles */}
            {expandedId === vertical.id && (
              <div className="border-t border-gray-100 bg-gray-50 px-4 py-3">
                <RolesManager
                  verticalId={vertical.id}
                  initialRoles={vertical.roles ?? []}
                  onRolesChange={roles =>
                    setVerticals(verticals.map(v =>
                      v.id === vertical.id ? { ...v, roles } : v
                    ))
                  }
                />
              </div>
            )}
          </div>
        ))}

        {verticals.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-8">No verticals yet. Add one above.</p>
        )}
      </div>
    </div>
  )
}
