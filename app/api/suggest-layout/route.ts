import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

export interface LayoutSuggestion {
  widgets: { x: number; y: number; w: number; h: number }[]
  roleOverlay: { x: number; y: number; w: number; h: number } | null
}

export async function POST(req: NextRequest) {
  const { frameUrl, widgetCount } = await req.json()

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 })
  }

  const client = new Anthropic({ apiKey })

  let imageContent: Anthropic.ImageBlockParam | null = null

  if (frameUrl) {
    const imgRes = await fetch(frameUrl)
    if (imgRes.ok) {
      const arrayBuffer = await imgRes.arrayBuffer()
      const base64 = Buffer.from(arrayBuffer).toString('base64')
      const mediaType = (imgRes.headers.get('content-type') ?? 'image/png') as
        | 'image/jpeg'
        | 'image/png'
        | 'image/gif'
        | 'image/webp'
      imageContent = {
        type: 'image',
        source: { type: 'base64', media_type: mediaType, data: base64 },
      }
    }
  }

  const prompt = frameUrl
    ? `This is a product dashboard screenshot used as a background frame. I need to overlay ${widgetCount} widget screenshot(s) on top of it.

Analyze the image and:
1. Find the main CONTENT AREA (the scrollable/widget region \u2014 excludes left sidebar nav, top navigation bar, tab bars, and other fixed chrome)
2. Suggest a grid layout for exactly ${widgetCount} widget(s) placed ONLY within the content area
3. Find any placeholder text like "ROLE HERE", "Role Here", "YOUR ROLE", "Title Here", "PERSONA NAME", "INSERT ROLE" etc. \u2014 look especially in tab bars and breadcrumb areas

${widgetCount > 1 ? `For ${widgetCount} widgets: use a grid. If they don't fit in one screen, extend below (y > 1.0 = second page, y > 2.0 = third page).` : ''}

Return ONLY valid JSON (no markdown, no explanation):
{
  "widgets": [
    { "x": 0.05, "y": 0.15, "w": 0.43, "h": 0.40 }
  ],
  "roleOverlay": { "x": 0.05, "y": 0.28, "w": 0.18, "h": 0.04 }
}

IMPORTANT coordinate rules:
- ALL values are fractions of the FULL IMAGE dimensions (0.0 = left/top edge, 1.0 = right/bottom edge)
- Widget x/y must be INSIDE the content area (past the left nav and top bar)
- Leave 0.01\u20130.02 gaps between widgets
- roleOverlay: exact bounding box of the placeholder tab/label text in the image, or null
- Widgets must NOT overlap the product sidebar, top nav, or tab bar`
    : `Suggest an optimal grid layout for ${widgetCount} dashboard widget(s) in a clean content area.

Return ONLY valid JSON:
{
  "widgets": [
    { "x": 0.0, "y": 0.0, "w": 0.45, "h": 0.45 }
  ],
  "roleOverlay": null
}

Rules:
- All values are 0.0\u20131.0 fractions (y can exceed 1.0 for rows on a second scroll page)
- Return exactly ${widgetCount} widget placement(s)
- Use the full content area efficiently
- Leave 0.01\u20130.02 gaps between widgets`

  const contentBlocks: Anthropic.ContentBlockParam[] = imageContent
    ? [imageContent, { type: 'text', text: prompt }]
    : [{ type: 'text', text: prompt }]

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [{ role: 'user', content: contentBlocks }],
  })

  const rawText = message.content[0].type === 'text' ? message.content[0].text : ''
  const jsonText = rawText.replace(/```(?:json)?\n?/g, '').trim()

  let suggestion: LayoutSuggestion = { widgets: [], roleOverlay: null }
  try {
    suggestion = JSON.parse(jsonText)
  } catch {
    console.error('Failed to parse layout suggestion:', rawText)
  }

  while (suggestion.widgets.length < widgetCount) {
    const i = suggestion.widgets.length
    suggestion.widgets.push({
      x: 0.01 + (i % 2) * 0.5,
      y: 0.01 + Math.floor(i / 2) * 0.5,
      w: 0.47,
      h: 0.47,
    })
  }
  suggestion.widgets = suggestion.widgets.slice(0, widgetCount)

  return NextResponse.json(suggestion)
}
