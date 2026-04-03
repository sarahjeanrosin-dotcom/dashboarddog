'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import type { Branding } from '@/lib/supabase/types'
import { Upload, Save } from 'lucide-react'

const FONT_OPTIONS = [
  'Inter', 'Roboto', 'Open Sans', 'Lato', 'Montserrat',
  'Poppins', 'Raleway', 'Source Sans Pro', 'Nunito', 'Playfair Display',
]

const BRANDING_ID = '00000000-0000-0000-0000-000000000001'

function loadGoogleFont(fontFamily: string) {
  const id = `gfont-${fontFamily.replace(/\s+/g, '-')}`
  if (document.getElementById(id)) return
  const link = document.createElement('link')
  link.id = id
  link.rel = 'stylesheet'
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontFamily)}:wght@400;600;700&display=swap`
  document.head.appendChild(link)
}

interface Props {
  branding: Branding & { frame_url?: string | null } | null
}

export default function BrandingEditor({ branding }: Props) {
  const supabase = createClient()
  const logoRef = useRef<HTMLInputElement>(null)
  const frameRef = useRef<HTMLInputElement>(null)

  const [primary, setPrimary] = useState(branding?.primary_color ?? '#1a56db')
  const [accent, setAccent] = useState(branding?.accent_color ?? '#e3a008')
  const [font, setFont] = useState(branding?.font_family ?? 'Inter')
  const [logoUrl, setLogoUrl] = useState(branding?.logo_url ?? null)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [frameUrl, setFrameUrl] = useState<string | null>(branding?.frame_url ?? null)
  const [frameFile, setFrameFile] = useState<File | null>(null)
  const [framePreview, setFramePreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Load the current font on mount
  useEffect(() => { loadGoogleFont(font) }, [])

  // Load font whenever selection changes and apply it to preview immediately
  function handleFontChange(f: string) {
    setFont(f)
    loadGoogleFont(f)
  }

  function onLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setLogoFile(f)
    setLogoPreview(URL.createObjectURL(f))
  }

  function onFrameChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setFrameFile(f)
    setFramePreview(URL.createObjectURL(f))
  }

  async function uploadToLogos(file: File, path: string) {
    const { error } = await supabase.storage.from('logos').upload(path, file, { upsert: true })
    if (error) throw error
    const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(path)
    return publicUrl
  }

  async function handleSave() {
    setSaving(true)
    try {
      let newLogoUrl = logoUrl
      let newFrameUrl = frameUrl

      if (logoFile) {
        const ext = logoFile.name.split('.').pop()
        newLogoUrl = await uploadToLogos(logoFile, `logo.${ext}`)
        setLogoUrl(newLogoUrl)
      }

      if (frameFile) {
        const ext = frameFile.name.split('.').pop()
        newFrameUrl = await uploadToLogos(frameFile, `frame.${ext}`)
        setFrameUrl(newFrameUrl)
      }

      const { error } = await supabase.from('branding').upsert({
        id: BRANDING_ID,
        primary_color: primary,
        accent_color: accent,
        font_family: font,
        logo_url: newLogoUrl,
        frame_url: newFrameUrl,
        updated_at: new Date().toISOString(),
      })

      if (error) { alert(error.message); return }

      document.documentElement.style.setProperty('--brand-primary', primary)
      document.documentElement.style.setProperty('--brand-accent', accent)
      document.documentElement.style.setProperty('--brand-font', font)

      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-lg space-y-6">
      {/* Logo */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Logo</label>
        <div className="flex items-center gap-4">
          {(logoPreview ?? logoUrl) && (
            <div className="relative h-16 w-32 rounded-lg border border-gray-200 bg-gray-50 overflow-hidden">
              <Image src={logoPreview ?? logoUrl!} alt="logo" fill className="object-contain p-2" />
            </div>
          )}
          <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={onLogoChange} />
          <button
            onClick={() => logoRef.current?.click()}
            className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            <Upload className="w-4 h-4" /> {logoUrl ? 'Replace logo' : 'Upload logo'}
          </button>
        </div>
      </div>

      {/* Dashboard frame image */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Dashboard frame image</label>
        <p className="text-xs text-gray-400 mb-2">
          Upload a screenshot of your product&apos;s empty dashboard shell (top nav, sidebar chrome). Widgets will be overlaid on top.
        </p>
        <div className="flex items-start gap-4">
          {(framePreview ?? frameUrl) && (
            <div className="relative h-24 w-48 rounded-lg border border-gray-200 bg-gray-50 overflow-hidden shrink-0">
              <Image src={framePreview ?? frameUrl!} alt="frame" fill className="object-cover" />
            </div>
          )}
          <input ref={frameRef} type="file" accept="image/*" className="hidden" onChange={onFrameChange} />
          <button
            onClick={() => frameRef.current?.click()}
            className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            <Upload className="w-4 h-4" /> {frameUrl ? 'Replace frame' : 'Upload frame'}
          </button>
        </div>
      </div>

      {/* Colors */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Primary color</label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={primary}
              onChange={e => setPrimary(e.target.value)}
              className="h-10 w-10 rounded cursor-pointer border border-gray-300"
            />
            <input
              type="text"
              value={primary}
              onChange={e => setPrimary(e.target.value)}
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Accent color</label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={accent}
              onChange={e => setAccent(e.target.value)}
              className="h-10 w-10 rounded cursor-pointer border border-gray-300"
            />
            <input
              type="text"
              value={accent}
              onChange={e => setAccent(e.target.value)}
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Font */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Font family</label>
        <select
          value={font}
          onChange={e => handleFontChange(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          style={{ fontFamily: font }}
        >
          {FONT_OPTIONS.map(f => (
            <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>
          ))}
        </select>
      </div>

      {/* Preview */}
      <div
        className="rounded-xl p-5 text-white"
        style={{ backgroundColor: primary, fontFamily: font }}
      >
        <p className="text-lg font-bold">Preview</p>
        <p className="text-sm opacity-80 mt-1">This is how your branding will look in exports.</p>
        <span
          className="mt-3 inline-block rounded px-3 py-1 text-sm font-semibold"
          style={{ backgroundColor: accent, color: '#000' }}
        >
          Accent button
        </span>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
      >
        <Save className="w-4 h-4" />
        {saving ? 'Saving…' : saved ? 'Saved!' : 'Save Branding'}
      </button>
    </div>
  )
}
