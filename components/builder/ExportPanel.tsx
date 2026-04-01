'use client'

import { useState } from 'react'
import { useBuilderStore } from '@/store/builderStore'
import { Download, ChevronDown } from 'lucide-react'

export default function ExportPanel() {
  const { selectedRole, selectedVertical, widgets, layout, branding, setIsExporting } = useBuilderStore()
  const [open, setOpen] = useState(false)
  const [exporting, setExporting] = useState<'pptx' | 'pdf' | null>(null)

  async function exportPDF() {
    setExporting('pdf')
    setIsExporting(true)
    setOpen(false)

    // Dynamic import to avoid SSR issues
    const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
      import('jspdf'),
      import('html2canvas'),
    ])

    const canvas = document.getElementById('dashboard-canvas')
    if (!canvas) { setExporting(null); setIsExporting(false); return }

    const canvasEl = await html2canvas(canvas as HTMLElement, { scale: 2, useCORS: true })
    const imgData = canvasEl.toDataURL('image/png')

    const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [canvasEl.width / 2, canvasEl.height / 2] })
    pdf.addImage(imgData, 'PNG', 0, 0, canvasEl.width / 2, canvasEl.height / 2)

    const filename = `${selectedVertical?.slug ?? 'dashboard'}-${selectedRole?.title?.toLowerCase().replace(/\s+/g, '-') ?? 'role'}.pdf`
    pdf.save(filename)

    setExporting(null)
    setIsExporting(false)
  }

  async function exportPPTX() {
    setExporting('pptx')
    setIsExporting(true)
    setOpen(false)

    const [{ default: PptxGenJS }, { default: html2canvas }] = await Promise.all([
      import('pptxgenjs'),
      import('html2canvas'),
    ])

    const canvas = document.getElementById('dashboard-canvas')
    if (!canvas) { setExporting(null); setIsExporting(false); return }

    const canvasEl = await html2canvas(canvas as HTMLElement, { scale: 2, useCORS: true })
    const imgData = canvasEl.toDataURL('image/png')

    const pptx = new PptxGenJS()
    pptx.layout = 'LAYOUT_WIDE'

    const slide = pptx.addSlide()

    // Sidebar
    const primary = branding?.primary_color ?? '#1a56db'
    const accent = branding?.accent_color ?? '#e3a008'
    const font = branding?.font_family ?? 'Inter'

    slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 2.4, h: 7.5, fill: { color: primary.replace('#', '') } })

    if (selectedVertical?.name) {
      slide.addText(selectedVertical.name.toUpperCase(), {
        x: 0.2, y: 5.5, w: 2, h: 0.35,
        fontSize: 8, bold: true, color: 'FFFFFF', fontFace: font, valign: 'middle',
      })
    }

    if (selectedRole) {
      slide.addText(`${selectedRole.avatar_emoji} ${selectedRole.title}`, {
        x: 0.2, y: 5.9, w: 2, h: 0.6,
        fontSize: 14, bold: true, color: 'FFFFFF', fontFace: font, valign: 'middle', wrap: true,
      })
      if (selectedRole.blurb) {
        slide.addText(selectedRole.blurb, {
          x: 0.2, y: 6.55, w: 2, h: 0.7,
          fontSize: 9, color: 'FFFFFFAA', fontFace: font, valign: 'top', wrap: true,
        })
      }
    }

    // Accent bar
    slide.addShape(pptx.ShapeType.rect, { x: 0.2, y: 7.2, w: 0.8, h: 0.08, fill: { color: accent.replace('#', '') } })

    // Dashboard screenshot (main panel)
    slide.addImage({ data: imgData, x: 2.5, y: 0.2, w: 10.3, h: 7.1 })

    const filename = `${selectedVertical?.slug ?? 'dashboard'}-${selectedRole?.title?.toLowerCase().replace(/\s+/g, '-') ?? 'role'}.pptx`
    await pptx.writeFile({ fileName: filename })

    setExporting(null)
    setIsExporting(false)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        disabled={!!exporting}
        className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
      >
        <Download className="w-4 h-4" />
        {exporting ? `Exporting ${exporting.toUpperCase()}…` : 'Export'}
        <ChevronDown className="w-3.5 h-3.5" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-40 rounded-xl border border-gray-200 bg-white shadow-lg z-50 overflow-hidden">
          <button
            onClick={exportPDF}
            className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            Export as PDF
          </button>
          <button
            onClick={exportPPTX}
            className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            Export as .pptx
          </button>
        </div>
      )}
    </div>
  )
}
