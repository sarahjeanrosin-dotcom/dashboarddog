'use client'

import { useState } from 'react'
import { useBuilderStore } from '@/store/builderStore'
import { Download, ChevronDown } from 'lucide-react'

export default function ExportPanel() {
  const { selectedRole, selectedVertical, layout, branding, setIsExporting } = useBuilderStore()
  const [open, setOpen] = useState(false)
  const [exporting, setExporting] = useState<'pptx' | 'pdf' | null>(null)

  const primary = branding?.primary_color ?? '#1a56db'
  const accent = branding?.accent_color ?? '#e3a008'
  const font = branding?.font_family ?? 'Inter'
  const filename = `${selectedVertical?.slug ?? 'dashboard'}-${selectedRole?.title?.toLowerCase().replace(/\s+/g, '-') ?? 'role'}`

  // How many slides worth of content do we have?
  function getPageCount() {
    const maxBottom = layout.reduce((max, item) => Math.max(max, item.y + item.h), 1)
    return Math.ceil(maxBottom)
  }

  async function exportPDF() {
    setExporting('pdf')
    setIsExporting(true)
    setOpen(false)

    const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
      import('jspdf'),
      import('html2canvas'),
    ])

    const canvasEl = document.getElementById('dashboard-canvas')
    if (!canvasEl) { setExporting(null); setIsExporting(false); return }

    // Temporarily show full scroll content for capture
    const rightPanel = document.getElementById('right-panel')
    const originalOverflow = rightPanel?.style.overflowY ?? ''
    const originalScrollTop = rightPanel?.scrollTop ?? 0
    if (rightPanel) { rightPanel.style.overflowY = 'visible'; rightPanel.scrollTop = 0 }

    await new Promise(r => setTimeout(r, 100))
    const screenshotEl = await html2canvas(canvasEl as HTMLElement, { scale: 2, useCORS: true })

    if (rightPanel) { rightPanel.style.overflowY = originalOverflow; rightPanel.scrollTop = originalScrollTop }

    const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [screenshotEl.width / 2, screenshotEl.height / 2] })
    pdf.addImage(screenshotEl.toDataURL('image/png'), 'PNG', 0, 0, screenshotEl.width / 2, screenshotEl.height / 2)
    pdf.save(`${filename}.pdf`)

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

    const canvasEl = document.getElementById('dashboard-canvas')
    const rightPanel = document.getElementById('right-panel')
    if (!canvasEl || !rightPanel) { setExporting(null); setIsExporting(false); return }

    const pptx = new PptxGenJS()
    pptx.layout = 'LAYOUT_WIDE' // 13.33" x 7.5"

    const pageCount = getPageCount()
    const onePageHeight = rightPanel.clientHeight

    for (let page = 0; page < pageCount; page++) {
      // Scroll to the right position
      rightPanel.scrollTop = page * onePageHeight
      await new Promise(r => setTimeout(r, 80))

      const screenshotEl = await html2canvas(canvasEl as HTMLElement, { scale: 2, useCORS: true })
      const imgData = screenshotEl.toDataURL('image/png')

      const slide = pptx.addSlide()

      // Branded left sidebar
      slide.addShape(pptx.ShapeType.rect, {
        x: 0, y: 0, w: 2.4, h: 7.5,
        fill: { color: primary.replace('#', '') },
      })

      if (branding?.logo_url) {
        try {
          slide.addImage({ path: branding.logo_url, x: 0.2, y: 0.3, w: 1.8, h: 0.6 })
        } catch { /* ignore logo errors */ }
      }

      if (selectedVertical?.name) {
        slide.addText(selectedVertical.name.toUpperCase(), {
          x: 0.2, y: 5.3, w: 2, h: 0.35,
          fontSize: 8, bold: true, color: 'FFFFFF', fontFace: font,
        })
      }
      if (selectedRole) {
        slide.addText(`${selectedRole.avatar_emoji} ${selectedRole.title}`, {
          x: 0.2, y: 5.7, w: 2, h: 0.6,
          fontSize: 13, bold: true, color: 'FFFFFF', fontFace: font, wrap: true,
        })
        if (selectedRole.blurb) {
          slide.addText(selectedRole.blurb, {
            x: 0.2, y: 6.35, w: 2, h: 0.8,
            fontSize: 9, color: 'FFFFFFAA', fontFace: font, wrap: true,
          })
        }
      }
      slide.addShape(pptx.ShapeType.rect, {
        x: 0.2, y: 7.2, w: 0.8, h: 0.08,
        fill: { color: accent.replace('#', '') },
      })

      // Page indicator (if multi-page)
      if (pageCount > 1) {
        slide.addText(`${page + 1} / ${pageCount}`, {
          x: 11.5, y: 7.1, w: 1.5, h: 0.3,
          fontSize: 9, color: '999999', align: 'right',
        })
      }

      // Full dashboard screenshot (fills the whole slide including sidebar)
      slide.addImage({ data: imgData, x: 0, y: 0, w: 13.33, h: 7.5 })
    }

    // Reset scroll
    rightPanel.scrollTop = 0

    await pptx.writeFile({ fileName: `${filename}.pptx` })
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
        <div className="absolute right-0 top-full mt-1 w-48 rounded-xl border border-gray-200 bg-white shadow-lg z-50 overflow-hidden">
          <button onClick={exportPDF} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
            Export as PDF
          </button>
          <button onClick={exportPPTX} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
            Export as .pptx
            {getPageCount() > 1 && (
              <span className="ml-1.5 text-xs text-purple-600">({getPageCount()} slides)</span>
            )}
          </button>
        </div>
      )}
    </div>
  )
}
