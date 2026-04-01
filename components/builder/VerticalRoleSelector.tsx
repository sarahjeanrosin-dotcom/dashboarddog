'use client'

import { useBuilderStore } from '@/store/builderStore'
import type { VerticalWithRoles } from '@/lib/supabase/types'

interface Props {
  verticals: VerticalWithRoles[]
}

export default function VerticalRoleSelector({ verticals }: Props) {
  const { selectedVertical, selectedRole, setSelectedVertical, setSelectedRole } = useBuilderStore()

  const roles = verticals.find(v => v.id === selectedVertical?.id)?.roles ?? []

  return (
    <div className="flex items-center gap-4 flex-wrap">
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Vertical</label>
        <select
          value={selectedVertical?.id ?? ''}
          onChange={e => {
            const v = verticals.find(v => v.id === e.target.value) ?? null
            setSelectedVertical(v)
          }}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[160px]"
        >
          <option value="">Select vertical…</option>
          {verticals.map(v => (
            <option key={v.id} value={v.id}>{v.name}</option>
          ))}
        </select>
      </div>

      {selectedVertical && (
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Role</label>
          <select
            value={selectedRole?.id ?? ''}
            onChange={e => {
              const r = roles.find(r => r.id === e.target.value) ?? null
              setSelectedRole(r)
            }}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[200px]"
          >
            <option value="">Select role…</option>
            {roles.map(r => (
              <option key={r.id} value={r.id}>{r.avatar_emoji} {r.title}</option>
            ))}
          </select>
        </div>
      )}

      {selectedRole && (
        <div className="ml-auto flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2">
          <span className="text-2xl">{selectedRole.avatar_emoji}</span>
          <div>
            <p className="text-sm font-semibold text-gray-900">{selectedRole.title}</p>
            {selectedRole.blurb && (
              <p className="text-xs text-gray-500 max-w-xs line-clamp-1">{selectedRole.blurb}</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
