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
    ? `This is a product dashboard screenshot that will be used as a frame/background. I need to overlay ${widgetCount} widget screenshot(s) on top of it.

Analyze the image and:
1. Identify the main CONTENT AREA where dashboard widgets/panels would go (avoid the sidebar nav, top bar, and any fixed chrome UI)
2. Suggest an optimal grid layout for exactly ${widgetCount} widget(s) within that content area
3. Look for any placeholder text like "Role Here", "YOUR ROLE", "Title Here", "PERSONA", "INSERT NAME", etc.

${widgetCount > 1 ? `For ${widgetCount} widgets: arrange in a grid. If they don't all fit in one screen height, let rows continue below (y values can exceed 1.0 — values from 1.0–2.0 represent the second scroll page, 2.0–3.0 the third, etc.).` : ''}

Return ONLY valid JSON (no markdown):
{
  "widgets": [
    { "x": 0.0, "y": 0.0, "w": 0.45, "h": 0.45 }
  ],
  "roleOverlay": { "x": 0.0, "y": 0.0, "w": 0.3, "h": 0.08 }
}

Rules:
- All values are fractions of the CONTENT AREA dimensions (0.0 to 1.0 per screen height)
- Return exactly ${widgetCount} widget placement(s)
- Leave small gaps between widgets (0.01–0.02)
- roleOverlay is the bounding box of the role/persona placeholder text, or null if none found
- Widgets should NOT overlap the product's own nav/sidebar/header UI elements`
    : `Suggest an optimal grid layout for ${widgetCount} dashboard widget(s) in a clean content area.

Return ONLY valid JSON:
{
  "widgets": [
    { "x": 0.0, "y": 0.0, "w": 0.45, "h": 0.45 }
  ],
  "roleOverlay": null
}

Rules:
- All values are 0.0–1.0 fractions (y can exceed 1.0 for rows on a second scroll page)
- Return exactly ${widgetCount} widget placement(s)
- Use the full content area efficiently
- Leave 0.01–0.02 gaps between widgets`

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

  // Ensure we have exactly widgetCount entries
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
