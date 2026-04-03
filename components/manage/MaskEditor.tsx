'use client'

import { useRef, useState, useEffect } from 'react'
import { Stage, Layer, Image as KonvaImage, Rect, Text, Transformer } from 'react-konva'
import Konva from 'konva'
import { createClient } from '@/lib/supabase/client'
import type { Widget } from '@/lib/supabase/types'
import { Plus, Save, X, Trash2, Sparkles, Loader2 } from 'lucide-react'
import type { PiiItem } from '@/app/api/detect-pii/route'

interface MaskRect {
  id: string
  x: number
  y: number
  width: number
  height: number
  replacementText?: string
  bgColor?: string
}

interface Props {
  widget: Widget
  onSave: (maskedUrl: string) => void
  onCancel: () => void
}

export default function MaskEditor({ widget, onSave, onCancel }: Props) {
  const supabase = createClient()
  const stageRef = useRef<Konva.Stage>(null)
  const transformerRef = useRef<Konva.Transformer>(null)

  const [image, setImage] = useState<HTMLImageElement | null>(null)
  const [imgSize, setImgSize] = useState({ w: 800, h: 450 })
  const [masks, setMasks] = useState<MaskRect[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [drawStart, setDrawStart] = useState({ x: 0, y: 0 })
  const [saving, setSaving] = useState(false)
  const [detecting, setDetecting] = useState(false)
  const [detectError, setDetectError] = useState<string | null>(null)

  useEffect(() => {
    if (!widget.screenshot_url) return
    const img = new window.Image()
    img.crossOrigin = 'anonymous'
    img.src = widget.screenshot_url
    img.onload = () => {
      const maxW = 800
      const scale = img.width > maxW ? maxW / img.width : 1
      setImgSize({ w: img.width * scale, h: img.height * scale })
      setImage(img)
    }
  }, [widget.screenshot_url])

  function addMask() {
    const id = `mask-${Date.now()}`
    setMasks(prev => [...prev, { id, x: 50, y: 50, width: 120, height: 30 }])
    setSelectedId(id)
  }

  function deleteMask(id: string) {
    setMasks(prev => prev.filter(m => m.id !== id))
    if (selectedId === id) setSelectedId(null)
  }

  async function handleAiDetect() {
    if (!widget.screenshot_url) return
    setDetecting(true)
    setDetectError(null)

    try {
      const res = await fetch('/api/detect-pii', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: widget.screenshot_url }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Detection failed')

      const items: PiiItem[] = data.items ?? []
      if (items.length === 0) {
        setDetectError('No PII detected in this screenshot.')
        return
      }

      const PAD = 3
      const newMasks: MaskRect[] = items.map((item, i) => {
        const px = item.x * imgSize.w - PAD
        const py = item.y * imgSize.h - PAD
        const pw = item.w * imgSize.w + PAD * 2
        const ph = item.h * imgSize.h + PAD * 2

        return {
          id: `ai-${Date.now()}-${i}`,
          x: Math.max(0, px),
          y: Math.max(0, py),
          width: Math.max(pw, 24),
          height: Math.max(ph, 18),
          replacementText: item.replacement,
          bgColor: '#ffffff',
        }
      })

      setMasks(prev => [...prev, ...newMasks])
    } catch (err) {
      setDetectError(err instanceof Error ? err.message : 'Detection failed')
    } finally {
      setDetecting(false)
    }
  }

  function onMouseDown(e: Konva.KonvaEventObject<MouseEvent>) {
    if (e.target === e.target.getStage() || e.target.attrs.id === 'bg-image') {
      const pos = e.target.getStage()!.getPointerPosition()!
      setIsDrawing(true)
      setDrawStart(pos)
      setSelectedId(null)
    }
  }

  function onMouseMove(e: Konva.KonvaEventObject<MouseEvent>) {
    if (!isDrawing) return
    const pos = e.target.getStage()!.getPointerPosition()!
    setMasks(prev => {
      const last = prev[prev.length - 1]
      if (!last || !last.id.startsWith('draw-')) {
        return [...prev, {
          id: `draw-${Date.now()}`,
          x: Math.min(drawStart.x, pos.x),
          y: Math.min(drawStart.y, pos.y),
          width: Math.abs(pos.x - drawStart.x),
          height: Math.abs(pos.y - drawStart.y),
        }]
      }
      return prev.map((m, i) => i === prev.length - 1 ? {
        ...m,
        x: Math.min(drawStart.x, pos.x),
        y: Math.min(drawStart.y, pos.y),
        width: Math.abs(pos.x - drawStart.x),
        height: Math.abs(pos.y - drawStart.y),
      } : m)
    })
  }

  function onMouseUp() {
    setIsDrawing(false)
    setMasks(prev => prev.map(m =>
      m.id.startsWith('draw-')
        ? { ...m, id: `mask-${Date.now()}` }
        : m
    ))
  }

  async function handleSave() {
    if (!stageRef.current) return
    setSaving(true)

    const dataUrl = stageRef.current.toDataURL({ pixelRatio: 2 })
    const res = await fetch(dataUrl)
    const blob = await res.blob()

    const path = `masked/${widget.id}-${Date.now()}.png`
    const { error: uploadError } = await supabase.storage
      .from('screenshots')
      .upload(path, blob, { contentType: 'image/png', upsert: true })

    if (uploadError) { alert(uploadError.message); setSaving(false); return }

    const { data: { publicUrl } } = supabase.storage.from('screenshots').getPublicUrl(path)

    await supabase.from('widgets').update({ masked_url: publicUrl }).eq('id', widget.id)

    setSaving(false)
    onSave(publicUrl)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Mask Editor</h2>
          <p className="text-sm text-gray-500">Anonymize sensitive data in <strong>{widget.name}</strong></p>
        </div>
        <div className="flex flex-wrap gap-2 justify-end">
          <button
            onClick={handleAiDetect}
            disabled={detecting || !widget.screenshot_url}
            className="flex items-center gap-1.5 rounded-lg border border-purple-200 bg-purple-50 px-3 py-2 text-sm text-purple-700 hover:bg-purple-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {detecting
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Sparkles className="w-4 h-4" />}
            {detecting ? 'Detecting…' : 'AI Detect PII'}
          </button>
          <button onClick={addMask} className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm hover:bg-gray-50">
            <Plus className="w-4 h-4" /> Add mask
          </button>
          {selectedId && (
            <button onClick={() => deleteMask(selectedId)} className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 hover:bg-red-100">
              <Trash2 className="w-4 h-4" /> Remove
            </button>
          )}
          <button onClick={onCancel} className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm hover:bg-gray-50">
            <X className="w-4 h-4" /> Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            <Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save Masked'}
          </button>
        </div>
      </div>

      {detectError && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-2 text-sm text-amber-700">
          {detectError}
        </div>
      )}

      <p className="text-xs text-gray-400">
        Click <strong>AI Detect PII</strong> to auto-detect names, dates, emails and replace them with anonymized data.
        Or draw boxes manually by dragging on the image.
        <span className="ml-2 inline-flex items-center gap-1"><span className="inline-block w-3 h-3 bg-black rounded-sm" /> = redacted</span>
        <span className="ml-2 inline-flex items-center gap-1"><span className="inline-block w-3 h-3 bg-gray-200 border border-gray-300 rounded-sm" /> = AI replaced</span>
      </p>

      <div className="rounded-xl border border-gray-200 overflow-auto bg-gray-100 p-2">
        {image ? (
          <Stage
            ref={stageRef}
            width={imgSize.w}
            height={imgSize.h}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            style={{ cursor: 'crosshair' }}
          >
            <Layer>
              <KonvaImage
                id="bg-image"
                image={image}
                width={imgSize.w}
                height={imgSize.h}
              />
              {masks.map(mask => {
                const fontSize = Math.max(9, Math.round(mask.height * 0.55))
                return mask.replacementText ? (
                  <>
                    <Rect
                      key={`${mask.id}-bg`}
                      id={mask.id}
                      x={mask.x}
                      y={mask.y}
                      width={mask.width}
                      height={mask.height}
                      fill={mask.bgColor ?? '#ffffff'}
                      stroke={selectedId === mask.id ? '#8b5cf6' : 'transparent'}
                      strokeWidth={selectedId === mask.id ? 2 : 0}
                      draggable
                      onClick={() => setSelectedId(mask.id)}
                      onTap={() => setSelectedId(mask.id)}
                      onDragEnd={e => {
                        setMasks(prev => prev.map(m =>
                          m.id === mask.id ? { ...m, x: e.target.x(), y: e.target.y() } : m
                        ))
                      }}
                    />
                    <Text
                      key={`${mask.id}-text`}
                      x={mask.x + 2}
                      y={mask.y + (mask.height - fontSize) / 2}
                      width={mask.width - 4}
                      text={mask.replacementText}
                      fontSize={fontSize}
                      fill="#1f2937"
                      listening={false}
                      ellipsis
                    />
                  </>
                ) : (
                  <Rect
                    key={mask.id}
                    id={mask.id}
                    x={mask.x}
                    y={mask.y}
                    width={mask.width}
                    height={mask.height}
                    fill="black"
                    draggable
                    onClick={() => setSelectedId(mask.id)}
                    onTap={() => setSelectedId(mask.id)}
                    onDragEnd={e => {
                      setMasks(prev => prev.map(m =>
                        m.id === mask.id ? { ...m, x: e.target.x(), y: e.target.y() } : m
                      ))
                    }}
                    stroke={selectedId === mask.id ? '#3b82f6' : undefined}
                    strokeWidth={selectedId === mask.id ? 2 : 0}
                  />
                )
              })}
              <Transformer
                ref={transformerRef}
                boundBoxFunc={(oldBox, newBox) => newBox}
              />
            </Layer>
          </Stage>
        ) : (
          <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
            {widget.screenshot_url ? 'Loading image…' : 'No screenshot uploaded for this widget.'}
          </div>
        )}
      </div>
    </div>
  )
}
