import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

export interface PiiItem {
  type: 'name' | 'email' | 'phone' | 'date' | 'time' | 'company' | 'other'
  original: string
  replacement: string
  x: number  // 0–1 fraction of image width
  y: number  // 0–1 fraction of image height
  w: number
  h: number
}

export async function POST(req: NextRequest) {
  const { imageUrl } = await req.json()

  if (!imageUrl) {
    return NextResponse.json({ error: 'imageUrl required' }, { status: 400 })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 })
  }

  // Fetch the image and convert to base64
  const imgRes = await fetch(imageUrl)
  if (!imgRes.ok) {
    return NextResponse.json({ error: 'Failed to fetch image' }, { status: 400 })
  }
  const arrayBuffer = await imgRes.arrayBuffer()
  const base64 = Buffer.from(arrayBuffer).toString('base64')
  const mediaType = (imgRes.headers.get('content-type') ?? 'image/png') as
    | 'image/jpeg'
    | 'image/png'
    | 'image/gif'
    | 'image/webp'

  const client = new Anthropic({ apiKey })

  const prompt = `Analyze this dashboard screenshot and identify all personally identifiable information (PII) visible in the image. Look for:
- Person names (first, last, or full names)
- Email addresses
- Phone numbers
- Dates (any format, e.g. "January 15, 2024", "01/15/24", "2024-01-15")
- Times (e.g. "3:45 PM", "14:30")
- Job titles when paired with a specific person
- Company/client names that appear to be customer data
- Any other sensitive identifiers

For each PII item found, estimate its bounding box position in the image.

Return ONLY a valid JSON array (no markdown, no explanation) where each element has:
{
  "type": "name" | "email" | "phone" | "date" | "time" | "company" | "other",
  "original": "exact text as it appears",
  "replacement": "realistic anonymized replacement text of similar length",
  "x": <left edge as 0.0–1.0 fraction of image width>,
  "y": <top edge as 0.0–1.0 fraction of image height>,
  "w": <width as 0.0–1.0 fraction of image width>,
  "h": <height as 0.0–1.0 fraction of image height>
}

For replacements use realistic data: real-sounding names, plausible dates in the same format, fake but plausible emails, etc. If no PII is found, return [].`

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mediaType, data: base64 },
          },
          { type: 'text', text: prompt },
        ],
      },
    ],
  })

  const rawText = message.content[0].type === 'text' ? message.content[0].text : ''

  // Strip markdown code fences if present
  const jsonText = rawText.replace(/```(?:json)?\n?/g, '').trim()

  let items: PiiItem[] = []
  try {
    items = JSON.parse(jsonText)
  } catch {
    // If parse fails return empty rather than crashing
    console.error('Failed to parse PII response:', rawText)
  }

  return NextResponse.json({ items })
}
