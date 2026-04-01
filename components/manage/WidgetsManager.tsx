'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import type { Widget } from '@/lib/supabase/types'
import { Plus, Trash2, Pencil, Upload, Eraser } from 'lucide-react'
import MaskEditor from './MaskEditor'

interface Props {
  initialWidgets: Widget[]
}

export default function WidgetsManager({ initialWidgets }: Props) {
  const supabase = createClient()
  const fileRef = useRef<HTMLInputElement>(null)

  const [widgets, setWidgets] = useState<Widget[]>(initialWidgets)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [maskingWidget, setMaskingWidget] = useState<Widget | null>(null)

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  async function saveWidget() {
    if (!name.trim()) return
    setSaving(true)

    let screenshot_url: string | null = null

    if (file) {
      const ext = file.name.split('.').pop()
      const path = `raw/${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('screenshots')
        .upload(path, file, { upsert: true })
      if (uploadError) { alert(uploadError.message); setSaving(false); return }
      const { data: { publicUrl } } = supabase.storage.from('screenshots').getPublicUrl(path)
      screenshot_url = publicUrl
    }

    const { data, error } = await supabase
      .from('widgets')
      .insert({ name: name.trim(), description: description.trim(), screenshot_url })
      .select()
      .single()

    setSaving(false)
    if (error) { alert(error.message); return }
    setWidgets([...widgets, data])
    setName(''); setDescription(''); setFile(null); setPreview(null)
    setShowForm(false)
  }

  async function deleteWidget(id: string) {
    if (!confirm('Delete this widget?')) return
    await supabase.from('widgets').delete().eq('id', id)
    setWidgets(widgets.filter(w => w.id !== id))
  }

  function onMaskSaved(widget: Widget, maskedUrl: string) {
    setWidgets(widgets.map(w => w.id === widget.id ? { ...w, masked_url: maskedUrl } : w))
    setMaskingWidget(null)
  }

  if (maskingWidget) {
    return (
      <MaskEditor
        widget={maskingWidget}
        onSave={(url) => onMaskSaved(maskingWidget, url)}
        onCancel={() => setMaskingWidget(null)}
      />
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" /> Add Widget
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-3">
          <h3 className="text-sm font-semibold text-gray-800">New Widget</h3>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Widget name"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Description (optional)"
            rows={2}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
            <button
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <Upload className="w-4 h-4" /> {file ? file.name : 'Upload screenshot'}
            </button>
            {preview && (
              <div className="mt-2 rounded-lg overflow-hidden border border-gray-200 w-48">
                <Image src={preview} alt="preview" width={192} height={108} className="object-cover" />
              </div>
            )}
          </div>

          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5">
              Cancel
            </button>
            <button
              onClick={saveWidget}
              disabled={saving || !name.trim()}
              className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save Widget'}
            </button>
          </div>
        </div>
      )}

      {/* Widget grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {widgets.map(widget => (
          <div key={widget.id} className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            {(widget.masked_url ?? widget.screenshot_url) ? (
              <div className="relative h-40 bg-gray-100">
                <Image
                  src={widget.masked_url ?? widget.screenshot_url!}
                  alt={widget.name}
                  fill
                  className="object-cover"
                />
                {widget.masked_url && (
                  <span className="absolute top-2 left-2 rounded bg-green-600 px-2 py-0.5 text-xs text-white font-medium">
                    Masked
                  </span>
                )}
              </div>
            ) : (
              <div className="h-40 bg-gray-100 flex items-center justify-center text-gray-400 text-sm">
                No screenshot
              </div>
            )}
            <div className="p-3">
              <p className="text-sm font-semibold text-gray-900">{widget.name}</p>
              {widget.description && (
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{widget.description}</p>
              )}
              <div className="flex gap-2 mt-3">
                {widget.screenshot_url && (
                  <button
                    onClick={() => setMaskingWidget(widget)}
                    className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-800"
                  >
                    <Eraser className="w-3.5 h-3.5" /> {widget.masked_url ? 'Re-mask' : 'Mask'}
                  </button>
                )}
                <button
                  onClick={() => deleteWidget(widget.id)}
                  className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 ml-auto"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </div>
            </div>
          </div>
        ))}

        {widgets.length === 0 && !showForm && (
          <p className="col-span-full text-sm text-gray-400 text-center py-12">
            No widgets yet. Add one to get started.
          </p>
        )}
      </div>
    </div>
  )
}
